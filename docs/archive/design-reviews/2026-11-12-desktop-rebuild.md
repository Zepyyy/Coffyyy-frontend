# Desktop rebuild — 2026-11-12

Explorations, not owner-approved replacements. Coffee branch stays default.
Supersedes the first round's shortlist; its implementation remains preserved.

## Rendered critique

Three Sol 6.1 implementors rebuilt the strongest mechanisms after the owner
rejected the first round. Each received concrete revision requests.

- **Passionflower:** first rebuild looked like a stiff green star around a fuzzy
  purple center. Leaves floated and the butterfly approached behind cards.
  Revised to broad ivory folded petals, a smaller open corona, attached petioles,
  and a visible lower/right approach. Lead corrected petiole origins to actual
  vine curves. Final desktop frames show recognizable petals and a distinct
  copper visitor. Remaining weakness: the flower still has regular radial anatomy;
  its beauty is for the owner to judge, not established by implementing details.
- **Orbital:** viewport-scale rings finally occupy space. First rebuild lacked
  strong near/far separation and spent too much work on ring geometry. Revised
  foreground lip, sphere shadow, lower globe and continuous transit shadow.
  Static ring material is cached; wakes, atmosphere and moon stay animated.
  Remaining weakness: broad ring bands are quite uniform; card masking remains
  conspicuous over the upper globe. Stronger scale does not prove daily appeal.
- **Aurora:** rejected twice. The first material was a diagonal sheet; the revised
  rays still formed a generic wavy band around cards. Removed from the registry
  and active lab. Source retained for future use, not presented as a success.

The lab now contains two Watch/Still pairs. Preview links change no saved choice.
Main checkout's uncommitted gallery/motion work remains untouched; see the prior
review's checkout clarification before integration.

## Validation

Populated desktop screenshots: 1440×900 and 1920×1080, both themes, at 0, 5,
10 and 30 seconds. Further sampled frames inspect butterfly arrival/rest/departure
and Orbital at 0, 5, 10, 30, 50 and 60 seconds. This is sampled rendered evidence,
not continuous real-device observation. Mobile explicitly deferred by owner.

Browser check: both Still canvases remain stable; both previews preserve saved
Coffee branch/motion preferences; two Watch and two Still links; no page errors.

Temporary captures and measurements live under `/tmp/coffyyy-rebuild-final`,
`/tmp/coffyyy-motion`, and `/tmp/coffyyy-cached-wide.txt`. Not durable test assets.

Production build and targeted ESLint pass. Build retains its large-chunk warning.
At 2560×1440 both scenes have zero hard flips and on-off-on reversals in the
10-second instrumented test. Performance does **not** pass: Orbital improved from
39.64 to 23.62ms mean synchronous render cost after caching; Passionflower is
12.94ms. These include instrumentation and exclude compositor/GPU time. Both
remain visual explorations, not performance-approved defaults. No engine-wide
optimization or mobile validation is included.
