# MCMC P2630 Strategy Plan — Interactive Flipbook

Interactive digital flipbook for the MCMC Plan 2026–2030 (MCMC P2630) built with **StPageFlip** (open-source, MIT license).

## Current scope

- This repository currently targets the **MCMC P2630 Strategy Plan** book.
- The reading format is a **single-page 16:9 widescreen** presentation.
- One report asset represents exactly one complete page.
- Desktop, tablet, and mobile display **one page at a time**.
- Page navigation advances **one individual page at a time**.
- The **P2630 Action Plan** has its own reader (`action-plan.html`); its pages are pending.
- Current validated sample contains **12 reader pages** (1 front cover, 10 content pages, 1 back cover).
- The final Strategy Plan page count (~64 pages) is pending the remaining approved assets.

## Migration status

- Brand identity: verified (MCMC Plan 2026–2030 / MCMC P2630 — Advancing Inclusivity).
- Page ratio: verified 16:9 widescreen (1920 × 1080 px).
- Reading format: verified single-page view across all viewports.
- Current sample: 12 validated individual reader pages.
- Action Plan: reader ready, assets pending (shows an empty state).

## Project structure
```
mcmc-flipbook/
├── index.html                 # landing page (3D book hero)
├── strategy.html              # Strategy Plan reader  (<body data-book="strategy">)
├── action-plan.html           # Action Plan reader    (<body data-book="action-plan">)
├── css/
│   ├── tokens.css             # design tokens: primitive → semantic → per-book theme
│   ├── style.css              # components (uses semantic tokens only)
│   └── fonts.css              # self-hosted fonts
├── js/
│   ├── pages.js               # AUTO-GENERATED page manifest (run tools/scan-pages.js)
│   ├── main.js                # flipbook logic (single-page 16:9 mode)
│   └── vendor/
│       └── page-flip.browser.js   # StPageFlip library (v2.0.7, MIT)
├── tools/
│   └── scan-pages.js          # scans assets/books/*/ and regenerates js/pages.js
└── assets/
    └── books/
        ├── strategy/          # Strategy Plan covers, spine + content pages
        └── action-plan/       # Action Plan pages (empty until assets arrive)
```

## Page naming convention
```
assets/books/<book>/cover-front.webp    # front cover (fixed name, 16:9)
assets/books/<book>/cover-back.webp     # back cover  (fixed name, 16:9)
assets/books/<book>/page-01.webp        # content pages, strictly 2-digit zero-padded (16:9)
assets/books/<book>/page-02.webp
...
assets/books/<book>/page-10.webp        # up to page-NN.webp (2 digits, not 3 digits)
```

The page count is **derived from the images themselves** — no hardcoded list.
Every cover and content page uses a consistent **16:9 widescreen canvas** (1920 × 1080 px or equivalent 16:9 resolution).
Page filenames must strictly use the **2-digit zero-padded format** (`page-01.webp`, `page-02.webp`, etc.).

## How to add / replace pages
1. Drop 16:9 page images into `assets/books/<book>/` (`strategy` or `action-plan`), named sequentially with 2 digits (`page-01.webp`,
   `page-02.webp`, …).
2. Regenerate the manifest:
   ```bash
   node tools/scan-pages.js
   ```
   (or automatically when running `npm run dev` or `npm run build`).
3. Done. The manifest and reader will update automatically.

## Design tokens
All colours, shadows, fonts, radii and motion live in `css/tokens.css`, in three layers:

1. **Primitive**: raw brand values (`--navy-900`, `--blue-500` …). Never used directly in components.
2. **Semantic**: what a value is *for* (`--color-bg`, `--color-text`, `--color-accent`, `--shadow-md` …). `style.css` uses only these.
3. **Book theme**: `[data-book="strategy"]` / `[data-book="action-plan"]` override semantic tokens per book.

To change a colour everywhere, edit the token, not the component.

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
# strategy plan: http://localhost:3000/strategy.html
# action plan:   http://localhost:3000/action-plan.html
```

## Deploy
- **Netlify**: upload this folder (drag & drop); root is `index.html`.
- **MCMC server**: place this entire folder in the P2630 Strategy Plan subdirectory.

## QA
Before release, work through [`plan.md`](plan.md) (Phase 4 QA checklist) once every page
has been uploaded.

## Embed into another page (optional)
```html
<iframe src="/p2630/strategy.html" width="100%" height="800" style="border:0"></iframe>
```
The iframe isolates the flipbook's CSS/JS from the parent page — no conflicts.
