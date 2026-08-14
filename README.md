# MCMC Licensing 2025 — Interactive Flipbook

Interactive digital report flipbook built with **StPageFlip** (open-source, MIT license).

## Project structure
```
mcmc-flipbook/
├── index.html                 # main page (HTML structure)
├── css/
│   └── style.css              # all styles
├── js/
│   ├── main.js                # flipbook logic (pages, controls, responsive)
│   └── vendor/
│       └── page-flip.browser.js   # StPageFlip library (v2.0.7, MIT)
└── assets/
    └── img/                   # page images (page-001.webp … page-NNN.webp)
```

## Features
- Realistic 3D page-flip effect (hard cover on first & last page)
- Responsive: 1 page on mobile (portrait), 2-page spread on desktop
- Table of contents (clickable, slide-in panel)
- Thumbnails grid (clickable, lazy-loaded)
- Draggable progress bar (scrub to jump to any page)
- Zoom in/out (60%–250%)
- Fullscreen mode
- Self-contained — no CDN or external dependencies

## How to add / replace pages
1. Drop page images into `assets/img/`, named sequentially:
   `page-001.webp`, `page-002.webp`, … `page-213.webp`
2. Open `js/main.js` and update the two config blocks at the top:
   - `PAGE_COUNT` → total number of pages
   - `CHAPTERS` → table-of-contents entries (`title` + `page`)
3. Done. The cover (first page) and back cover (last page) are applied
   automatically by position.

## Run locally
Open `index.html` directly in a browser, or serve it:
```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy
- **Netlify**: upload this folder (drag & drop); root is `index.html`.
- **MCMC server**: place this entire folder in the `/ipr/2025/` subdirectory.
  - The flipbook becomes a sub-page: `https://mcmc.gov.my/ipr/2025/`
  - Safe: it lives in its own folder and does not touch the 2024 code.

## Embed into another page (optional)
```html
<iframe src="/ipr/2025/" width="100%" height="800" style="border:0"></iframe>
```
The iframe isolates the flipbook's CSS/JS from the parent page — no conflicts.
