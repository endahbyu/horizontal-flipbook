# QA Checklist — MCMC Licensing 2025 Flipbook

A pre-release checklist to run once **every page has been uploaded**. Work through
it top to bottom and tick items only after verifying them live in a browser.

## How to use

- **Local preview:** `cd ~/projects/mcmc-flipbook && python3 -m http.server 8878`,
  then open `http://localhost:8878/`.
- **Deployed build:** test the live URL as well — relative paths can behave
  differently once hosted.
- Tick `[x]` when confirmed. Re-check any section after a change to `js/main.js`,
  `css/*.css`, or the page images.

---

## 1. Assets (before opening the book)

- [ ] Every page exists as `assets/img/page-NNN.webp` (3-digit, zero-padded) and
      runs continuously from `001` with no gaps.
- [ ] The number of `page-NNN.webp` files matches the number of entries in the
      `PAGES` array in `js/main.js`.
- [ ] `page-001.webp` is the **front cover** and the last `page-NNN.webp` is the
      **back cover**.
- [ ] All images are **portrait** and the **same dimensions** (target 2481×3508).
      Mixed sizes cause inconsistent page heights.
- [ ] Total page count is **EVEN** — an odd count pairs the back cover with the
      previous page instead of showing it alone.
- [ ] Each entry's `title` and `type` in the `PAGES` array is the final, approved
      text (these drive the TOC and the "Direct access" grid).
- [ ] "Wave of Connectivity" appears on **even-numbered** pages (`page-002`,
      `page-004`, …) — the left page of each spread.

## 2. Cover behaviour

- [ ] On first load, the front cover shows as a **single page, centered** (not
      stuck to the left).
- [ ] Flipping the front cover opens to the 2-page spread (pages 2–3).
- [ ] At the end, the back cover closes as a **single page, centered**.
- [ ] Cover front/back flip with the **same soft-paper effect** as every other
      page (no thick/hard-board look, no vertical "lift" on flip).

## 3. Core interaction

- [ ] Drag a page corner to turn works in both directions.
- [ ] "Previous spread" / "Next spread" buttons work.
- [ ] ← → arrow keys turn pages; `+`/`−` zooms; `F` toggles fullscreen.
- [ ] No page gets stuck or skips when flipping quickly.
- [ ] The readout below the book shows the correct `XX / YY` on every page.

## 4. Table of contents & contents grid

- [ ] TOC button opens the "Table of contents" panel.
- [ ] Every page is listed with the correct number + title.
- [ ] Clicking a TOC entry jumps to the correct page and closes the panel.
- [ ] "Direct access" contents grid lists every page with number + title + type.
- [ ] Clicking a contents item jumps to the correct page.
- [ ] The current page is highlighted in both lists (`aria-current`).

## 5. Zoom & fullscreen

- [ ] Zoom in/out works and the "current zoom" status updates.
- [ ] Zoomed view does not clip the book or break page turning.
- [ ] Fullscreen opens and exits cleanly; flipping still works inside fullscreen.

## 6. Responsive & layout

- [ ] Desktop / landscape: shows a **2-page spread**.
- [ ] Mobile / portrait: shows a **single page** (`usePortrait`).
- [ ] The book never overflows the viewport vertically; no scroll needed to see
      a full page.
- [ ] No clipping of the book; the page shadow looks clean (not dark/cut off).
- [ ] No rubber-band / scroll-jump when turning pages on mobile touch.
- [ ] Nav links (Report / Contents / How to use) hide below 1024px; the
      "Licensing 2025" brand stays visible.

## 7. Design & typography

- [ ] Instrument Serif + Newsreader load from `css/fonts.css` (no system-font
      flash / fallback).
- [ ] Masthead, hero ("A report you can hold."), sections and footer match the
      editorial design.
- [ ] Fluid `clamp()` text ("Industry Performance Report 2025", section
      headings) stays readable at every width.
- [ ] No broken images or missing assets anywhere on the page.

## 8. Performance (final ~213+ page build)

- [ ] Each `page-NNN.webp` is reasonably compressed (a few hundred KB max each).
- [ ] Initial load is acceptable (ideally < 3–4s on a normal connection).
- [ ] Turning pages stays smooth on a mid-range phone (no visible lag).
- [ ] (If lazy-loading is added) pages load on demand with no blank pages during
      fast flipping.

## 9. Cross-browser

- [ ] Chrome (desktop) — all checks pass.
- [ ] Safari (desktop + iOS) — all checks pass.
- [ ] Firefox (desktop) — all checks pass.
- [ ] Edge (desktop) — all checks pass.
- [ ] Android Chrome — responsive + touch checks pass.

## 10. Deployment

- [ ] No errors in the browser console (Console and Network tabs clean).
- [ ] All relative asset paths resolve on the deployed URL (no 404s for
      `assets/…`, `css/…`, `js/…`).
- [ ] Works when embedded as a subpage / iframe on the MCMC site (CSS/JS
      isolated, no collision with the parent page).
- [ ] Deployed URL is live and matches the latest commit.

---

## Sign-off

| Section | Tester | Date | Result |
|---|---|---|---|
| Assets | | | |
| Cover behaviour | | | |
| Core interaction | | | |
| TOC & contents | | | |
| Zoom & fullscreen | | | |
| Responsive | | | |
| Design & typography | | | |
| Performance | | | |
| Cross-browser | | | |
| Deployment | | | |

- [ ] All blockers resolved and re-tested.
- [ ] Approved for release by ________ on ________.
