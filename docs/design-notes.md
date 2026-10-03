# Design notes — "Roastery Notebook"

Working notes for the identity pass on the UX-overhaul branch. This is the plan I
cooked against, plus the reasoning worth keeping.

## The brief, as I understood it

"Cool design system, but no wow effect, not personalized, not established."
Translation after looking at every page: the app has a *voice* (quiet journal,
Newsreader italics, mono labels) but no *material world* and no *signature
moment*. Every surface is the same flat hairline box on cream; type comes from
five competing families; the one interactive gem (the brew dial) is visually
whispering; nothing moves, nothing celebrates, nothing is yours.

## Direction

**A barista's field notebook strapped to a precision instrument.**

- Warmth comes from material: unbleached paper, espresso-brown ink (never
  black, never cold grey), warm shadows instead of neutral ones.
- Structure comes from instruments: mono data everywhere a number matters,
  tick scales, a machined knob.
- One living color: **crema amber** — reserved for what is active, filled, or
  true ("this shot worked"). Everything else stays ink-on-paper.
- Flavor notes keep their tag hues, recalibrated to sit on paper instead of
  shouting over it.

Why not the obvious "dark moody coffee site": it would fight the morning-light
reality of brewing and read as template. Why not photography: no assets, and
the app's world is numbers + notes, not latte art.

## Tokens

Color is defined once in `src/index.css` as semantic vars (paper / ink /
crema / roast / line), then mapped onto the existing shadcn variable names so
every component keeps working:

| Token        | Light                  | Role                          |
| ------------ | ---------------------- | ----------------------------- |
| `paper`      | warm unbleached cream  | app background                |
| `paper-raised` | near-white cream     | cards, popovers               |
| `paper-sunken` | deeper paper         | wells, inputs, code           |
| `ink`        | espresso brown-black   | text, primary buttons         |
| `ink-soft` / `ink-faint` |            | secondary / labels            |
| `crema`      | amber, hue ~76         | accent: active, needle, fill  |
| `crema-deep` | darker amber           | hover/pressed                 |
| `crema-tint` | pale amber wash        | selected backgrounds          |
| `roast`      | near-black brown       | strongest surfaces (CTA)      |
| `line` / `line-strong` | warm hairlines | borders                    |

Type roles (three faces, no more):

- **Fraunces** — display. Heroes, section titles, bean names, the ratio
  numeral, the brand wordmark. Italics for the human voice.
- **Instrument Sans** — body and UI. Buttons, chips, hints, forms.
- **Spline Sans Mono** — data. Eyebrow labels, recipes, ledger rows, dates,
  dials.

## Signature + echoes

One big bet, three quiet echoes:

1. **The machined dial** (log-a-brew): knurled ring, ideal-zone arc, crema
   needle with a spring settle. The most-used control becomes the most
   beautiful object in the app.
2. Bean cards read as **coffee-bag labels** (roaster eyebrow, origin line,
   tasting strip) instead of pastel billboards.
3. Saving a shot plays a one-time **crema-fill cup** animation.
4. The dashboard opens with a **time-of-day greeting** — the journal talks to
   you.

## Motion

- Load: 300ms rise + fade, 45ms stagger per element (`rise` utility), disabled
  under `prefers-reduced-motion`.
- Hover: 2px lift + shadow deepen on interactive cards.
- The dial needle settles on a soft spring when nudged.
- Everything under 400ms; nothing loops except the save celebration.

## What was cut (Chanel rule)

- 11 Google font families → 3.
- Giant watermark text behind bean-card headers.
- Squiggly dividers everywhere → one squiggle under the ratio numeral only.
- Dot grid stays but quieter, in crema instead of brown confetti.

## Verification log

- `tsc -b`, ESLint and `vite build` all pass after the sweep.
- Every page screenshotted headlessly against seeded data (small/demo preset via
  `/dev`) in light + dark + 390px mobile, before and after. The screenshots and
  the capture scripts live outside the repo in `/tmp/coffyyy-shots/`.
