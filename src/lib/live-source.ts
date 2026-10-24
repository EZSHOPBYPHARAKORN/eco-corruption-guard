import { Command, DataSource, Snapshot } from './domain';
/** FastAPI owns validation, history, MQTT ingestion, integrity and event lifecycle. */
export class LiveSource implements DataSource {
  constructor(private api: string, private ws: string) {}
  async getSnapshot(): Promise<Snapshot> { const response = await fetch(`${this.api}/api/overview`, { cache: 'no-store' }); if (!response.ok) throw new Error(`API ${response.status}`); const data = await response.json(); if (!Array.isArray(data.stations) || !Array.isArray(data.records) || !Array.isArray(data.events) || !Array.isArray(data.offline) || !data.updatedAt) throw new Error('Invalid snapshot contract'); return { ...data, mode: 'live' }; }
  subscribe(update: (s: Snapshot) => void, error: (message: string) => void) {
    let stopped = false, socket: WebSocket, timer: ReturnType<typeof setTimeout>, attempts = 0;
    const refresh = () => { this.getSnapshot().then(s => { if (!stopped) update(s); }).catch(e => { if (!stopped) error(String(e)); }); };
    const connect = () => { if (stopped) return; socket = new WebSocket(this.ws); socket.onopen = () => { attempts = 0; refresh(); }; socket.onmessage = event => { try { const message = JSON.parse(event.data); if (['telemetry','alert','snapshot','status','integrity'].includes(message.type)) refresh(); } catch { error('Invalid WebSocket message'); } }; socket.onerror = () => error('WebSocket disconnected — reconnecting'); socket.onclose = () => { if (!stopped) { error('Connection lost — data may be stale'); timer = setTimeout(connect, Math.min(30000, 1000 * 2 ** attempts++)); } }; }; connect();
    return () => { stopped = true; clearTimeout(timer); socket?.close(); };
  }
  async command(_command: Command): Promise<void> { throw new Error('Simulation is disabled in live mode'); }
  async acknowledge(id: string) { const response = await fetch(`${this.api}/api/events/${encodeURIComponent(id)}/acknowledge`, { method: 'POST' }); if (!response.ok) throw new Error(`Acknowledgement failed: ${response.status}`); }
}
