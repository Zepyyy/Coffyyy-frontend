# Brewer and Method-Aware Brews

## Problem Statement

The app currently treats every piece of brewing equipment as a “machine” and every brew as an espresso-like record. This makes the brew log misleading for methods such as Moka Pot, whose measurements and timing differ substantially from espresso. Users need a clear distinction between the physical equipment they own, the brew method they used, and the measurements that make sense for that method.

## Solution

Make Brewer the umbrella term for physical brewing equipment and introduce curated Brew methods. A new brew starts with a bean and method selection, then presents the method’s own optional measurements. Version one supports Espresso and Moka Pot, uses metric units, leaves brewer selection optional, and does not enforce brewer–method compatibility. Existing records remain method-unknown rather than being inferred.

## User Stories

1. As a coffee journal user, I want to see “Brewer” used instead of “Machine,” so that the app can describe equipment beyond espresso machines.
2. As a coffee journal user, I want to catalogue a brewer under a curated category, so that an espresso machine and a Moka Pot are visibly distinct kinds of equipment.
3. As a coffee journal user, I want to give a brewer a name and record its relevant details, so that I can recognize the physical equipment I used.
4. As a coffee journal user, I want to select a brew method independently from my brewer, so that the app does not make assumptions about what my equipment can do.
5. As a coffee journal user, I want to choose Espresso as a brew method, so that I can log espresso-specific information.
6. As a coffee journal user, I want to choose Moka Pot as a brew method, so that I can log moka-pot-specific information.
7. As a coffee journal user, I want to choose the bean before logging a brew, so that every new brew remains connected to the bean that is central to the journal.
8. As a coffee journal user, I want to choose the brew method before seeing measurement fields, so that the form only asks for information relevant to how I brewed.
9. As a coffee journal user, I want to leave the brewer blank, so that I can record a brew even when I have not catalogued or cannot remember the equipment.
10. As a coffee journal user, I want new brews to require a method, so that future records are understandable and method-specific fields have a clear meaning.
11. As a coffee journal user, I want historical records with no method to remain method-unknown, so that the app does not invent facts about past brews.
12. As an espresso user, I want optional fields for grind size, coffee dose, espresso yield, extraction time, and flow, so that the existing espresso journaling capability is preserved in the Espresso method.
13. As a Moka Pot user, I want optional fields for grind size, coffee dose, water amount, heat level, total brew time, and yield, so that espresso-specific labels do not appear in my moka-pot log.
14. As a Moka Pot user, I want total brew time to describe the time from placing the pot on heat until removing it, so that the timing has a consistent meaning.
15. As a coffee journal user, I want all measurements to use metric units, so that my records are consistent.
16. As a coffee journal user, I want dose and yield in grams, so that coffee quantities can be compared across records.
17. As a coffee journal user, I want water amount in millilitres, so that moka-pot water measurements are unambiguous.
18. As a coffee journal user, I want brew times recorded in minutes and seconds, so that espresso and Moka Pot timing can be represented clearly.
19. As a Moka Pot user, I want heat level represented as Low, Medium, or High, so that I can record it quickly without introducing inconsistent free text.
20. As a coffee journal user, I want method-specific measurements to be optional, so that I can record a brew even when I did not measure every parameter.
21. As a coffee journal user, I want the form to suggest the last matching setup, so that repeating a familiar brew is quick.
22. As a coffee journal user, I want any repeated setup to be labelled “Last used,” so that I know it is a historical suggestion rather than a fact about the current brew.
23. As a coffee journal user, I want last-used suggestions to prefer the same bean, method, and brewer when available, so that suggestions are relevant to the current brew.
24. As a coffee journal user, I want the app to fall back to the latest matching bean and method when no brewer-specific record exists, so that an optional brewer does not prevent useful suggestions.
25. As a coffee journal user, I want no measurement suggestion when there is no relevant history, so that the app does not fabricate values.
26. As a coffee journal user, I want ratings to remain feedback about the outcome rather than determine form defaults, so that a five-star rating does not incorrectly imply a single best configuration.
27. As a coffee journal user, I want the brew summary to show the selected method and optional brewer, so that I can verify the context before saving.
28. As a coffee journal user, I want history and brew details to display method-specific values with their correct labels and units, so that records remain understandable after they are saved.
29. As a coffee journal user, I want brewer lists, library sections, and setup language to use the Brewer vocabulary consistently, so that the domain distinction is clear throughout the frontend.
30. As a coffee journal user, I want to continue using existing espresso history while the model evolves, so that introducing methods does not make the journal unusable.

