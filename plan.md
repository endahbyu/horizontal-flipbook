# Plan — MCMC P2630 Two-Book Flipbook

Single source of truth: the build plan **and** the QA checklist (merged from the old `QA-CHECKLIST.md`).

> Distinguish planned, implemented and browser-verified items. Tick `[x]` only after verifying live in a browser, never just because code changed.

**How to test:** `npm run dev`, then open `http://localhost:3000/index.html` (landing) and `http://localhost:3000/strategy.html` and `/action-plan.html` (flipbooks). Test the deployed URL too, because relative paths can behave differently once hosted. Re-check the affected sections after changing `js/*`, `css/*` or page images, or after re-running `node tools/scan-pages.js`.

- **Design source:** Figma `Flipbook-P2630`, node `47:341` (landing, 1624×2437)
- **Inspiration:** https://press.stripe.com/ — quiet editorial layout, big 3D book that tilts on hover, book "lifts" toward the viewer before opening
- **Books:**
  1. **Advancing Inclusivity** (Strategy Plan): blue `#3152C8` section, white text
  2. **Action Plan**: light `#EAEEFA` section, navy `#172983` text

---

## Phase 0 — Foundation & data ✅

- [x] Rename `reader.html` → `strategy.html` and add `action-plan.html`. Each picks its book via `<body data-book>`. `/reader.html` redirects (301) to `/strategy.html`.
- [x] Add `css/tokens.css` (primitive → semantic → per-book theme). Components use semantic tokens only.
- [x] Assets per book in `assets/books/<strategy|action-plan>/` (agreed naming, see 4.1). `scan-pages.js` writes one manifest per book, and each reader loads its own.
- [x] Action Plan: real front cover (1920×1080); back cover + spine copied from Strategy until its own arrive. No content pages yet, so the reader shows the covers only.
- [ ] Optional: move per-book copy (title, description, PDF path) into one `js/books.js` so the landing and readers don't repeat it.
- [x] Reader: the PDF button is replaced by **Download flipbook**: a single self-contained HTML per book (`tools/build-standalone.js` → `downloads/`), reader only, opens offline by double-click.
- [x] No external requests: Host Grotesk self-hosted (`assets/fonts/`, OFL 1.1); Google Fonts and the unused serif fallback fonts removed. Handoff/deploy notes in README.

## Phase 1 — Landing page (Figma 56:361) — layout ✅, motion pending

- [x] **1a. Layout:** `index.html` is the landing page (`draft.html` = static draft). Matches Figma 56:361 at 1624px and 390px.
- [x] **1b. 3D books:** one 3D book per section (Strategy + Action Plan), with a flat-cover fallback when WebGL or textures fail. Strategy cover brightened (`COVER_GLOW`).
- [x] Colours, type and buttons from Figma 56:361 as semantic tokens.
- [ ] **1c. Motion (Stripe Press feel)** ← **next**
  - [x] Book is still at rest; it tilts only while the pointer is over it (desktop pointers only). No idle float.
  - [x] Scroll reveal: book turns to its rest angle and the text fades/slides up (staggered) as each section enters the view.
  - [x] ~~Contact shadow~~ removed at review.
  - [x] 3D book stays hidden until its textures are drawn, then fades in (300ms; opacity only with reduced motion).
- [x] Each book starts (renderer + textures) only when near the viewport, and stops rendering when off-screen.
  - [x] `prefers-reduced-motion`: no float, tilt, reveal or text animation (open transition: fade, when built).
- [x] PDF button: dimmed "coming soon" state until the PDF exists.
- [ ] Replace the 72px logo with an SVG or hi-res version.

## Phase 2 — Reader (`strategy.html` / `action-plan.html`) UI ✅

Both readers are generated from one template (same markup, different `data-book` and copy). Styles: `css/reader.css`, semantic tokens only. The old `css/style.css` was removed.

