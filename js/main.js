(function () {
  "use strict";

  /* ============================================================
     PAGES — edit this list when pages change.
     Files: assets/img/page-001.webp … page-NNN.webp
     ============================================================ */
  var PAGES = [
    { title: "Cover", type: "Cover" },
    { title: "Design rationale", type: "Concept" },
    { title: "Chapter 1 — Licensing", type: "Chapter opener" },
    { title: "Licensing landscape", type: "Introduction" },
    { title: "Overview of licensing framework", type: "Framework" },
    { title: "Licences overview", type: "Key highlights" },
    { title: "Licensing profile over the years", type: "Data" },
    { title: "Class licences under the CMA 1998", type: "Data" },
    { title: "Licensing activity and developments", type: "Analysis" },
    { title: "New and renewed licensees", type: "Table" },
    { title: "Infrastructure and services", type: "Table" },
    { title: "Back cover", type: "Back cover" }
  ];

  function pad3(n) { return String(n).padStart(3, "0"); }
  var IMAGES = PAGES.map(function (_, i) {
    return "assets/img/page-" + pad3(i + 1) + ".webp";
  });

  var bookEl = document.getElementById("book");

  /* ============================================================
     BUILD StPageFlip PAGES (HTML mode)
     ============================================================ */
  var pageNodes = IMAGES.map(function (src, i) {
    var p = document.createElement("div");
    p.className = "page";
    var img = document.createElement("img");
    img.src = src;
    img.alt = PAGES[i].title;
    img.draggable = false;
    p.appendChild(img);
    bookEl.appendChild(p);
    return p;
  });

  /* ============================================================
     INITIALIZE StPageFlip
     ============================================================ */
  var RESERVED_H = 310;          // hero copy + meta + toolbar + hint + padding
  var PAGE_RATIO = 2481 / 3508;  // portrait page aspect ratio

  var settings = {
    width: 550,
    height: 778,
    size: "fixed",
    minWidth: 220,
    maxWidth: 1000,
    minHeight: 240,
    maxHeight: 1273,
    maxShadowOpacity: 0.3,
    showCover: true,
    usePortrait: true,
    drawShadow: false,
    flippingTime: 900,
    mobileScrollSupport: false,
    disableFlipByClick: false,
    showPageCorners: false   // disable the corner "peel" hint on hover
  };

  // CSS clamp() equivalent — keeps the book fluid with min/max bounds
  function clamp(v, min, max) { return Math.max(min, Math.min(v, max)); }

  function computePageSize() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var isMobile = window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;

    if (isMobile) {
      // single page fills the width fluidly (clamped); 82vw leaves room for the side arrows
      var pageW = clamp(vw * 0.82, 220, 620);
      var pageH = pageW / PAGE_RATIO;
      var maxH = clamp(vh - 400, 300, 900);
      if (pageH > maxH) {
        pageH = maxH;
        pageW = pageH * PAGE_RATIO;
      }
      return { width: Math.round(pageW), height: Math.round(pageH) };
    }

    // desktop spread: fluid page width, clamped by width + height
    var pageW = clamp(vw * 0.30, 240, 520);
    var pageH = pageW / PAGE_RATIO;
    var availH = clamp(vh - RESERVED_H, 300, 900);
    if (pageH > availH) {
      pageH = availH;
      pageW = pageH * PAGE_RATIO;
    }
    return { width: Math.round(pageW), height: Math.round(pageH) };
  }

  (function initSize() {
    var s = computePageSize();
    settings.width = settings.minWidth = settings.maxWidth = s.width;
    settings.height = settings.minHeight = settings.maxHeight = s.height;
  })();

  var pageFlip = new St.PageFlip(bookEl, settings);
  pageFlip.loadFromHTML(pageNodes);

  window.addEventListener("resize", function () {
    var s = computePageSize();
    var is = pageFlip.getSettings();
    is.width = is.minWidth = is.maxWidth = s.width;
    is.height = is.minHeight = is.maxHeight = s.height;
    pageFlip.update();
    applyBookTransform();
  });

  /* ============================================================
     READOUT + COVER CENTERING
     ============================================================ */
  var pageReadout = document.getElementById("pageReadout");
  var hint = document.getElementById("hint");

  var zoomLevel = 1;

  function applyBookTransform() {
    var idx = pageFlip.getCurrentPageIndex();
    var total = pageFlip.getPageCount();
    var parts = [];

    // center the front / back cover when it is shown alone (single page)
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
  }

  function updateMeta() {
    var idx = pageFlip.getCurrentPageIndex();
    var total = pageFlip.getPageCount();
    pageReadout.textContent = String(idx + 1).padStart(2, "0") + " / " + String(total).padStart(2, "0");

    // highlight current item in TOC + contents grid
    document.querySelectorAll("#tocList button, #contentsGrid button").forEach(function (btn) {
      btn.setAttribute("aria-current", String(Number(btn.dataset.page) - 1 === idx));
    });
  }

  pageFlip.on("flip", function () {
    updateMeta();
    applyBookTransform();
  });
  pageFlip.on("changeOrientation", function () {
    applyBookTransform();
  });

  /* ============================================================
     TABLE OF CONTENTS (slide-in panel)
     ============================================================ */
  var tocList = document.getElementById("tocList");
  var tocPanel = document.getElementById("tocPanel");
  var tocBackdrop = document.getElementById("tocBackdrop");
  var tocButton = document.getElementById("tocButton");
  var tocClose = document.getElementById("tocClose");

  PAGES.forEach(function (page, i) {
    var li = document.createElement("li");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.page = String(i + 1);
    btn.innerHTML =
      '<span class="toc-thumb"><img src="' + IMAGES[i] + '" alt="" loading="lazy" draggable="false"></span>' +
      '<span class="toc-text">' +
        '<span class="toc-number">Page ' + String(i + 1).padStart(2, "0") + "</span>" +
        '<span class="toc-title">' + page.title + "</span>" +
      "</span>";
    btn.addEventListener("click", function () {
      pageFlip.flip(i);
      closeToc();
    });
    li.appendChild(btn);
    tocList.appendChild(li);
  });

  function openToc() {
    tocPanel.hidden = false;
    tocBackdrop.hidden = false;
    requestAnimationFrame(function () {
      tocPanel.classList.add("open");
      tocBackdrop.classList.add("open");
    });
    tocButton.setAttribute("aria-expanded", "true");
  }
  function closeToc() {
    tocPanel.classList.remove("open");
    tocBackdrop.classList.remove("open");
    tocButton.setAttribute("aria-expanded", "false");
    setTimeout(function () {
      if (!tocPanel.classList.contains("open")) {
        tocPanel.hidden = true;
        tocBackdrop.hidden = true;
      }
    }, 260);
  }

  tocButton.addEventListener("click", function () {
    tocPanel.hidden ? openToc() : closeToc();
  });
  tocClose.addEventListener("click", closeToc);
  tocBackdrop.addEventListener("click", closeToc);

  /* ============================================================
     CONTENTS GRID (page section)
     ============================================================ */
  var contentsGrid = document.getElementById("contentsGrid");
  PAGES.forEach(function (page, i) {
    var li = document.createElement("li");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.page = String(i + 1);
    btn.innerHTML =
      '<span class="contents-number">' + String(i + 1).padStart(2, "0") + "</span>" +
      '<span class="contents-title">' + page.title + "</span>" +
      '<span class="contents-type">' + page.type + "</span>";
    btn.addEventListener("click", function () {
      pageFlip.flip(i);
      document.getElementById("flipbook").scrollIntoView({ behavior: "smooth", block: "center" });
    });
    li.appendChild(btn);
    contentsGrid.appendChild(li);
  });

  /* ============================================================
     NAVIGATION
     ============================================================ */
  document.getElementById("nextButton").addEventListener("click", function () {
    pageFlip.flipNext("top");
    hideHint();
  });
  document.getElementById("prevButton").addEventListener("click", function () {
    pageFlip.flipPrev("bottom");
    hideHint();
  });

  function hideHint() {
    hint.classList.add("gone");
  }

  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { pageFlip.flipNext("top"); hideHint(); }
    else if (e.key === "ArrowLeft") { pageFlip.flipPrev("bottom"); hideHint(); }
    else if (e.key === "+" || e.key === "=") setZoom(zoomLevel * 1.2);
    else if (e.key === "-") setZoom(zoomLevel / 1.2);
    else if (e.key.toLowerCase() === "f") document.getElementById("fullscreenButton").click();
    else if (e.key === "Escape") closeToc();
  });

  /* ============================================================
     ZOOM
     ============================================================ */
  var zoomReadout = document.getElementById("zoomReadout");
  var zoomOutButton = document.getElementById("zoomOut");
  var zoomInButton = document.getElementById("zoomIn");

  function setZoom(z) {
    zoomLevel = Math.max(0.9, Math.min(1.6, z));
    zoomReadout.textContent = Math.round(zoomLevel * 100) + "%";
    zoomOutButton.disabled = zoomLevel <= 0.91;
    zoomInButton.disabled = zoomLevel >= 1.59;
    applyBookTransform();
  }

  zoomInButton.addEventListener("click", function () { setZoom(zoomLevel * 1.2); });
  zoomOutButton.addEventListener("click", function () { setZoom(zoomLevel / 1.2); });

  /* ============================================================
     FULLSCREEN
     ============================================================ */
  var fullscreenButton = document.getElementById("fullscreenButton");
  fullscreenButton.addEventListener("click", function () {
    if (!document.fullscreenElement) {
      document.getElementById("bookWrap").requestFullscreen().catch(function () {});
    } else {
      document.exitFullscreen();
    }
  });
  document.addEventListener("fullscreenchange", function () {
    fullscreenButton.setAttribute("aria-pressed", String(!!document.fullscreenElement));
    setTimeout(applyBookTransform, 60);
  });

  updateMeta();
  applyBookTransform();
})();
