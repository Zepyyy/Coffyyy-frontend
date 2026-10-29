# UI art direction audit · 2026-10-29

## Recommendation

Keep Coffyyy's identity. Change its composition and interaction rhythm. The strongest next design is a **working journal with a memorable handoff between attempts**: a quiet home, an efficient brew surface, and history that makes differences legible. The visual risk belongs in that handoff, not another decorative button family.

The current app has character at the component level. Its weakness is that many useful components demand equal attention, and phone layouts inherit too much desktop structure. More effects alone would amplify that problem.

This is an independent source and existing-image audit, not a new live browser evaluation. Findings below distinguish source observations, visual judgments, and proposals. No app files changed.

## Evidence and constraints

- Read `CONTEXT.md`, `docs/design-notes.md` revisions 1–12, `docs/ux-review.md`, current pages, controls, CSS, and screenshot README.
- Viewed `docs/screenshots/dashboard-light.png`, `library-light.png`, `history-light.png`, and `log-a-brew-mobile.png`. Capture date is undocumented; Dashboard image displays October 4. These are historical composition references, not current rendered proof. The mobile image shows desktop navigation that current `App.tsx` hides on phones; its layout must not be treated as current.
- Current source includes uncommitted work from the prior UX review. Findings refer to that working tree. Prior mobile branch changes are outside this audit.
- Explicit owner feedback in design notes: square corners; no cheap hover lift; no multicolored haze; one hue family per surface; no generic coffee literalism or random measuring props. The censer, steaming cup, Fraunces, drawn hairlines and paper/ink language survived repeated review. Preserve these.
- Existing motion overrides are intentional owner decisions (`src/index.css:753`–825), including animation under OS reduced motion. Do not silently remove them. Any broader motion policy needs a visible product decision.

## Findings

| Area | Source evidence | Design judgment / consequence | Proposed change |
| --- | --- | --- | --- |
| Identity | `src/index.css:21`–69, 137–160 | Three type roles and neutral surfaces already cohere. Replacing them would discard hard-won preference knowledge. | Retain semantic tokens, faces, square geometry; spend effort on scale, grouping and state. |
| Home hierarchy | `src/pages/Home.tsx:175`–208, 237–257 | Greeting/CTA, full tasting form, then all beans. Historical screenshot confirms tasting dominates the page. Current source still mounts the full form before beans. | Make pending tasting a compact expandable row. Put a useful continuation near the CTA; keep deep bean insights below. |
| Home shelf | `src/pages/Home.tsx:122`–144 | Every bean gets equal space; selecting one adds a large panel below the entire shelf. Large collections push the answer away from its trigger. | Keep the selected bean and its insight adjacent. Offer explicit “All beans” expansion; retain selection/deselection semantics until tested. |
| Small text | `BottomNav.tsx:20`, 42, 73; `BrewFeedback.tsx:93`; `Bean.tsx:274`; `BrewLedgerRow.tsx:59`, 124, 135 | 9–10px uppercase mono is doing real interface work. At phone scale, subtlety becomes effort. | Essential labels 12–14px; body 15–16px; reserve 10–11px for optional metadata. Reduce tracking before reducing size. Verify real contrast rather than assuming token names guarantee it. |
| Button proliferation | `ui/buttonVariants.tsx:7`–32 | Fourteen variants carry several competing mechanisms. Delight is visible mainly on hover, unavailable during ordinary touch use. | Map semantic jobs to primary, secondary, quiet, destructive. Reuse current implementations; retire redundant appearances gradually. Every touch action gets a visible pressed and completed state. |
| Unstable hover geometry | `ui/buttonVariants.tsx:10` | `hover:tracking-wide` changes text metrics. It can change button width and nearby layout; this is source risk, not a demonstrated mobile root cause. | Remove geometry-changing hover properties. Keep line drawing, opacity and isolated transforms. |
| Brew density | `pages/log/Brew.tsx:571`, 689, 739, 766–959 | Setup catalog, grind presets, recipe selection, two dials and ratio create a long form with several visual centers. | Compress confirmed setup into an editable summary. Give dose/yield a single composed group, then the observed outcome. Optional details disclose in place. |
| Dial usability | `components/log/Dial.tsx:55`, 126–138, 208–221 | 28px +/- targets and a captured touch-none dial make a beautiful object demanding on phones. Keeping appearance need not preserve the interaction cost. | 44px targets, direct numeric entry, explicit edit affordance. Prototype compact dose/yield rows before shrinking the dial. Test scrolling that begins beside/on it separately. |
| Library density | `library/BeanCard.tsx:57`–101; `pages/Library.tsx:470` | Every bean is a full specification panel. In the historical screenshot, most vertical space serves repeated field headings and boxed tags. | Catalog cards show name, roaster/origin, short flavor line, status and roast. Full taxonomy belongs on Bean detail. No swipe-only actions. |
| Bean comparisons | `pages/Bean.tsx:263`–286 | Nested Average/Best cards repeat labels and obscure row-to-row comparison. | One aligned ledger: parameter / all brews / best-rated subset. Explicitly say averages; do not imply an actual repeatable brew. |
| History scanning | `history/BrewLedgerRow.tsx:117`–169 | Dense wrapping mixes date, grind, recipe, flow and tasting tags into one competing line. | Desktop: aligned columns. Phone: fixed three-line hierarchy: identity/date; grind + ratio + time; rating + tasting. Expansion reveals the rest. |
| Surface vocabulary | `Header.tsx:13`; `BeanCard.tsx:46`, 57, 91; `Bean.tsx:273` | Border, inset fill, tag box and outer panel repeatedly encode grouping. The app is visually busier than its restrained palette suggests. | Outer boundary for an independent object; divider for sections; plain text for metadata. Remove at least one nesting level on each dense screen. |

