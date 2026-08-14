(function () {
  "use strict";

  // ===== Halaman (urutan sesuai report) =====
  var IMAGES = [
    "assets/img/page-01.webp",
    "assets/img/page-02.webp",
    "assets/img/page-03.webp",
    "assets/img/page-04.webp",
    "assets/img/page-05.webp",
    "assets/img/page-06.webp",
    "assets/img/page-07.webp",
    "assets/img/page-08.webp",
    "assets/img/page-09.webp",
    "assets/img/page-10.webp"
  ];

  var bookEl = document.getElementById("book");

  // Bangun elemen halaman (HTML mode → mendukung hard cover)
  var pages = IMAGES.map(function (src, i) {
    var p = document.createElement("div");
    p.className = "page";
    if (i === 0 || i === IMAGES.length - 1) {
      p.setAttribute("data-density", "hard"); // cover & back cover
    }
    var img = document.createElement("img");
    img.src = src;
    img.alt = "Page " + (i + 1);
    img.draggable = false;
    p.appendChild(img);
    bookEl.appendChild(p);
    return p;
  });

  // ===== Konfigurasi StPageFlip =====
  var settings = {
    width: 550,
    height: 778,
    size: "stretch",
    minWidth: 280,
    maxWidth: 1000,
    minHeight: 396,
    maxHeight: 1273,
    maxShadowOpacity: 0.5,
    showCover: true,        // cover & back cover tampil single page
    usePortrait: true,      // otomatis 1 halaman di layar sempit
    drawShadow: true,
    flippingTime: 900,
    mobileScrollSupport: false,
    disableFlipByClick: false
  };

  // Pastikan buku selalu muat di layar (spread di desktop, 1 page di HP)
  function fitLimits() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var availH = Math.max(340, vh - 180);
    var wByHeight = Math.floor(availH * 0.707);
    var wByWidth = Math.floor(vw - 140);
    settings.maxWidth = Math.max(240, Math.min(1000, wByHeight, wByWidth));
    settings.maxHeight = availH;
  }
  fitLimits();
  window.addEventListener("resize", fitLimits);

  var pageFlip = new St.PageFlip(bookEl, settings);
  pageFlip.loadFromHTML(pages);

  // ===== Readout & caption =====
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

  // ===== Kontrol =====
  document.getElementById("next").addEventListener("click", function () {
    pageFlip.flipNext("top");
  });
  document.getElementById("prev").addEventListener("click", function () {
    pageFlip.flipPrev("bottom");
  });

  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") pageFlip.flipNext("top");
    else if (e.key === "ArrowLeft") pageFlip.flipPrev("bottom");
  });

  update();
})();