- Issues caught and fixed during self-review: mobile header collision
  (brand vs nav), stray dark "stripe" bar on the add-a-bean live preview,
  duplicate `onClick` in the quick-pick cards, `BeanHeader` swatch prop type,
  button sizes without radii (`icon` variants), and the unused `Separator`
  import in `SectionTitle`.

## Ideas parked (deliberately not done)

- A "roast spectrum" color scale instead of 10 roast dots.
- Chart tooltips styled as specimen labels.
- Sound on the dial detents (no — it's a coffee app, not a slot machine).
- Migrating `TasteRatingPrompt` sliders to the dial as a radial control
  (worth prototyping before committing; the linear deviation gauge is honest
  and readable, the radial one may be cute-but-worse).

## Revision 2 — after human review (current)

The first pass ("roastery notebook") was too warm, too round, and too colorful.
Review feedback, and the revision it produced:

| Feedback | Change |
| --- | --- |
| "I absolutely HATE those rounded corners" | Radius is 0 everywhere. Only things that are physically round stay round: the dial, slider thumbs, spinner. |
| "cheap hover effect" | The 2px lift + growing shadow is gone. Cards now answer with a border-color shift (`hover-line`); buttons darken in place. Nothing moves on hover. |
| "too colorful, don't like brown as background/primary" | Light is near-white neutral paper, dark is near-black neutral (no espresso cast). Brown/crema demoted to ONE dusty caramel accent: the dial arc + needle, active states, focus ring, nav underline, small labels. CTAs are ink. |
| "random color gradients in the background? bottom right a red one" | Real bugs, not imagination: the roast-level scale on add-a-bean was a teal→yellow→orange→**red** gradient bar (pre-existing), and the grind scale had a brown gradient bar. Roast scale is now a monochrome light→dark ramp; grind scale is a tick ruler. The soft dot-grid (radial-gradient dots) is replaced by a crisp hairline blueprint grid. |
| "the three colored y's, lmao I hate it" | Wordmark is single-color ink again. |

Inspiration that anchored the revision (in `/home/quent/dev/inspi`, the user's
own collection): the Zed landing page (white, hairline grid + ruler ticks, blue
serif italic, square key-cap buttons) and the "Delta" landing (near-black, mono
labels, one muted red accent, outlined mark). The gradient/shader swatch images
in the same folder were reviewed and deliberately *not* applied — the user's
own feedback rules out surface color and soft gradients.

## Revision 3 — the CTA and the view switches (current)

Feedback: the dashboard "Log a brew" ink slab with the caramel arrow read as
"dark maroon with a light brown arrow"; the Library beans/machines toggle was a
card inside a card; the same washed-fill toggle lived on History; Library cards
ballooned when there were only one or two; the Add-Bean card shared the fill
problem and squashed flat when alone in its grid row.

Changes, all inside the existing system (no new tokens, no gradients — the
revision-2 rule stands):

- **The shot key** (dashboard CTA): ink stays the strongest surface, but the
  button now speaks in the app's two voices — a mono eyebrow ("Next shot") over
  Fraunces italic ("Log a brew"). The caramel left the arrow and moved to a 3px
  crema marker on the bottom edge: a stub at rest that pulls across the full
  edge on hover, echoing the crema-fill save celebration and the page-title
  crema markers. Arrow slides, background darkens in place, 1px press. Nothing
  lifts, nothing glows.
- **View switch** (`SegmentedControl`): the header nav's underline ported down —
  mono uppercase labels, hairline crema underline under the active view, half
  underline on hover. No track, no nested boxes. Used on Library
  (beans/machines) and History (by bean/timeline); documented on /buttons.
- **Library grids**: `auto-fit` → `auto-fill` so tracks keep their width when
  the list is short; cards no longer stretch to fill the row.
- **Add-Bean card**: the caramel tint wash on hover is gone — the border
  answers and the ghost card solidifies to paper-raised. On the dashboard it
  gets a min height so it holds its own in the grid.
- The beans empty state no longer nests a dashed Add-Bean card inside the
  dashed empty-state panel (the no-card-in-card rule); it uses the same ink
  button as the other empty states.

## Revision 4 — the CTA gets a pulse (current)

The first CTA rework (eyebrow + crema stub that extended on hover) failed:
at rest the stub read as a rendering glitch — a partial mark — and the hover
payoff was too timid. Lesson learned: a resting state must look complete;
life has to come from motion or state change, not from a static fragment.

The user asked for something alive — an animated inner field, an SVG that runs
until hover, or something better. Five directions were prototyped live on
`/cta-lab` (shot timer, crema pour, cup sketch, standby key, the flip); the
shipped **shot key** combines the two strongest:

- At rest, a crema needle idles along a tick rail on the key's bottom edge —
  the machine is on, counting toward the next shot. This is the app's first
  deliberate ambient loop; the "nothing loops" rule is relaxed for this one
  element only.
- On hover, the key floods with crema rising from the bottom edge, the
  meniscus line leading, and the text yields to ink-on-caramel (dark text on
  caramel in both themes). The needle goes under: the shot has been pulled.
- Click presses the key 1px. `prefers-reduced-motion` parks the needle; the
  flood stays as an instant state change.

Gradients stay out; the flood is a liquid state change, not a surface gradient.
The lab page stays up (dev-only link) so any alternative can swap in by
request.

## Revision 5 — the pulse survives reduced motion (current)

The owner's browser reports `prefers-reduced-motion: reduce` (Windows
"Animation effects" off does this), and the app's blanket reduced-motion rule
was killing every CTA animation: no needle, no flood, instant color swaps.
Diagnosed from exactly that symptom set. The blanket rule stays for the rest
of the app, but the shot key and the `/cta-lab` variants now opt back in
explicitly — the owner's call, recorded here on purpose.

