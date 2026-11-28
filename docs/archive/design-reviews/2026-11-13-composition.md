# Composition exploration — 2026-11-13

Owner likes the rebuilt backgrounds' texture; asks better framing, spacing and
motion. Explicit missing concepts: moon/shooting stars, rays, water reflections
with falling leaves. Desktop only. Three Sol 6.1 implementors; lead rendered
review, not submission alone, determines which studies enter the lab.

## First rendered rejection

- Nocturne: pixel-shaded lunar relief flattened to a gray disk; meteor too thin
  for the 2px dither lattice. Requested graphic crater relief, stronger terminator
  and a visible tapered luminous head/tail.
- Daylight: three equal short stripes below cards read as road markings. Requested
  an asymmetric offscreen window source crossing the page with unequal panes.
- Leaffall: cards concealed foliage; reflection's source mapping left an unnatural
  gap; isolated floating leaf and unrelated glints failed to establish water.
  Requested visible foliage, correct mirroring and impact in the reflected region.

## Second rendered review

Daylight's diagonal projection now frames the right and lower page coherently;
leaf shadows interrupt light rather than becoming colored botanical decoration.
Still a broad graphic light plane, not photorealistic volumetric rays.

Leaffall's corrected mapping connects reflection, but straight twig geometry still
felt crude. Lead replaced it with tapered curved wood, attached larger leaves at
actual curve coordinates, and strengthened reflection. Fixed an abrupt 180-degree
landing turn and softened the replacement leaf's arrival at the cycle boundary.

Owner approval remains open. The three studies are exploratory lab choices.

## Current desktop checks

Daylight and Leaffall are available as lab explorations; neither is owner-approved.
Reviewed populated 1440×900 and 1920×1080 frames in both themes. Leaffall includes
fall/impact/rest samples at 15, 19, 20 and 30 seconds. After reviewing bottom fade,
lead brought water closer to branch and reduced downward leaf angles.

Build and scoped lint pass. At 1280×900, Leaffall: 4.93ms mean synchronous render
cost; Daylight: 11.37ms after using a half-resolution working surface (previously
16.00ms). Daylight still exceeds the verifier's 10ms cost threshold. Both have zero
hard flips and reversals in the sampled 10-second test. Instrumented canvas cost,
not end-to-end FPS; larger desktops and mobile remain unverified this round.

## Final moon and delivery review

Second moon submission rejected: uniform giant basins resembled perforated stone.
Lead replaced them with cached smaller continuous crater slopes and one shared sun
normal for terrain/sphere, with alpha carrying relief through the grain lattice.
Meteor now traverses the open right sky diagonally; arrival, midpoint and departure
captured at 29.2, 30 and 30.8 seconds in both desktop sizes/themes.

Nocturne remains quieter between meteor events; the moon is deliberately still.
Daylight offers the strongest whole-page framing; Leaffall offers the most explicit
cause-and-effect motion, but water identity is delicate and left-weighted. These
are lead assessments, not owner preferences or approved defaults.

All five lab choices preserve saved Coffee branch/motion preferences and produce
stable Still canvases. Five Watch/Still pairs, no browser page errors. Final build,
scoped ESLint and diff checks pass. Moon tested with an offset that exercises an
active meteor: 3.00ms mean, zero hard flips/reversals at 1280×900. Prior test sampled
resting terrain and was insufficient evidence for meteor motion; superseded.
No continuous real-device viewing, mobile or cross-browser validation claimed.

Latest temporary evidence: `/tmp/coffyyy-composition-r4`,
`/tmp/coffyyy-nocturne-final`, `/tmp/coffyyy-composition-motion`,
`/tmp/coffyyy-meteor-check.txt`. Main checkout untouched.

