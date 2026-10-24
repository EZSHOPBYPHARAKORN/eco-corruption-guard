export type Severity = 'normal' | 'watch' | 'warning' | 'critical';
export type Metric = 'ph' | 'ec' | 'temperature';
export type Command = 'normal' | 'anomaly' | 'recover' | 'offline' | 'tamper' | 'integrity' | 'reset';
export interface Station { id: string; name: string; type: 'upstream' | 'downstream'; latitude: number; longitude: number; lastCalibration: string }
export interface Telemetry { id: string; station_id: string; timestamp: string; ph: number; ec: number; temperature: number; battery: number; rssi: number; tamper: boolean; hash: string; integrity: 'verified' | 'failed' }
export interface Event { id: string; station_id: string; type: 'water_anomaly' | 'offline' | 'tamper' | 'integrity'; severity: Severity; score: number; status: 'open' | 'acknowledged' | 'resolved'; start_time: string; end_time?: string; record: Telemetry; timeline: { time: string; message: string }[] }
export interface Snapshot { stations: Station[]; records: Telemetry[]; events: Event[]; offline: string[]; updatedAt: string; mode: 'mock' | 'live' }
export interface DataSource { getSnapshot(): Promise<Snapshot>; subscribe(update: (snapshot: Snapshot) => void, error: (message: string) => void): () => void; command(command: Command): Promise<void>; acknowledge(id: string): Promise<void> }
export const thresholds = { phMin: 6.5, phMax: 8.5, phDelta: 0.5, ecDeltaPercent: 30, offlineMs: 60_000 };
export function anomaly(a: Telemetry | undefined, b: Telemetry | undefined): { score: number; severity: Severity } {
  if (!a || !b || a.integrity === 'failed' || b.integrity === 'failed') return { score: 0, severity: 'normal' };
  const phDelta = Math.abs(b.ph - a.ph), ecDelta = a.ec > 0 ? (b.ec - a.ec) / a.ec * 100 : 0;
  const score = Math.min(100, Math.round((b.ph < thresholds.phMin || b.ph > thresholds.phMax ? 30 : 0) + (phDelta > thresholds.phDelta ? Math.min(35, phDelta * 16) : 0) + (ecDelta > thresholds.ecDeltaPercent ? Math.min(35, ecDelta * .14) : 0)));
  return { score, severity: score >= 75 ? 'critical' : score >= 50 ? 'warning' : score >= 30 ? 'watch' : 'normal' };
}
export function canonical(r: Telemetry) { return JSON.stringify([r.id, r.station_id, r.timestamp, r.ph, r.ec, r.temperature, r.battery, r.rssi, r.tamper]); }
export async function hashRecord(r: Telemetry) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(r))))).map(b => b.toString(16).padStart(2, '0')).join(''); }
export async function verify(r: Telemetry) { return await hashRecord(r) === r.hash; }
export const latest = (s: Snapshot, id: string) => s.records.findLast(r => r.station_id === id);
export const time = (value: string) => new Date(value).toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', second: '2-digit' });
