# Mobile stability and interaction audit

2026-10-29. Current shared checkout, including prior uncommitted UX work; `mobile-polish` reviewed read-only through `ee46cf4`. No application changes. Playwright Chromium, isolated local workspace, synthetic bean/Brewer/Recipe/two brews. Browser emulation is **not physical iOS verification**.

## Main finding

The mobile problem includes a reproducible layout defect, not merely subjective animation discomfort. A populated Bean detail page expands the document to **512px** at phone widths 320/360/390/430. It enables lateral panning. Separately, the proposed mobile branch's 16px input guard is ineffective against existing Tailwind font utilities. Fixing overscroll alone misses both.

The earlier report's no-overflow check uses `scrollWidth <= innerWidth`; in Chromium mobile emulation, **both become 512** when the Bean page overflows. Compare `documentElement.scrollWidth` with `documentElement.clientWidth` or configured viewport width. The old assertion can falsely pass.

## Evidence and reproducible probes

Run an isolated Vite server and the included probe:

```sh
npm run dev -- --host 127.0.0.1 --port 5183
# Separate terminal; seeds only its disposable Playwright context:
node docs/research/mobile-probe.mjs
```

Executed during this investigation. Current result: **exit 1**, four Bean overflow failures, Dial Enter/Space failures, branch font guard failure. This is an intentional regression probe, not a passing check. It does not write the user's browser data. Width checks compare rendered DOM dimensions; the keyboard probe drives the real Dial control; the font probe injects the exact proposed branch rule into its own disposable page.

Forty populated route/width checks:

| Route | Result at 320/360/390/430 |
| --- | --- |
| `/home` | Fits |
| `/history` | Fits |
| `/library` | Fits |
| `/library?tab=recipes` | Fits |
| `/library?tab=machines` | Fits |
| `/beans/101` | **512px document width** |
| `/log/brew?fromBrew=401` | Fits; long form |
| `/log/bean` | Fits |
| `/log/machine` | Fits |
| `/log/recipe` | Fits |

“Fits” covers this seeded fixture, not arbitrary names, all data volumes, expanded rows, or every method. The Library `machines` URL is the existing Brewers tab. No page is declared pleasant solely because it fits.

Fresh full-page screenshots at 390px: `/tmp/coffyyy-audit-home.png`, `/tmp/coffyyy-audit-brew.png`, `/tmp/coffyyy-audit-history.png`, `/tmp/coffyyy-audit-bean.png`. Ephemeral review artifacts, not committed product screenshots.

### Confirmed: chart grid causes Bean overflow

Sources: `src/pages/Bean.tsx:223` enables both graphs; `src/components/home/BestBrewPanel.tsx:155` lays them out in a grid; `src/components/home/BeanGraph.tsx:13` and `src/components/home/BeanBarChart.tsx:33` wrap charts without `min-w-0`.

The red-capable Bean probe reproduced three consecutive reloads. At 320px: `scrollWidth=512`, `clientWidth=320`, `innerWidth=512`, `visualViewport.width=320`. The page's graph grid carries the overflow.

Ranked hypotheses tested: implicit grid track, chart children's intrinsic sizing, long text. Browser-only CSS perturbations isolated the cause:

- Explicit `grid-template-columns:minmax(0,1fr)` alone reduced overflow to 492px but did not resolve it in that probe.
- Resetting that change and applying `min-width:0` to the two direct graph children restored `scrollWidth=clientWidth=320`.

Recommended fix: make chart grid items shrink safely and define responsive tracks deliberately; check chart internals and readable labels after shrinking. Add the regression at the populated Bean route, with both graphs. Global `overflow-x:hidden` would conceal the symptom and could crop information.

### Confirmed: proposed input guard loses the cascade

`mobile-polish` places its media-query input rule inside `@layer base` in `src/index.css:263` (branch line). Existing utilities such as `text-sm` and `text-xs` belong to a later layer. Layer precedence wins before selector specificity. Injecting the exact branch rule leaves Custom grind size **14px**, not 16px.

Current computed fonts: History search/select 14px; Library search 14px; Brew custom grind and time 14px; Bean form has five fields below 16px; Brewer form six; Recipe form four. Sync code input is **12px** (`src/components/SyncPanel.tsx:219`). Dial center inputs already compute to 16px.

Recommended fix: give actual mobile field styles an effective `text-base sm:text-sm` equivalent or a deliberate shared field primitive. Verify computed fonts after composition; avoid disabling user zoom. The often-cited iOS focus-zoom threshold is a **device hypothesis here**, not reproduced in Chromium. Smaller computed fonts are confirmed; whether they explain this user's particular phone movement requires iOS testing.

### Confirmed: Dial keyboard actions fail

`src/components/log/Dial.tsx:55` supplies only pointer-down behavior for +/- buttons, no click handler. At 18.0g, focused increase + Enter => 18.0; Space => 18.0; touch tap => 18.1. The keyboard equivalent needs to work without double-counting pointer activation or breaking hold-repeat.

Other source findings: +/- hit boxes are 28px. The knob is a button containing an input (`Dial.tsx:208`, `:306`), and exposes value ARIA attributes without a slider role. Left/right arrows are implemented; Home/End/up/down are not. This needs a coherent accessible composite control, rather than ARIA attributes added to a button.

Dial `touch-action:none` currently computes correctly on the knob; it intentionally reserves gestures there. No measured evidence supports blaming the knob for general page panning. Pointer-cancel/lost-capture cleanup is absent on the knob; add it before introducing richer gestures. Wheel events always prevent default over the knob (`Dial.tsx:115`), so scrolling a long form over it changes the dose instead of scrolling; decide whether to require focus/modifier before wheel changes.

