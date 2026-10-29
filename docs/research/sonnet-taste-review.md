# Taste review · art direction · 2026-10-29

Independent read. Challenges `docs/research/ui-art-direction.md` where noted. All proposals **provisional** — taste calls to test on a phone, not specs. No app files touched.

## Verdict

The identity is right and under-spent. Square corners, hairlines, Fraunces italic, one caramel, the censer: keep all. The problem is **scale and count, not style**:

- Nothing on any screen is big. Largest type is 36–48px; everything else is 10–14px. Hierarchy comes from borders, so every box shouts equally.
- Motion is all micro (1px underlines, hover-only). On a phone, where the owner actually brews, the lines never draw.
- The one loved object (censer) is a 36px cup in a 70px bordered box. In the fresh Home screenshot it barely registers.

Fix = fewer boxes, one large gesture per screen, same line language. Not more effects, not more props.

## What I looked at / caveats

- Read `AGENTS.md`, `CONTEXT.md`, design-notes rev 1–12, the existing audit, `index.css`, `Home.tsx`, `BottomNav.tsx`, `App.tsx`, `Dial.tsx`, `SteamCup.tsx`, `Brew.tsx` (setup + measure + save), `History.tsx`, `BeanChapter.tsx`, `BrewLedgerRow.tsx`, `SegmentedControl.tsx`, `CtaLab.tsx`.
- Viewed `/tmp/coffyyy-audit-{home,brew,history}.png` (390px, full-page). **Fixed bottom nav is painted mid-page in all three (y≈780 Home/History, ≈690 Brew at 346-scale) — capture artifact, not a layout bug.** Real concern is only what it covers, handled by `pb-28`.
- No live browser run. Sizes below are measured off the screenshots; treat ±10%.

## Hierarchy and density critique

### Phone content width is being eaten (concrete, not in prior audit)

- **Brew**: `main px-4` (16) + `mx-6` (24) + card `p-6` (24) = **64px per side**. Usable width ≈ **262 of 390px (67%)**. This is the real reason the dials stack vertically and the bean name clips ("Moonwalk" loses its last letter against the swatch in the 2-up card). Dropping the card chrome <640px gives 358px — the dose/ratio/yield row fits in one line.
- **Home**: 16+24 = 40/side → 310px. Acceptable, but the CTA box is only 70px tall and reads as a text field.
- **History**: ~341px. Best of the three.

### Per screen (390×~844 first viewport)

**Home** (page ≈1409px)
- Greeting + censer box ≈ 0–280. Fine, but CTA and the tasting card below it share the same border/weight → two equal rectangles.
- Tasting card = y 373–1025 ≈ **650px, 46% of the page**, mounted *above* beans. Beans never reach the first viewport. Agree with prior audit: collapse it.
- Eyebrow count in that card alone: How was that cup / Overall rating / Taste axis / Strength axis + 3 axis end-labels + 2 helper lines. Eight small mono lines for three controls.

**Brew** (page ≈2252px ≈ 2.7 viewports)
- Setup (brewer, bean, recipe, "your settings", grind) ≈ y 160–1040 ≈ **40% of the page**, and both brewer and bean are already resolved (auto-picked) — catalogs still shown in full.
- Selected cards use a tint fill **plus** crema border plus ring plus ink check (`QuickMachineCard.tsx:20`). That is the loudest color on the page, louder than the CTA, and contradicts rev 11 ("selection is a stroke, not a pop").
- Dose dial → ratio → yield dial stacks ≈ **550px (24%)**: three centers in a column. The ratio numeral is the strongest type moment on the page but sits *between* two dials like an afterthought, and it's **Fraunces bold 700** while the rest of the display voice is italic regular. Off-voice.
- "SAVE THE SHOT": full-width ink bar, **bold uppercase sans**. The only uppercase-sans label in the app; everything else is Fraunces italic (actions) or mono (data).

