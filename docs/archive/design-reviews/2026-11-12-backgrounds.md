# Background exploration — 2026-11-12

> OWNER REJECTED THIS ROUND. The lead shortlist below was overgenerous.
> Preserve as evidence of a failed review, not an aesthetic benchmark.
> Canopy, Unfurl, Penumbra and Rain garden retired from active exploration.
> Moonflower is being rebuilt; only the butterfly idea interested the owner.
> The 64px phone padding was removed.

Working review, not owner approval or standing design guidance.
Five Sol 6.1 implementors; lead-directed concepts and rendered revision requests.
Coffee branch remains default. Candidate promotion waits for review.

## First submission: all returned for revision

Populated Home captured at 1440×900 and 390×844, light/dark, t=30.
Initial evidence: /tmp/coffyyy-exploration (temporary, not durable repository assets).

| Study | Lead verdict from rendered frames | Required revision |
| --- | --- | --- |
| Penumbra | Huge patterned strip loses planetary identity; phone shows checkerboard scraps. | Complete crescent, irregular terrain, deliberate smaller phone composition. |
| Rain garden | Elliptical bands read as ruled lines, weak reeds. Phone hides identity. | Coherent reflection, stronger attached reed anatomy, fewer surface marks. |
| Moonflower | Best focal scene; pinwheel corollas and moth blot weaken intimacy. Phone hides subject. | Overlapping funnel folds, asymmetric resting moth, explicit phone vignette. |
| Canopy | Rejected: enormous oval wash dominates; quiet masks punch rectangles through it. | Remove oval, use shaped light apertures and connected cast shadows. |
| Unfurl | Recognizable but skeletal, regular combs; crozier reads as drawn spiral. Phone hidden. | Varied divided foliage, continuous rolled anatomy, reduced sprawl. |

## Integration finding

The lead initially directed phone placement from `shelf.y`, incorrectly treating
it as the section heading. It is the card grid. Added `shelf-heading` anchor on
the existing section; no spacing change. Revised phone placement must use that
anchor and stay in the small existing gap. This is an implementation correction,
not a new owner preference for miniature backgrounds.

## Verification so far

First-pass scene ESLint and application/node TypeScript checks passed with local
installed dependencies. TypeScript build metadata redirected to /tmp because
shared dependencies are read-only. Revised captures and motion checks pending.
No candidate is an approved replacement for Coffee branch.

## Final lead verdict

These are lead recommendations for owner evaluation, not owner approval.

| Study | Disposition | Remaining objection |
| --- | --- | --- |
| Moonflower | First shortlist | Strongest coherent relationship and dimensional flowers. Moth is small; dark corollas lose some fold detail. |
| Unfurl | Shortlist | Distinct growth mechanism; now opens once and holds, never rewinds. Still botanical rather than a radically new atmosphere. |
| Rain garden | Shortlist | Reflection and intermittent ripples supply a different rhythm. Quiet to the point of slightness, especially on phone. |
| Penumbra | Hold | Recognizable crescent and disciplined palette, but isolated globe feels more like an illustration than a living world. Not a new-default recommendation. |
| Canopy | Rejected from shortlist | Removing the wash rescued readability, but the optical idea collapsed into another moving branch. Not distinct enough from Coffee branch. |

All five remain URL-only studies in `/cta-lab`, with Watch and Still links.
They do not enter the saved-background picker or replace Coffee branch.
Watch: `/home?grain=moonflower` (substitute study ID).
Still: append `&grainMotion=off`. Leaving the preview restores the saved choice.

Phone experiments reserve 64px above Beans, only for these study URLs. The extra
space is an explicit composition tradeoff: recognizable scene versus more scrolling.
Normal Home spacing is unchanged. The heading anchor was moved onto the actual
heading, so padding is accounted for. This supersedes the initial miniature-only
placement described above. Empty/non-Home layouts have fallback positions but are
not proposed as validated defaults.

Lead fixes after agent revisions: corrected anchor placement; separated the mobile
composition from card masks; restored phone moth motion; landed moth on the flower
rim; moved reed seedhead below desktop card occlusion; refined fern leaflet density
and juvenile direction; replaced growth reversal with one-way growth; batched fern
pinnules into one fill per pinna to reduce render cost.

## Final verification

- Standard `npm run build` and targeted ESLint pass. Build reports its existing
  large-chunk advisory; no bundle-size optimization attempted here.
- Existing responsive scene tests: 9 passed.
- Populated Home: 1440×900 and 390×844, both themes, t=30, inspected through actual
  grain/glass rendering. Phone contact sheets inspected in both themes.
- Sampled motion phases: moth arrival/rest/departure and cycle seam, ripple lifecycle,
  crescent illumination, canopy wind, fern growth through 720s. These are sampled
  rendered frames, not continuous human observation on a real device.
- `verify-grain.mjs`: all 15 scene/viewport cases had zero hard flips and reversals
  at 1280, 2560 and 390px (phone DPR 3, CPU throttle 4).
- Initial Fern large-desktop cost advisory: 11.12ms mean. Batched leaf fills; focused
  rerun passed at 9.03ms mean. Other cases passed the script's cost thresholds.
  These are instrumented synchronous canvas costs, not end-to-end compositor FPS.
- Browser checks: five Watch links, five Still links, saved Coffee branch preference
  preserved across every study, no page errors. Still canvas stability checked.
- No touch-device, screen-reader or cross-browser validation claimed. Full unrelated
  application test suite not rerun.

Temporary evidence (local, not durable): `/tmp/coffyyy-exploration-final`,
`/tmp/coffyyy-motion`, `/tmp/coffyyy-grain-verification.txt`,
`/tmp/coffyyy-fern-optimized.txt`. Reproduce stills with the existing
`scripts/render-grain-frames.mjs` and the five IDs in `explorations.ts`.


## Checkout clarification

The owner clarified that the previous exploration lives uncommitted in
`/home/quent/dev/coffyyy-frontend`. Both checkouts start at `3b896b0`; this
worktree did not inherit those uncommitted changes. Main contains the existing
`/backgrounds` chooser, five earlier scenes, and three-state motion controls.
Those files were inspected read-only; they have not been merged or overwritten.

To prevent collisions, this exploration's Canopy uses `sunshade.ts` / `sunshade`;
main's `canopy` continues to mean Ginkgo. New study metadata lives in
`explorations.ts`, leaving main's `studies.ts` available for its prior work.
Earlier temporary screenshots and verification logs still call this study `canopy`.
The latest main-checkout history was added to the historical archive, not the
active brief. When integrating, reuse `/backgrounds` and its motion controls;
reconcile the temporary lab links and `grainMotion` alias with `motion=on|off`.
Main's Willow fallback differs from the owner's stated Coffee branch preference;
resolve explicitly during integration rather than silently overwriting it.