## Implementation Decisions

- Use the existing brew-log boundary as the primary seam: method selection, conditional form fields, brew persistence, and brew suggestions should be coordinated there.
- Replace the user-facing “Machine” vocabulary with “Brewer.” Keep curated Brewer categories separate from Brew methods.
- Treat a Brewer as physical equipment and a Brewer category as its curated physical classification. The category does not enforce compatible methods.
- Treat a Brew method as the preparation technique that determines meaningful measurements. The method is selected per Brew, not permanently attached to a Brewer.
- Support only the built-in Espresso and Moka Pot methods in the first version.
- Require Bean and Brew method for new Brews. Brewer remains optional.
- Preserve historical Brews whose method is absent as method-unknown; do not infer Espresso.
- Keep method-specific measurements optional. Do not require a complete recipe or measurement set.
- Espresso fields are optional grind size, coffee dose, espresso yield, extraction time, and flow.
- Moka Pot fields are optional grind size, coffee dose, water amount, heat level, total brew time, and yield.
- Use metric units: grams for coffee quantities, millilitres for water, minutes/seconds for time, and Low/Medium/High for Moka Pot heat.
- Render method selection before method-specific measurements in the multi-step log flow.
- Do not hard-enforce Brewer–method compatibility.
- Show historical suggestions only as explicitly labelled “Last used” values. Prefer a matching Bean + method + Brewer, then fall back to matching Bean + method. Do not use the five-star rating to choose defaults.
- Extend the current brew model and local IndexedDB versioning so method identity, optional brewer association, and method-specific measurements can coexist with historical records.
- Keep method definitions curated by the app in this version. Do not build user-defined method customization or a field-builder interface.
- Keep active brewing guidance, step-by-step instructions, timers, notifications, and live workflow assistance out of this feature.

## Testing Decisions

- Test observable user behavior at the brew-log boundary rather than implementation details such as React state shape or database internals.
- Verify that selecting Espresso renders only Espresso fields, selecting Moka Pot renders only Moka Pot fields, and changing method does not retain incompatible field values in the saved Brew.
- Verify Bean and method validation, optional Brewer behavior, optional measurements, and method-unknown historical records.
- Verify metric display and persistence for grams, millilitres, time, and Moka Pot heat levels.
- Verify “Last used” suggestion precedence, its visible label, and the absence of suggestions when no matching history exists.
- Verify that ratings do not affect suggestion selection.
- Verify that Brewer category selection and Brew method selection remain independent.
- Verify history/detail presentation for both methods and for method-unknown legacy records.
- Use the project’s existing TypeScript build and lint checks as baseline verification; there is currently no automated test runner configured, so the feature should add focused tests at the highest feasible form/domain seam rather than broad implementation-coupled tests.

## Out of Scope

- User-created Brew methods.
- User-customizable method fields, labels, units, or defaults.
- Recipe or repeatable target profiles.
- Best-rated-brew-driven defaults.
- Hard Brewer–method compatibility validation.
- Active brewing guidance, timers, notifications, or step-by-step instructions.
- New methods beyond Espresso and Moka Pot.
- Adding espresso temperature, pressure, or pre-infusion fields in this version.
- Automatic inference of methods for historical records.
- Replacing the existing rating model.

## Further Notes

The domain language and architectural rationale are recorded in the repository glossary and ADR. The current implementation is espresso-shaped: its Brew type, form, persistence, suggestions, statistics, and history views all assume fields such as espresso yield and extraction time. The implementation should preserve useful existing behavior while moving those fields behind the Espresso method boundary.
