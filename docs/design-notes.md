# Design brief

Current owner preferences and review criteria. Updated 2026-11-18.
Read for visual work; domain facts live in CONTEXT.md, implementation in code.
An implemented experiment is not an approved direction. Latest owner feedback wins.

## Product character

Coffyyy is a personal brew journal used in everyday brewing. Keep information
clear, controls precise, and the surrounding world alive without demanding attention.
Established UI: sharp surfaces, hairlines, restrained color, expressive serif
headings and quiet body/data typography. Background exploration preserves the
existing tokens and component behavior.

## Interaction clarity

Make the next action apparent through control order, grouping, sensible defaults,
and visible state. When a flow needs a sentence explaining how to use it,
redesign the interaction and remove the sentence. Keep labels, units, accessible
names, and actionable errors precise. Review on a phone: can someone identify
their current selection and take the next action without scrolling back for context?

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

## Grain, round five — five candidates for the next default

Owner opened the whole canvas and palette, then steered toward autumn and trees.
Opus led the final art direction: replaced Grove with Willow, rebuilt Stillwater
and Windfall, strengthened Ginkgo's anatomy/colour, and retained Shore.

- `willow` / **Willow**: golden hanging whips. A gust turns the leaves silver,
  then long and short whips swing at different rates and drift out of step.
  The first-visit default; saved choices still win.
- `reflection` / **Stillwater**: birches and a copper fern bank over a pond.
  Level engraved water lines break into dashes. A leaf and its reflection
  meet at the surface, sending rings through the mirrored trunks.
- `windfall` / **Windfall**: large five-lobed maple leaves on one connected bough.
  Gusts release a leaf from its real attachment; it slips, tumbles and settles
  into the drift below.
- `canopy` / **Ginkgo**: overhead boughs, butter-yellow fan-shaped leaves, forked
  veins and knobby spur shoots. Turning faces open skylights in the crown.
- `shore` / **Shore**: swash, backwash, drying sand and foam lace along a moving
  tide line. Foam holes erase opaquely on both papers; inheriting the night
  glow's partial opacity previously left grey sheets instead of open lace.

`/backgrounds` compares one live scene at a time, with native keyboard-selectable
radios, pause, dashboard trials and an explicit **Use this background** action.
Previewing never changes the saved choice. Choosing writes the normal background
preference and returns to the journal. Coffee branch and Bloom remain selectable.

The existing grain lattice, quiet masks and glass remain responsible for the
material. Willow and Stillwater share `scenes/raster.ts`, which paints blades,
polylines and water marks directly into the dither source grid, then lets the
engine apply its usual masking, hue and tone easing. Caches contain pure
time-derived drawings: backward seeks and `t=30` stills must reproduce the
same image. Expensive anatomy uses cached paths or raster profiles; intermediate
canvases are CPU-backed to avoid transfers into the readback layer.

Motion has three saved states: `null` follows the device, `true` is explicit
On, and `false` is explicit Off. Existing saved booleans keep that meaning.
Dashboard On/Off overrides the device setting and survives scene selection,
reselection and navigation. An unset choice follows live OS reduced motion.

Studies and the dashboard share the same saved motion choice. Explicit study
Play/Pause updates playback immediately, including after returning to the
journal without choosing a new background. Selecting a scene only previews it;
**Use this background** saves the background. Dashboard trials can carry
playback as `?grain=<scene>&motion=on` (or `off`); changing a playback control
clears that temporary override. Both controls report actual playback. `scripts/verify-grain-motion.mjs` checks the real
controls and moving/still canvas pixels, including the reduced-motion case. Populated phone cards
conceal much of every scene; mobile is a close crop and edge colour rather than
an unobstructed miniature of the desktop scene. Wide-screen engine cost remains
substantial even with the established Coffee branch; scene-only timings do not
establish full-frame performance.

