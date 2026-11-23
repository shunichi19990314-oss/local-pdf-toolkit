/* Runtime-cache service worker: after the first visit the app works offline.
   Assets are cached as they are fetched, so hashed build names need no list. */
const CACHE = "local-pdf-toolkit-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add("./")).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(event.request, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    }),
  );
});
