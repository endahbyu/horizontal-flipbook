// Registers the service worker (sw.js) so the site works offline, e.g. after
// "Add to Home Screen" on iPhone. Skipped for file://.
(function () {
  if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () { /* offline mode unavailable */ });
  });
})();
