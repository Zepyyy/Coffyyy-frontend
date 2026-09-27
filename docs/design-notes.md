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