### Confirmed: unnecessary width and scrolling burden

The app main provides 16px side padding (`src/App.tsx:76`); Home adds 24px (`src/pages/Home.tsx:175`). Brew adds 24px margins (`src/pages/log/Brew.tsx:571`) then 24px card padding (`:639`). At 390px the field area is roughly 260px wide before inner controls. RecipeForm has the same margin/card arrangement (`src/components/recipes/RecipeForm.tsx:161`, `:196`).

The mobile branch helps Home and several other wrappers, but **does not remove Brew's `mx-6`** and changes only the notice wrapper in `pages/log/Recipe.tsx`, not the populated `RecipeForm`. Its summary overstates coverage. Review and integrate selectively; no blind merge.

The Brew form stacks two large dials and ratio vertically on phones (`Brew.tsx:881`). Preserve the crafted dials, but prototype a compact dose/yield strip with optional expanded precision controls. Show selected Brewer/bean as compact summaries after selection. This is a proposal, not a requirement to remove expressive controls.

## Existing mobile branch: retain, revise, defer

- **Retain:** 44px header targets; larger chips where they truly compute larger; single outer gutter on phones; responsive card padding.
- **Revise:** effective field font rules; populated Brew and Recipe padding; safe-area handling on all relevant edges; theme-color should follow actual theme rather than fixed dark chrome.
- **Treat carefully:** `min-h-dvh` follows dynamic browser UI. It can improve available-height use but is not proof against movement when browser bars change. Evaluate whether a stable `svh` minimum better suits short screens; long forms still require normal scrolling.
- **Defer blanket suppression:** body `overscroll-behavior-y:none` only addresses vertical boundary behavior. It does not remove horizontal layout overflow. Consider local containment for scrollable panels, and preserve expected navigation/refresh affordances where useful.
- **Touch feedback:** removing tap highlight globally needs an equally visible pressed/focus response on every target. `touch-action:manipulation` preserves pan/pinch while removing double-tap zoom behavior; it does not lock layout or fix oversized children.

The earlier claim that omitting `viewport-fit=cover` necessarily puts navigation under the home indicator is too strong. WebKit documents automatic default insetting. Once `cover` opts into edge-to-edge rendering, explicitly respect safe areas. Current bottom nav already has bottom inset padding; header/main lack top/side safe-area treatment. Test portrait, landscape, installed mode, and keyboard states.

## Popovers, save and navigation

Sync popover currently fits at 390px: 358px wide, x=16, roughly y=57–407. It has its own overflow container (`src/components/SyncControl.tsx:156`). No reproduced clipping in its local state. A mobile sheet could improve thumb access, but is a design proposal, not an overflow fix. It needs title, close action, focus return, safe areas, contained scrolling and keyboard-aware height.

Bottom nav is fixed, 64px plus bottom inset (`src/components/BottomNav.tsx:15`). Labels are 9px; raising to 10px alone is modest. Prefer readable sentence-case labels and deliberate icon/label balance. The fixed nav is present during long data-entry tasks; prototype replacing its center area with a stable save action while editing, with explicit navigation protection for unsaved input. Do not stack a second competing action bar on top.

Actual soft keyboards, visual viewport shifts, browser toolbar expansion, pinch zoom, orientation changes and safe-area insets were not simulated as physical device behavior. MDN distinguishes visual and layout viewports, explaining why a layout-fit result cannot establish keyboard usability.

## Delivery order and acceptance

1. **P0 — containment and effective fields.** Fix chart sizing; assert populated routes, expanded History rows and method variants at all four widths. Root document must fit its client width. Inputs compute at least 16px on phones. Focusing/dismissing each field on iOS must not leave the page enlarged or laterally displaced. Preserve pinch zoom.
2. **P1 — operation and reach.** One 16px outer gutter; no duplicated phone margin. Primary touch targets aim for 44px, with secondary minimum/spacing assessed separately. Dial tap, hold, cancel, typed editing and keyboard must all work. No unintended setting changes during ordinary page scroll.
3. **P1 — phone task flow.** Populated Brew shows selection summaries and key actuals with less scrolling; save remains reachable with/without keyboard. Navigation does not silently discard in-progress entry. Test local, sync active, sync disconnected and error states without changing their established meaning.
4. **P2 — delight after stability.** Animate local feedback and data relationships, not whole-page geometry. All state remains legible with reduced motion. Avoid gesture-only essential actions and celebratory effects for routine dose changes.

Standards nuance: W3C's minimum target criterion is 24px with exceptions; 44px is the enhanced criterion/product comfort target. A 28px Dial helper is not automatically a WCAG minimum failure, though it remains uncomfortable for thumb use.

## Primary references

- [WebKit: Designing Websites for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/) — default insetting, `cover`, safe-area variables and retaining ordinary gutters.
- [MDN: VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) — separate layout/visual viewports and keyboard effects.
- [MDN: touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action) — gesture arbitration, ancestor intersection, manipulation behavior.
- [MDN: pointercancel](https://developer.mozilla.org/en-US/docs/Web/API/Element/pointercancel_event) — cancellation during browser/hardware interruptions.
- [MDN: overscroll-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overscroll-behavior) — boundary and chaining behavior, not layout sizing.
- [W3C: target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) and [enhanced target size](https://www.w3.org/WAI/WCAG21/Understanding/target-size) — 24px versus 44px and exceptions.
- [Apple: Responsive Design Mode](https://developer.apple.com/documentation/safari-developer-tools/responsive-design-mode) — platform rendering differences and simulator testing.
