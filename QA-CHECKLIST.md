# QA Checklist — MCMC P2630 Strategy Plan Flipbook

A pre-release checklist for the single-page 16:9 widescreen reader format. Work through
it top to bottom and tick items only after verifying them live in a browser.

> This checklist must distinguish between planned, implemented, and browser-verified
> items. Do not tick an item merely because code was changed.

## How to use

- **Local preview:** `npm run dev`, then open `http://localhost:3000/reader.html` (flipbook)
  and `http://localhost:3000/index.html` (landing page).
- **Deployed build:** test the live URL as well — relative paths can behave
  differently once hosted.
- Tick `[x]` when confirmed. Re-check any section after a change to `js/main.js`,
  `css/*.css`, the page images, or after re-running page scan tools.

---

## 1. Assets & manifest

- [ ] `assets/img/cover-front.webp` exists (front cover, 1920×1080, 16:9).
- [ ] `assets/img/cover-back.webp` exists (back cover, 1920×1080, 16:9).
- [ ] Content pages exist as `assets/img/page-NN.webp` (2-digit, zero-padded, 16:9)
      and run continuously from `01` with no gaps.
- [ ] Every report asset is one independent 16:9 page.
- [ ] No asset contains two merged PDF pages.
- [ ] No spread image or two-page composition was introduced.
- [ ] The current sample contains 12 validated reader pages (1 front cover, 10 content pages, 1 back cover).
- [ ] Missing PDF pages 12–63 are not fabricated or silently added.
- [ ] After adding/removing pages, `js/pages.js` was regenerated:
      ```bash
      node tools/scan-pages.js
      ```
      and the page count in `js/pages.js` matches the number of `page-NN.webp` files.
- [ ] All Strategy Plan images use the **16:9 widescreen ratio** and the exact same
      dimensions (1920×1080 px).

## 2. Reading format & cover behaviour

- [ ] Desktop shows **one page at a time**.
- [ ] Tablet shows **one page at a time**.
- [ ] Mobile shows **one page at a time**.
- [ ] The reader never displays two report pages side by side.
- [ ] On first load, the front cover shows as a **single 16:9 page, centered**.
- [ ] Turning the front cover opens directly to Page 01 as a single centered page.
- [ ] At the end, the back cover is displayed as a **single 16:9 page, centered**.
- [ ] Every page flips with a soft, smooth paper animation.

## 3. Core interaction & navigation

- [ ] Drag a page corner to turn works forward and backward.
- [ ] Previous and next controls move **one page at a time**.
- [ ] "Previous page" / "Next page" buttons advance/return by exactly one page.
- [ ] ← → arrow keys turn one page at a time; `+`/`−` zooms; `F` toggles fullscreen.
- [ ] No page gets stuck or skips when flipping quickly.
- [ ] Page readout reports individual page position (`XX / 12`).

## 4. Table of contents

- [ ] TOC button opens the "Table of contents" slide-in panel.
- [ ] TOC lists all non-blank pages with 16:9 widescreen thumbnails: `Front cover` → `Page 01 … Page 10` → `Back cover`.
- [ ] TOC jumps to the correct individual page and closes the panel.
- [ ] The active page is highlighted in the TOC list (`aria-current`).

## 5. Zoom & fullscreen

- [ ] Zoom in/out works and the zoom percentage status updates.
- [ ] Zoomed view maintains the 16:9 canvas without clipping or breaking page turns.
- [ ] Fullscreen opens and exits cleanly; page turning remains functional inside fullscreen.

## 6. Responsive & layout

- [ ] The 16:9 book does not overflow the viewport vertically at any screen size.
- [ ] No horizontal clipping occurs at any screen size.
- [ ] Cover, back cover, and content pages retain the clean 16:9 aspect ratio.
- [ ] No rubber-band / scroll-jump when turning pages on mobile touch.
- [ ] The P2630 Strategy Plan brand stays visible across desktop and mobile.

## 7. Landing page (3D book)

- [ ] `index.html` loads the 3D book with 16:9 widescreen cover proportions.
- [ ] Hover/pointer tilt works; pressing/clicking the book rotates it and returns to rest.
- [ ] "Open MCMC P2630" links to `reader.html`.

## 8. Design & typography

- [ ] MCMC Plan 2026–2030 / MCMC P2630 title and section headings stay readable at every width.
- [ ] Verified P2630 color palette (navy `#172983`, blue `#4159D5`, light blue `#D0DDF4`, neutral `#E5E7ED`, gradient) renders accurately.
- [ ] No broken images or missing assets anywhere on the page.

## 9. Deployment & integrity

- [ ] No errors in the browser console.
- [ ] All asset paths resolve cleanly (no 404s).
- [ ] Works when embedded as an iframe.

## Scope guard

- [ ] Only the **MCMC P2630 Strategy Plan** is included in this release candidate.
- [ ] The **P2630 Action Plan** has not been added or modified in this phase.
- [ ] The supplied reference PDF was not uploaded into the repository.
- [ ] The current 12-page sample is correctly documented as a sample, not the complete 64-page book.

---

## Sign-off

| Section | Tester | Date | Result |
|---|---|---|---|
| Assets & manifest | | | |
| Reading format & cover behaviour | | | |
| Core interaction & navigation | | | |
| Table of contents | | | |
| Zoom & fullscreen | | | |
| Responsive & layout | | | |
| Landing page | | | |
| Design & typography | | | |
| Deployment & integrity | | | |
| Scope guard | | | |

- [ ] All blockers resolved and re-tested.
- [ ] Approved for release by ________ on ________.
