# Coffyyy UI / mobile investigation

2026-10-29 · Research snapshot before implementation. See [delivery record](../ui-mobile-delivery.md) for the integrated changes and current verification.

## Recommendation

Keep the identity. Redesign the composition of the everyday tasks. Coffyyy has unusually considered individual controls, but the screens do not yet feel as considered as the controls. On phones, the repeated setup cards, competing headings, small metadata and vertically separated measurements turn a simple capture task into a long document.

My recommended direction is **a calm working surface with expressive transitions between attempts**. Preserve the square geometry, Fraunces / Instrument Sans / Spline Sans Mono, neutral paper and ink, caramel selection strokes, the censer and the existing button language. Make the next useful action prominent, keep related values together, and make changes legible. Spend the creative budget on that continuity rather than another button redesign.

Mobile stability is the prerequisite. A lovely control feels broken if the page slides sideways or a scroll changes its value.

## What this investigation adds

- Read both attached threads, including their final reports; inspected their actual working-tree / branch state.
- Three independent investigations: visual direction, mobile behavior, and workflows / interaction / accessibility. A fourth, Sonnet 5.5, independently challenges the visual recommendations.
- Reviewed all twelve revisions of `docs/design-notes.md`, domain terminology and sync ADRs. Earlier rejected designs are constraints, not fresh ideas to rediscover.
- Inspected fresh, populated mobile captures of Home, Log a brew and History, rather than relying on the old promotional screenshots.
- Mobile audit uses isolated local data and headless Chromium. Its report distinguishes reproduced failures, source risks, proposals and physical-device checks still needed.

Supporting evidence:

