# Focused Bean and Brewer library pages

The Library will remain the umbrella destination for owned coffee inventory, but Beans and Brewers will become focused sibling pages rather than two collections combined behind one tabbed screen.

`/library` will redirect to `/library/beans`. The two collection pages will be `/library/beans` and `/library/brewers`, with a shared Library layout and integrated sub-navigation. The layout will provide consistent page framing, search placement, filtering behavior, collection spacing, empty states, and creation actions, while each resource may use its own UI patterns. Beans will use a visual collection treatment; the Brewer presentation will remain open for a prototype and must not default to a dense data table or compact layout for its own sake.

## Collection responsibilities

The Bean page is a discovery and selection surface. Bean items will foreground identity and sensory information, link to Bean details, and offer starting a brew with the Bean preselected as a secondary action.

The Brewer page is an equipment recognition and action surface. A Brewer item should communicate:

- which Brewer it is;
- when it was last used;
- what the user can do with it.

The collection view will show identity, category, brand/model, a derived last-used date, pin state, and clear actions. Fixed specifications, usage history, and setup context belong in the Brewer detail view. The primary action is “Start brew,” which opens the brew form with the Brewer preselected. “View details” is secondary. A Brewer detail view will contain identity, fixed specifications, usage summary, recent history, Start brew, edit, and lifecycle actions.

Bean and Brewer detail routes live under the Library hierarchy:

- `/library/beans/:beanId`
- `/library/brewers/:brewerId`

## Search, filtering, ordering, and creation

Search remains visible on each collection page. Resource-specific filters are available through a subtle filter panel rather than a permanently visible sidebar. Active filters are represented by removable chips and an active-filter count. Bean filters initially cover origin and brand; Brewer filters initially cover category and brand.

Search and filter state is independent and page-local. It is not shared between Beans and Brewers and is not initially encoded in the URL.

Collection items are ordered with pinned items first and unpinned items alphabetically. Pinning is represented subtly within the same continuous collection; it does not create a separate prominent content block. “Last used” is displayed as a signal, not used for automatic ordering.

“Add bean” and “Add brewer” are page-level creation actions. They are repeated in the empty state, but are not rendered as fake collection items among the results.

## Pinning and lifecycle

Beans and Brewers both support two independent states:

- `Active` / `Archived` describes whether the item is available for new Brews.
- `Pinned` / `Unpinned` describes whether the item should be prioritized for quick access.

Pinned Beans and Brewers appear first in their Library collections and in the brew selector. Pinning does not imply quality, compatibility, a default setup, or a preferred Brew method.

Archived items are hidden from the default collection view and from new brew selection, but remain available through an “Include archived” filter. Their details, history, and insights remain accessible. An archived item’s primary action becomes “Restore” instead of “Start brew.” If an item is archived while pinned, its pin state is preserved but suppressed until restoration.

Permanent deletion is available only for Beans and Brewers with no associated Brew history. Used inventory is archived so historical Brews retain their Bean and Brewer identity.

## Brewer usage

“Last used” is derived from the newest Brew associated with the Brewer. It is shown on the Brewer collection item as a simple date or relative label, such as “Last used 3 days ago” or “Never used.” Bean, method, rating, and other Brew details remain in the Brewer detail/history view.

Brewer selection remains optional and independent from Brew method. The method does not filter or constrain active Brewers, and “No brewer” remains a valid selection.

## Brew logging flow

Starting a Brew from a Bean or Brewer preselects that item in `/log/brew`, while leaving the selection editable. The form will use this order:

1. Bean
2. Brew method
3. Brewer (optional)
4. Method-specific parameters
5. Summary

Brew method is a first-class, visually prominent choice. The selected method remains visible as context throughout the form and determines which measurements are shown. Espresso and Moka Pot remain independent from Brewer category and compatibility.

After Bean, method, and optional Brewer are known, the form may show a clearly labelled “Last used” setup. It prefers a matching Bean + method + Brewer record and falls back to Bean + method when necessary. Applying the setup always requires an explicit user action and never silently overwrites manual input.

The final summary leads with Brew method, followed by Bean and Brewer, then the method-specific measurements. An absent Brewer is shown explicitly as “No brewer recorded.”

## Terminology and data reset

“Machine” is removed from the product vocabulary, active code, and new data schema. The application uses “Brewer” for physical equipment and “Brew method” for the preparation workflow.

The local data store will restart with the new Brewer schema rather than supporting a compatibility migration. Existing local data is not required to survive this reset. The new implementation will use Brewer naming consistently across routes, components, hooks, types, API helpers, and database fields.

## Consequences

- The Library no longer asks one screen to represent two different inventory domains.
- Beans and Brewers can evolve different visual patterns without losing shared navigation and layout conventions. The initial Brewer collection treatment will use the validated editorial card direction from the prototype: direct-information cards with explicit actions, a prominent but restrained Brew method cue, and no clickable inventory rows.
- Active/archive state prevents inactive inventory from cluttering new Brew selection without destroying history.
- Pinning supports quick access without being confused with quality or permanent Brew defaults.
- Brew method becomes the central workflow decision, while Brewer remains optional equipment context.
- The Brewer collection presentation is resolved by prototype direction A: an editorial card grid. Brewer cards show identity, Brew method, last-used date, history, and direct `View details` / `Start brew` actions. The card does not include user-entered descriptive or setup fields such as “what it does” or “setup,” and Brew method cues must not rely on black backgrounds or stark contrast.