While in there the ambient layer got louder, per the same feedback:

- The needle sweeps right, holds at the end like a settling gauge, and sweeps
  back (7s loop) instead of ping-ponging.
- The espresso sheen from the lab's pour variant now drifts across the shot
  key in both rest and flooded states.
- The flood eases with `easeOutCubic` over 600ms so the liquid front is
  readable instead of snapping visually complete in the first 200ms.

## Revision 6 — expressive over literal (current)

The instrument-literalism ran its course: the owner's verdict on the needle /
flood / crema family was "trying too hard to fit the design system," and
"everything coffee-inspired gets boring fast." New direction, owner-specified:

- The CTA's life is **ambient, not hover-gated**: a layer of blurred color
  spots drifts forever behind the label, each spot on its own clock (17s /
  21s / 23s / 29s alternate), so the composition never repeats. Gradients are
  officially allowed in this one place — blurred, slow, multi-spot.
- The one coffee nod that survives: a line-drawn cup with two steam wisps
  rising and dissolving out of phase (`SteamCup`).
- **No warm dark fills.** Owner's words: dark maroon reads like poop. The
  morning-haze key is cream with latte amber leading, foam rose answering,
  matcha sage low, cream melting the seams. The night variant uses a *cool*
  charcoal (hue 260) — never the warm ink slab.
- Hover only warms the haze (saturate + brightness) and slides the arrow; the
  eyebrow is gone — one confident line of Fraunces italic.
- Dark mode adapts for free via tokens; the night variant keeps fixed colors.
  The reduced-motion carve-out now covers the haze and steam, verified under
  emulated `prefers-reduced-motion: reduce` (spot transforms and steam
  opacity both change over time).

The lab keeps the three takes (morning haze / night haze / latte art) at
`/cta-lab`; the needle, flood, sketch, standby, and flip variants were
deleted with their CSS.

## Revision 7 — back to the sources (current)

The pastel three-spot haze failed on color: amber + green + rose on one
surface is a fruit salad, and the owner killed it. Two standing rules came
out of that: **one hue family per surface, ever** (the latte amber/beige is
the house warm and stays), and **lab buttons must be vastly different from
each other** — one idea per button, no merging concepts into variants.

