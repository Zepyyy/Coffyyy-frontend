# Coffyyy interaction design investigation

Date: 2026-10-29. Scope: current working tree, including earlier uncommitted UX work. Source audit + primary accessibility documentation; no browser, physical-device or screen-reader testing in this report. Code findings are structural observations, not claims about measured mobile behavior. Line references reflect the audit snapshot and may move during implementation.

## Recommendation

Make the app feel more intentional by connecting actions, preserving context, and giving changes a clear visual answer. The existing buttons already have extensive choreography. Another animated button family would contribute less than a calmer populated brew form, a concise tasting prompt, and a beautiful comparison of actual attempts.

Keep the censer, square geometry, editorial type and drawn-line vocabulary. Read **all** revisions in `docs/design-notes.md`: its early coffee/instrument proposals were repeatedly rejected or superseded. The owner explicitly preferred expressive animation over literal props, then required quiet integration with the page. Do not resurrect gauges, crema floods, random measuring strips, off-palette slabs, hover lift or keycap decorations. Coffee-specific below means serving brewing, not putting coffee imagery everywhere.

## Findings with implementation implications

| Priority | Source observation | Consequence and concrete change |
| --- | --- | --- |
| P0 | `src/components/log/Dial.tsx:208–219` renders a button carrying range ARIA properties; `:306–331` nests an editable input inside that button. | Invalid interactive nesting; range properties do not turn a button into a slider. Separate the editable value from the drag surface. Prefer a native numeric field as the precision interface; keep optional dial interaction outside it. If using a custom slider, implement and test the complete slider pattern. |
| P0 | `Dial.tsx:181–189` only handles Left/Right; `:109–115` consumes every wheel event over the dial, even when unfocused. | An incidental trackpad scroll can change an actual brew setting. Gate wheel adjustment on intentional focus/activation, preserve ordinary page scrolling otherwise; support appropriate slider keys if that role is adopted. |
| P1 | `BrewFeedback.tsx:167–183` and `BeanVerdictPicker.tsx:26–37` have `finally` but no user-facing error state. | A failed save returns controls to idle with no actionable explanation. Preserve edits, show an inline alert and Retry; never show saved confirmation before the local write succeeds. |
| P1 | `BeanVerdictPicker.tsx:26–33` immediately saves the bean verdict while the surrounding feedback waits for Save notes (`BrewFeedback.tsx:291–309`). | Two persistence models look like one form. Prefer staging the verdict until Save notes, if an atomic write can be provided; otherwise explicitly label the verdict as saving immediately and show its own failure. This is a product choice, not a cosmetic refactor. |
| P1 | `Home.tsx:155–165` asks for one latest unrated brew, then discards it if dismissed. `src/lib/api/brews.ts:48–58` chooses the latest with any missing rating dimension. | Dismissing the latest can hide earlier eligible prompts. Filter dismissed IDs before selecting the next prompt. Decide what a completed optional tasting means before changing the query: missing axes must stay unknown. |
| P1 | `BrewFeedback.tsx:223–240` star controls announce actions but not selected state; several negative margins enlarge and overlap their hit regions. | Use a named rating group with an explicit selected value and a clear-rating action. A native radio group is a strong default. Give each star a non-overlapping 44px target on touch layouts. |
| P1 | Brew presets use `data-active` without pressed/radio semantics (`pages/log/Brew.tsx:915–933`, `:964–973`, `:998–1008`). | Visual selection is not programmatic selection. Add pressed semantics for independent/toggle controls or radio semantics for exclusive choices. Do not label all groups as tabs: these select values, not pages. |
| P1 | `BrewFeedback.tsx:77–114` uses native range controls, 24px height, and a one-tap Balanced action. | Keep native sliders and explicit unknown state. Increase touch area without making the rail visually thick. Keep each axis independent; add textual `aria-valuetext` rather than stuffing changing advice into the accessible name. Verify visible focus despite local `focus:outline-none`. |
| P1 | `SyncControl.tsx:58–71` closes the popover 1.8 seconds after a successful sync initiated after opening. | Sync completion could close while a person reads or prepares another action. Prefer manual close, or constrain auto-close to an explicitly initiated, self-contained action with focus restoration. Reproduce before changing. |
| P2 | `BrewLedgerRow.tsx:85` stores expansion locally; details mount a complete feedback form at `:184–186`. | Returning from Repeat or Save as recipe loses reading position/expansion. Preserve selected brew ID and filters in navigation state/URL; open detail on a dedicated narrow layout if the inline form overwhelms History. |
| P2 | Shared buttons offer many stylistic variants (`ui/buttonVariants.tsx:7–32`), but feedback, History and form choices style their own buttons. | Styling count is not hierarchy. Define semantic roles first and map existing variants to them; migrate high-use controls before inventing another family. |

