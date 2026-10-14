// Offline support. Once a reader has been opened, its pages are kept on the
// device, so the book also opens without internet (e.g. from an iPhone home
// screen icon). Code is fetched fresh when online; images come from the
// cache.
const VERSION = "__BUILD__"; // replaced with the commit id on deploy
const CACHE = "p2630-" + VERSION;

// The app shell: everything every page needs.
const SHELL = [
  "./",
  "index.html",
  "strategy.html",
  "action-plan.html",
  "manifest.webmanifest",
  "css/fonts.css",
  "css/tokens.css",
  "css/landing.css",
  "css/reader.css",
  "js/vendor/page-flip.browser.js",
  "js/pages.js",
  "js/toc.js",
  "js/reader-sound.js",
  "js/main.js",
  "js/book-3d.js",
  "assets/sounds/page-turn.mp3",
  "assets/landing/p2630-logo.png",
  "assets/app/icon-192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // One missing file must not block the rest.
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("p2630-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// The reader asks for its whole book to be saved once it has loaded.
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "cache-book" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      for (const url of data.urls) {
        if (!(await cache.match(url))) await cache.add(url).catch(() => {});
      }
    })
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  // Large downloads (PDF, standalone HTML) go straight to the network.
  if (/\/downloads\/|\.pdf$/.test(url.pathname)) return;

  // Pages, styles and scripts: network first, so a new deploy never mixes
  // fresh HTML with stale code; the cache is only the offline fallback.
  // Images, fonts and sound: cache first (they rarely change and are big).
  const isCode = req.mode === "navigate" || /\.(html|css|js|webmanifest)$/.test(url.pathname) || url.pathname.endsWith("/");
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      if (isCode) {
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch (e) {
          return (await cache.match(req, { ignoreSearch: true })) || Response.error();
        }
      }
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
  );
});
