# MCMC Licensing 2025 — Interactive Flipbook

Interactive digital report flipbook built with **StPageFlip** (open-source, MIT license).

## Project structure
```
mcmc-flipbook/
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
    ├── img/                   # covers + content pages
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
- **MCMC server**: place this entire folder in the `/ipr/2025/` subdirectory.
  - The flipbook becomes a sub-page: `https://mcmc.gov.my/ipr/2025/`
  - Safe: it lives in its own folder and does not touch the 2024 code.

## Embed into another page (optional)
```html
<iframe src="/ipr/2025/reader.html" width="100%" height="800" style="border:0"></iframe>
```
The iframe isolates the flipbook's CSS/JS from the parent page — no conflicts.
