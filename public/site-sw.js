// Ozodbek's Blog — yengil service worker.
// FAQAT statik resurslarni (rasm, shrift, _next/static) keshlaydi.
// HTML sahifalar HAR DOIM tarmoqdan olinadi — kontent eskirmasligi uchun.
const CACHE = "ozod-site-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/media/") ||
    /\.(?:css|js|woff2?|ttf|png|jpe?g|webp|avif|gif|svg|ico)$/i.test(url.pathname);

  if (!isStatic) return; // HTML va API — tarmoqdan (kesh emas)

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return cached || Response.error();
      }
    })
  );
});
