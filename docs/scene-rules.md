# Scene rules (DRAFT — owner edits; owner's word beats everything here)

Drafted from memory notes + design reviews. Strike, rewrite, add. Items marked `?` are guesses.

## Gate: concept (before any build)
1. **Mechanic named.** One line. A loop is only bad if it is obvious/fast: slow, hard-to-spot loops are fine. Plain drifting props are not.
   Don't copy past winners' mechanics as a recipe (coffee branch, bloom, koi, soft sky are examples, not templates).
2. **Subject nameable** by a stranger from one frame. No abstract blobs, no props-in-a-room with no life of their own (Calder mobile, linen curtain).
3. **Engine-fit (the one hard limit)**: never force the engine to render what it isn't built for (1px lattice, 6-step dither). Failures: first Lakeside, comet, snow bough, first star map, fine-line subjects (marbled ink, cream, clockwork, frost).
   Anything else is guidance, not a ban. Taste is calibrated by the reference images below, not by word lists.
4. **Different from existing scenes** in mechanic AND composition, not prop swap / tint / weather swap.
5. Owner approves the concept (1 line + 1 still) before a full build.
6. Max 3 concepts per ideation round, distinct mechanics.

## Look
- Emptier beats full. Owner consistently kept sparse scenes with movement/vibe and rejected scenes filled with random stuff.
- Small details + subtle movement. No realism, nothing too big.
- Soft volumes and translucency land well; flat illustration and literal landscapes keep failing.
- Colour: muted by default; vibrant allowed as a small accent.
- Light mode first; dark must still be finished.
- Accent: one small, clear, defined vibrant accent is fine (each koi). Never the thing that dominates the frame.
- Subject + approach: structure-first/conceptual, not "draw a shape from geometric primitives and see". Think anatomy, veins, tentacles, translucent layers, secondary motion. Humans/animals are NOT banned (koi, jellyfish, betta are loved); what fails is the kid's-drawing look.
- Judge at the size it is actually seen. Tiny/small birds looked incredible; up-close they were stacked rectangles. Size is a design lever.
- Prefer feeling/vibe + subtle movement over content.

## Reference images (`docs/scene-references/`)
- `good-jellyfish.png`: structure seen through translucent layers, secondary motion. Best on the site.
- `good-betta.png`: same family, tiny and convincing.
- `good-coffee-branch.png`: one confident object, rich internal structure (veins, berries), muted palette.
- `bad-lakeside.png`: "kid's drawing": flat stacked shapes, fisherman = rectangles, literal landscape. Engine-fit failure.

## Motion
- Nothing blinks/flickers or grabs the eye while the owner reads (no twinkling star in a corner). Slow, secondary motion. Loops must be non-obvious. Fast motion only as a brief rare event (shooting star, gust). Judge in motion, not one still.
- Moving things need the settling veil (hysteresis ghosting).
- Reduced-motion: still frame must still look finished.

## Cost
- Soft: measure and report frame cost (say if headless-only). Over ~10ms = flag for owner to decide.

## Page
- Whole-page scenes allowed if they don't hinder app usability (legible text, nothing in the way). Calm centre is a tip, not a rule.
- Desktop is the judging surface. Phone not judged for now (owner may later: no phone scene is good yet). Must not break usability there.

## Verdict style
- Owner judges by eye. Agents show rendered frames; never ask owner to pick numeric tuning values.
- Agents don't self-approve: "pitch agreement is not taste". Judge first builds harder than feels natural.

## Open questions
- (none)

## Process decisions
- Day/night: agents' call (re-toned or separate scenes both fine).
- Revisions: owner sees first build + referee verdict; revises only after owner says so.