**History** (page ≈1005px shown)
- Before the first brew: stat trio box, "one to remember" box, "Next shot" ink-bordered box, filter box (with the view switch nested inside) = **four stacked boxes ≈ 420px**. First brew row is below the fold on a 390×844.
- "The one to remember" is a `truncate`d 14px mono line: the ratio and time — the stuff you'd repeat — are exactly what the ellipsis eats (`History.tsx:132`).
- With one bean, "one to remember" and the chapter's "Repeat this" strip say the same thing twice.
- "Next shot · Log a brew" is a *fourth* CTA dialect (ink border, eyebrow, Coffee icon) next to the censer, the nav disc and the ink key. Remove; the nav already has it.
- Filter box is the card-in-card the notes banned in rev 3; `rounded-lg` on the inputs is zero only because tokens flatten it.

### System-level

1. **Eyebrow inflation.** Nearly every element carries a mono caps label. Prior audit says bump to 12px. That makes everything louder. Better: **delete eyebrows where the control self-labels** (stars, axis sliders with end labels, dials with a unit). Keep them for sections only. Then raise survivors to 11–12px.
2. **Box inflation.** Prior audit: "remove one nesting level." Go further on phone: **no boxes at all except an independent object** (a brew entry, a bean). Everything else = full-bleed hairline rules. The blueprint grid already provides the paper; boxes re-paint paper on paper.
3. **Round things that aren't physical.** `rounded-full` is *not* tokenized to zero (only `rounded-sm…4xl` are). The bottom-nav disc (`BottomNav.tsx:64`) renders as a solid caramel circle in every screenshot — the only filled warm round object in the app, on every screen. The prior audit says "current circular-looking control tokens resolve to zero radius… inspect before changing" — inspection says the disc is a real circle. The dial is the only thing allowed to be round; this isn't a dial.

### Do-regardless cleanups (cheap, no taste risk)

- Bottom nav centre: replace the disc with a **square 44px key**, 1px `ink` border, `+` drawn as two strokes; crema line draws around it on `:active`. Add one shared crema underline that **slides** between tabs on route change (single element, 250ms) — the header's line, made one continuous gesture. Labels 11px.
- Brew selected cards: drop tint + ring + check; selected = crema hairline drawn along the bottom edge (`opt-key`). One cue.
- Ratio numeral: Fraunces italic, weight 400–500.
- Save key label: Fraunces italic, sentence case.
- History: delete "Next shot" box; stat trio → one mono line.

## Three proposals

### 1 · The plume — Home becomes one composition

**What.** Greeting, steam and CTA read as a single poster instead of heading + box. The censer's steam is scaled out of its 36px cup into a tall, slow, line-drawn plume that rises into the empty space beside the greeting. CTA loses its frame.

