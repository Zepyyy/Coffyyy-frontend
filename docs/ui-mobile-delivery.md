# UI and mobile integration

Implemented from the October 29 investigation. Earlier research documents describe the pre-fix snapshot; this is the delivery record.

## Delivered

- Preserved and committed the earlier Repeat, History, Library and honest-tasting changes. Merged `mobile-polish`, then corrected its ineffective font cascade and incomplete populated-form padding.
- Fixed Bean charts' intrinsic sizing and a rotated Dial decoration's overflow. No document-level overflow clipping. Mobile fields compute to 16px; pinch/pan remain available. Safe areas cover top and sides as well as navigation; short-page height uses the stable viewport minimum. Browser theme color follows app theme.
- Kept the dials: paired dose/ratio/yield on phones, 104px faces with unscaled numeric entry, 44px step keys, keyboard activation, hold/cancel behavior and focus-gated wheel changes. Slider and input are siblings; units remain visible.
- Selected Brewer and bean become named, editable summary rows. Changing a selection reopens its picker; choosing closes it and restores focus. Compatible actuals remain intact. Recipe/actual and method semantics remain unchanged.
- Home tasting starts compact. Fold/Escape preserves the mounted draft; folding is disabled while a brew write is pending. Dismissed entries are excluded before finding the next prompt, without redefining optional rating completeness.
- Home gives the familiar censer more presence: larger cup, a thin attached plume with complete static traces, fewer competing details. Existing accepted cup motion remains; new plume motion stops under reduced motion. Tablet layout stacks until there is room beside the greeting.
- History starts with a quiet count/rating line and unboxed controls. Removed the redundant capture panel and duplicate highlighted record; actual attempts and chapter Repeat actions remain.
- Feedback write failures retain edits with inline retry. Bean verdict's separate automatic save is explicit. Rating controls have non-overlapping touch targets, selected state and Clear; untouched axes stay unknown.
- Fixed stale async Repeat/start results during navigation within the mounted brew form. Fixed outline-button SVG geometry so the perimeter draws cleanly without stray resting segments; removed geometry-changing button hover tracking.

## Design decisions

Keep the existing palette, three type roles, square surfaces and line-drawing language. Reclaim space around the dials before replacing them. Spend visual emphasis on the censer and related measurements, rather than adding another motif or page-wide transition. No new animation dependency.

Deferred: two-attempt comparison, a motion preference UI, larger Library redesign, session views, route-persistent drafts. They need separate product work; no new data model or sync policy introduced here.

## Verification

- Build and lint pass; 161 unit tests pass.
- `BASE_URL=http://127.0.0.1:5183 node scripts/verify-ux.mjs`: Repeat/save, recipe History, URL persistence, keyboard filters, balanced feedback, populated Bean containment.
- `node scripts/verify-mobile.mjs` with Vite on 5183: 84 populated route/width cases at 320/360/390/430/640/768/1280, including all three Brew methods; computed field size, Dial keyboard/tap/direct entry/wheel, selection preservation, same-component Repeat navigation, folded tasting draft and tablet greeting separation.
- Additional isolated browser checks: hold/release/cancel; slider boundary keys; injected bean/brew write failures and exact-value retry; both themes; new plume frozen under OS reduced motion while accepted cup motion continues.
- Independent review found stale Repeat, folded draft loss and tablet heading overlap. Fixed; affected paths are in the durable browser checks.

Physical iOS/Android keyboards, browser chrome and screen readers were not tested. The existing bundle-size warning remains. Browser fixtures use disposable local data; no production workspace was changed.

## Captures

Fresh seeded captures, both identity and populated layout. Full-page capture can paint fixed navigation mid-image; inspect live scrolling to judge obstruction.

- [Home, light](screenshots/mobile-finish/coffyyy-finished-home-light.png)
- [Home, dark](screenshots/mobile-finish/coffyyy-finished-home-dark.png)
- [Brew, 390px](screenshots/mobile-finish/coffyyy-finished-brew-light.png)
- [Pour-over, 320px](screenshots/mobile-finish/coffyyy-finished-pour-small-light.png)
- [History](screenshots/mobile-finish/coffyyy-finished-history-light.png)
