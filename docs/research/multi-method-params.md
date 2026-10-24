# V60 and moka: parameters worth tracking

Resolves #62. Researched 2026-10-24. Sources are fetched primary pages unless flagged.

## Bottom line

- Primary sources are thin on numbers. Manufacturers give procedure, not full recipes. Numeric ranges mostly come from Hario's own pages plus one named-expert recipe published by Hario.
- Moka has almost no authoritative numbers beyond Bialetti's procedure. Treat moka ranges as defaults to tune, not standards.
- Ratio is the central V60 knob. For moka, ratio is fixed by the pot (full basket + water to valve), so track yield and time, not ratio.

## V60

### What primary sources say

| Param | Value | Source |
|---|---|---|
| Dose | 10-12 g per 120 mL cup (Hario manual, VDN) | [1] |
| Ratio | 1:16 (12.5 g : 200 g), "adjust if necessary" | [2] |
| Ratio | 1:15 (30 g : 500 g), Hoffmann | [3][4] |
| Water temp | 90 C suggested "or preferred" (Hario USA); 97 C (Hoffmann, soft/bottled water); "hotter the better, esp. light roasts" (Hoffmann) | [2][3][4] |
| Grind | medium-fine / fine-medium | [3][4] |
| Bloom | 2x coffee weight (Hario Global); 2-3x, 30-45 s (Hario USA); 2x = 60 g, up to 45 s (Hoffmann) | [2][3][4][5] |
| Pours | after bloom, 3 pours of 4x dose each (Hario Global); Hoffmann: 60 g bloom, to 300 g by 1:15, to 500 g by 1:45 | [3][4][5] |
| Total time | within 3 min regardless of cups (Hario); 3-4 min (Hario USA); drawdown done ~3:30 (Hoffmann) | [2][3][5][6] |
| Other | rinse filter; swirl after bloom; stir/swirl at end to flatten bed; drawdown speed depends on temp, filter | [3][4] |

Note: Hario Global's "3 pours x 4x dose" = 2x bloom + 12x = 14x dose total, about 1:14. Derived, not stated by Hario.

### Suggested tracked fields (V60)

Core: dose (g), water (g), ratio (derived), grind setting, water temp (C), total time (mm:ss).
Optional: bloom water (g), bloom time (s), filter type, pour count/notes, drawdown end time, dripper (plastic/ceramic/glass; Hoffmann used plastic).

### Suggested defaults (V60)

- Ratio 1:15 to 1:16 (range 1:14 to 1:17 reasonable; sources cluster here).
- Dose 15 g / water 250 g is a common one-mug starting point (derived from 1:16.7; not itself in a primary source). 12.5 g : 200 g and 30 g : 500 g are sourced.
- Temp 90-97 C (sources span; sourced endpoints are 90 and 97).
- Bloom 2x dose, 30-45 s.
- Total time 2:30-4:00 (sources: <3:00 to 3:30-4:00).

## Moka

### What primary sources say

Source: Bialetti NZ product page, how-to-use text [7].

| Param | Value |
|---|---|
| Water | fill base to just below safety valve; overfill gives boiled, bitter, burnt coffee |
| Coffee | fill funnel "loosely"; medium-fine grind, gritty not powdery; no tamping implied |
| Heat | low to medium; on gas keep flame from climbing the pot side; not full heat |
| Time | 3-6 min depending on size and heat |
| Stop | remove immediately once pot is full; do not allow to boil |
| Fill rule | always brew full; under-filling water or coffee hurts pressure/quality |
| Yield | "cup" = ~30 mL espresso cup. Approx yields: 1c 60, 2c 90, 3c 130, 4c 185, 6c 250, 9c 410, 12c 595, 18c 800 mL |

Because dose and water are set by the pot, the user-varied variables are: pot size, grind, heat level, water start temp (cold vs hot), stop time/yield.

### Suggested tracked fields (moka)

Core: pot size (cups), dose (g, as weighed), water (g), grind setting, heat level (low/med/high), total time, yield (g).
Optional: water start (cold/hot), paper filter used, stop-by-sound vs time, stove type (gas/electric/induction).

### Suggested defaults (moka)

- Pot size is a required field; pre-fill nominal yield from Bialetti table above.
- Heat: low-medium. Time target 3-6 min.
- Grind: medium-fine (finer than filter, coarser than espresso).
- Dose is whatever fills the basket; weigh and record, do not default a ratio.

### Weak / secondary evidence (flag, not relied on)

- Hoffmann's moka video (hot water in base, level grounds, optional paper filter under top plate) was not available as primary text; only secondary summaries seen. Hot-start is a legitimate tracked variant (water start field).
- A 2026 arXiv preprint models moka heating/pressure/extraction onset [8]; teaching model, gives no usable recipe numbers.

## Cross-method (SCA)

- SCA Standard 310-2021 (home brewers) tests at 55 g coffee per 1 kg water (~1:18) and 90-96 C slurry temp; Gold Cup 18-22% extraction and 1.15-1.35% TDS also cited from SCA/SCAE docs. I found these via search snippets; direct fetches of the SCA PDFs returned 404, so verify before quoting. These target drip machines, not V60 or moka [9].
- Implication: TDS/extraction % is a refractometer-user field; keep as optional, hidden-by-default.

## Gaps

- No Hario official page gives a single full V60 recipe with temperature; none given for grind in microns.
- No peer-reviewed or manufacturer source for moka dose/ratio/time targets beyond Bialetti's 3-6 min and heat guidance.
- Bialetti NZ is a regional official site; Bialetti global/US pages 404'd.

## Sources

1. Hario V60 manual (VDN): https://global.hario.com/product/VDN.pdf (PDF not text-extracted; figures per search summary, verify)
2. Hario USA, Alpha Dripper page: https://www.hario-usa.com/products/hario-alpha-dripper
3. Hario USA, James Hoffmann Ultimate V60 Technique: https://www.hario-usa.com/blogs/recipes-and-more-from-friends/james-hoffmann-uitimate-v60-technique
4. Hario Europe, Hoffmann V60 recipe (HARIOLOGY booklet, 2021): https://www.hario-europe.com/blogs/hario-community/v60-ambassadors-james-hoffmann
5. Hario Global, V60 basic recipe (via search summary; page not fetched directly): https://global.hario.com/v60/v60series.html
6. Hario Global, paper filter pour over: https://global.hario.com/coffeelife/paper-drip.html
7. Bialetti NZ, Moka Express: https://bialetti.co.nz/products/moka-express
8. Moka thermo-fluid model (preprint): https://arxiv.org/abs/2601.03663v1
9. SCA Standard 310-2021: https://sca.coffee/s/SCA_Standard_310-2021.pdf ; SCAE Gold Cup extraction: https://sca.coffee/s/SCAE_Gold_Cup_European_Extraction_Preferences.pdf (both unverified by direct fetch)
