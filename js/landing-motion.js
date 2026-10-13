// Scroll reveal for the landing text. The page is fully visible without this
// script; it only hides content once it knows it can reveal it again.
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
