# Eco-Corruption Guard

## Public demo hosting
The GitHub Actions workflow `.github/workflows/pages.yml` builds a static Next.js export and deploys GitHub Pages on pushes to `main`. In repository **Settings → Pages**, select **GitHub Actions** as the build source. The repository name must be `eco-corruption-guard` (or adjust `basePath` in `next.config.ts`). No API keys are needed. The online demo uses mock data independently in each visitor's browser.

Local Pages build in PowerShell: `$env:GITHUB_PAGES='true'; npm run build`. Output is `out/`. Normal development remains `npm run dev` without that environment variable.

Next.js App Router + TypeScript + Tailwind CSS v4 + Recharts + TanStack Query. Local proof of concept; no hardware, MQTT broker or backend required.

## Run
```sh
npm install
npm run dev
```
Open http://127.0.0.1:3000. Production: `npm run build` then `npm start`. Checks: `npm test`, `npm run typecheck`.

## Demo
Open **Simulation controls** → **Simulate anomaly**. WATER-B gradually changes over roughly 8 seconds; watch/critical events are generated and deduplicated per ongoing condition. Open Events & Evidence, inspect a frozen snapshot and timeline, acknowledge or export JSON. **Integrity failure** modifies a retained record without changing its SHA-256, recomputes the digest and flags the mismatch. **Recover environment** restores communication and gradually recovers water values; historical integrity failures remain visible. **Reset demo** clears the session. Offline immediately simulates communication loss for presentation rather than waiting 60 seconds.

Routes: `/`, `/live`, `/stations`, `/map`, `/alerts`, `/events`, `/history`, `/integrity`, `/health`, `/public`. Public view excludes technical controls and raw integrity internals; it is a UI separation, not an authentication boundary. All data is simulated and held in browser memory, seeded with 15 minutes of baseline history. Reload starts a new session; separate tabs have separate simulations. History keeps the most recent 12,000 records. Longer chart windows show only available data and disclose the available duration. Map is a schematic, not a surveyed location.

## Architecture
- `src/lib/domain.ts`: dynamic Station/Telemetry/Event/Snapshot contracts, rule thresholds, canonical hashing.
- `src/lib/mock-source.ts`: serialized simulator, 2-second stream, event lifecycle, immutable evidence copies, actual Web Crypto SHA-256 verification.
- `src/lib/live-source.ts`: REST + reconnecting WebSocket adapter; no MQTT credentials in browser.
- `src/components/provider.tsx`: data source selection and TanStack Query cache.
- `src/components/dashboard.tsx`: views, filters, Recharts, exports; reads the same DataSource contract.

## FastAPI contract (future implementation)
Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_DATA_SOURCE=live` only when a backend exists. The live adapter is scaffolded and has not been integration-tested against real services.

`GET /api/overview` returns the `Snapshot` contract: `{stations, records, events, offline, updatedAt, mode}`. Every telemetry row must include id, ISO timestamp, station_id, ph, ec, temperature, battery, rssi, tamper, hash and integrity. Backend validates data, computes offline status after 60 seconds, verifies hashes, deduplicates packets, and owns event lifecycle. Configure CORS for the frontend origin.

`POST /api/events/{id}/acknowledge` persists acknowledgment. `/ws` sends JSON envelopes with `type` one of `telemetry`, `alert`, `snapshot`, `status`, `integrity`. Each envelope invalidates the aggregate snapshot; the adapter refreshes REST, including after reconnect. This intentionally simple contract can later become incremental updates without changing UI components. Add pagination and server-side range queries before large-scale history.

FastAPI subscribes to `ecoguard/station/+/telemetry`, `/status`, `/tamper`; publishes/consumes `ecoguard/alert/environmental` and `ecoguard/system/gateway`. MQTT ingestion, persistence, auth, access roles, calibration workflows and real hardware are future backend work. Never place broker secrets in NEXT_PUBLIC variables. Production deployment requires backend auth and a separate public projection endpoint.

## Evidence semantics
SHA-256 canonical input is JSON array `[id, station_id, timestamp, ph, ec, temperature, battery, rssi, tamper]` in that exact order. Firmware/backend must agree on canonical numeric and timestamp encoding. This hash detects changes only relative to a trusted original hash; production provenance requires authenticated ingestion and protected reference digests. It is not immutable storage, a digital signature, legal proof of wrongdoing or laboratory confirmation. Failed records remain in the audit/export but are excluded from chart trends. Rule scores are illustrative system priorities, not regulatory limits. Field investigation and laboratory confirmation remain necessary.
