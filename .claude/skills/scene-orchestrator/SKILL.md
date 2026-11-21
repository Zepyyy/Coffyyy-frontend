---
name: scene-orchestrator
description: Run grain background scene work (new concepts, builds, revisions) with a small model team. Use when asked to ideate, build, or rework background scenes, or to orchestrate/delegate scene work.
---

You are the orchestrator. Whatever model you are, do the orchestrator job; never announce or depend on your identity.

## Team
- **Builders** (the only ones who write scene code): `gpt-6.2-sol` on provider `codex` (reasoningEffort `high`), and `claude-sonnet-5-5` on `claudeAgent`. Spawn via `delegate_task`; call `orchestrator_capabilities` once per thread first.
- **Referee**: at most ONE Opus (`claude-opus-5-5`) at any time: idea spawner, critic, design referee. Never two. If you ARE Opus, you are the referee yourself: spawn no Opus.
- Builders never judge their own taste. Referee never edits scene files.

## Flow
1. **Rules first.** Read `docs/scene-rules.md`. Owner's rules beat any default here. If it is missing/contradicted by the request, stop and ask.
2. **Ideate** (referee): 3 concepts max, each = mechanic (one line), subject, why it survives 1px 6-step dither, how it differs from existing scenes in `src/components/grain/scenes/`. Referee discards rule-breakers before owner sees them.
3. **Owner picks** (text only, no builds yet). Don't build unpicked concepts.
4. **Build**: one concept per builder, one file each, tabs, touch only that file (+ register in `scenes/index.ts` if told). Check other threads/worktrees first; split file ownership.
5. **Look**: render with `SCENES=<id> TIMES=20,45,85 node scripts/render-grain-frames.mjs` (vite dev needed). View desk frames, light + dark. Phone only if asked. Builders must view their own frames before handback.
6. **Referee verdict** on frames vs rules AND the images in `docs/scene-references/`: keep / revise (concrete asks) / kill. Owner sees first build + verdict; revise only after owner says so.
7. **Owner sees**: frames + one line per scene + measured frame cost. No tuning-number questions: decide yourself, show before/after.
8. Commit nothing/merge nothing without owner say.

## Builder brief (paste into every delegate_task)
- Concept + mechanic line; link `docs/scene-rules.md` and `docs/scene-references/` (view the images). Structure-first, not geometric primitives.
- Scope: single file; tabs; re-read file after each edit to confirm it landed.
- Done = frames viewed (desk light/dark, motion on), tsc + lint clean, frame cost measured (say if headless-only).
- Handback: what changed, what was verified, what was NOT verified, frame cost, known flaws. Be candid.
- Checkpoint: after each good iteration, update handoff note (see `handoff` skill). If other file broken, report, don't fix.

## Pitfalls
- Moving elements: settling veil or ghost pixels.
- Check scene-switch + dark mode after any dither change.
- Pitch agreement between models is not taste; be harsher on first builds.
