// Offline support. Once a reader has been opened, its pages are kept on the
// device, so the book also opens without internet (e.g. from an iPhone home
// screen icon). Files are served from the cache first and refreshed in the
// background, so a new deploy reaches readers on their next visit.
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
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  // Large downloads (PDF, standalone HTML) go straight to the network.
  if (/\/downloads\/|\.pdf$/.test(new URL(req.url).pathname)) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
