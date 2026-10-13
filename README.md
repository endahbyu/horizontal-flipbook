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
├── index.html                 # landing page (3D books, Figma layout)
├── draft.html                 # static layout draft (not linked)
├── strategy.html              # Strategy Plan reader  (<body data-book="strategy">)
├── action-plan.html           # Action Plan reader    (<body data-book="action-plan">)
├── css/
│   ├── tokens.css             # design tokens: primitive → semantic → per-book theme
│   ├── landing.css            # landing page (semantic tokens only)
│   ├── reader.css             # flipbook readers (semantic tokens only)
│   └── fonts.css              # Host Grotesk @font-face (self-hosted, assets/fonts/)
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
assets/books/<book>/page-02.webp        # first content page (the front cover counts as page 01), 2-digit, 16:9
assets/books/<book>/page-02.webp
...
assets/books/<book>/page-10.webp        # up to page-NN.webp (2 digits, not 3 digits)
```

The page count is **derived from the images themselves** — no hardcoded list.
Every cover and content page uses a consistent **16:9 widescreen canvas** (1920 × 1080 px or equivalent 16:9 resolution).
Page filenames must strictly use the **2-digit zero-padded format** and start at `page-02.webp` (the front cover is page 01), so a file's number matches the reader's `NN / total` readout.

## How to add / replace pages
1. Drop 16:9 page images into `assets/books/<book>/` (`strategy` or `action-plan`), named sequentially with 2 digits starting at 02 (`page-02.webp`,
   `page-03.webp`, …).
2. Regenerate the manifest:
   ```bash
   node tools/scan-pages.js
   ```
   (or automatically when running `npm run dev` or `npm run build`).
3. Done. The manifest and reader will update automatically.

## Design tokens
All colours, shadows, fonts, radii and motion live in `css/tokens.css`, in three layers:

1. **Primitive**: raw brand values (`--navy-900`, `--blue-500` …). Never used directly in components.
2. **Semantic**: what a value is *for* (`--color-bg`, `--color-text`, `--color-accent`, `--shadow-md` …). `landing.css` and `reader.css` use only these.
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
# landing page:  http://localhost:3000/  (index.html)
# strategy plan: http://localhost:3000/strategy.html
# action plan:   http://localhost:3000/action-plan.html
```

## Deploy (handoff to the client's own server / VPS)

The site is **fully static** and makes **no external requests**: fonts (Host Grotesk, OFL), three.js, StPageFlip and the page-turn sound are all served from this folder. Node.js is only needed to *build* it, not to run it.

1. Build once (Node 20+):
   ```bash
   npm ci
   npm run build:book          # 3D landing bundle (js/book-3d.js)
   node tools/scan-pages.js    # page manifest (js/pages.js)
   npm run build:standalone    # downloads/MCMC-P2630-*.html
   ```
2. Copy these to the web root: `index.html`, `strategy.html`, `action-plan.html`, `css/`, `js/`, `assets/`, `downloads/`. (`draft.html`, `server.js`, `tools/`, `node_modules/` are not needed.)
3. Serve them with any static web server. Nginx example:
   ```nginx
   server {
     listen 80;
     server_name flipbook.example.gov.my;
     root /var/www/p2630;
     index index.html;
     location / { try_files $uri $uri/ =404; }
     location ~* \.(webp|woff2|mp3|js|css)$ { expires 30d; add_header Cache-Control "public"; }
     location /downloads/ { add_header Content-Disposition "attachment"; }
   }
   ```
   `woff2` and `webp` need their MIME types (`font/woff2`, `image/webp`); current Nginx and Apache include both.

GitHub Pages runs the same steps in `.github/workflows/deploy.yml`.

## Offline download ("Download flipbook")

`tools/build-standalone.js` writes one self-contained HTML file per book to `downloads/` (reader only: every page image, font, script and the sound inlined). It opens by double-click with no server and no internet. Rebuild it whenever pages change; `npm run dev` and CI do this automatically. Page images in the download are re-encoded to 1600px wide, WebP quality 75 (the website keeps the originals), so a 35-page book is about 4–5 MB.

## QA
Before release, work through [`plan.md`](plan.md) (Phase 4 QA checklist) once every page
has been uploaded.

## Embed into another page (optional)
```html
<iframe src="/p2630/strategy.html" width="100%" height="800" style="border:0"></iframe>
```
The iframe isolates the flipbook's CSS/JS from the parent page — no conflicts.
