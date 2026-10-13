(function () {
  "use strict";

  /* ============================================================
     PAGE MANIFEST
     tools/scan-pages.js writes one manifest per folder in
     assets/books/<bookId>/. Each reader page picks its book via
     <body data-book="strategy"> or <body data-book="action-plan">.
       cover-front.webp, cover-back.webp, page-NN.webp
     ============================================================ */
  var bookId = document.body.dataset.book;
  var manifest = (window.FLIPBOOK_MANIFESTS || {})[bookId] || { pages: [] };
  var contentFiles = manifest.pages || [];

  function pad2(n) { return String(n).padStart(2, "0"); }

  // In single-page 16:9 mode, every asset is an independent page rendered
  // one at a time. Missing covers are skipped rather than shown blank.
  var PAGES = [];
  if (manifest.coverFront) PAGES.push({ type: "Cover", title: "Front cover", src: manifest.coverFront });
  // The title comes from the file name (page-02.webp → "Page 02"): the front
  // cover is page 01, so content pages are numbered from 02.
  contentFiles.forEach(function (file) {
    var number = (/page-(\d+)\.webp$/.exec(file) || [])[1];
    PAGES.push({ type: "Content", title: "Page " + number, src: file });
  });
  // A blank soft-blue endpaper before the back cover, so closing the book
  // reads as a page turning onto the inside of the back board.
  if (manifest.coverBack) {
    if (contentFiles.length) PAGES.push({ type: "Endpaper", title: "Endpaper", src: null });
    PAGES.push({ type: "Back cover", title: "Back cover", src: manifest.coverBack });
  }

  // No assets yet for this book: show the empty state and stop.
  if (!PAGES.length) {
    document.body.classList.add("is-empty");
    return;
  }

  var bookEl = document.getElementById("book");
  var bookFrame = document.getElementById("bookFrame");
  var total = PAGES.length;

  /* ============================================================
     START PAGE
     Always the front cover, unless the link asks for #page=NN.
     ============================================================ */
  function readStartIndex() {
    var match = /(?:^#|&)page=(\d+)/.exec(window.location.hash);
    return match ? clamp(parseInt(match[1], 10) - 1, 0, total - 1) : 0;
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(v, max)); }

  var startIndex = readStartIndex();

  /* ============================================================
     BUILD StPageFlip PAGES (HTML mode)
     Images get their src only when they are within two pages of
     the current one, so long books don't download every page up front.
     ============================================================ */
  var PRELOAD_RADIUS = 2;
  var pageImages = [];

  var pageNodes = PAGES.map(function (page, i) {
    var p = document.createElement("div");
    var cls = "page";
    if (page.type === "Cover") cls += " is-front-cover";
    else if (page.type === "Back cover") cls += " is-back-cover";
    p.className = cls;
    p.setAttribute("data-page-type", page.type);

    var front = document.createElement("div");
    front.className = "page-face page-front";

    if (page.src) {
      var img = document.createElement("img");
      img.alt = page.title;
      img.draggable = false;
      img.decoding = "async";
      front.appendChild(img);
      pageImages[i] = img;
    } else {
      p.className += " is-endpaper";
    }

    p.appendChild(front);
    bookEl.appendChild(p);
    return p;
  });

  function preloadAround(index) {
    for (var i = index - PRELOAD_RADIUS; i <= index + PRELOAD_RADIUS; i++) {
      var img = pageImages[i];
      if (img && !img.getAttribute("src")) img.src = PAGES[i].src;
    }
  }
  preloadAround(startIndex);

  // Hide the loading skeleton once the first visible page has an image.
  (function watchFirstPage() {
    var img = pageImages[startIndex];
    var done = function () { document.body.classList.add("is-loaded"); };
    if (!img || (img.complete && img.naturalWidth)) done();
    else {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    }
  })();

  /* ============================================================
     INITIALIZE StPageFlip (single 16:9 page)
     ============================================================ */
  var PAGE_RATIO = 16 / 9;
  var topBar = document.querySelector(".reader-top");
  var controls = document.getElementById("controls");

  var settings = {
    width: 800,
    height: 450,
    size: "fixed",
    minWidth: 260,
    maxWidth: 1600,
    minHeight: 146,
    maxHeight: 900,
    maxShadowOpacity: 0.45,  // depth of the fold and page-under shadows
    showCover: false,        // Each cover is an individual 16:9 page
    usePortrait: true,       // Single-page reading at every width
    drawShadow: true,
    // A little slower reads as heavier paper; reduced motion keeps turns short.
    flippingTime: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 300 : 850,
    swipeDistance: 30,       // a short flick is enough to turn on touch
    mobileScrollSupport: false,
    disableFlipByClick: false,
    showPageCorners: true,   // corner lifts slightly on hover to show it can be dragged
    startPage: startIndex
  };

  function syncPageFrameSize(size) {
    if (bookFrame) bookFrame.style.setProperty("--page-width", size.width + "px");
  }

  // Fit the page into the space left between the top bar and the toolbar.
  function computePageSize() {
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var inFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    var arrows = window.matchMedia("(max-width: 640px)").matches ? 0 : 2 * clamp(vw * 0.06, 44, 80);
    var chromeH = (inFullscreen ? 0 : topBar.offsetHeight) + controls.offsetHeight + 20 + 20 + 24;

    var maxW = clamp(vw - arrows - 32, 240, 1600);
    var maxH = clamp(vh - chromeH, 135, 900);

    var pageW = maxW;
    var pageH = pageW / PAGE_RATIO;
    if (pageH > maxH) {
      pageH = maxH;
      pageW = pageH * PAGE_RATIO;
    }
    return { width: Math.round(pageW), height: Math.round(pageH) };
  }

  (function initSize() {
    var s = computePageSize();
    settings.width = settings.minWidth = settings.maxWidth = s.width;
    settings.height = settings.minHeight = settings.maxHeight = s.height;
    syncPageFrameSize(s);
  })();

  var pageFlip = new St.PageFlip(bookEl, settings);
  pageFlip.loadFromHTML(pageNodes);

  /* ============================================================
     DRAG-TO-TURN THRESHOLD
     StPageFlip only completes a forward drag once the fold passes the
     page's left edge (a full-width drag), and completes almost any
     backward drag. Make both directions turn past halfway, or on a
     quick flick, and spring back otherwise.
     ============================================================ */
  var FLICK_SPEED = 0.5; // px per ms
  var dragTrack = [];

  bookEl.addEventListener("pointerdown", function (e) { dragTrack = [{ x: e.clientX, t: e.timeStamp }]; });
  window.addEventListener("pointermove", function (e) {
    if (!dragTrack.length) return;
    dragTrack.push({ x: e.clientX, t: e.timeStamp });
    if (dragTrack.length > 6) dragTrack.shift();
  }, { passive: true });
  window.addEventListener("pointerup", function () { setTimeout(function () { dragTrack = []; }, 0); });

  function releaseVelocity() {
    if (dragTrack.length < 2) return 0;
    var a = dragTrack[0], b = dragTrack[dragTrack.length - 1];
    return b.t > a.t ? (b.x - a.x) / (b.t - a.t) : 0;
  }

  (function tuneDragRelease() {
    var flip = pageFlip.getFlipController();
    flip.stopMove = function () {
      if (this.calc === null) return;
      var pos = this.calc.getPosition();
      var rect = this.getBoundsRect();
      var y = this.calc.getCorner() === "bottom" ? rect.height : 0;
      var forward = this.calc.getDirection() === 0;
      var v = releaseVelocity();
      var turn = forward
        ? pos.x <= rect.pageWidth * 0.5 || v < -FLICK_SPEED
        : pos.x <= -rect.pageWidth * 0.5 || v > FLICK_SPEED;
      if (turn) this.animateFlippingTo(pos, { x: -rect.pageWidth, y: y }, true);
      else this.animateFlippingTo(pos, { x: rect.pageWidth, y: y }, false);
    };
  })();

  // Paper pages bend; the covers are turned by the cover board below.
  for (var d = 0; d < pageFlip.getPageCount(); d++) {
    var pg = pageFlip.getPage(d);
    if (pg) {
      pg.setDensity("soft");
      pg.setDrawingDensity("soft");
    }
  }

  function resizeBook() {
    var s = computePageSize();
    var is = pageFlip.getSettings();
    is.width = is.minWidth = is.maxWidth = s.width;
    is.height = is.minHeight = is.maxHeight = s.height;
    syncPageFrameSize(s);
    pageFlip.update();
    applyBookTransform();
  }
  window.addEventListener("resize", resizeBook);

  /* ============================================================
     READOUT, SCRUBBER, NAV STATE
     ============================================================ */
  var pageReadout = document.getElementById("pageReadout");
  var scrubber = document.getElementById("pageScrubber");
  var nextBtn = document.getElementById("nextButton");
  var prevBtn = document.getElementById("prevButton");
  var nextControl = document.getElementById("nextControl");
  var prevControl = document.getElementById("prevControl");
  var zoomLevel = 1;

  scrubber.max = String(total);

  function pageLabel(index) {
    return PAGES[index].title;
  }

  // Zoom scales the page; pan moves it while zoomed (clamped to its edges).
  var pan = { x: 0, y: 0 };

  function clampPan() {
    var maxX = (bookEl.offsetWidth * (zoomLevel - 1)) / 2;
    var maxY = (bookEl.offsetHeight * (zoomLevel - 1)) / 2;
    pan.x = clamp(pan.x, -maxX, maxX);
    pan.y = clamp(pan.y, -maxY, maxY);
  }

  function applyBookTransform() {
    clampPan();
    bookEl.style.transform = zoomLevel !== 1
      ? "translate(" + pan.x + "px, " + pan.y + "px) scale(" + zoomLevel + ")"
      : "";
  }

  function updateMeta() {
    var idx = pageFlip.getCurrentPageIndex();
    pageReadout.textContent = pad2(idx + 1) + " / " + pad2(total);
    scrubber.value = String(idx + 1);
    scrubber.setAttribute("aria-valuetext", pageLabel(idx) + ", " + (idx + 1) + " of " + total);
    scrubber.style.setProperty("--progress", (total > 1 ? (idx / (total - 1)) * 100 : 100) + "%");

    var atStart = idx === 0;
    var atEnd = idx === total - 1;
    prevBtn.disabled = prevControl.disabled = atStart;
    nextBtn.disabled = nextControl.disabled = atEnd;

    document.querySelectorAll("#tocList button").forEach(function (btn) {
      btn.setAttribute("aria-current", String(Number(btn.dataset.page) - 1 === idx));
    });

    preloadAround(idx);

    if (window.history.replaceState) {
      window.history.replaceState(null, "", idx === 0 ? window.location.pathname : "#page=" + (idx + 1));
    }
  }

  /* ============================================================
     PAGE-TURN SOUND (js/reader-sound.js)
     One cue per single-page turn: open/close for the covers,
     forward/back for paper. Jumps (scrubber, contents) stay silent.
     ============================================================ */
  var sound = window.P2630Sound;
  var soundToggle = document.getElementById("soundToggle");
  var lastIndex = startIndex;

  if (sound) {
    soundToggle.setAttribute("aria-pressed", String(sound.isEnabled()));
    soundToggle.addEventListener("click", function () {
      var on = !sound.isEnabled();
      sound.setEnabled(on);
      soundToggle.setAttribute("aria-pressed", String(on));
    });
  } else {
    soundToggle.hidden = true;
  }

  function cueForTurn(from, to) {
    if (Math.abs(to - from) !== 1) return null;
    var last = total - 1;
    if (to > from) return from === 0 ? "open" : to === last ? "close" : "forward";
    return to === 0 ? "close" : from === last ? "open" : "back";
  }

  function onTurned() {
    var idx = pageFlip.getCurrentPageIndex();
    if (idx === lastIndex) return;
    var cue = cueForTurn(lastIndex, idx);
    if (sound && cue) sound.play(cue);
    lastIndex = idx;
    updateMeta();
    pan.x = pan.y = 0;
    applyBookTransform();
  }
  pageFlip.on("flip", onTurned);
  pageFlip.on("changeState", function (event) {
    var state = event.data;
    var isFlipping = state === "flipping" || state === "fold_corner" || state === "user_fold";
    if (!isFlipping) {
      delete bookEl.dataset.flipState;
      delete bookEl.dataset.flipDirection;
      return;
    }

    bookEl.dataset.flipState = state;

    var syncDirection = function () {
      // For mouse dragging, user_fold fires before StPageFlip creates its
      // calculation. Read the direction on the next frame instead.
      if (bookEl.dataset.flipState !== state) return;
      var calculation = pageFlip.getFlipController().getCalculation();
      if (!calculation || typeof calculation.getDirection !== "function") return;
      bookEl.dataset.flipDirection = calculation.getDirection() === 1 ? "prev" : "next";
    };

    syncDirection();
    if (state === "user_fold") requestAnimationFrame(syncDirection);
  });
  pageFlip.on("changeOrientation", applyBookTransform);

  /* ============================================================
     COVER BOARD
     StPageFlip's portrait "hard" turn starts already showing the back of
     the board, so the covers are turned by our own 3D board instead:
       open  — front cover swings open on the spine onto page 1
       close — the last sheet turns over into the back cover; nothing
               lies underneath, as when a real book is closed
     Both run backwards for the reverse turn.
     ============================================================ */
  var hasFrontCover = PAGES[0].type === "Cover";
  var hasBackCover = PAGES[total - 1].type === "Back cover";
  var REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var BOARD_MS = REDUCED_MOTION ? 200 : 900;
  var CLOSE_MS = REDUCED_MOTION ? 200 : 1100;
  var EASE_IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";

  // Keyframes for each cover move, written for the forward turn.
  function boardKeyframes(move) {
    if (REDUCED_MOTION) return move === "open"
      ? [{ opacity: 1 }, { opacity: 0 }]
      : [
          { opacity: 0, transform: "translateX(100%) rotateY(-180deg)" },
          { opacity: 1, transform: "translateX(100%) rotateY(-180deg)" },
        ];
    if (move === "open") return [{ transform: "rotateY(0deg)" }, { transform: "rotateY(-180deg)" }];
    // Close: the last leaf lifts on the spine; once it stands upright the
    // spine glides right while the leaf keeps turning, so the closed book
    // lands centred showing the back cover, without leaving the frame.
    return [
      { transform: "translateX(0) rotateY(0deg)", easing: "cubic-bezier(0.55, 0, 1, 0.45)" },
      { transform: "translateX(0) rotateY(-90deg)", offset: 0.45, easing: "cubic-bezier(0, 0.55, 0.45, 1)" },
      { transform: "translateX(100%) rotateY(-180deg)" },
    ];
  }
  var boardBusy = false;

  // Which cover move (if any) a single-page turn from `from` to `to` is.
  function coverMove(from, to) {
    if (Math.abs(to - from) !== 1) return null;
    var hi = Math.max(from, to);
    if (hasBackCover && hi === total - 1) return "close";
    if (hasFrontCover && hi === 1) return "open";
    return null;
  }

  function face(page, fallbackClass) {
    var el = document.createElement("div");
    el.className = "cover-board__face " + (page && page.src ? "" : fallbackClass);
    if (page && page.src) el.style.backgroundImage = "url(\"" + page.src + "\")";
    return el;
  }

  function turnCover(from, to) {
    var move = coverMove(from, to);
    var forward = to > from;
    var board = document.createElement("div");
    board.className = "cover-board cover-board--" + move;
    var front, back;
    if (move === "open") {
      front = face(PAGES[0]);
      back = face(null, "is-cover-inside");
    } else {
      front = face(PAGES[total - 2], "is-endpaper-face");
      back = face(PAGES[total - 1]);
    }
    back.classList.add("cover-board__back");
    board.appendChild(front);
    board.appendChild(back);

    boardBusy = true;
    if (sound) sound.play(cueForTurn(from, to));
    lastIndex = to; // sound handled here, not by the flip event
    if (move === "open") {
      // Page 1 lies under the board while the cover swings.
      if (forward) pageFlip.turnToPage(1);
    } else {
      bookEl.style.visibility = "hidden"; // nothing beneath a closed book
      bookFrame.classList.add("is-closing");
    }
    bookFrame.appendChild(board);

    var anim = board.animate(boardKeyframes(move), {
      duration: move === "open" ? BOARD_MS : CLOSE_MS,
      easing: move === "open" ? EASE_IN_OUT : "linear", // close eases per keyframe
      direction: forward ? "normal" : "reverse",
      fill: "both",
    });
    anim.onfinish = function () {
      pageFlip.turnToPage(to);
      bookEl.style.visibility = "";
      bookFrame.classList.remove("is-closing");
      board.remove();
      boardBusy = false;
      updateMeta();
    };
    updateMeta();
  }

  // Stop StPageFlip from starting a turn (drag, click, corner hint) that
  // the cover board owns; taps and swipes on those pages are handled below.
  (function guardCoverTurns() {
    var flip = pageFlip.getFlipController();
    var start = flip.start.bind(flip);
    flip.start = function (point) {
      var idx = pageFlip.getCurrentPageIndex();
      var dir = this.getDirectionByPoint(this.render.convertToBook(point));
      var to = dir === 0 ? idx + 1 : idx - 1;
      if (boardBusy || coverMove(idx, to)) return false;
      return start(point);
    };
  })();

  function turn(step) {
    if (boardBusy) return;
    var from = pageFlip.getCurrentPageIndex();
    var to = clamp(from + step, 0, total - 1);
    if (to === from) return;
    if (coverMove(from, to)) turnCover(from, to);
    else if (step > 0) pageFlip.flipNext("top");
    else pageFlip.flipPrev("bottom");
  }
  function next() { turn(1); }
  function prev() { turn(-1); }

  function goTo(index) {
    index = clamp(index, 0, total - 1);
    var from = pageFlip.getCurrentPageIndex();
    if (index === from || boardBusy) return;
    if (Math.abs(index - from) === 1) { turn(index - from); return; }
    // A jump (contents, Home/End, scrubber) goes straight to the page, like a
    // link. (pageFlip.flip(index) was blocked by the cover-board guard when
    // jumping from the cover, so jumps never moved.)
    preloadAround(index);
    pageFlip.turnToPage(index);
    onTurned();
  }

  // Taps and swipes on a page whose turn belongs to the cover board.
  (function coverGestures() {
    var down = null;
    bookFrame.addEventListener("pointerdown", function (e) { down = { x: e.clientX, y: e.clientY }; });
    bookFrame.addEventListener("pointerup", function (e) {
      if (!down || zoomLevel > 1) return;
      var dx = e.clientX - down.x;
      var rect = bookEl.getBoundingClientRect();
      down = null;
      var idx = pageFlip.getCurrentPageIndex();
      var step = Math.abs(dx) > 30 ? (dx < 0 ? 1 : -1) : (e.clientX > rect.left + rect.width / 2 ? 1 : -1);
      if (coverMove(idx, idx + step)) turn(step);
    });
  })();

  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);
  nextControl.addEventListener("click", next);
  prevControl.addEventListener("click", prev);

  // Scrubber: preview while dragging, turn the page on release.
  var preview = document.getElementById("scrubPreview");
  var previewImg = document.getElementById("scrubPreviewImg");
  var previewLabel = document.getElementById("scrubPreviewLabel");

  function showPreview() {
    var i = Number(scrubber.value) - 1;
    previewImg.hidden = !PAGES[i].src;
    if (PAGES[i].src) previewImg.src = PAGES[i].src;
    previewLabel.textContent = pageLabel(i);
    var ratio = total > 1 ? i / (total - 1) : 0;
    preview.style.setProperty("--preview-x", (scrubber.offsetLeft + 8 + ratio * (scrubber.offsetWidth - 16)) + "px");
    preview.hidden = false;
  }
  function hidePreview() { preview.hidden = true; }

  // Follow #page=NN links opened while the reader is already showing.
  window.addEventListener("hashchange", function () {
    var match = /(?:^#|&)page=(\d+)/.exec(window.location.hash);
    if (match) goTo(parseInt(match[1], 10) - 1);
  });

  scrubber.addEventListener("input", showPreview);
  scrubber.addEventListener("change", function () {
    hidePreview();
    goTo(Number(scrubber.value) - 1);
  });
  scrubber.addEventListener("blur", hidePreview);
  scrubber.addEventListener("pointerup", hidePreview);

  /* ============================================================
     CONTENTS (slide-in panel with thumbnails)
     ============================================================ */
  var tocList = document.getElementById("tocList");
  var tocPanel = document.getElementById("tocPanel");
  var tocBackdrop = document.getElementById("tocBackdrop");
  var tocButton = document.getElementById("tocButton");
  var tocClose = document.getElementById("tocClose");

  PAGES.forEach(function (page, i) {
    if (!page.src) return; // the endpaper isn't a contents entry
    var li = document.createElement("li");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.page = String(i + 1);

    var thumb = document.createElement("span");
    thumb.className = "toc-thumb";
    var img = document.createElement("img");
    img.src = page.src;
    img.alt = "";
    img.loading = "lazy";
    img.draggable = false;
    thumb.appendChild(img);

    var title = document.createElement("span");
    title.className = "toc-title";
    title.textContent = page.title;

    btn.appendChild(thumb);
    btn.appendChild(title);
    btn.addEventListener("click", function () {
      goTo(i);
      closeToc();
    });
    li.appendChild(btn);
    tocList.appendChild(li);
  });

  // List view: the book's printed table of contents (js/toc.js).
  var tocOutline = document.getElementById("tocOutline");
  var outline = (window.FLIPBOOK_TOC || {})[bookId] || [];
  var BRAND = "MCMC P2630";

  function indexForPage(n) {
    if (n <= 1) return 0;
    var file = "page-" + pad2(n) + ".webp";
    for (var k = 0; k < PAGES.length; k++) {
      if (PAGES[k].src && PAGES[k].src.slice(-file.length) === file) return k;
    }
    return -1;
  }

  outline.forEach(function (entry) {
    var target = indexForPage(entry.page);
    var li = document.createElement("li");
    li.className = "toc-entry toc-entry--l" + (entry.level || 1);
    var btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.index = String(target);

    var title = document.createElement("span");
    title.className = "toc-entry__title";
    // Brand name in italic accent, built with text nodes (no innerHTML).
    entry.title.split(BRAND).forEach(function (part, n) {
      if (n > 0) {
        var em = document.createElement("em");
        em.className = "toc-brand";
        em.textContent = BRAND;
        title.appendChild(em);
      }
      if (part) title.appendChild(document.createTextNode(part));
    });
    var leader = document.createElement("span");
    leader.className = "toc-entry__leader";
    leader.setAttribute("aria-hidden", "true");
    var num = document.createElement("span");
    num.className = "toc-entry__page";
    num.textContent = String(entry.page);

    btn.appendChild(title);
    btn.appendChild(leader);
    btn.appendChild(num);
    if (target < 0) {
      btn.disabled = true;
    } else {
      btn.addEventListener("click", function () {
        goTo(target);
        closeToc();
      });
    }
    li.appendChild(btn);
    tocOutline.appendChild(li);
  });

  // Highlight the section the reader is in: last entry starting at or before this page.
  function markOutline(idx) {
    var best = null;
    tocOutline.querySelectorAll("button").forEach(function (btn) {
      var t = Number(btn.dataset.index);
      btn.removeAttribute("aria-current");
      if (t >= 0 && t <= idx) best = btn;
    });
    if (best) best.setAttribute("aria-current", "true");
  }

  function isTocOpen() { return !tocPanel.hidden; }

  // One panel, two views: "grid" (thumbnails) and "list" (page names only).
  var tocListButton = document.getElementById("tocListButton");
  var tocTrigger = tocButton;

  function openToc(view) {
    view = view || "grid";
    tocTrigger = view === "list" ? tocListButton : tocButton;
    tocPanel.dataset.view = view;
    document.getElementById("tocPanelTitle").textContent = view === "list" ? "Contents" : "Thumbnails";
    tocPanel.hidden = false;
    tocBackdrop.hidden = false;
    requestAnimationFrame(function () {
      tocPanel.classList.add("open");
      tocBackdrop.classList.add("open");
    });
    tocTrigger.setAttribute("aria-expanded", "true");
    var list = view === "list" && outline.length ? tocOutline : tocList;
    if (list === tocOutline) markOutline(pageFlip.getCurrentPageIndex());
    var current = list.querySelector('button[aria-current="true"]') || list.querySelector("button:not(:disabled)");
    if (current) current.focus({ preventScroll: false });
  }
  function closeToc() {
    if (!isTocOpen()) return;
    tocPanel.classList.remove("open");
    tocBackdrop.classList.remove("open");
    tocButton.setAttribute("aria-expanded", "false");
    tocListButton.setAttribute("aria-expanded", "false");
    setTimeout(function () {
      if (!tocPanel.classList.contains("open")) {
        tocPanel.hidden = true;
        tocBackdrop.hidden = true;
      }
    }, 260);
    tocTrigger.focus();
  }

  tocButton.addEventListener("click", function () { isTocOpen() ? closeToc() : openToc("grid"); });
  tocListButton.addEventListener("click", function () { isTocOpen() ? closeToc() : openToc("list"); });
  tocClose.addEventListener("click", closeToc);
  tocBackdrop.addEventListener("click", closeToc);

  // Keep keyboard focus inside the open panel.
  tocPanel.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var focusables = tocPanel.querySelectorAll("button");
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ============================================================
     KEYBOARD
     ← → turn · Home/End first/last · + − zoom · F fullscreen ·
     T contents (thumbnails) · L page list · Esc closes them
     ============================================================ */
  window.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape") { closeToc(); return; }
    if (isTocOpen()) return;
    // The scrubber handles its own arrow/Home/End keys.
    if (e.target === scrubber) return;

    switch (e.key) {
      case "ArrowRight": next(); break;
      case "ArrowLeft": prev(); break;
      case "Home": goTo(0); break;
      case "End": goTo(total - 1); break;
      case "+": case "=": zoomStep(1); break;
      case "-": zoomStep(-1); break;
      case "0": setZoom(1); break;
      case "f": case "F": fsBtn.click(); break;
      case "t": case "T": openToc("grid"); break;
      case "l": case "L": openToc("list"); break;
      default: return;
    }
    e.preventDefault();
  });

  /* ============================================================
     ZOOM
     ============================================================ */
  var zoomReadout = document.getElementById("zoomReadout");
  var zoomOutButton = document.getElementById("zoomOut");
  var zoomInButton = document.getElementById("zoomIn");

  var ZOOM_STEPS = [1, 1.25, 1.5, 2];
  var zoomPan = document.getElementById("zoomPan");

  function setZoom(z) {
    zoomLevel = clamp(z, 1, 2);
    if (zoomLevel === 1) pan.x = pan.y = 0;
    zoomReadout.textContent = Math.round(zoomLevel * 100) + "%";
    zoomOutButton.disabled = zoomLevel <= 1;
    zoomInButton.disabled = zoomLevel >= 2;
    // While zoomed, the pan layer sits over the page: drags pan instead of turning.
    var zoomed = zoomLevel > 1;
    bookFrame.classList.toggle("is-zoomed", zoomed);
    zoomPan.hidden = !zoomed;
    applyBookTransform();
  }
  function zoomStep(direction) {
    var i = ZOOM_STEPS.findIndex(function (step) { return step >= zoomLevel - 0.001; });
    if (i === -1) i = ZOOM_STEPS.length - 1;
    if (direction > 0 && ZOOM_STEPS[i] <= zoomLevel + 0.001) i++;
    if (direction < 0) i--;
    setZoom(ZOOM_STEPS[clamp(i, 0, ZOOM_STEPS.length - 1)]);
  }

  (function enablePan() {
    var start = null;
    zoomPan.addEventListener("pointerdown", function (e) {
      start = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      zoomPan.setPointerCapture(e.pointerId);
      zoomPan.classList.add("is-panning");
      bookEl.style.transition = "none"; // follow the finger without easing lag
    });
    zoomPan.addEventListener("pointermove", function (e) {
      if (!start) return;
      pan.x = e.clientX - start.x;
      pan.y = e.clientY - start.y;
      applyBookTransform();
    });
    var end = function () {
      start = null;
      zoomPan.classList.remove("is-panning");
      bookEl.style.transition = "";
    };
    zoomPan.addEventListener("pointerup", end);
    zoomPan.addEventListener("pointercancel", end);
    // Double-click / double-tap returns to 100%.
    zoomPan.addEventListener("dblclick", function () { setZoom(1); });
  })();
  zoomInButton.addEventListener("click", function () { zoomStep(1); });
  zoomOutButton.addEventListener("click", function () { zoomStep(-1); });
  setZoom(1);

  /* ============================================================
     FULLSCREEN
     ============================================================ */
  var fsBtn = document.getElementById("fullscreenButton");
  var bookWrap = document.getElementById("bookWrap");
  var canFullscreen = !!(bookWrap.requestFullscreen || bookWrap.webkitRequestFullscreen);
  if (!canFullscreen) fsBtn.hidden = true;

  fsBtn.addEventListener("click", function () {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      var req = bookWrap.requestFullscreen ? bookWrap.requestFullscreen() : bookWrap.webkitRequestFullscreen();
      if (req && req.catch) req.catch(function () { /* refused: stay inline */ });
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  });

  function onFsChange() {
    var isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    fsBtn.setAttribute("aria-pressed", String(isFs));
    if (!isFs && screen.orientation && screen.orientation.unlock) {
      try { screen.orientation.unlock(); } catch (e) { /* not locked */ }
    }
    setTimeout(resizeBook, 100);
  }
  document.addEventListener("fullscreenchange", onFsChange);
  document.addEventListener("webkitfullscreenchange", onFsChange);

  /* ============================================================
     MOBILE MENU
     On small screens the secondary controls (thumbnails, page list,
     sound, fullscreen) move into a menu behind one button, so the bar
     keeps only prev / page / next. On wider screens they move back.
     ============================================================ */
  var menuBtn = document.getElementById("menuButton");
  var menu = document.getElementById("controlsMenu");
  var compactQuery = window.matchMedia("(max-width: 640px), (max-height: 500px) and (pointer: coarse)");
  var menuItems = ["tocButton", "tocListButton", "soundToggle", "fullscreenButton"].map(function (id) {
    var el = document.getElementById(id);
    // A marker remembers where the button lives in the desktop bar.
    var marker = document.createComment(id);
    el.parentNode.insertBefore(marker, el);
    return { el: el, marker: marker };
  });

  function isMenuOpen() { return !menu.hidden; }
  function openMenu() {
    menu.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");
    var first = menu.querySelector("button:not([hidden])");
    if (first) first.focus();
  }
  function closeMenu(returnFocus) {
    if (!isMenuOpen()) return;
    menu.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
    if (returnFocus) menuBtn.focus();
  }

  function applyCompact() {
    var compact = compactQuery.matches;
    document.body.classList.toggle("controls-compact", compact);
    menuItems.forEach(function (item) {
      if (compact) menu.appendChild(item.el);
      else item.marker.parentNode.insertBefore(item.el, item.marker.nextSibling);
    });
    if (!compact) closeMenu(false);
  }
  if (compactQuery.addEventListener) compactQuery.addEventListener("change", applyCompact);
  else compactQuery.addListener(applyCompact);
  applyCompact();

  menuBtn.addEventListener("click", function () { isMenuOpen() ? closeMenu(true) : openMenu(); });
  // Picking an item closes the menu (the sound toggle stays open so its state is visible).
  menu.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (btn && btn.id !== "soundToggle") closeMenu(false);
  });
  menu.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.stopPropagation(); closeMenu(true); }
  });
  document.addEventListener("pointerdown", function (e) {
    if (isMenuOpen() && !menu.contains(e.target) && !menuBtn.contains(e.target)) closeMenu(false);
  });

  /* ============================================================
     ROTATE HINT (phones held upright)
     Pages are 16:9, so upright phones show them small. Suggest turning
     the phone; where the browser allows it, go full screen and lock to
     landscape in one tap. Dismissal is remembered for the visit.
     ============================================================ */
  var rotateHint = document.getElementById("rotateHint");
  var rotateFs = document.getElementById("rotateFullscreen");
  var rotateDismiss = document.getElementById("rotateDismiss");
  var portraitPhone = window.matchMedia("(max-width: 640px) and (orientation: portrait) and (pointer: coarse)");
  var HINT_KEY = "p2630:rotate-hint";

  function hintDismissed() {
    try { return sessionStorage.getItem(HINT_KEY) === "1"; } catch (e) { return false; }
  }
  function dismissHint() {
    rotateHint.hidden = true;
    try { sessionStorage.setItem(HINT_KEY, "1"); } catch (e) { /* private mode: hide for now only */ }
  }
  function updateHint() {
    rotateHint.hidden = !(portraitPhone.matches && !hintDismissed());
  }
  if (!canFullscreen) {
    // iPhone Safari can't full-screen a page element: just ask to rotate.
    rotateFs.hidden = true;
    rotateDismiss.textContent = "Got it";
    rotateDismiss.className = "rotate-hint__primary";
  }
  rotateFs.addEventListener("click", function () {
    dismissHint();
    var req = bookWrap.requestFullscreen ? bookWrap.requestFullscreen() : bookWrap.webkitRequestFullscreen();
    Promise.resolve(req).then(function () {
      if (screen.orientation && screen.orientation.lock) return screen.orientation.lock("landscape");
    }).catch(function () { /* refused or unsupported: the reader still works upright */ });
  });
  rotateDismiss.addEventListener("click", dismissHint);
  // Turning the phone answers the hint by itself.
  if (portraitPhone.addEventListener) portraitPhone.addEventListener("change", function () {
    if (!portraitPhone.matches && !rotateHint.hidden) dismissHint();
    else updateHint();
  });
  updateHint();

  /* ============================================================
     AUTO-HIDE TOOLBAR (desktop only)
     Hidden after a few idle seconds; any pointer move, key press or
     focus brings it back. Never hides while the contents are open.
     ============================================================ */
  var IDLE_MS = 2800;
  var idleTimer = null;
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function wake() {
    document.body.classList.remove("controls-idle");
    clearTimeout(idleTimer);
    if (!canHover) return;
    idleTimer = setTimeout(function () {
      if (!isTocOpen() && !controls.matches(":hover")) document.body.classList.add("controls-idle");
    }, IDLE_MS);
  }
  ["pointermove", "pointerdown", "keydown", "focusin", "wheel"].forEach(function (type) {
    window.addEventListener(type, wake, { passive: true });
  });
  wake();

  updateMeta();
})();
