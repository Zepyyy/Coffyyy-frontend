# UX review · October 2026

Three independent source reviews (Sonnet 5.5 + two Sol 6.1), followed by a
Sonnet implementation of repeat-brew and parent integration/browser validation.

The strongest direction: make the journal remember useful things and connect
its existing features. The established visual identity already has character.
Keep square surfaces, paper/ink/crema, Fraunces, hairlines and the censer; use
clearer interactions to make the app feel considered.

## Implemented

- **Repeat an actual brew.** History's highlighted brew and expanded rows open
  its exact settings, with source context and Start fresh. Time, flow, notes
  and scores belong to the new attempt and are cleared. Valid recipe links
  survive; deleted references get actionable notices. No automatic method swap.
- **Recipe stats lead somewhere.** A recipe's brew count opens History filtered
  by its explicit recipe ID. The filter is named and can be cleared.
- **Find remembered details.** History searches notes and recipe names alongside
  bean/Brewer names and IDs. Search, rating, method and view persist in the URL.
  Rapid view/search changes retain both values. Timeline rows identify the bean.
- **Library recovery.** Bean names are searchable. Active-section result counts
  and a scoped reset remain visible with filters closed. Reset preserves sort,
  tab and other sections' facets. Search inputs have accessible names.
- **Controls feel consistent.** Filter rows are native buttons with pressed
  semantics and 44px targets; segmented controls wrap, have larger targets and
  answer keyboard focus with the existing underline.
- **Honest tasting feedback.** Untouched axes say Not rated. Balanced is a
  one-tap action; recording balanced taste does not invent balanced strength.
- **Small guidance fixes.** Home explains bean selection. Mobile brew saving
  shows its disabled reason and save errors beside the action.

## Strong next candidates

1. **Compare two actual attempts.** Choose two brews of the same bean and method;
   show settings, tasting and notes side by side, with Repeat on each. Explicitly
   flag different Brewers. Better answer to “Did that grind change help?” than
   another aggregate chart. Keep missing data visible; avoid causal promises.
2. **Compact tasting follow-up.** Home's current full feedback form dominates the
   dashboard. Collapse to a quiet row that expands on demand. Exclude dismissed
   entries before choosing the next prompt; let History recover older entries.
   Settle whether an optional partial rating counts as resolved before changing
   the existing completeness query.
3. **Recognize dial-in progress.** When existing dial-in criteria are met, offer
   a quiet Save as recipe link using a real qualifying brew. Reuse SteamCup and
   the current post-save rows. No new badges, celebrations or score systems.
4. **Bean comparison as a ledger.** Replace nested Average/Best boxes with
   readable parameter rows before charts. Label best-rated values as averages;
   they are not necessarily the settings of any individual brew.
5. **Method-aware dashboard handoff.** Preserve the selected method when opening
   the brew form from bean insights. Needs a validated start parameter and
   compatible Brewer fallback, rather than adding an unsupported query link.

## Deferred deliberately

- Automated grind advice: grinder steps have different meanings; avoid false
  precision without equipment calibration.
- Auto-selecting Home's latest bean: changes the quiet default and deselection
  behavior. The selection hint is a smaller, reversible improvement.
- New gradients, hover lift, literal instrument props, or competing animations:
  these repeat directions already rejected in `docs/design-notes.md`.
- Expanded History rows still use local component state. Filters survive a
  return from promotion; row expansion does not yet persist.

## Validation

- `npm run build`, `npm run lint`, `npm test`: pass, 160 tests across 20 files.
- `node scripts/verify-ux.mjs` against Vite on `127.0.0.1:5173`: isolated
  browser data, name search/reset, Space activation, recipe history, rapid
  view/search + reload, older-brew repeat/save, balanced feedback storage.
- Browser layout checks at 320/390/1280px: no horizontal overflow on Library,
  recipes or Timeline. Light mobile and dark desktop screenshots inspected.
- Local seeded data only; no production workspace or sync changes. No real
  device or screen-reader verification. Existing bundle-size warning remains.
