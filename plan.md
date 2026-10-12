# Plan — MCMC P2630 Two-Book Flipbook

Replaces the old single-book `QA-CHECKLIST.md` scope. Ticks mean **browser-verified**, not just "code changed".

- **Design source:** Figma `Flipbook-P2630`, node `47:341` (landing, 1624×2437)
- **Inspiration:** https://press.stripe.com/ — quiet editorial layout, big 3D book that tilts on hover, book "lifts" toward the viewer before opening
- **Books:**
  1. **Advancing Inclusivity** (Strategy Plan): blue `#3152C8` section, white text
  2. **Action Plan**: light `#EAEEFA` section, navy `#172983` text

---

## Phase 0 — Foundation & data

- [ ] Add `books.json` (or `js/books.js`): `id`, title, eyebrow, subtitle, description, cover/back/spine, page folder, PDF path, theme colours.
- [ ] Assets per book: `assets/books/<id>/cover-front.webp`, `cover-back.webp`, `spine.webp`, `page-NN.webp` (2-digit, 1920×1080, 16:9).
- [ ] Move the current Strategy Plan pages into `assets/books/advancing-inclusivity/`.
- [ ] Make `tools/scan-pages.js` scan each book folder → `js/pages.js` exports `{ [bookId]: manifest }`.
- [ ] `reader.html?book=<id>` loads the right manifest. Unknown/missing id → redirect to landing.
- [ ] Action Plan: use placeholder pages until the real assets arrive (mark them as a sample in the README).
- [ ] Do not commit the reference PDFs unless we decide to (see Phase 2 PDF button).

## Phase 1 — Landing page (Figma 47:341)

Layout, top to bottom:
- [ ] Header: MCMC logo top-left (small, inside the blue section).
- [ ] **Section 1 (blue):** 3D book on the left, text column on the right: eyebrow "MCMC PLAN 2026–2030", H1, subtitle "Malaysian Communications and Multimedia Commission", outlined **Open Flipbook** button, description paragraph, then the **PDF card** (outlined box with mini title block and a `⬇ PDF` button top-right).
- [ ] **Section 2 (light):** same layout for the Action Plan, with the colours inverted.
- [ ] Each section is ~100svh tall on desktop. Stack it at ≤900px: book on top, text below.
- [ ] Typography: Host Grotesk for headings, Inter for body. Pull the exact sizes, spacing and colours from Figma variables (`get_design_context` / `get_variable_defs`).
- [ ] Generalise the 3D book (`js/book-3d-source.js`) so it can render **N instances** with different textures. Use one shared renderer per canvas, or a lazily created canvas per section.

UI enhancements (Stripe Press feel):
- [ ] Hover/pointer tilt with eased lerp. The book idles with a slow float.
- [ ] Scroll-driven reveal: the book rotates from a slight angle to face-on as its section enters the view, and the text fades and slides up (IntersectionObserver).
- [ ] Section background colour transitions smoothly as you scroll between books.
- [ ] Clicking **Open Flipbook** (or the book) plays an *open transition*: the book moves to the centre and scales up, the cover swings open, then we go to `reader.html?book=<id>` (View Transitions API where supported, a fade fallback otherwise).
- [ ] Soft contact shadow under each book, plus a subtle page-edge thickness/texture.
- [ ] Buttons: outlined style from Figma with hover fill, focus ring and active press.
- [ ] Lazy-load the second book's textures. Show a static `<img>` cover fallback when WebGL is unavailable.
- [ ] `prefers-reduced-motion`: no tilt, float or scroll rotation. The open transition becomes a simple fade.

## Phase 2 — Reader (`reader.html`) UI enhancements

- [ ] Theme the reader by book (the blue or the light palette comes from book config).
- [ ] Top bar: back-to-library link (←), book title, page readout `XX / NN`, and a PDF download button.
- [ ] Bottom toolbar: prev/next, a scrubber/progress bar with a thumbnail preview on hover, TOC, zoom, fullscreen. Use glassy/blurred bar styling and auto-hide when idle (show again on mouse move or tap).
- [ ] TOC panel: thumbnail grid, active page highlighted, quick jump. Optional: section names from config.
- [ ] Loading state: cover skeleton + progress, and preload the ±2 neighbouring pages.
- [ ] Remember the last page per book (`localStorage`, wrapped in try/catch). Add a deep link `#page=NN`.
- [ ] Keyboard: ←/→, Home/End, `+`/`−`, `F`, `T` (TOC), `Esc`.
- [ ] Mobile: swipe, pinch-zoom, safe-area insets, controls ≥44px.

## Phase 3 — Flipbook effect enhancements

- [ ] Realistic page curl: dynamic gradient shading on the fold, a highlight on the curl ridge, and a drop shadow cast onto the page underneath.
- [ ] Paper feel: subtle paper-grain overlay, a gutter shadow near the spine, and slight page-thickness edges that grow or shrink with progress.
- [ ] Physics: easing tuned for the "soft paper" turn. Velocity-based flick (fast swipe = full turn, slow drag = follow the finger, release under 50% = fall back).
- [ ] Corner hint: on hover, the page corner peels slightly to suggest it can be dragged.
- [ ] Cover open/close has a heavier, slower turn than inner pages (hard-cover feel).
- [ ] Optional page-turn sound (off by default, toggle in the toolbar).
- [ ] Zoomed state: pan with drag, and page turns disabled until zoom = 100%.
- [ ] Performance: 60fps on a mid-range phone, GPU transforms only, and images decoded ahead (`img.decode()`).
- [ ] Decide on the engine: keep StPageFlip and tune it, or move to a custom WebGL/three.js page curl that shares the landing renderer. Spike this first and pick based on quality vs effort.

## Phase 4 — QA (carried over from QA-CHECKLIST.md, now per book)

For **each** book:
- [ ] Assets valid (16:9, 1920×1080, continuous `page-NN`, no merged spreads), and the manifest count matches.
- [ ] One page at a time on desktop, tablet and mobile. Covers are centred.
- [ ] Drag, buttons and keys all turn exactly one page. Fast flipping never sticks or skips.
- [ ] TOC lists Front cover → Page 01…NN → Back cover. Jumping works and the active page is highlighted.
- [ ] Zoom and fullscreen work without breaking turns.
- [ ] No vertical overflow or horizontal clipping at 320 / 768 / 1280 / 1920 widths.
- [ ] Brand palette is accurate (navy `#172983`, blue `#4159D5`, light blue `#D0DDF4`, neutral `#E5E7ED`, gradient).

Global:
- [ ] Landing matches Figma 47:341 (side-by-side screenshot check at 1624px).
- [ ] Landing → reader → back to landing works for both books.
- [ ] PDF buttons download the correct file.
- [ ] No console errors and no 404s. Works inside an iframe and when deployed.
- [ ] Lighthouse: Performance ≥ 85, Accessibility ≥ 95.
- [ ] Reduced motion respected everywhere.

## Open questions

1. Final Action Plan page images and PDF: when will they be ready?
2. Should the PDFs be hosted in the repo or behind an external URL?
3. Page-turn sound: yes or no?
4. Flip engine: tune StPageFlip, or a custom WebGL curl?

## Suggested order

Phase 0 → Phase 1 (layout first, then the 3D/motion work) → Phase 3 spike → Phase 2 → Phase 3 polish → Phase 4.
