// Scroll reveal for the landing text. The page is fully visible without this
// script; it only hides content once it knows it can reveal it again.
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Open Flipbook: open the 3D book, fade the page, then navigate ----
  var FADE_MS = reduceMotion ? 150 : 350;
  var opening = false;

  document.querySelectorAll(".book-section .button-primary").forEach(function (link) {
    link.addEventListener("click", function (event) {
      // Let new-tab / new-window clicks behave normally.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (opening) return;
      opening = true;

      var section = link.closest(".book-section");
      var canvas = section && section.querySelector("canvas.book-webgl");
      var book = canvas && canvas.book3d;
      var opened = book ? book.open() : Promise.resolve();

      opened.then(function () {
        document.documentElement.classList.add("is-leaving");
        setTimeout(function () { window.location.href = link.href; }, FADE_MS);
      });
    });
  });

  // Coming back with the browser's Back button restores the page from cache:
  // undo the fade so it isn't left blank.
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
      document.documentElement.classList.remove("is-leaving");
      opening = false;
      document.querySelectorAll("canvas.book-webgl").forEach(function (canvas) {
        if (canvas.book3d) canvas.book3d.reset();
      });
    }
  });

  if (reduceMotion || !("IntersectionObserver" in window)) return;

  var sections = document.querySelectorAll(".book-section");
  document.documentElement.classList.add("motion-ready");

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.2 });

  sections.forEach(function (section) { observer.observe(section); });
})();