## Three directions considered

All retain the actual token system. Hex values below are **approximate sketch references**, not replacements for the canonical OKLCH values: Paper `#FCFCFB`, Raised `#FFFFFF`, Ink `#24211F`, Secondary `#665F58`, Caramel `#B48351`, Line `#DEDCD8`. Dark sketches invert paper/ink using existing dark tokens; no new colored dark backdrop. Display: Fraunces; reading/action: Instrument Sans; measurements: Spline Sans Mono.

### A · Working journal — recommended

The app opens on the next useful action; saved attempts become a readable record. Broad whitespace separates tasks; hairlines align related data. One familiar censer remains the ambient accent.

```text
DESKTOP                              PHONE
Date · greeting        Log a brew     Date · greeting
Last attempt / Repeat                 [ Log a brew          → ]
Pending taste notes · expand          Last attempt · Repeat
Beans / selected insight              Taste notes · expand
                                      Selected bean / Change
                                      Last attempt / details
```

Signature: **the attempt handoff**. Repeat opens the brew form with a small source strip: “From Oct 28 · grind 12 · 18 → 36g.” Changed fields earn an understated “was 18g” annotation. Saving turns that strip into a dated journal row, with optional taste notes below. Layout remains steady; a 180–240ms line draw and opacity handoff communicate continuity. No flying cards, full-screen wipe or compulsory delay.

Why it fits: it makes existing Repeat useful visually, respects the user's current design, and joins individual polished controls into a recognizable product behavior. It needs no fake intelligence or new scoring system. Tradeoff: status placement and source/change comparisons require careful semantics.

### B · Focused brew desk

Logging gets a dedicated composition: setup summary above; dose and yield share one horizontal plane on desktop; actual results below. The rest of the app remains restrained.

```text
Bean · Brewer · method · Change
DOSE [18.0g]    RATIO 1:2    YIELD [36.0g]
Grind [12]                   Outcome [26s]
Details                                  Save
```

Signature: selecting dose or yield temporarily gives that control a larger editable readout while the paired measure remains visible; ratio updates immediately without layout movement. Phone uses stacked measurement rows, not tiny dual dials. This is a prototype direction, not permission to delete the dial.

Tradeoff: strongest for frequent logging, weaker as the whole app's identity. A focus mode adds mode complexity; prefer responsive composition over a separate mode switch.

### C · Attempt archive

History becomes the centerpiece: beans read as named chapters, attempts as aligned records; a pinned pair reveals differences. Dashboard stays simple.

```text
Colombia Huila / Espresso
Oct 29   12   18 → 36g   27s   4★   [Choose]
Oct 28   13   18 → 39g   25s   3★   [Choose]
              [Compare selected attempts]
```

Signature: **difference ink**. In a two-attempt view, unchanged rows are quiet; changed values receive the caramel line. Phone aligns both values within each parameter row, avoiding horizontally scrolling side-by-side cards. Change is described, never credited as the cause of a better score.

Tradeoff: valuable after a real history exists, less useful for onboarding and the daily capture problem. Recommend as the second expression of A, not the initial redesign.

## Per-screen proposal

### Home

One dominant Log a brew action; one compact last-attempt continuation; one optional tasting prompt. Current full bean catalog can remain below a short selected-bean region. Do not add streaks, totals, a new greeting animation or an atmospheric hero. For zero data, show the real prerequisite action instead of several competing empty panels.

Phone first viewport should reveal the main action plus a useful record or next step on a 390×844 viewport. “Useful” must be evaluated with real content and enlarged text, not by hiding everything behind disclosure. Preserve selection when navigating back.

### Log a brew

Keep prerequisites explicit. After choosing Bean/Brewer, show their names in a compact summary with Change buttons; reopening preserves all still-compatible entered values. This removes repeated catalogs from the working area without forcing a multistep wizard.

