// OzodFlow PWA service worker.
// DIQQAT: navigatsiya va RSC (/_next/data, sahifa fetch) so'rovlarini
// ATAYLAB TUTMAYMIZ — aks holda "bir marta 404 keyin ishlaydi" bug'i qaytadi.
// Faqat o'zgarmas statik rasm/shrift/hashli fayllarni keshlaymiz (cache-first).

const CACHE = "ozodflow-assets-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // Navigatsiya (sahifa) so'rovlarini umuman tutmaymiz
  if (req.mode === "navigate") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/media/") ||
    url.pathname.startsWith("/uploads/") ||
    /\.(png|jpg|jpeg|svg|webp|gif|ico|woff2?)$/.test(url.pathname);

  if (!isStaticAsset) return; // qolgan hamma narsa oddiy tarmoq orqali

  e.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((resp) => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return resp;
        })
    )
  );
});
