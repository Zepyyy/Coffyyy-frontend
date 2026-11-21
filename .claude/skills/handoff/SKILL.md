---
name: handoff
description: Write/refresh a short handoff note so work survives usage limits or thread switches. Use at checkpoints during long scene/render loops, or when asked to hand off or resume.
---

Write `HANDOFF.md` (untracked; put in repo root, never commit) after each iteration that improved things, and before ending a turn if limits are near. Overwrite, don't append. Max ~20 lines:

- **Goal**: one line.
- **State**: what changed, files touched, branch.
- **Verified**: what was actually looked at/run (frames viewed, tsc, cost number).
- **Not verified**: be explicit.
- **Next**: ordered list.
- **Resume**: exact commands (vite dev port, render command).
- **Owner verdicts so far**: kept/killed, quotes if sharp.

To resume: read `HANDOFF.md` first, confirm branch/state matches, continue from **Next**. Delete the note when work lands.
