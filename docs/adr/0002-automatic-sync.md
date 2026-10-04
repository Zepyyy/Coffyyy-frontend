# Automatic, bounded cloud sync

Status: accepted

Amends 0001's explicit Push policy. Enrolled, unpaused workspaces save automatically after local edits. Independent entity changes use the existing three-way merge; competing edits to the same entity retain the explicit Push local / Pull cloud choice. Requests continue to carry the expected cloud version.

Local snapshot observation batches edits for two seconds. Automatic attempts have a fifteen-second cooldown shared across tabs through an atomic enrollment transaction. Web Locks also prevent overlapping automatic requests across tabs where supported. There is no polling: cloud checks occur on returning to the visible app or coming online, at most once a minute per tab. Hidden, offline, paused, and conflicting workspaces do not start automatic requests.

Failed automatic attempts retry after thirty seconds and sixty seconds, then stop until a return/online event or explicit reconnect. A session recovery can make multiple authentication requests within one attempt. Manual Sync now bypasses the automatic cooldown. Edits made during a request remain queued; automatic local replacement compares the observed hash inside the replacement transaction before applying cloud data.

The cloud control shows saving, pending, saved, paused, disconnected, and conflict states. Its popover dismisses on outside interaction, Escape, navigation, or shortly after a successful save made while open. Conflicts and failures remain available for a user choice.

Consequences: changes propagate with a short delay, and remote-only edits appear when another device returns to the app. A continuously visible idle app does not discover remote changes until Sync now or a return event. Local backup imports join the same automatic save flow when sync is active.
