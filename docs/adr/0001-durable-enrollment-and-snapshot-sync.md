# Durable enrollment and whole-workspace snapshots

Status: accepted

Coffyyy keeps local-first use and adds optional sync through one durable browser enrollment: a workspace ID is an enrollment marker and a reusable sync code is the reconnect credential. Sync uses complete workspace snapshots with explicit Push and automatic Pull; stale pushes are rejected so a browser cannot silently overwrite a newer cloud snapshot. This replaces operation feeds, outboxes, revisions, tombstones, recovery history, and record-level merging because the product needs understandable whole-workspace replacement rather than conflict-recovery machinery.

The sync code is stored locally for seamless reconnect, is masked by default, and can be explicitly replaced. Pause retains enrollment but blocks sync. Forget enrollment clears only local enrollment. Multi-workspace browser support and cloud deletion are out of scope.

Consequences: local data remains usable during pause or disconnection, but reconnect may require a Push/Pull/Cancel choice.
Both the backend rewrite and local browser data may use a destructive reset before rollout. Data loss is agreed to be acceptable during rollout.