**Where.** `Home.tsx:175–208` (hero section), new `Plume` SVG next to `SteamCup`, CSS under the existing `.censer-key` block in `index.css` (so the owner's reduced-motion carve-out at `index.css:~772` applies without a new exception).

**How.**
- Greeting: Fraunces italic, `clamp(2.75rem, 14vw, 4rem)`, `leading-[0.95]`, `text-balance`. "Good afternoon." is the longest string; let it break to two lines on narrow phones. A two-line display greeting is a feature.
- `dailyLine` stays 14px sans, left-aligned, short — leaves ~140px of empty right margin on the same rows. That's where the plume lives.
- CTA = full-bleed row (`-mx-10` to cancel `px-4 + px-6`), `border-y border-line-strong`, 80px tall, no fill, no box. Left: "Log a brew" Fraunces italic 24px + small arrow. Right: `SteamCup` at 56px, crema.
- Plume: absolutely positioned SVG, `viewBox 0 0 64 140`, anchored over the cup, rising ~120–140px *out of the row* into the dailyLine zone. Three S-curve paths (amplitude ≤12px, different lengths), `pathLength=1`, 1px stroke, `ink-soft` at ~50% (dark theme: the existing warm `oklch(0.8 0.07 72)` + the faint drop-shadow already used for `.dark .censer-key .steam`).
- Two layers per wisp: a **ghost trace** (full path, ~12% opacity, static — so the silhouette always reads and a screenshot never looks half-drawn; this is the rev-4 lesson, "a resting state must look complete") and a **travelling segment** (`stroke-dasharray: .38 2`, `stroke-dashoffset` .38 → −1). The line draws itself upward, head leading, tail erasing. Periods 7s / 9s / 11s, out of phase, `ease-in-out`. Slower than the cup's own 3–4s wisps; drop those (`SteamCup` gets a `steam={false}` prop) so there aren't two steam speeds.
- Top fade via `mask-image: linear-gradient(to top, #000 45%, transparent)` — an alpha mask on strokes, not a visible gradient surface.
- Touch feedback (the thing hover-only lines don't give a phone): on `:active` the existing crema hairline (`key-line` mechanism) draws along the row's bottom border in 300ms.
- Keep halo + motes if they survive the larger cup; if the plume reads, motes may be redundant — judge on device.

**Why it fits.** Same cup, same wisp shape, same crema, same "line that draws itself" idea the nav and buttons already use. No new surface, no off-palette color, no prop. It just stops hiding the owner's favorite thing.

**Risks.** (a) Thin looping squiggles could read as decoration — fallback: two wisps, shorter. (b) Plume near the headline's second line may touch glyphs on 320px — keep plume below the baseline of line two, or hide it <340px. (c) The rev-12 lesson ("random measuring strip in the middle of the page") — this is attached to the cup, not floating; if it still feels free-standing, shrink it.

### 2 · The measure row — Brew in one thumb-length

**What.** Brew drops from 2.7 screens to ~1.8 without losing the dial. (a) No card chrome on phone. (b) Resolved setup collapses to two ruled lines. (c) Dose · ratio · yield sit on one row. (d) The line between dose and yield redraws when the ratio changes.

**Where.** `Brew.tsx` section wrappers (`mx-6`, `p-6`, ~L640), steps 01/02 (~L667–760), measure block (~L874–957); `Dial.tsx` (`StepButton`, `size-32`); `QuickMachineCard`/bean card selected state.

**How.**
- **Width.** `<sm`: remove `mx-6`, section `border p-6` → `border-0 p-0`. Content 358px. Desktop unchanged.
- **Setup collapse.** When brewer and bean are both resolved, each step renders as one 56px row: `01  Kitchen · Espresso   Change`. Step number mono crema, name Fraunces italic 20px, "Change" = the existing `.word-link` voice, right. Tapping expands the catalog in place with a `clip-path` draw (same easing as `opt-frame`). Brewer change still locks method per `CONTEXT.md`.
- **Measure row.** `grid-cols-[1fr_auto_1fr]`: dial · ratio · dial.
  - Dials ≈104px. `Dial.tsx` hard-codes pixel offsets (tick `translateY(-40px)`, collar `-60px`), so scale the finished 128px knob in a wrapper (`transform: scale(.81)`, fixed 104px box) instead of re-deriving geometry.
  - **Steppers move under each dial** as one 104px hairline key split in two (`−` | `+`), each half 52×44. Meets the 44px target, kills the 28px side buttons that forced the stacked layout. Press-and-hold repeat stays.
  - Centre column ≈126px: ratio numeral Fraunces italic ~40px; below it a 1px crema connector line with a small arrowhead pointing dose → yield. Ratio presets (1:1.5 · 1:2 · 1:2.5) as a text row *under the whole row*, `opt-key` underline for the active one — not boxed chips.
  - **Redraw on change**: connector `stroke-dashoffset` 1 → 0 over ~320ms, keyed on `ratioValue`. At rest it's fully drawn. Conveys "relation recomputed" without animating digits through false values (prior audit's concern, correctly).
- **Save moment.** On success, `SteamCup` (and the Plume from #1, ~96px) **draws itself once** (cup outline `stroke-dashoffset`, ~900ms), then the steam starts. One motif, reused; nothing new invented, consistent with the rev-12 lesson. State is saved immediately; animation never gates "Done".

**Why it fits.** Keeps the dial as the signature (prior audit's option B flirts with replacing it with stacked rows — I'd resist, see objection 2) while removing the structural reasons it's costly on phones. Every change reduces count, not adds props.

**Risks.** Scaling the dial affects touch-target math: test drag vs. page-scroll starting beside it (`touch-none` on the knob). Collapse needs a rule for "resolved" (auto-picked vs. user-picked) so users still see what was auto-chosen — the collapsed row must show it.

### 3 · The ledger with one figure — History/Bean chapters

**What.** History's top four boxes become one large figure and two ruled lines. Chapters lose their boxed header; rows get a fixed grid.

**Where.** `History.tsx:112–150` (stats/one-to-remember/next shot), `:320` (filter box), `BeanChapter.tsx:44–95`, `BrewLedgerRow.tsx:117–170`.

**How.**
- **The figure.** "The one to remember" becomes: the grind number in Fraunces light italic ~88px, mono caption beneath (`18 → 36 g · 1:2 · 28s · 5★`, wrapping, never truncating), bean name in Fraunces italic, ink "Repeat" key below. One object, ~190px, the first thing you see. The question this page answers — "what worked, how do I repeat it" — gets typographic dominance. Hide the figure when it merely duplicates a single chapter's Repeat strip (≤1 bean, ≤1 rated brew).
- **Stats.** Trio box → one mono line under the title: `2 brews · 1 bean · avg 4.0★`.
- **Delete** the "Next shot" box.
- **Filters.** No card. View switch (existing `SegmentedControl`) on its own line; search = single full-width input with only a bottom hairline (matches the nav/segmented language); rating filter = a word-link row. Total ≈ 120px vs ≈ 175px now, zero boxes.
- **Chapters.** Header = bean name Fraunces italic + mono count, hairline rule below, no `paper-sunken` fill band. The "Repeat this" strip loses the crema-tint fill: it becomes a rule with a crema 2px left edge (`border-l-2 border-crema pl-3`, already used in Brew notices and recipe rows).
- **Rows.** CSS grid, three fixed lines on phone: `date · method` / `grind(large) · ratio · time` / `stars · taste tag`. Grind is the only large number. Kills the incidental flex-wrap.
- **Optional, data-bearing (≥3 brews of one bean+method only):** a single stepped polyline of grind across attempts in each chapter header, drawing itself once on first view, ending on a crema node at the best-rated brew — the dial-in trajectory. It's the one piece of expressive motion that is also *information*. Skip entirely for <3 brews so there's never a degenerate two-point line. (Risk: could be the "random measuring strip" again if it reads as ornament; only ship if the owner sees it with real data.)

**Why it fits.** Same hairlines, same Fraunces, same crema edge; the box count drops from ~6 to ~1 on first view. Bolder purely through scale of one number.

## Three objections to `ui-art-direction.md`

**1. The "signature" isn't one.** The recommended signature — the attempt handoff, a 12px source strip with "was 18g" annotations and a 180–240ms line draw — is good *function* and a poor *visual risk*. The doc says "the visual risk belongs in that handoff" and then specifies the quietest element in the product. Its premise, "more effects alone would amplify the problem", misdiagnoses: the app's effects are all 1px and hover-gated, so on phones there are effectively none. What's missing is **one large gesture per screen** (type scale, the plume, a drawn cup), not restraint. Keep the handoff as UX; don't call it the identity.

**2. The Dial section contains a factual miss and a direction I'd resist.**
- Doc says "direct numeric entry, explicit edit affordance" as a fix. The cap already is a typeable `<input>` (`Dial.tsx:306`) and the helper line says "drag, scroll or type". The actual defect is different: an `<input>` nested inside a `<button>` is invalid interactive nesting (a11y, focus order) — worth fixing, but it's not "add typing".
- Option B/"stacked measurement rows, not tiny dual dials" would trade the app's one earned signature (rev 1) for a spreadsheet. The width finding above shows the dials only *felt* big because the card ate 128px. Put dials side-by-side at ~104px with 44px steppers; keep the object.

**3. "Censer remains the *sole* ambient motif" + "scoped" under-uses it.** I agree on one motif; I disagree that scope means small. As shipped the censer's steam is ~5px tall wisps in a 36px glyph, the halo is 13% alpha clipped by `overflow-hidden` — in the fresh screenshot you cannot see it. "Sole motif" should mean *the same steam-line physics reappears* (Home plume, save moment, empty states, maybe the sync "connected" indicator) at larger scale, not that it stays a footnote. Related: the doc's type advice (bump 9–10px labels to 12–14px) is right for legibility but treats labels as the lever; deleting redundant eyebrows matters more than resizing them (see system-level #1).

Smaller notes: (a) "reduce tracking before size" — fine. (b) Retiring button variants is hygiene, not design; skip until a touch-state pass (press = draw, selected = drawn) is decided. (c) "Optional in-app motion preference" — I'd leave it; the owner's carve-out is deliberate and recorded, and a setting invites relitigating it.

## Recommended first prototype

**The plume (proposal 1), on `/cta-lab`, not on Home.**

- Smallest surface: one SVG component, ~40 lines CSS, one `steam` prop. Reversible; the lab already exists for exactly this.
- Tests the owner's taste on the thing they care about most (the censer) before any structural work.
- Gate: view on a real phone at 390×844, light + dark, under the owner's OS reduced-motion. Questions: does the plume read as the same censer, bigger, or as a squiggle? Does the row without a frame still look like a button?
- If it passes: move into `Home.tsx`, then do proposal 2's width + setup collapse (highest functional value) next, then 3.
- Cheap same-day bundle alongside it: the do-regardless cleanups (nav key, one-cue selection, ratio italic, save-key voice, History box deletions).

## Preserve

- Square geometry, near-white/near-black paper tokens, one caramel, `rise` entrance.
- Fraunces italic as the human voice; Spline mono for data; Instrument Sans for body. Three faces.
- The censer and `SteamCup` — the one coffee visual that survived every review. Extend it, don't replace it.
- Lines that draw themselves (`key-line`, `opt-key`, `opt-frame`, `seg-underline`, header nav underline). All new motion should be a stroke, a clip-path reveal, or a dashoffset.
- The dial as the single round object.
- Honest "Not rated" states; Balanced one-tap; no invented data.
- The reduced-motion carve-out for the censer family — new plume CSS nests under `.censer-key` / `.steam-cup` so it inherits the decision without a new exception.
- Owner's standing rules: no rounded cards, no hover lift, one hue family per surface, no warm dark slabs, nothing gratuitous.

## Considered and parked

- **Inked-grid spine** (a crema line laid on one of the 32px blueprint lines, filling as Brew steps resolve): conceptually lovely, but it's the nearest relative of the killed "measuring strip". Park unless the plume lands well.
- **Replacing the dial with direct-entry rows**: no (objection 2).
- **Flying-card handoff on Repeat**: agree with prior audit, no.

## Unresolved questions

- Plume in dark mode: keep warm drop-shadow glow, or ink-only?
- OK to drop card chrome on phone Brew (grid shows through inputs)?
- History: hide the figure when only one bean, or always show?
- Grind-trajectory line: want to see it with real data first, or skip?
- Bottom-nav centre: square outline key ok, or prefer text-only "Log" in Fraunces italic?
- Is auto-resolved brewer/bean collapse ok, or must users always see catalogs on first load?
