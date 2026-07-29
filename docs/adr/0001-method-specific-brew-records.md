# Model brews around built-in methods

We will model each new brew around a curated brew method, with optional method-specific measurements and an optional brewer. Version one supports Espresso and Moka Pot, uses metric units, and does not enforce brewer–method compatibility or user-defined method customization. This separates espresso-specific data from other preparation styles while keeping logging flexible and preserving historical records whose method is unknown.

## Consequences

- The brew form must ask for the method before rendering method-specific fields.
- New brews require a bean and method; a brewer may be omitted.
- Existing espresso-shaped records remain method-unknown rather than being inferred.
- “Last used” values may be shown as explicit suggestions, but ratings are not used to generate defaults.