Final validation: build, lint and all 170 tests passed. Desktop/phone light/dark
chooser checks, six default/persistence cases and sixteen temporal/still cases
passed, including dark Shore. No hard flips or on-off-on reversals; backward
seeks and theme roundtrips reproduce the same still. Full engine measurements
still warn on 2560px canvases and on Ginkgo at 390px with 4x CPU throttling.
These are local Chromium measurements, not physical-phone performance claims.


## Cleanup and Nocturne rebuild (Opus, 2026-11-14)

Owner rejected Murmuration outright ("the plague"). Removed rejected scenes from
code and menus: murmuration, whale, star atlas, horizon, leaffall, windfall,
ginkgo (canopy), shore, daylight, orbital, penumbra, rain. Saved choices that
pointed at them fall back to the default.

Nocturne rebuilt from scratch, now in the regular menu. Real near-side moon
(maria layout, crater height fields, Tycho/Copernicus/Kepler rays), waning
gibbous, lit limb facing the page. Lesson: mid-tone grey dithers into a
checkerboard; the moon prints at full dot density with luminance carried by
hue (ivory, slate, indigo). Diffuse Milky Way stipple read as dirt on light
paper and was cut. One radiant beyond the moon; overlapping families (bursty
streaks, coloured bright meteors with wind-twisted trains, slow grazers, a rare
fireball that breaks up). No cirrus haze, no twinkling.

Owner then rejected the realistic moon: too realistic, too filled, too big.
Replaced with a small crescent drawn in the grain (gold limb dissolving through
a dithered falloff, open disc with a dotted earthshine rim). Trains no longer
wiggle: they stay where they formed and fade from the oldest end.

Owner disliked the crescent too, and called sparse single-pixel stars "dirt".
With the new 1px blue-noise engine underway, Nocturne dropped the moon: a soft
Milky Way band (star clouds, warm core, dust lane) rises up the left side,
crowded with stars; the open sky keeps a few bright stars with halos.

## Cleanup and engine fixes (2026-11-14, owner direction)

Owner rejected Stained glass, Caustic floor, Extraction (all deleted), then
retired Willow, Stillwater, Betta, Nocturne (too laggy) and Jellyfish. One
ink moon jelly from Jellyfish now swims in Bloom. Motion lab removed; one
"Preview backgrounds" page remains. Explorations live in the regular picker
with an "exp" tag (`exploration: true` in creatures.ts). Default is Coffee
branch. Engine: frame pacing now follows the display (60 → 30 → 20 under
load; fixed 24fps read as lag), and dots stop holding old steps for 0.6s
after a scene/theme switch (fixes ghosts of the previous scene).

Lakeside is liked as a concept. Owner wants full-page scene variations that are
different worlds in the same spirit (cozy, full width/height illustrated
landscape, small life, chill), not the same lake with swapped props.

## Grain print and coffee branch fix (2026-11-18)

Owner: on a large screen the 1px engine made Coffee branch look worse than the
old 2px print (heavy petal contours, coarse leaves). Cause: the plate's strokes
had 2px minimums tuned for the 2px lattice, so at 1px every line was a solid
cartoon outline. Cherry now thins strokes toward the lattice (`thin`).

Grain is now per background: **Grain: fine / coarse** in Settings switches the
background on screen. A background declares its default (`print` in
creatures.ts). Owner: keep Coffee branch fine; coarse looks best on Lakeside.
Fine is the 1px blue-noise engine; coarse is 2px dots on an 8x8 Bayer lattice,
the original stitched look, rebuilt on the GPU engine. Dev: `?grainDot=2&grainMask=bayer&grainCoverage=0.8`.

Owner principle (2026-11-18): design for the engine, don't fight it. A scene
that chases detail the grain can't carry (a figure built from small parts,
many tiny structures) ends up as "rectangles piled up". Use one strong simple
gesture per subject, soft shading, and suggestive form; cut any detail that
doesn't survive a zoomed render. The Lakeside thread's simplification was
right; its grey slab water and lost colour were not.