- [Mobile stability and reproduction](mobile-stability.md)
- [Visual audit and three directions](ui-art-direction.md)
- [Workflows, accessibility and motion](interaction-design.md)
- [Sonnet's independent taste critique](sonnet-taste-review.md)

Fresh 390px captures: [Home](screenshots/coffyyy-audit-home.png), [populated brew form](screenshots/coffyyy-audit-brew.png), [History](screenshots/coffyyy-audit-history.png), [Bean detail](screenshots/coffyyy-audit-bean.png). Full-page captures include a fixed navigation bar at the capture scroll position; judge actual obstruction during interaction, not from that compositing alone. These are seeded research fixtures, not production user data.

These are research notes. Any adopted product specification belongs in GitHub Issues; no issues, PRs or messages to other threads were published during this investigation.

## Prior work: retain, but verify integration

The UX thread left substantial local, uncommitted changes: Repeat, recipe-linked History, searchable notes / Recipes, URL filter persistence, keyboard filters and honest unrated tasting fields. Its final report records build/lint/160 tests and browser checks. Those results are prior evidence, not checks rerun by this investigation. See `docs/ux-review.md`.

The mobile thread left a separate `mobile-polish` branch. Its useful changes include viewport metadata, larger header targets, dynamic viewport height and gutter reductions. It is not integrated into this working tree. Its rendered checks covered two empty states, not the populated form or Bean detail. Review individual changes; do not assume that branch resolves mobile usability.

One important correction to prior validation: comparing document `scrollWidth` to `innerWidth` can miss mobile layout overflow because the layout viewport itself can expand. Use the configured viewport and document `clientWidth`, and test horizontal scroll offsets during interaction. The old UX script also omitted Bean detail from its overflow route list.

## Confirmed mobile findings

**Bean detail overflows.** At configured widths 320, 360, 390 and 430px, the populated Bean detail page measured 512px wide. The mobile audit localized this to the chart grid in `src/components/home/BestBrewPanel.tsx`. Applying `min-width: 0` to its direct chart children in the browser restored the expected document width at 320px. This is a reproduced layout defect and a demonstrated remedy, not proof that it explains every movement on every page.

**The proposed small-input fix is insufficient.** The mobile branch places a 16px input rule in the base cascade layer. Existing utility-layer font classes still win. The audit tested that rule and found a custom grind field remained 14px. Fix the controls at the appropriate utility/component level, then verify computed sizes. Actual iOS focus zoom still needs device validation.

**Dial alternatives fail keyboard activation.** The +/- controls respond through pointer handlers; Enter and Space do not nudge them. Retain hold-to-repeat, but give normal click / keyboard activation exactly one increment. Do not double-count pointer clicks when adding that path. The dial also needs a semantic review: an editable input is nested inside its outer button.

**Several mechanisms remain separate.** Horizontal overflow, browser overscroll, focus zoom, virtual-keyboard viewport changes, scroll interception and layout reflow are different problems. Test and record each. A global `overflow-x: hidden` or disabling all gestures would conceal symptoms and can introduce accessibility regressions.

The detailed mobile report and executable probe carry exact findings and limits. No physical iPhone test was performed here.

Parent recheck: `node docs/research/mobile-probe.mjs` reproduced the same seven failure messages (four overflowing widths, two keyboard activations, one ineffective font guard), exit 1. This remains a deliberately failing baseline for subsequent implementation. `node --check` passes; no application tests rerun for these documentation-only changes. The temporary server and browser were stopped after verification.

## What the fresh screens say

### Home: the prompt has become the page

The current 390px capture puts the full tasting form ahead of the bean shelf. A helpful follow-up occupies much of the screen and makes the dashboard feel like outstanding paperwork. The greeting and censer are already successful; more atmosphere above the fold would deepen the problem.

Proposed composition: greeting / Log a brew, compact last-attempt continuation, a named tasting row, then beans. Expand tasting in place when requested. Keep dismissed / partial / unrated semantics explicit; collapsing the form must not mark an entry rated. Do not silently auto-select a bean or remove the ability to deselect it.

### Log a brew: preserve the dial, stop making every visit a setup visit

The populated form shows Brewer and bean picker cards, Recipe selection, past settings, a grind grid, dose dial, ratio, yield dial and outcomes in one tall column. Nested side padding makes the usable area narrower still. The two measurements that explain each other are far apart.

Proposed composition: compact, editable Brewer / bean / method summary; connected dose / ratio / yield group; actual time and flow; optional notes; Save. First-use prerequisites stay visible. Selecting Change reopens the relevant picker without clearing compatible values. This is progressive disclosure in one page, not a mandatory Next / Back wizard.

On phones, test two compositions after reclaiming the wasted gutters: paired dials with full-size steppers versus readable numeric rows with an expanded dial editor. The dial already supports typing; this proposal concerns discoverability, valid markup and composition, not adding an absent capability. Do not replace a crafted control before testing whether better surrounding layout makes it comfortable.

### History: show the remembered thing sooner

In the fresh mobile capture, title, summary totals, highlighted brew, another Log a brew action, controls and result count all precede the ordinary records. The individual pieces are useful, but together they delay the purpose of History.

Proposed composition: title and compact count, search / filters / view, then records. Keep a highlighted actual attempt only if it earns its position; avoid another large generic capture CTA when bottom navigation already offers it. Use a stable mobile row structure: identity/date, settings, then rating/taste. No tiny horizontal desktop table.

### Library and Bean: catalog versus evidence

Library cards should help identify a bean; Bean detail should carry its taxonomy and brewing evidence. Reduce repeated labels and nested panels before inventing a new card skin. On Bean detail, align parameter rows once rather than placing Average and Best inside repeated mini-cards.

Keep aggregate and individual records distinct. An average of best-rated brews can describe settings that no actual brew used. Label the population and sample count; attach Repeat only to an actual attempt. Respect method differences and missing fields.

## Creative direction: a few moments worth owning

These are proposals, not accepted requirements. Each needs an inexpensive interaction study before production work.

1. **A continuous attempt.** Repeating a brew carries its source identity into a compact strip above the form. Changed fields show a quiet “was …” annotation; unchanged values stay quiet. On save, the composition becomes a dated record. Use line/opacity continuity, not a flying card or a page-wide slide. The memorable part is recognizing your previous decision, not a new coffee illustration.
2. **One composed measurement.** Dose and yield sit around their ratio as a single typographic object. Editing either updates the real ratio immediately; a short selection stroke moves between the active fields while the overall footprint stays fixed. No rolling numbers through invented intermediate measurements. Keep method-specific behavior explicit.
3. **Difference as a visual language.** A later two-attempt view highlights changed values with the existing caramel stroke and leaves shared values aligned and quiet. Phone layout compares each parameter within one row. Differing Brewers and missing values remain visible. No “this grind improved your coffee” causal claim.
4. **An expansion that feels attached.** Taste notes unfold from the named saved brew; a selected History row opens its details directly underneath. Keep focus and the trigger stable. The effect should feel like revealing the next part of the same object, rather than inserting another unrelated card or replaying the page entrance.
5. **A settled save.** Storage success appears immediately, then the existing SteamCup supplies the familiar quiet life. Keep a short settings receipt and useful actions in the same footprint. Animation never delays Done, another brew or the announcement of success.

Choose one signature transition first. Five simultaneous new effects would compete with the censer and obscure whether the composition improved.

## Where the reviewers disagree — my judgment

Sonnet's strongest objection is fair: a small source strip is useful continuity, but calling it a visual signature overstates its impact. The current system can be quiet **and** have stronger scale. Keep the attempt handoff as interaction craft; investigate a bolder focal point separately.

- **Larger censer / plume:** worthwhile taste experiment in the existing CTA lab. Enlarge the familiar steam-line motion and try a ruled, less boxed CTA composition; do not introduce a different motif. Test longest greeting, 320px width, both themes and the actual phone. Do not copy the proposed negative-margin recipe literally: its gutter cancellation depends on the old layout. Do not automatically expand the reduced-motion exception to the new plume. Verdict: highest-interest visual experiment, not an approved Home replacement.
- **Paired dials:** Sonnet's compact 104px dial with full-size split steppers is a credible alternative to numeric rows. However its proposed 104 + 126 + 104px composition already requires 334px before gaps; it cannot fit a 288px content area on a 320px phone. Responsive variants must preserve touch targets, typed-entry size and legible units. Also, current stacking is explicitly controlled by a breakpoint; wasted width compounds it, rather than being its sole cause. Verdict: compare both layouts with real interaction; preserve the dial if the paired treatment passes.
- **One giant History figure:** 88px grind type would create hierarchy, but grinder settings are not comparable across Brewers, and another 190px highlight can keep records below the fold. Verdict: reject as History's default; consider an optional selected-bean/selected-Brewer focus view only if it beats the simpler ledger.
- **Labels:** Sonnet is right that enlarging every eyebrow only makes the screen louder. Delete redundant labels first, then enlarge the remaining essential ones. Keep compact metadata where it remains optional and readable.
- **Mobile navigation:** its central caramel disc is a real circle, not a flattened radius token. A square key could fit the design better, but it is a taste choice; do not call the current circle a confirmed defect. Touch feedback should show immediately on contact, then complete on release; a 300ms pressed-only animation may be missed by a fast tap.
- **Motion preference:** preserve the owner's accepted expressive behavior. Sonnet would omit a setting; the accessibility review recommends a user-controlled quiet option. Keep it as a product decision, with an honest pause/reduced-motion path for other visitors. Reusing steam on sync, every empty state and every card would dilute the original motif; do not adopt that extension by default.

The resulting proposal has two tracks: stabilize and simplify the daily workflow; separately test one more expressive composition. This avoids confusing a usability improvement with evidence that the visual experiment succeeded.

## Button and motion policy

Keep the existing line-drawing language. Organize usage around four jobs: primary, secondary, quiet, destructive; this need not immediately remove the current implementation variants. Selection is a persistent state, hover is an optional response, and completion is its own feedback. Every touch action must make sense without hover.

Use fixed geometry: no hover letter-spacing, font-weight or border-width changes that move neighbors. A drawn inner frame, underline or 1px isolated press can preserve the existing feel. Avoid `transition-all` where only paint/transform should animate.

Owner-approved reduced-motion carve-outs are recorded explicitly in design notes. Preserve that personal preference during this audit. Proposed product policy: an optional System / Full / Quiet motion choice; System honors the OS, Full enables the accepted ambient life, Quiet removes decorative motion without hiding state. Do not silently broaden the current exceptions to new animations.

For gesture controls, retain a tap or direct-entry alternative: keyboard support alone does not replace a single-pointer alternative. [W3C's dragging guidance](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements) explains that distinction. A 44px project target for frequent mobile controls exceeds the WCAG 2.2 AA 24px minimum, whose spacing and other exceptions must be assessed separately; see [the normative criterion](https://www.w3.org/TR/WCAG22/#target-size-minimum).

## Recommended implementation order

1. **Stability:** correct chart sizing; integrate selected mobile branch fixes; correct input font cascade; repair dial activation and scroll ownership. Gate: the mobile probe detects the original failures and passes after fixes. Check real iOS keyboard, pinch zoom and overscroll separately.
2. **Composition:** one mobile gutter owner, larger essential labels, compact optional Home tasting, readable History rows, fewer nested panels. Gate: populated states in both themes, long names, missing data, large collections and enlarged text remain usable.
3. **Brew surface study:** compact setup and connected measurements, with explicit editing and no lost draft values. Gate: repeat, fresh brew, changing Brewer/method, Recipe selection and direct entry all retain correct semantics across Espresso, Pour-over and Moka.
4. **Signature transition:** implement one attempt handoff after the static composition works. Gate: no surrounding layout jump, misleading intermediate values, delayed save, inaccessible focus or mandatory gesture.
5. **Deeper journal:** compare attempts and compact catalog improvements, only after the daily capture loop feels good. Gate: truthful data populations, compatible-method handling, visible missing values and recovery from filters.

Prioritize in that order; precise effort estimates require the implementation study. Do not bundle all five into one sweeping redesign.

## Completion criteria for the overall direction

- No sideways document travel from ordinary taps, focus, expansion, chart rendering or gestures at 320/360/390/430px.
- No unexpected value edits while trying to scroll past a control; direct entry, tap and keyboard activation remain available.
- Frequent mobile controls aim for 44px targets; essential labels are readable without zoom. Verify contrast, not merely token names.
- A returning user can recognize the current setup and reach actual measurements without scrolling through open picker catalogs.
- Home's optional follow-up does not dominate the first useful task; History exposes real attempts without redundant promotional blocks.
- Errors and local save success are visible beside the action. Optional cloud sync remains a separate state, following the accepted ADRs.
- Both themes and reduced-motion behavior are reviewed. No design relies on hover, swipe or animation to communicate state.
- The final design still looks like Coffyyy, including its familiar censer and line work.

## Unresolved questions

- Phone dial primary, or expanded editor?
- Home leads with last attempt, or selected bean?
- Drafts survive route changes?
- Offer System / Full / Quiet motion?
- Partial tasting resolves reminder?
- Bean verdict saves with feedback, or immediately?

These do not block stability fixes or the static hierarchy pass.
