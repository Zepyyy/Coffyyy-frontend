# Screenshots & promo assets

The reusable promo set: referenced by the README and safe to hotlink from
external sites (ads, socials, listing pages). Desktop shots are captures at
1440 CSS px wide with a 2x device scale factor (2880 px files); the mobile
shot is a 390x844 viewport at 2x. Light theme unless the filename says `dark`.

| File | What it shows |
| --- | --- |
| `dashboard-light.png` / `dashboard-dark.png` | Dashboard: time-of-day greeting, taste-rating prompt, bean shelf, censer CTA |
| `log-a-brew-light.png` / `log-a-brew-dark.png` | Log-a-brew: bean picker, recipe dials, setup |
| `log-a-brew-mobile.png` | Log-a-brew on a 390 px viewport, scrolled to the dial |
| `library-light.png` | Library: bean cards with country/brand filters |
| `history-light.png` | History: stats strip and bean chapters (first viewport) |
| `censer-loop.gif` | The home CTA ("censer") animating — steam, ember motes, breathing halo. 7 s loop at 20 fps, works anywhere a GIF works |
| `censer-loop.mp4` | The same capture across the full 23.8 s motion cycle (halo/motes 7 s, steam 3.4 s), so the loop is perfectly seamless. Use this where video is accepted |

## Re-shooting

1. `npx vite build`, then `npx vite preview --port 4173` (prod build, so the
   dev-tools links don't appear).
2. Open `/dev`, run the **Demo** seed preset (8 beans, 3 machines, 48 brews).
3. Curate the story: in IndexedDB `Coffyyy`, set the latest brew's date to
   yesterday ~17:30 and delete its `overallRating` / `tasteScore` /
   `strengthScore`, and keep every other brew older than 3 days. The dashboard
   then shows the taste-rating prompt and "Yesterday's shot is in the book."
4. Capture with Puppeteer/Playwright at `deviceScaleFactor: 2`
   (1440x900 desktop, 390x844 mobile). Wait for `document.fonts.ready` plus
   ~2 s so the rise-and-fade entrance settles.
5. `history-light.png` and `log-a-brew-mobile.png` are viewport-height shots,
   not full-page; the mobile one is scrolled so "The recipe" sits ~300 px from
   the top.
6. For the animation assets: freeze every animation inside `.censer-key` and
   step their `animation-delay` in 50 ms increments (20 fps). The GIF takes the
   first 7 s; the MP4 uses the whole 23.8 s cycle (LCM of the 7 s halo/mote
   loop and the 3.4 s steam loop).