Target sizes above are proposed Coffyyy usability goals. A 28px Dial step control (`Dial.tsx:55`) is below that goal but not automatically a WCAG failure. AA minimum target size is 24×24 CSS px with exceptions; 44×44 is the enhanced AAA criterion. Measure actual targets and spacing before claiming conformance failure. [W3C target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

The dial already offers tap step buttons and typing, which is directionally right. Drag alternatives must work with a single pointer without dragging; keyboard support alone is insufficient. [W3C dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)

## Workflow designs

### Brew: prepare → record → taste

Keep the current separation of recording from tasting (`pages/log/Brew.tsx:500–563`). It matches when information becomes available. Do not force a wizard with Next/Back for every parameter.

On phones, start with a compact selected-bean/Brewer summary and a Change action. Let expanded pickers replace the summary in place; selecting an item collapses the picker without scrolling the page to the top. Keep focus on the selected item until collapse, then return to Change. Show the provenance line already present at `:480–498`: “Started from your last brew” versus “Repeating …” must remain distinguishable.

Promote four method-relevant actuals, with units beside values and large direct-entry targets. The dose/yield relationship is the main visual: quieter controls frame it. Dials remain an optional expressive manipulation, never the only precise path. A sticky save dock is worth prototyping only after testing keyboard/safe-area behavior; it must replace the mobile global action in that context, not create two stacked fixed bars. Keep the existing inline disabled reason and error (`:1113–1127`).

After save, retain the current single primary Done action and ledger secondary steps. Focus a success heading and announce “Brew saved”; do not rely on the steaming cup to convey success. Add taste notes expands in place; Log another preserves only intended preparation data and clears results/tasting. Preserve exact repeat provenance until the user deliberately changes context.

### Tasting: a small invitation, then a focused edit

Home should show one concise row: bean, when brewed, “Add taste notes”, Later. It should not show the whole rating/axes/verdict form before the person chooses to taste. Open inline or a well-managed dialog, avoiding a second scrolling panel inside the dashboard.

Keep rating, taste and strength optional. Saving zero touched fields should either be disabled with an explanation or explicitly finish as “Skip for now”; it must not pretend notes were added. Decide whether partial feedback resolves a prompt. Suggested product rule for discussion: any deliberate feedback submission resolves the reminder, while History permits later editing. That needs an explicit state/policy, not interpreting `null` as balanced.

“Taste notes” currently opens rating/axes/bean verdict, not a free-text tasting note (`BrewFeedback.tsx:214–309`). Align copy with contents (“Rate this brew”) or intentionally add a notes editor that preserves existing brew notes. Do not overwrite preparation notes accidentally.

### History: retrieve → inspect → repeat or compare

Keep earlier URL/search improvements. Make the closed row an excellent summary: time, bean, method when needed, dose→yield, rating. Additional tags belong in detail when they make the mobile row wrap excessively. Use the whole summary as a native disclosure button; add `aria-controls` with a stable panel ID.

Offer Compare beside Repeat only after a deliberate selection mode is entered. A comparison needs two real brews, same bean/method by default, and a visible differing-Brewer warning. Phones should use parameter rows with A/B columns, not two vertically separated full cards. Mark unknowns with “Not recorded”; differences must be visible as text, not color alone. Never claim a grind change caused a rating change.

Preserve expanded brew and scroll position after recipe promotion. Deletion confirmation should name the bean/date, expose Cancel first in keyboard order or explicitly focus the safe action, and restore focus to a remaining row after deletion. Existing inline confirmation (`BrewLedgerRow.tsx:250–300`) is a reasonable foundation; do not replace every confirmation with a modal by default.

### Library: find → understand → act

Retain native filter buttons, search names, scoped resets and result counts. Reveal secondary filters on demand. Avoid changing sorting while toggling a facet. Keep Recipe identity plus its brew count navigable; the prior clickable stats fix is stronger than adding decorative analytics. Use one obvious Add action per active section, with an empty-state action when empty; avoid simultaneously showing three equivalent primary creation affordances in one viewport.

A bottom sheet is appropriate for a short filter editor, not automatically every phone interaction. For Sync, try a full-width constrained panel only if the current popover is hard to operate. Modal presentation needs initial focus, contained Tab navigation, Escape/close, background inertness and focus return. The existing Radix Popover supplies behavior to build on; converting it to a hand-built fixed div would be a regression. [W3C dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

## Button system: simplify responsibility, keep character

| Role | Existing language to retain | Behavior contract |
| --- | --- | --- |
| Commit | Ink or default, one per decision region | Clear verb; loading label; prevent duplicate writes; inline failure; consistent success. |
| Navigate | Text/outline links | Real anchor; modifier-click and back navigation work; underline/focus visible. |
| Choose | Quiet option/chip + persistent selected line | Selected state visible without hover and announced with pressed/radio semantics. |
| Reveal | Ghost/text disclosure | `aria-expanded`, stable controlled region; keyboard works; focus stays logical. |
| Destructive | Quiet destructive until confirmation | Label actual operation; never suggest an “arming” animation itself confirms intent. |

Animation should reinforce these roles. Keep one press response and the drawn-line family; do not make Save, Cancel and Delete equally theatrical. Touch cannot depend on hover payoff. Avoid `transition-all` and hover tracking changes for labels where they cause width movement (`buttonVariants.tsx:4,10`); prefer explicit color/opacity/transform and reserve stable width for changing labels.

## Eight creative proposals, ranked for utility

These are proposals, not owner-approved visual decisions. Start with the first three. None requires literal coffee props.

| Idea | Trigger and visual expression | Benefit | Limits / acceptance |
| --- | --- | --- | --- |
| **1. Attempt overlay** | Compare two brews: corresponding numeric values align, then only changed fields receive a short underline pass. | Lets the person see the experiment immediately. | Stable layout; missing values remain unknown; zero animation in Off mode; text differences usable without color. |
| **2. The changed-value echo** | Editing a repeated brew shows a faint previous value beside the actual, e.g. `18.0 → 18.5 g`, until save/reset. | Expressive memory with a practical purpose; makes adjustment feel deliberate. | Based on actual source brew, not aggregate “best”; do not rewrite the source; preserve exact units. |
| **3. Quiet tasting receipt** | Saving rating collapses the editor into a typographic one-line summary, with the existing underline drawing once. | Makes completion feel satisfying and returns space to brewing. | Focus lands on summary/Edit; no collapsing content above an active pointer; failed writes remain open. |
| **4. Context handoff** | Repeat opens the form with the selected bean name and source date already occupying their destination positions; optional brief opacity transition. | A coherent connection between the remembered brew and the next attempt. | Navigation remains immediate; no zooming page transition; browser back retains History context. |
| **5. Recipe margin notes** | For a linked Recipe, changed actuals reveal a narrow textual delta beside the value. | Turns existing recipe-vs-actual calculations into useful live feedback. | Method-aware; Moka has no Recipes; do not auto-correct actuals to targets. |
| **6. One-light selection** | Choosing a bean moves the existing accent line to the selected card while the detail label updates. | A restrained signature across mobile pickers, tabs and filters. | Never shift card positions; no default motion on every card; selection remains explicit without animation. |
| **7. A personal mark** | Optional user-chosen small abstract mark beside a bean name, treated like an editorial marginal glyph. | Distinctiveness without more colored surfaces or product gamification. | A later prototype only; needs stored user choice/migration/sync considerations; names remain the primary identifier. |
| **8. Session thread** | A deliberately opened view connects today's attempts as short textual entries; selected entry gets a hairline draw. | Makes a real dial-in session readable without another aggregate dashboard. | Grouping is a proposed view, not a new causal model; no invented progress score, streaks or forced session lifecycle. |

## Motion policy: preserve owner preference, make it controllable

Current source explicitly restores censer, steam, line and link animations under reduced-motion (`src/index.css:753–829`). This is deliberate owner preference documented in design-note revisions 5/7/10; do not silently remove it.

Propose a per-browser **Motion: System / Expressive / Off** setting. System follows OS preference; Expressive is the owner's explicit opt-in, retaining the beloved censer; Off stops all nonessential animations, including SVG descendants/pseudo-elements and marching dashes. Explain that switching to System honors OS settings. Preserve an existing explicit preference only when one was actually recorded; CSS bypasses alone do not prove every visitor opted in.

Autostart movement that lasts over five seconds alongside other content needs a pause/stop/hide mechanism unless essential under WCAG 2.2.2 (A). The censer is decorative and should be assessed under that criterion; its beauty does not make it essential. Interaction animation disablement is a separate AAA criterion (2.3.3), not an AA requirement. [Pause, stop, hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html), [Animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), [MDN reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)

Suggested timing goals, not standards: press/selection feedback immediate; line draw 120–180ms; detail reveal at most 180ms; success confirmation at most 250ms. Keep ordinary dial response tied to input rather than a trailing spring. Pause decorative work when hidden/offscreen. Do not create page-wide staggered entrance animation on every filter edit or expand action.

## Standards versus project goals

- WCAG AA target minimum: 24px with specified exceptions. Coffyyy goal: 44px targets for frequent standalone touch actions, without overlapping hit boxes. [W3C target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- Drag alternatives and keyboard behavior are independent obligations. Custom slider semantics need a full name/value/range and keyboard implementation, including Home/End and arrows; touch assistive technology needs real-device testing. APG patterns are implementation guidance, not a conformance certificate. [W3C slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)
- An input is interactive content and must not be nested inside a button. Separate targets in the dial DOM. [MDN button content model](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button)
- Fixed save/navigation controls must not entirely obscure keyboard focus (WCAG 2.4.11 AA). Coffyyy goal is stronger: active input and its error remain fully visible above the keyboard/dock. [W3C focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
- This report does not establish color contrast, WCAG compliance or screen-reader compatibility. Contrast requires measured resolved colors in both themes, including muted labels and outlined control states.

## Delivery sequence and completion criteria

1. **Reliability and semantics first.** Separate Dial targets; intentional wheel handling; selected states; feedback failure UI. Verify typing/stepping/keyboard/drag yield the same values; scrolling a non-active dial never changes saved data. Inject failed writes and confirm edits survive and an alert appears. Rating announces selected value and clears without toggling an undocumented star gesture.
2. **Compact mobile paths.** Prototype selected context, direct-value entry and concise tasting. At 320/360/390/430px, long names and expanded content remain within the viewport. Required fields/action discoverable without horizontal gestures. With virtual keyboard open, active input/error reachable and save/global bars do not overlap. Validate on physical Safari and Android Chrome; emulation is insufficient for keyboard claims.
3. **Continuity and comparison.** Navigate from an expanded brew to Repeat/Recipe and back: filters, expanded identity and position survive. Compare known seeded brews and assert every difference/missing value matches stored actuals. Different Brewers remain clearly identified.
4. **Motion control and one signature.** Ship System/Expressive/Off and changed-value echo or tasting receipt before more animation. Test OS reduce on/off crossed with all three app modes. Off has no continuing decorative animations after settling; Expressive retains censer; no animation changes layout dimensions or delays data entry/navigation.
5. **Broader craft pass.** Audit labels, contrast, focus, empty/error/loading states and command hierarchy across the same screens in both themes. Use semantic markup checks plus keyboard/VoiceOver/TalkBack review. Do not treat a passing automated scan as this review's completion.

## What not to add now

No ambient motion on every card; scroll parallax; route-transition choreography; swipe-only actions; hidden gesture navigation; haptic/sound feedback as a requirement; radial tasting controls; literal measuring props; new badges/streaks; automated grind prescriptions; shiny redesign of all existing buttons. Existing `TASTE_HINT` text (`BrewFeedback.tsx:10–21`) already gives assertive grind guidance: soften causal certainty separately rather than expanding that advice without equipment/context evidence.

No need for a new animation library to implement the first iteration. The interaction state and DOM contracts matter more than the interpolation engine.

## Unresolved product questions

- Partial tasting resolves reminder?
- Stage bean verdict with brew feedback, or label immediate save?
- Keep censer as sole ambient signature?
- Comparison before session view? Recommendation: yes.
