(function () {
  "use strict";

  /* ============================================================
     CONFIG — EDIT HERE
     ============================================================

     - PAGE_COUNT : total number of pages (change to 213 when the
       final book is ready).
     - Image files must be named sequentially:
         assets/img/page-001.webp, page-002.webp, … page-213.webp

     - CHAPTERS : table of contents. Edit `title` and `page` (1-based
       page number). This is what appears in the "Table of contents" menu.
  */
  var PAGE_COUNT = 12;

  var CHAPTERS = [
    { title: "Cover", page: 1 },
    { title: "Table of Contents", page: 2 },
    { title: "Chapter 1 — Licensing", page: 3 },
    { title: "Chapter 2 — Framework", page: 5 },
    { title: "Chapter 3 — Data & Analysis", page: 7 },
    { title: "Back Cover", page: 12 }
  ];

  /* ============================================================
     BUILD IMAGE LIST (auto-generated from PAGE_COUNT)
     ============================================================ */
  function pad3(n) {
    return String(n).padStart(3, "0");
  }

  var IMAGES = [];
  for (var i = 1; i <= PAGE_COUNT; i++) {
    IMAGES.push("assets/img/page-" + pad3(i) + ".webp");
  }

  var bookEl = document.getElementById("book");

  // Page elements (HTML mode → supports hard covers)
  var pages = IMAGES.map(function (src, i) {
    var p = document.createElement("div");
    p.className = "page";
    if (i === 0 || i === IMAGES.length - 1) {
      p.setAttribute("data-density", "hard"); // cover & back cover (by position)
    }
    var img = document.createElement("img");
    img.src = src;
    img.alt = "Page " + (i + 1);
    img.draggable = false;
    p.appendChild(img);
    bookEl.appendChild(p);
    return p;
  });

  /* ============================================================
     INITIALIZE StPageFlip
     ============================================================ */
  var settings = {
    width: 550,
    height: 778,
    size: "fixed",
    minWidth: 220,
    maxWidth: 1000,
    minHeight: 240,
    maxHeight: 1273,
    maxShadowOpacity: 0.25,
    showCover: true,      // cover & back cover shown as single pages
    usePortrait: true,    // auto-switch to 1 page on narrow screens
    drawShadow: true,
    flippingTime: 900,
    mobileScrollSupport: false,
    disableFlipByClick: false
  };

  var RESERVED_H = 280;           // header + meta + toolbar + hint + padding
  var PAGE_RATIO = 2481 / 3508;   // portrait page aspect ratio

  function computePageSize() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var availH = Math.max(260, vh - RESERVED_H);
    var availW = Math.max(240, vw - 80);
    var pageH = availH;
    var pageW = Math.floor(pageH * PAGE_RATIO);
    if (2 * pageW > availW) { // spread too wide → fit by width
      pageW = Math.floor(availW / 2);
      pageH = Math.floor(pageW / PAGE_RATIO);
    }
    return { width: pageW, height: pageH };
  }

  (function initSize() {
    var s = computePageSize();
    settings.width = settings.minWidth = settings.maxWidth = s.width;
    settings.height = settings.minHeight = settings.maxHeight = s.height;
  })();

  var pageFlip = new St.PageFlip(bookEl, settings);
  pageFlip.loadFromHTML(pages);

  window.addEventListener("resize", function () {
    var s = computePageSize();
    var is = pageFlip.getSettings();
    is.width = is.minWidth = is.maxWidth = s.width;
    is.height = is.minHeight = is.maxHeight = s.height;
    pageFlip.update();
  });

  /* ============================================================
     READOUT, CAPTION & PROGRESS
     ============================================================ */
  var readout = document.getElementById("readout");
  var caption = document.getElementById("caption");
  var progressFill = document.getElementById("progressFill");

  function update() {
    var idx = pageFlip.getCurrentPageIndex();
    var total = pageFlip.getPageCount();
    readout.textContent = String(idx + 1).padStart(2, "0") + " — " + String(total).padStart(2, "0");
    caption.textContent = idx === 0 ? "Cover" : (idx === total - 1 ? "Back cover" : "Page " + (idx + 1));
    updateProgress();
    applyBookTransform();
  }

  function updateProgress() {
    var idx = pageFlip.getCurrentPageIndex();
    var total = pageFlip.getPageCount();
    var pct = total > 1 ? (idx / (total - 1)) * 100 : 0;
    progressFill.style.width = pct + "%";
  }

  pageFlip.on("flip", update);
  pageFlip.on("changeOrientation", update);

  /* ============================================================
     TABLE OF CONTENTS
     ============================================================ */
  var tocList = document.getElementById("tocList");

  CHAPTERS.forEach(function (ch) {
    var li = document.createElement("li");
    var btn = document.createElement("button");
    btn.type = "button";
    var title = document.createElement("span");
    title.className = "toc-title";
    title.textContent = ch.title;
    var page = document.createElement("span");
    page.className = "toc-page";
    page.textContent = String(ch.page).padStart(2, "0");
    btn.appendChild(title);
    btn.appendChild(page);
    btn.addEventListener("click", function () {
      pageFlip.flip(ch.page - 1);
      closePanels();
    });
    li.appendChild(btn);
    tocList.appendChild(li);
  });

  /* ============================================================
     THUMBNAILS (spread view — 2 pages merged per thumbnail)
     ============================================================ */
  var thumbGrid = document.getElementById("thumbGrid");

  // Build spreads: [0] cover, [1,2], [3,4], ... , [N-1] back cover
  var spreads = [[0]];
  for (var s = 1; s < IMAGES.length - 1; s += 2) {
    if (s + 1 < IMAGES.length - 1) {
      spreads.push([s, s + 1]);
    } else {
      spreads.push([s]); // leftover single page before the back cover
    }
  }
  spreads.push([IMAGES.length - 1]);

  spreads.forEach(function (spread) {
    var cell = document.createElement("div");
    cell.setAttribute("role", "button");
    cell.setAttribute("tabindex", "0");
    cell.className = "thumb" + (spread.length === 1 ? " thumb--single" : "");

    spread.forEach(function (pageIdx) {
      var img = document.createElement("img");
      img.src = IMAGES[pageIdx];
      img.loading = "lazy";
      img.alt = "Page " + (pageIdx + 1);
      cell.appendChild(img);
    });

    var label = document.createElement("span");
    label.textContent = spread.length === 1
      ? String(spread[0] + 1).padStart(2, "0")
      : String(spread[0] + 1).padStart(2, "0") + "\u2013" + String(spread[1] + 1).padStart(2, "0");
    cell.appendChild(label);

    cell.addEventListener("click", function () {
      pageFlip.flip(spread[0]);
      closePanels();
    });
    cell.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        cell.click();
      }
    });

    thumbGrid.appendChild(cell);
  });

  /* ============================================================
     PANELS (open / close)
     ============================================================ */
  var overlay = document.getElementById("overlay");
  var tocPanel = document.getElementById("tocPanel");
  var thumbPanel = document.getElementById("thumbPanel");

  function openPanel(panel) {
    closePanels();
    overlay.classList.add("on");
    panel.classList.add("on");
  }

  function closePanels() {
    overlay.classList.remove("on");
    tocPanel.classList.remove("on");
    thumbPanel.classList.remove("on");
  }

  document.getElementById("tocBtn").addEventListener("click", function () {
    if (tocPanel.classList.contains("on")) closePanels();
    else openPanel(tocPanel);
  });

  document.getElementById("thumbBtn").addEventListener("click", function () {
    if (thumbPanel.classList.contains("on")) closePanels();
    else openPanel(thumbPanel);
  });

  overlay.addEventListener("click", closePanels);
  document.querySelectorAll("[data-close]").forEach(function (btn) {
    btn.addEventListener("click", closePanels);
  });

  /* ============================================================
     FULLSCREEN
     ============================================================ */
  document.getElementById("fullscreenBtn").addEventListener("click", function () {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function () {});
    } else {
      document.exitFullscreen();
    }
  });

  document.addEventListener("fullscreenchange", function () {
    document.getElementById("fullscreenBtn").classList.toggle("active", !!document.fullscreenElement);
  });

  /* ============================================================
     ZOOM + COVER CENTERING
     ============================================================ */
  var zoomLevel = 1;
  var zoomReadout = document.getElementById("zoomReadout");

  function applyBookTransform() {
    var idx = pageFlip.getCurrentPageIndex();
    var total = pageFlip.getPageCount();
    var parts = [];

    // Center the single cover / back cover so it looks like a closed book
    // (only in landscape spread mode, where the single page is offset)
    var isSingle = (idx === 0) || (idx === total - 1);
    if (isSingle && pageFlip.getOrientation() === "landscape") {
      var offset = bookEl.offsetWidth / 4;
      var dir = (idx === 0) ? -1 : 1;
      parts.push("translateX(" + (dir * offset) + "px)");
    }

    if (zoomLevel !== 1) {
      parts.push("scale(" + zoomLevel + ")");
    }

    bookEl.style.transform = parts.join(" ");
    bookEl.classList.toggle("book--single", isSingle);
  }

  function setZoom(z) {
    zoomLevel = Math.max(0.6, Math.min(2.5, z));
    zoomReadout.textContent = Math.round(zoomLevel * 100) + "%";
    document.getElementById("zoomOut").disabled = zoomLevel <= 0.61;
    document.getElementById("zoomIn").disabled = zoomLevel >= 2.49;
    applyBookTransform();
  }

  document.getElementById("zoomIn").addEventListener("click", function () {
    setZoom(zoomLevel * 1.2);
  });
  document.getElementById("zoomOut").addEventListener("click", function () {
    setZoom(zoomLevel / 1.2);
  });

  // Reset zoom by double-clicking the book area
  document.getElementById("viewport").addEventListener("dblclick", function () {
    setZoom(1);
  });

  /* ============================================================
     NAVIGATION CONTROLS
     ============================================================ */
  document.getElementById("next").addEventListener("click", function () {
    pageFlip.flipNext("top");
  });
  document.getElementById("prev").addEventListener("click", function () {
    pageFlip.flipPrev("bottom");
  });

  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") pageFlip.flipNext("top");
    else if (e.key === "ArrowLeft") pageFlip.flipPrev("bottom");
    else if (e.key === "+" || e.key === "=") setZoom(zoomLevel * 1.2);
    else if (e.key === "-") setZoom(zoomLevel / 1.2);
    else if (e.key.toLowerCase() === "f") document.getElementById("fullscreenBtn").click();
    else if (e.key === "Escape") closePanels();
  });

  update();
})();
