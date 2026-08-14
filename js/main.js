(function () {
  "use strict";

  /* ============================================================
     KONFIGURASI — EDIT DI SINI
     ============================================================

     - PAGE_COUNT : total halaman (ubah jadi 213 saat buku final).
     - Nama file gambar harus berurutan:
         assets/img/page-001.webp, page-002.webp, ... page-213.webp

     - CHAPTERS : daftar isi. Ubah `title` (judul) & `page` (nomor halaman,
       mulai dari 1). Ini yang tampil di menu "Daftar Isi".
  */
  var PAGE_COUNT = 10;

  var CHAPTERS = [
    { title: "Cover", page: 1 },
    { title: "Daftar Isi", page: 2 },
    { title: "Chapter 1 — Licensing", page: 3 },
    { title: "Chapter 2 — Framework", page: 5 },
    { title: "Chapter 3 — Data & Analysis", page: 7 },
    { title: "Back Cover", page: 10 }
  ];

  /* ============================================================
     BANGUN DAFTAR GAMBAR (otomatis dari PAGE_COUNT)
     ============================================================ */
  function pad3(n) {
    return String(n).padStart(3, "0");
  }

  var IMAGES = [];
  for (var i = 1; i <= PAGE_COUNT; i++) {
    IMAGES.push("assets/img/page-" + pad3(i) + ".webp");
  }

  var bookEl = document.getElementById("book");

  // Elemen halaman (HTML mode → mendukung hard cover)
  var pages = IMAGES.map(function (src, i) {
    var p = document.createElement("div");
    p.className = "page";
    if (i === 0 || i === IMAGES.length - 1) {
      p.setAttribute("data-density", "hard"); // cover & back cover otomatis
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
     INISIALISASI StPageFlip
     ============================================================ */
  var settings = {
    width: 550,
    height: 778,
    size: "stretch",
    minWidth: 280,
    maxWidth: 1000,
    minHeight: 396,
    maxHeight: 1273,
    maxShadowOpacity: 0.5,
    showCover: true,      // cover & back cover tampil single page
    usePortrait: true,    // otomatis 1 halaman di layar sempit
    drawShadow: true,
    flippingTime: 900,
    mobileScrollSupport: false,
    disableFlipByClick: false
  };

  function fitLimits() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var availH = Math.max(320, vh - 240);
    var wByHeight = Math.floor(availH * 0.707);
    var wByWidth = Math.floor(vw - 140);
    settings.maxWidth = Math.max(240, Math.min(1000, wByHeight, wByWidth));
    settings.maxHeight = availH;
  }
  fitLimits();
  window.addEventListener("resize", fitLimits);

  var pageFlip = new St.PageFlip(bookEl, settings);
  pageFlip.loadFromHTML(pages);

  /* ============================================================
     READOUT & CAPTION
     ============================================================ */
  var readout = document.getElementById("readout");
  var caption = document.getElementById("caption");

  function update() {
    var idx = pageFlip.getCurrentPageIndex();
    var total = pageFlip.getPageCount();
    readout.textContent = String(idx + 1).padStart(2, "0") + " — " + String(total).padStart(2, "0");
    caption.textContent = idx === 0 ? "Cover" : (idx === total - 1 ? "Back cover" : "Page " + (idx + 1));
  }

  pageFlip.on("flip", update);
  pageFlip.on("changeOrientation", update);

  /* ============================================================
     DAFTAR ISI (TOC)
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
     THUMBNAIL
     ============================================================ */
  var thumbGrid = document.getElementById("thumbGrid");

  IMAGES.forEach(function (src, i) {
    var cell = document.createElement("button");
    cell.type = "button";
    cell.className = "thumb";
    var img = document.createElement("img");
    img.src = src;
    img.loading = "lazy";
    img.alt = "Page " + (i + 1);
    var num = document.createElement("span");
    num.textContent = String(i + 1).padStart(2, "0");
    cell.appendChild(img);
    cell.appendChild(num);
    cell.addEventListener("click", function () {
      pageFlip.flip(i);
      closePanels();
    });
    thumbGrid.appendChild(cell);
  });

  /* ============================================================
     PANEL (buka / tutup)
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
     ZOOM
     ============================================================ */
  var zoomLevel = 1;
  var zoomReadout = document.getElementById("zoomReadout");

  function setZoom(z) {
    zoomLevel = Math.max(0.6, Math.min(2.5, z));
    bookEl.style.transform = zoomLevel === 1 ? "" : "scale(" + zoomLevel + ")";
    zoomReadout.textContent = Math.round(zoomLevel * 100) + "%";
    document.getElementById("zoomOut").disabled = zoomLevel <= 0.61;
    document.getElementById("zoomIn").disabled = zoomLevel >= 2.49;
  }

  document.getElementById("zoomIn").addEventListener("click", function () {
    setZoom(zoomLevel * 1.2);
  });
  document.getElementById("zoomOut").addEventListener("click", function () {
    setZoom(zoomLevel / 1.2);
  });

  // Reset zoom dengan double-click di area buku
  document.getElementById("viewport").addEventListener("dblclick", function () {
    setZoom(1);
  });

  /* ============================================================
     KONTROL NAVIGASI
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