- [x] Theme by book: background follows the landing section colour (`--color-reader-bg`). Host Grotesk throughout.
- [x] Top bar: ← Homepage, book title, PDF button (placeholder).
- [x] Book sized to the space between the top bar and the toolbar; no page scroll at 320–1920px.
- [x] Glass toolbar: contents, previous, page scrubber with thumbnail preview, readout `XX / NN`, next, zoom, fullscreen. Auto-hides after ~3s idle on desktop; any pointer move, key or focus brings it back.
- [x] Contents: two-column thumbnail grid, current page highlighted, focus kept inside while open.
- [x] Loading: shimmer placeholder until the first page decodes; only pages within ±2 of the current one are downloaded.
- [x] Always opens at the front cover; deep link `#page=NN`, kept in sync while reading.
- [x] Keyboard: ←/→, Home/End, `+`/`−`, `F`, `T` (contents), `Esc`.
- [x] Mobile: 44px controls, safe-area insets; zoom and fullscreen hidden (pinch-zoom and the browser's own fullscreen still work).
- [ ] Section names in the contents (needs the chapter list per book).

## Phase 3 — Flipbook effect (StPageFlip, tuned) ✅

Decision: keep StPageFlip and tune it, instead of a custom WebGL page curl.

- [x] Page curl shading: fold highlight, shadow cast onto the page underneath (`drawShadow`, `maxShadowOpacity: 0.45`).
- [x] Corner hint: the page corner lifts on hover (`showPageCorners`).
- [x] Soft-blue endpaper before the back cover, so closing the book is visible.
- [x] Covers are turned by our own 3D cover board (StPageFlip's portrait hard turn starts already showing the board's back). Open: the front cover swings on the spine, navy inside (`--color-cover-inside`), onto page 1. Close: the last leaf lifts on the spine and, once upright, glides to the centre while it keeps turning, landing as the back cover with nothing underneath (1.1s; fade only with reduced motion). Both reverse; taps, swipes, keys and buttons all use it.
- [x] Drag-to-turn: both directions turn past halfway or on a quick flick (> 0.5 px/ms), and spring back otherwise. Before, forward drags needed the full page width and backward drags turned almost always.
- [x] Turn speed 850ms (300ms with reduced motion).
- [x] Zoom 100 / 125 / 150 / 200%: drag pans the page instead of turning it; double-click or `0` returns to 100%. Turning a page re-centres it.
- [x] Touch: quick swipes (< 250ms) and slow drags both work.
- [x] Pages preloaded ±2 around the current one (Phase 2).
- [x] Page-turn sound: one recorded sample (`assets/sounds/page-turn.mp3`, 11 KB) played with Web Audio by `js/reader-sound.js` (no library). One sound per single-page turn, slight pitch variation, covers a touch lower; scrubber/contents jumps stay silent. Speaker toggle in the bottom toolbar, off until the viewer turns it on (`p2630:sound`).
- [ ] Paper grain / gutter shadow — skipped: the page images carry their own design, an overlay would muddy them.

## Phase 4 — QA checklist (run for **each** book)

### 4.1 Assets & manifest

**Naming convention (agreed):** the folder tells the books apart, and file names stay the same in every book.
`assets/books/<strategy|action-plan>/` → `cover-front.webp`, `cover-back.webp`, `spine.webp`, `page-02.webp` … `page-NN.webp` (numbering starts at 02 because the front cover is page 01). Use lowercase with hyphens, 2 digits (both books have fewer than 99 pages), and 1920×1080. The number matches the reader readout (`02 / 35` = `page-02.webp`).

- [ ] `cover-front.webp` and `cover-back.webp` exist (1920×1080, 16:9).
- [ ] Content pages are named `page-NN.webp`: strictly 2-digit, zero-padded (`page-02` … `page-NN`), continuous from `02` with no gaps, and no 3-digit names.
- [ ] Every asset is one independent 16:9 page. No merged PDF pages, no spreads or two-page compositions.
- [ ] Every image is exactly 1920×1080.
- [ ] Missing PDF pages are not fabricated or silently added.
- [ ] After adding or removing pages, `node tools/scan-pages.js` has been re-run and the page count in `js/pages.js` matches the files.
- [ ] Sample status is documented (Strategy Plan: currently 12 pages = cover + 10 + back, out of 64; Action Plan: placeholder until assets arrive).

### 4.2 Reading format & covers
- [ ] **One page at a time** on desktop, tablet and mobile. Two pages are never shown side by side.
- [ ] First load shows the front cover as a single centred 16:9 page. Turning it opens Page 01.
- [ ] The back cover shows as a single centred 16:9 page at the end.
- [ ] Every page flips with the soft paper animation (see Phase 3).

### 4.3 Interaction & navigation
- [ ] Dragging a page corner turns forward and backward.
- [ ] Prev/next buttons and ←/→ keys move exactly one page. `+`/`−` zooms, `F` toggles fullscreen.
- [ ] Flipping fast never sticks or skips a page.
- [ ] The readout shows the individual page position (`XX / NN`).

### 4.4 Table of contents
- [ ] The TOC button opens the slide-in panel.
- [ ] It lists Front cover → Page 01…NN → Back cover, with 16:9 thumbnails.
- [ ] Clicking an entry jumps to the correct page and closes the panel.
- [ ] The active page is highlighted (`aria-current`).

### 4.5 Zoom & fullscreen
- [ ] Zoom in/out works and the zoom % status updates.
- [ ] Zoom keeps the 16:9 canvas without clipping or breaking page turns.
- [ ] Fullscreen opens and exits cleanly, and pages still turn inside it.

### 4.6 Responsive & layout
- [ ] No vertical overflow and no horizontal clipping at 320 / 768 / 1280 / 1920 widths.
- [ ] Covers and pages keep their 16:9 ratio.
- [ ] No rubber-band or scroll-jump when turning pages by touch.
- [ ] The P2630 brand stays visible on desktop and mobile.

### 4.7 Landing page
- [ ] Matches Figma 47:341 (side-by-side screenshot check at 1624px).
- [ ] Both 3D books load with 16:9 cover proportions. Tilt and click-rotate work and return to rest.
- [ ] Each **Open Flipbook** opens `strategy.html` / `action-plan.html` for the correct book. Back-to-library returns to the landing page.
- [ ] Each PDF button downloads the correct file.

### 4.8 Design & typography
- [ ] Titles and headings are readable at every width.
- [ ] Palette is accurate: navy `#172983`, blue `#4159D5`, light blue `#D0DDF4`, neutral `#E5E7ED`, gradient, and the Figma section blues.
- [ ] No broken images or missing assets.
- [ ] Reduced motion is respected everywhere.

### 4.9 Deployment & integrity
- [ ] No console errors and no 404s.
- [ ] Works when embedded as an iframe and on the deployed URL.
- [ ] Lighthouse: Performance ≥ 85, Accessibility ≥ 95.
- [ ] Reference PDFs are only committed if we decide to (see Open questions).

### Sign-off

| Section | Book | Tester | Date | Result |
|---|---|---|---|---|
| 4.1 Assets & manifest | | | | |
| 4.2 Reading format | | | | |
| 4.3 Interaction | | | | |
| 4.4 TOC | | | | |
| 4.5 Zoom & fullscreen | | | | |
| 4.6 Responsive | | | | |
| 4.7 Landing | | | | |
| 4.8 Design | | | | |
| 4.9 Deployment | | | | |

- [ ] All blockers resolved and re-tested.
- [ ] Approved for release by ________ on ________.

## Open questions

1. Final Action Plan page images and PDF: when will they be ready?
2. Should the PDFs be hosted in the repo or behind an external URL?
3. ~~Page-turn sound: yes or no?~~ Yes, one recorded sample (see Phase 3).
4. Flip engine: tune StPageFlip, or a custom WebGL curl?

## Suggested order

Phase 0 → Phase 1 (layout first, then the 3D/motion work) → Phase 3 spike → Phase 2 → Phase 3 polish → Phase 4.
