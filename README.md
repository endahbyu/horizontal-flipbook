# P2630 Strategy Plan — Interactive Flipbook

Interactive digital report flipbook built with **StPageFlip** (open-source, MIT license).

## Current scope
- This repository currently targets the **P2630 Strategy Plan** book.
- The book layout is being migrated from portrait pages to a **16:9 widescreen** format.
- The **P2630 Action Plan** book is not included in this phase.
- Any supplied reference document is used only to review brand identity and must not be
  uploaded directly into the source code or asset folders.

## Project structure
```
flipbook-p2630/
├── index.html                 # landing page (3D book hero)
├── reader.html                # flipbook reader (the actual page-flip)
├── css/
│   ├── style.css              # all styles
│   └── fonts.css              # self-hosted fonts (Instrument Serif + Newsreader)
├── js/
│   ├── pages.js               # AUTO-GENERATED page manifest (run tools/scan-pages.py)
│   ├── main.js                # flipbook logic (reads the manifest)
│   └── vendor/
│       └── page-flip.browser.js   # StPageFlip library (v2.0.7, MIT)
├── tools/
│   └── scan-pages.py          # scans assets/img/ and regenerates js/pages.js
└── assets/
    ├── img/                   # Strategy Plan covers + content pages
    └── landing/               # spine asset for the 3D hero
```

## Page naming convention
```
assets/img/cover-front.webp    # front cover (fixed name)
assets/img/cover-back.webp     # back cover  (fixed name)
assets/img/page-001.webp       # content pages, numbered sequentially
assets/img/page-002.webp
assets/img/page-NNN.webp
```

The page count is **derived from the images themselves** — no hardcoded list.
For the P2630 Strategy Plan, page artwork should use a consistent **16:9** canvas.
Blank pages (the inside of the back cover) are inserted automatically, so the
back cover always closes over empty space.

## How to add / replace pages
1. Drop page images into `assets/img/`, named sequentially (`page-001.webp`,
   `page-002.webp`, …).
2. Regenerate the manifest:
   ```bash
   python3 tools/scan-pages.py
   ```
3. Done. The cover, back cover and blank pages are handled automatically.

TOC / contents titles are placeholder (`Page 01`, `Page 02`, …) until the final
section titles are supplied.

## Features
- Realistic 3D page-flip (StPageFlip), soft/paper page feel
- Responsive: 1 page on mobile (portrait), 2-page spread on desktop
- Front & back cover close on the outside (single page, centered)
- Table of contents (clickable, slide-in panel)
- Contents grid ("direct access" section)
- Zoom in/out and fullscreen mode
- Self-contained — no CDN or external dependencies

## Run locally
```bash
python3 -m http.server 8000
# landing page:  http://localhost:8000/index.html
# flipbook:      http://localhost:8000/reader.html
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
