// Tween 82.8 — Service Worker
const CACHE = "tween828-v21";
const STATIC = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./ogp.png",
  "./robots.txt",
  "./sitemap.xml",
  "./assets/css/style.css",
  "./assets/js/i18n.js",
  "./assets/js/app.js",
  "./assets/js/pomodoro.js",
  "./assets/js/todo.js",
  "./assets/js/guestbook.js",
  "./assets/js/inbox.js",
  "./assets/js/weather.js",
  "./assets/js/tray.js",
  "./includes/data/genres.json",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  // Only cache same-origin requests; let YouTube API / IFrame pass through
  if (!e.request.url.startsWith(self.location.origin)) return;
  const url = new URL(e.request.url);
  // Don't cache requests with query params or API calls
  if (url.search || url.pathname.startsWith("/api/")) return;
  // Network-first: try network, fall back to cache (for offline)
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
