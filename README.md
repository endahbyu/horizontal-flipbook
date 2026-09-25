# MCMC P2630 Strategy Plan — Interactive Flipbook

Interactive digital flipbook for the MCMC Plan 2026–2030 (MCMC P2630) built with **StPageFlip** (open-source, MIT license).

## Current scope

- This repository currently targets the **MCMC P2630 Strategy Plan** book.
- The reading format is a **single-page 16:9 widescreen** presentation.
- One report asset represents exactly one complete page.
- Desktop, tablet, and mobile display **one page at a time**.
- Page navigation advances **one individual page at a time**.
- The **P2630 Action Plan** book is not included in this phase.
- Current validated sample contains **12 reader pages** (1 front cover, 10 content pages, 1 back cover).
- The final Strategy Plan page count (~64 pages) is pending the remaining approved assets.

## Migration status

- Brand identity: verified (MCMC Plan 2026–2030 / MCMC P2630 — Advancing Inclusivity).
- Page ratio: verified 16:9 widescreen (1920 × 1080 px).
- Reading format: verified single-page view across all viewports.
- Current sample: 12 validated individual reader pages.
- Action Plan: excluded from this phase.

## Project structure
```
mcmc-flipbook/
├── index.html                 # landing page (3D book hero)
├── reader.html                # flipbook reader (single-page 16:9 format)
├── css/
│   ├── style.css              # all styles (P2630 verified palette & 16:9 geometry)
│   └── fonts.css              # self-hosted fonts
├── js/
│   ├── pages.js               # AUTO-GENERATED page manifest (run tools/scan-pages.js)
│   ├── main.js                # flipbook logic (single-page 16:9 mode)
│   └── vendor/
│       └── page-flip.browser.js   # StPageFlip library (v2.0.7, MIT)
├── tools/
│   └── scan-pages.js          # scans assets/img/ and regenerates js/pages.js
└── assets/
    └── img/                   # Strategy Plan covers, spine + content pages
```

## Page naming convention
```
assets/img/cover-front.webp    # front cover (fixed name, 16:9)
assets/img/cover-back.webp     # back cover  (fixed name, 16:9)
assets/img/page-01.webp        # content pages, numbered sequentially (16:9)
assets/img/page-02.webp
assets/img/page-NN.webp
```

The page count is **derived from the images themselves** — no hardcoded list.
Every cover and content page uses a consistent **16:9 widescreen canvas** (1920 × 1080 px or equivalent 16:9 resolution).

## How to add / replace pages
1. Drop 16:9 page images into `assets/img/`, named sequentially (`page-01.webp`,
   `page-02.webp`, …).
2. Regenerate the manifest:
   ```bash
   node tools/scan-pages.js
   ```
3. Done. The manifest and reader will update automatically.

## Features
- Single-page 16:9 widescreen reading format across desktop, tablet, and mobile
- Realistic page-turn animation (StPageFlip)
- One report asset represents one page
- Front & back cover displayed as individual 16:9 pages
- Table of contents (clickable, slide-in panel with 16:9 thumbnails)
- Zoom in/out and fullscreen mode
- Self-contained — no external dependencies

## Run locally
```bash
npm run dev
# landing page:  http://localhost:3000/index.html
# flipbook:      http://localhost:3000/reader.html
```

## Deploy
- **Netlify**: upload this folder (drag & drop); root is `index.html`.
- **MCMC server**: place this entire folder in the P2630 Strategy Plan subdirectory.

## QA
Before release, work through [`QA-CHECKLIST.md`](QA-CHECKLIST.md) once every page
has been uploaded.

## Embed into another page (optional)
```html
<iframe src="/p2630/strategy-plan/reader.html" width="100%" height="800" style="border:0"></iframe>
```
The iframe isolates the flipbook's CSS/JS from the parent page — no conflicts.