The rework went back to the owner's inspiration folder (`/home/quent/dev/inspi`)
— the same well the revision-1 identity pass drank from — and each button now
traces to a specific source:

| Button | Source | Mechanism |
| --- | --- | --- |
| **0 · The censer** (ships on Home) | The golden censer with luminous vapor in a cold cavern (the owner's game screenshot) | Cold near-black key (hue 250, never warm-brown); a gold line-drawn cup, a breathing warm halo behind it, glowing vapor, embers drifting up |
| **1 · Ember rise** | Wonder Shader_9 (vertical ember streaks, burnt orange → cream) | Tall blurred amber-only heat columns rising forever, out of phase; ink text |
| **2 · Live word** | G2 DEFEAT poster (smoke inside the letterforms) | Calm paper face; an amber light sweeps through the word itself (`background-clip: text`) |
| **3 · Obsidian glow** | Delta's near-black + the owner's animated-gradient idea | Cool slate; amber gradient sweeps inside forever; brightens on hover, flashes on click |
| **4 · Amber beam** | Zed's key-cap solidity | Cream face; a light runs the perimeter via an animated conic mask |

All five loop infinitely and are carved back into motion under the owner's
reduced-motion OS (verified by probing computed styles over time under
emulated `prefers-reduced-motion: reduce`). The pastel haze, night, and vivid
variants were deleted.

## Revision 8 — round two on the source-mapped set (current)

Per-button verdicts and what changed:

- **The censer** (owner's favorite) — dark mode clashed ("looks almost dark
  blue"): the cold hue-250 base fought the warm dark theme. Dark mode now
  uses a deep warm espresso (`oklch(0.165 0.024 48)`) — the one sanctioned
  warm-dark — with a warm gold border; light theme keeps the cold cavern.
  The vapor pushed toward the thing the owner actually loved in the shot
  (Clair-Obscur, not Dark Souls — corrected): brighter white-gold strokes,
  double drop-shadow bloom, stronger halo.
- **Ember rise → the hearth** — columns were boring. Owner's suggestion
  adopted verbatim: blurred round amber circles beneath the label, each on a
  slow repeated bob (4.6–6.4s, staggered phases). A film-grain overlay
  (SVG turbulence tile jittering in `steps()`) nods to the Wonder swatches'
  dithered texture.
- **Live word** — the shimmer was invisible until you caught it, and it's a
  link treatment, not a button. Now a bare link in the lab (no frame), with a
  dark-mode gradient so the words shimmer on dark too.
- **Obsidian glow** — killed; the slate+amber pairing didn't work for the
  owner. Replaced by **Calmer**: Arc's aubergine panel with lavender petals
  breathing beneath a cream serif label.
- **Amber beam** — killed; broken under the owner's browser and the concept
  itself rejected.

Owner's taxonomy for using the folder (recorded): sometimes it's the color
(G2 poster combo, Arc's aubergine), sometimes the vibe/graphics (Zed, Delta,
the esports schedule), sometimes the composition (the Clair-Obscur
white-glow-on-dark). And the Wonder frames: small surfaces, complex color,
dithering/grain.

## Revision 9 — blend in, don't shout (current)

The round-two verdict made the meta-lesson explicit: every attempt so far was
a loud object on a quiet page, and the page always wins. New standing rule:
**CTA faces use the app's own tokens (paper / ink / line / crema) — no
hardcoded off-palette surfaces — and their character comes from whisper-level
ambient motion.**

- **The censer, softened on all accounts**: the fixed cold-black and espresso
  bases are gone; the face is `paper-raised` in both themes, so it is a
  sibling of every other card. The cup is drawn in the house crema token, the
  halo is a 13%-alpha breath (20% in dark), steam is quiet ink-soft with a
  faint glow only in dark. The cute coffee animation survives untouched.
- **The hearth, desaturated**: circle chroma cut by more than half (dusty
  latte tones, `oklch(0.8–0.92 0.03–0.055 68–82)`); the bob and the grain
  stay. The wash now whispers.
- **Live word, tamed into the app's link voice**: at rest it is literally the
  small grey mono uppercase link the app already has; on hover, one amber
  light passes through the letters once (`background-position` sweep, 0.75s).
  The always-on display shimmer was retired — it belongs on hover, not on
  permanent display. The sweep's endpoints were tuned so the band actually
  crosses the letters mid-transition (the first attempt blew past in 60ms).
- **Calmer, reinterpreted as Dusk**: the Arc aubergine was goofing as a slab.
  Its essence — cool, calm, low light — survives as a faint violet bloom
  (12–16% alpha) breathing on a paper key. The color as an accent wash, not
  a surface.

## Revision 10 — the instrument keys (current)

Dusk and the hearth are dead (the owner's call — the ideas never belonged to
this site). The censer ships on the dashboard as-is. The live word's two bugs
are fixed: the faint left-edge light at rest was a gradient-stop artifact
(the amber ramp bled into the rest window), and the sweep never ran on the
owner's machine because the link wasn't in the reduced-motion carve-out.

The everyday buttons get the upgrade the owner asked for — **"one big idea
distilled in many children"**, taken from Zed and Delta: **every button is a
key on the instrument.**

1. **Press**: every key sinks 1px while held (`active:translate-y-px` in the
   cva base) — uniform tactile physics across all fourteen variants.
2. **Sheen**: filled keys (`default`, `ink`) answer hover with a single light
   pass across the face (`.key-sweep`, white at 14%, 0.6s, once per hover).
3. **Plate**: the ink key wears Delta's faint diagonal texture
   (`.key-plate`, `currentColor` at 9% so it adapts to both themes).
4. **Hint**: primary form keys ("Save the shot/bean/equipment") carry Zed's
   key-cap chip — `.key-hint` with ↵, honest, since the forms submit on
   Enter.

Quiet keys (outline, option, chips, add) keep their border-answer hover and
gain only the press — restraint where the eye already has work to do. The
styleguide's Buttons section documents the set; the CTA lab is down to the
two survivors (censer, live word).

## Revision 11 — the language, not the props (current)

The key-cap props (chips, plate, sheen) missed the point and are gone. The
owner's actual brief: the design system itself — straight lines, sharp
corners, hairlines — is the source, and its existing motion idea is **lines
that draw themselves** (the nav's scaling crema underline). The buttons now
speak it, one mechanism per family, no blind copies:

| Variant | Mechanism | Reads as |
| --- | --- | --- |
| `default` | inner 1px frame draws left→right (`clip-path` reveal) | the key engages |
| `ink` | a ruler of measure ticks rises along the bottom edge | the measure appears |
| `destructive` | two half-frames converge from both edges | arming |
| `outline` | an SVG hairline retraces the full perimeter (`pathLength`-normalized, injected by `Button` itself) | the border redraws |
| `outline-dashed` | the dashes march while hovered (SVG dashoffset loop) | the slot is alive |
| `add` | four corner marks settle in | place here |
| `secondary`, `ghost`, `steps`, `chips`, `option` | the crema underline draws along the bottom | quiet keys join the nav's stroke |
| `subtle-destructive` | the same underline in destructive red | the danger edge |
| log-form tabs (roast, grind) | the bottom line draws on hover, stays drawn while true (`opt-key`) | selection is a stroke, not a pop |
| log-form pills (time, flow) | the crema frame draws around the chip when true (`opt-frame`) | marked true |

Everything presses 1px while held. All of it is `clip-path`/`transform`/
`stroke-dashoffset` state changes, so reduced motion degrades to instant
states (the marching dashes freeze — nothing loops at rest). Engineering
note: Lightning CSS wraps `color-mix(... var(...))` inside gradients in a
nested `@supports` fallback that Chromium drops, which silently deleted the
ruler's ticks — gradients with var-ed color-mix now use explicit oklch +
`.dark` overrides instead (see `.key-ruler`).
