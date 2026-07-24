# Issue #25: sync convergence verification

Status: partial; verifier and local coverage added, live gate pending.

The live verifier is read-only. It requires two authenticated sessions for the
same workspace and never creates, updates, or deletes real records.

```bash
COFFYYY_DEVICE_A_SESSION_COOKIE='coffyyy_session=...' \
COFFYYY_DEVICE_A_CSRF_TOKEN='...' \
COFFYYY_DEVICE_B_SESSION_COOKIE='coffyyy_session=...' \
COFFYYY_DEVICE_B_CSRF_TOKEN='...' \
npm run verify:sync
```

Optional variables:

- `COFFYYY_SYNC_BASE_URL` (default `http://localhost:3000/api`)
- `COFFYYY_SYNC_CURSOR` (default `0`; use each device's durable cursor when known)

The command compares both device snapshots, validates brew references, checks
cursor progress or the explicit full-resync signal, and verifies seven-day
history timestamps and pagination.
It prints counts and cursors only; credentials are not logged.

## Verification matrix

| Boundary | Automated evidence | Live evidence |
| --- | --- | --- |
| Create/update/delete, retry | `src/db/sync/sync.test.ts` | pending authenticated run |
| Concurrent edits and LWW retry | `src/db/sync/sync.test.ts` | pending authenticated run |
| Reconnect and reload | `src/db/sync/sync.test.ts` | pending authenticated run |
| Pending outbox and tombstones | `src/db/sync/sync.test.ts` | pending authenticated run |
| Seven-day history and recovery | `src/db/sync/sync.test.ts` | pending authenticated run |
| Multi-tab/session coordination | `src/db/sync/coordinator.test.ts` | pending authenticated run |
| Multi-device snapshot convergence | pull-test cache rebuild only | pending authenticated run |
| Frontend UI boundary and recovery actions | pending browser run | pending deployed-frontend run |

## Evidence captured 2026-07-24

Separate live API probes against `http://localhost:3000/api`:

- `GET /auth/sync/csrf` → `200`; CSRF token bootstrap available.
- `GET /auth/sync/session` without a session → `401 Session required`.
- `GET /bean` without a session → `401 Session required`.
- `GET /api` → `200` Swagger document; sync routes are registered on the live
  process.
- No authenticated device credentials were available to the agent, so no real
  dataset was mutated and cross-device convergence is not claimed.
- Issue #10 remains open; rollout acceptance is not claimed.

Local checks:

- `npm test -- --run src/db/sync/sync.test.ts src/db/sync/coordinator.test.ts` →
  31 tests passed.
- `npx tsc --noEmit --incremental false` → passed.