Use the visible ratio to connect dose/yield. Offer direct entry alongside the dial. Retain method-specific fields: Espresso, Pour-over and Moka should not inherit irrelevant sections or Recipes. Keep error/reason text beside Save. A fixed Save dock must occupy measured space above navigation and keyboard; it must not cover the last field.

### History

Use a stable mobile row structure rather than incidental flex wrapping. Keep bean identity on Timeline, the existing Repeat action and explicit method filtering. Optional compare selection appears as a quiet row action; keep normal navigation intact. For empty filtered results, put Clear filters beside the explanation.

### Library

Desktop keeps a useful filter rail. Phone shows section, search, count and Filter in a compact header; filters open in one accessible panel and apply predictably. Compact bean cards avoid repeated specification headings. Move Delete into an explicit secondary action area; confirmation remains visible and reversible until committed.

### Bean detail

Give the bean name enough room; separate descriptive facts from brewing evidence. A single comparison ledger precedes optional charts. Show a real latest/best-rated individual brew with Repeat beside it; aggregate data must never masquerade as that brew's settings. Reuse the existing dial-in state instead of new achievement art.

### Tasting and save confirmation

Preserve honest Not rated state and one-tap Balanced. On Home, expand from a named row without remounting the entire page. On save, keep the existing SteamCup and Done action. A saved state should appear immediately once storage succeeds; animation follows it, never gates it. Avoid new literal cup fills, measuring strips or success confetti.

### Navigation and sync

Phone bottom navigation needs legible labels, a visibly active Log a brew state and a stable footprint. The fresh parent-reviewed capture confirms the central Log a brew control is circular; `rounded-full` remains physically round despite square surface-radius tokens. Preserve or change that exception deliberately. Sync deserves a named state and a mobile panel that fits the viewport; keep domain terms from CONTEXT.md. Do not turn optional sync into onboarding friction.

## Motion specification

| Moment | Proposed response | Constraint |
| --- | --- | --- |
| Touch down | Existing 1px press / darkening, immediate | No layout metric changes; focus and selected states survive release. |
| Selection | Existing caramel line draws 140–180ms | Selected state must be complete at rest and usable without hover. |
| Expand row | Content opacity 120–180ms; optional bounded height transition | Preserve trigger/focus position; do not animate the entire page entrance again. |
| Repeat handoff | Source strip fades in; matching field labels remain stable | No spatial flight across routes. Existing entered data semantics remain authoritative. |
| Changed source value | Small “was …” label and underline | Do not animate digits through false intermediate values. |
| Save | Immediate saved status, then SteamCup | No delay to Done or another log. |
| Charts | Selection marker tracks chosen real attempt | No autoplaying chart reveals on every rerender. |

Keep ambient motion scoped to the accepted censer. Pause offscreen work where practical. Existing reduced-motion carve-outs are explicitly accepted history; new transitions should default to instant under reduce. An optional in-app motion preference is a proposal if the owner wants both personal expressiveness and an accessible quiet mode; it is not a prerequisite for composition work.

## Delivery and acceptance

1. **Stability foundation.** Integrate separately reviewed mobile fixes; verify seeded and long-content states at 320/360/390/430px, portrait/landscape, keyboard open, and 200% text. No horizontal document movement after tap/focus; scrolling near controls never unintentionally changes values. Capture actual scroll offsets and viewport width during the reproduction. No blanket overflow clipping as substitute for correcting an oversized child.
2. **Hierarchy pass.** Shared page gutters, essential-label scale, compact Home tasting, stable History rows and one-level Bean ledger. Acceptance: real populated screens, both themes; no hidden primary task, clipped labels, obscured final field or geometry-changing hover/focus. Retain existing URLs and recorded data.
3. **One prototype.** Prototype A's attempt handoff with one existing brew; evaluate on phone with keyboard/direct entry and desktop keyboard navigation. Acceptance: source context stays accurate, only meaningful changes marked, cancellation harmless, navigation/back preserves expected draft policy. No source values shown as current actuals without clear labeling.
4. **Extend the language.** Compact Library cards, deliberate dose/yield group and optional pair comparison. Acceptance: compare only compatible attempts or explicitly explain differing methods/Brewers; missing data shown; no causal “this improved your brew” copy.
5. **Polish budget.** Apply the motion table; inspect final screenshots and screen recordings. Acceptance: touch, keyboard and pointer expose all actions; focus visible; motion does not move surrounding content; owner-approved censer remains the sole ambient motif.

These are research recommendations. Implementation specifications belong in GitHub Issues under the repository's normal triage workflow; this note does not settle new workflow decisions.

## Open questions

- Keep dial primary on phones, or favor direct entry?
- Home: last attempt first, or selected bean first?
- Optional quiet-motion setting?
- Draft persistence across navigation: current expectation?
