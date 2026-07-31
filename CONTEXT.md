# Coffyyy sync context

Shared language for Coffyyy's local-first workspace and optional snapshot sync.

## Workspace

**Local workspace**:
The app data currently held by one browser. It remains usable without sync.
_Avoid_: local account, local user

**Cloud workspace**:
The one shared remote workspace paired by a sync code.
_Avoid_: cloud account, remote database

**Enrollment**:
This browser's durable association with one cloud workspace. Enrollment survives temporary session failure and is separate from the current sync session.
_Avoid_: login, account

**Sync code**:
A reusable bearer credential that authorizes pairing or reconnecting to a cloud workspace.
_Avoid_: password, CSRF token

## Sync lifecycle

**Sync session**:
The temporary authenticated browser connection used to access an enrolled cloud workspace.
_Avoid_: enrollment, workspace identity

**Sync state**:
The user's current relationship with sync: Local, Sync active, Sync paused, Sync disconnected, or Sync conflict.
_Avoid_: auth state

**Pause sync**:
A durable choice to stop push and pull while leaving the local workspace fully usable and the enrollment intact.
_Avoid_: disconnect, forget workspace

**Reconnect**:
An explicit or bounded automatic attempt to restore a sync session for existing enrollment. It never creates a new workspace.
_Avoid_: enable sync

**Forget enrollment**:
Removing this browser's local association with a cloud workspace without deleting the cloud workspace or local app data.
_Avoid_: delete workspace, delete account

## Snapshot operations

**Workspace snapshot**:
One complete representation of beans, machines, brews, stable local IDs, and their relationships.
_Avoid_: change feed, sync batch

**Push**:
An explicit replacement of the cloud workspace with the current local snapshot.
_Avoid_: upload changes, auto-sync

**Pull**:
An automatic or explicit replacement of the local workspace with the current cloud snapshot.
_Avoid_: merge, recovery

**Sync conflict**:
A local snapshot and cloud snapshot both changed since the last common state, requiring a choice between Push local, Pull cloud, or Cancel.
_Avoid_: merge conflict, recovery case
