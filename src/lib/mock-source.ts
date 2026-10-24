import { anomaly, Command, DataSource, Event, hashRecord, latest, Snapshot, Telemetry, verify } from './domain';
const stations: Snapshot['stations'] = [ { id: 'WATER-A', name: 'คลองสาธารณะ · จุดต้นน้ำ', type: 'upstream', latitude: 13.6012, longitude: 100.6142, lastCalibration: '2026-10-20' }, { id: 'WATER-B', name: 'คลองสาธารณะ · จุดปลายน้ำ', type: 'downstream', latitude: 13.5978, longitude: 100.6186, lastCalibration: '2026-10-20' } ];
export class MockSource implements DataSource {
  private state: Snapshot = { stations, records: [], events: [], offline: [], updatedAt: '', mode: 'mock' };
  private listeners = new Set<(s: Snapshot) => void>();
  private timer?: ReturnType<typeof setInterval>;
  private level = 0; private target = 0; private tamper = false; private serial = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private ready?: Promise<void>;
  private locked<T>(fn: () => Promise<T>): Promise<T> { const p = this.queue.then(fn); this.queue = p.catch(() => {}); return p; }
  private async record(station: typeof stations[number], stamp: string): Promise<Telemetry> {
    const b = station.type === 'downstream', drift = Math.sin(this.serial * .47) * .025;
    const r: Telemetry = { id: `REC-${++this.serial}`, station_id: station.id, timestamp: stamp, ph: +(7.12 - (b ? .04 + this.level * 2.26 : 0) + drift).toFixed(2), ec: Math.round(428 + (b ? 12 + this.level * 1170 : 0) + drift * 80), temperature: +(28.4 + (b ? .1 : 0) + drift).toFixed(1), battery: b ? 89 : 91, rssi: b ? -91 : -87, tamper: b && this.tamper, hash: '', integrity: 'verified' };
    r.hash = await hashRecord(r); return r;
  }
  private async seed() { const now = Date.now(); for (let i = 90; i >= 0; i--) for (const station of stations) this.state.records.push(await this.record(station, new Date(now - i * 10_000).toISOString())); this.state.updatedAt = new Date(now).toISOString(); }
  async getSnapshot() { this.ready ??= this.locked(() => this.seed()); await this.ready; return structuredClone(this.state); }
  subscribe(update: (s: Snapshot) => void, error: (message: string) => void) { this.listeners.add(update); if (!this.timer) this.timer = setInterval(() => { void this.locked(() => this.tick()).catch(e => error(String(e))); }, 2000); return () => { this.listeners.delete(update); if (!this.listeners.size) { clearInterval(this.timer); this.timer = undefined; } }; }
  private emit() { this.listeners.forEach(fn => fn(structuredClone(this.state))); }
  private open(type: Event['type'], record: Telemetry, score = 0, severity: Event['severity'] = 'warning') {
    const existing = this.state.events.find(e => e.type === type && e.station_id === record.station_id && e.status !== 'resolved');
    if (existing) { if (score > existing.score) { existing.score = score; if (existing.severity !== severity) existing.timeline.push({ time: this.state.updatedAt, message: `Severity escalated to ${severity}` }); existing.severity = severity; } return; }
    const stamp = this.state.updatedAt;
    this.state.events.unshift({ id: `EVT-${stamp.slice(0,10).replaceAll('-','')}-${String(this.state.events.length + 1).padStart(3,'0')}`, type, station_id: record.station_id, score, severity, status: 'open', start_time: stamp, record: structuredClone(record), timeline: [{ time: stamp, message: `${type.replaceAll('_',' ')} detected` }, { time: stamp, message: 'Evidence snapshot captured · alert issued' }] });
  }
  private resolve(types: Event['type'][]) { for (const e of this.state.events) if (types.includes(e.type) && e.status !== 'resolved') { e.status = 'resolved'; e.end_time = this.state.updatedAt; e.timeline.push({ time: this.state.updatedAt, message: 'Condition recovered' }); } }
  private async tick() {
    this.level += Math.max(-.25, Math.min(.25, this.target - this.level)); this.state.updatedAt = new Date().toISOString();
    for (const station of stations) if (!this.state.offline.includes(station.id)) this.state.records.push(await this.record(station, this.state.updatedAt));
    const a = latest(this.state, stations[0].id), b = latest(this.state, stations[1].id);
    if (!this.state.offline.length && b) { const result = anomaly(a,b); if (result.score >= 30) this.open('water_anomaly', b, result.score, result.severity); else this.resolve(['water_anomaly']); }
    this.state.records = this.state.records.slice(-12000); this.emit();
  }
  async command(command: Command) { await this.getSnapshot(); await this.locked(async () => {
    this.state.updatedAt = new Date().toISOString();
    if (command === 'reset') { this.level = this.target = 0; this.tamper = false; this.serial = 0; this.state = { stations, records: [], events: [], offline: [], updatedAt: '', mode: 'mock' }; await this.seed(); }
    if (command === 'anomaly') this.target = 1;
    if (command === 'recover' || command === 'normal') { this.target = 0; this.tamper = false; this.state.offline = []; this.resolve(['offline','tamper']); if (command === 'normal') this.level = 0; }
    if (command === 'offline') { this.state.offline = [stations[1].id]; this.open('offline', latest(this.state, stations[1].id)!); }
    if (command === 'tamper') { this.tamper = true; const record = await this.record(stations[1], this.state.updatedAt); this.state.records.push(record); this.open('tamper', record, 0, 'critical'); }
    if (command === 'integrity') { const r = this.state.records.findLast(r => r.station_id === stations[1].id && r.integrity === 'verified')!; r.ph = +(r.ph + 1.25).toFixed(2); r.integrity = await verify(r) ? 'verified' : 'failed'; this.open('integrity', r, 0, 'critical'); }
    await this.tick();
  }); }
  async acknowledge(id: string) { await this.locked(async () => { const e = this.state.events.find(e => e.id === id); if (e?.status === 'open') { e.status = 'acknowledged'; e.timeline.push({ time: new Date().toISOString(), message: 'Acknowledged by demo operator' }); this.emit(); } }); }
}
