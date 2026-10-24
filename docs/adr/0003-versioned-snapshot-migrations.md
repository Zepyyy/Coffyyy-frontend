# Versioned, non-destructive snapshot migrations

Status: accepted

Supersedes 0001's clause that a destructive reset of backend or local data is acceptable. Workspace snapshots carry a `schemaVersion`. When the contract changes, the version increments and a pure upgrade (`upgradeSnapshot`, implemented identically in backend and frontend) maps every older snapshot to the current one without losing data. Anything that can hold an older snapshot goes through it: stored cloud snapshots on read, cloud responses, backup imports, and the enrollment's stored merge base. Local Dexie data migrates in a matching Dexie version upgrade.

The backend accepts only the current version on write. A PUT of an older version is rejected with 409 "Client outdated" rather than validated, so schema validation never silently strips legacy fields. The backend deploys first; it upgrades stored snapshots in memory on read and persists them on the next write.

Consequences: either deploy order is data-safe (a new client against an old backend fails validation, an old client against a new backend is rejected), at the cost of sync being unavailable to outdated clients until they reload. Every schema change ships an upgrade function and tests for it in both repositories.
