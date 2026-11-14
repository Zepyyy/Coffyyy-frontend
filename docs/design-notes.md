# Design brief

Current owner preferences and review criteria. Updated 2026-11-13.
Read for visual work; domain facts live in CONTEXT.md, implementation in code.
An implemented experiment is not an approved direction. Latest owner feedback wins.

## Product character

Coffyyy is a personal brew journal used in everyday brewing. Keep information
clear, controls precise, and the surrounding world alive without demanding attention.
Established UI: sharp surfaces, hairlines, restrained color, expressive serif
headings and quiet body/data typography. Background exploration preserves the
existing tokens and component behavior.

## Owner preferences

Latest background feedback, 2026-11-12:

| Direction | Owner response | Useful distinction |
| --- | --- | --- |
| Coffee branch | Loved; current default | Color, motion, theme and implementation work together. |
| Dandelion, Bloom | Loved | Distinct ideas with convincing life, color and motion. |
| Star atlas | Disliked | Space remains welcome; this execution is not a template. |
| Whale, Koi | Indifferent; not used | Shipping is not evidence of quality. |
| Ginkgo, Shore | Disliked | Rejected execution does not ban plants or water. |
| Willow | Indifferent | Subject alone does not supply character. |
| Stillwater | Not keeping | Reflection/water mechanism is interesting. |
| Windfall | Not keeping | Falling leaves are interesting; execution fell short. |
| Canopy, Unfurl, Penumbra, Rain garden (Sol exploration) | Rejected | Too timid, unattractive or unconvincing; a barely moving isolated moon is not enough. |
| Moonflower (Sol exploration) | Flower rejected; butterfly promising | A much more impressive, beautifully designed flower could be worth considering. |

These judgments concern explored versions; not all exist in this checkout.
The owner wants surprise, visual ambition, and visibly meaningful motion. The
rejected atlas at least occupied space and attempted something innovative.
Tiny decorative vignettes do not satisfy this brief; recognizability and passing
technical checks are insufficient. Do not shrink ambition into spare card gaps.
Whole-page composition is open for exploration. Two lateral corridors are an
existing technique, not a requirement. Coffee imagery is welcome when it works;
the background need not illustrate coffee literally.

Earlier preferences still relevant: text stays quiet and readable; moving haze
behind exposed text was rejected. Avoid generic rounded UI and hover lift.
Continuity of useful UI state changes was approved. Old CTA-specific motion or
color exceptions do not authorize equivalent changes across the app.

Latest owner feedback on the desktop studies (2026-11-13):

- Keep the material quality: Orbital gradients, Passionflower's petal shadows and
  contrast, Leaffall's colors. Texture alone does not make a successful scene.
- Daylight rejected: orange carpet with arbitrary branch cutouts; visual premise
  does not make sense. Owner considers Aurora more convincing; lead rejection
  was not an owner rejection or a ban on aurora.
- Nocturne: moon and meteors look good, but scene is too empty. Identical isolated
  meteor trajectory/timing is inadequate. Wants varied sizes, colors, pace and
  patterns with overlapping activity, as in Bloom, without random visual noise.
- Leaffall: low branch, upward launch, invisible water and tiny ripples rejected.
  Earlier composition was better integrated. Falling and reflected-water physics
  must be visible and coherent, not merely present in the source.
- Passionflower: flower and butterfly loved. Improve composition and enrich the
  scene moderately; no entire jungle. Existing petal rendering is worth preserving.
- Orbital: orbiting moon and its shadow are excellent. Big planet's rendering is
  nice, but the scene feels empty and outer rings add only meaningless pixel area.
  Compose around purposeful interactions; filled area is not visual interest.

Latest clarification: the owner is a heavy light-mode user. Treat light mode as
the primary design target, with deliberate dark-mode treatment too. The shared
landscape screenshot was praised for its framing, not a request for a faithful
copy, orange palette, or specific terrain. Use spatial depth and focal hierarchy
as inspiration while giving new explorations their own identity.

Latest owner verdict after the Sonnet revisions:

- Passionflower and Horizon are approved for the regular background menu.
  Preserve both current versions; they are no longer exploration entries.
- Passionflower: preserve the liked baseline. The separate variant should explore
  additional flower types integrated into the composition, possibly with a bee.
  Botanical variety is the main exploration; butterfly motion still needs attention
  but a motion-only variant does not answer the request. Avoid turning it into a jungle.
- Nocturne is much better; align meteor families to a shared general direction.
  The near-vertical versus horizontal crossing feels disorganized. Keep variety
  in timing, size and material without opposing or perpendicular streams.
- Leaffall concept is much better; water is too loud and occupies too much space.
  Reduce its visual footprint while keeping readable water, reflections and impact.
- Orbital rejected; retire it and move on. No further refinement requested.

Owner requested Sonnet for every sub-agent in the next round. Latest feedback
supersedes lead shortlists and reviews. Inspect full motion sequences and quiet
intervals, not just selected stills. Approval remains with the owner.

## Current exploration scope

Owner explicitly deferred mobile for this exploration. Design and judge desktop
first: scale, visual ambition, beautiful execution and meaningful motion. Do not
shrink or simplify desktop compositions to satisfy phone constraints. Mobile
composition and validation remain future work, not acceptance gates for this round.

## Implementation boundaries

- Preserve saved background preferences and coffee-branch default until the owner
  chooses a replacement. Exploration does not choose for them.
- Use the Canvas2D Scene/engine, quiet zones and glass integration. Blur belongs
  under glass; scene-specific haze over open text is not acceptable.
- Compose for populated pages. A subject hidden by cards on a phone is not a
  successful mobile composition. Whole-page does not mean drawing over text.
- Preserve motion-off and reduced-motion behavior. A still must look complete.
  URL/lab motion overrides are preview behavior, not accessibility precedent.
- Keep deterministic motion and temporal smoothing. Validate visible flicker and
  cost; detail does not justify degraded everyday use.

## Review an exploration

State the subject, composition and characteristic motion mechanism before building.
Different subjects sharing the same drift loop are weak variety. These criteria
are a review framework, not a mandatory aesthetic recipe:

1. **Identity:** the rendered scene communicates its idea without its title.
2. **Life:** movement relates convincingly to the subject; the resting state is
   intentional. Watch transitions and cycle boundaries.
3. **Composition:** target viewports have a legible focal structure and quiet
   space; assess populated pages in light and dark themes. Desktop only this round.
4. **Material:** color, edges, anatomy and depth survive actual grain rendering.
   Source complexity is not evidence of visual richness.
5. **Daily use:** reward a glance, then let attention return to brewing. Check
   motion-off, readability, flicker and performance.

The lead inspects rendered results and records concrete weaknesses before accepting
submissions. Revise or reject failures; lint is not design approval. Separate
source checks, rendered stills, observed motion and untested behavior in reports.
Only the owner can confirm a new favorite/default.

## Maintaining this document

Record owner preferences; label interpretations. Replace superseded guidance
instead of appending another current revision. Keep candidate pitches, critiques
and validation with their delivery record. Agent preferences are not standing rules.

For a specific historical decision only, consult
[the archived chronology](archive/design-notes-history.md). Its old current labels
and test results describe their original iterations, not today's state.
