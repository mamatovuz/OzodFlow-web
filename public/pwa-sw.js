// OzodFlow PWA service worker — offline qo'llab-quvvatlash bilan.
//
// STRATEGIYA:
//  1) Statik fayllar (rasm/shrift/hashli _next/static) — CACHE-FIRST.
//     Bir marta yuklangach offline'da ham darhol ochiladi.
//  2) Menyu sahifasi (/m/<slug>) navigatsiyasi — NETWORK-FIRST.
//     Online bo'lsa doim serverdan yangi menyu olinadi (narx/taom yangilanadi)
//     va nusxasi keshga qo'yiladi. Internet yo'q bo'lsa — oxirgi keshlangan
//     menyu ko'rsatiladi. Menyu HTML'i butun ma'lumotni (SSR) o'z ichiga oladi,
//     shuning uchun offline'da to'liq menyu ishlaydi.
//  3) Qolgan navigatsiya (admin/dashboard) va API — oddiy tarmoq (keshlanmaydi).
//
// NEGA network-first XAVFSIZ: eski "bir marta 404" bug'i navigatsiyani
// KESH-BIRINCHI berish sababli edi. Bu yerda online foydalanuvchi HAR DOIM
// tarmoqdan yangi javob oladi; kesh faqat internet yo'qligida ishlaydi.

const ASSET_CACHE = "ozodflow-assets-v2";
const PAGE_CACHE = "ozodflow-pages-v1";
const KEEP = [ASSET_CACHE, PAGE_CACHE];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Faqat menyu sahifalarini offline uchun keshlaymiz (admin/dashboard emas)
function isMenuPage(url) {
  return url.pathname === "/" || url.pathname.startsWith("/m/");
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/media/") ||
    url.pathname.startsWith("/uploads/") ||
    url.pathname === "/api/img" || // aqlli rasm (transform) — offline uchun keshlanadi
    url.pathname.endsWith("/app-icon") || // ilova ikonkasi
    /\.(png|jpg|jpeg|svg|webp|gif|ico|woff2?)$/.test(url.pathname)
  );
}

// Oddiy offline fallback (kesh ham bo'lmasa)
function offlineFallback() {
  return new Response(
    `<!doctype html><html lang="uz"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Internet yo'q</title>
<style>body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
font-family:system-ui,sans-serif;background:#0b0b0b;color:#eee;text-align:center;padding:24px}
.b{max-width:320px}.i{font-size:44px;margin-bottom:12px}h1{font-size:18px;margin:0 0 8px}
p{color:#aaa;font-size:14px;line-height:1.5;margin:0}</style></head>
<body><div class="b"><div class="i">📶</div><h1>Internet yo'q</h1>
<p>Menyuni ko'rish uchun avval bir marta internet bilan oching. Keyin u internetsiz ham ishlaydi.</p></div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 }
  );
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // ─── 1) Menyu sahifasi navigatsiyasi — NETWORK-FIRST ───
  if (req.mode === "navigate" && isMenuPage(url)) {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          // Muvaffaqiyatli javobni offline uchun keshga qo'yamiz
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(async () => {
          // Internet yo'q — oxirgi keshlangan menyu (query'ni e'tiborsiz qoldirib)
          const cached =
            (await caches.match(req)) ||
            (await caches.match(req, { ignoreSearch: true }));
          return cached || offlineFallback();
        })
    );
    return;
  }

  // Boshqa navigatsiyalarni (admin/dashboard) tutmaymiz
  if (req.mode === "navigate") return;

  // ─── 2) Statik fayllar — CACHE-FIRST ───
  if (isStaticAsset(url)) {
    e.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((resp) => {
            if (resp && resp.ok) {
              const copy = resp.clone();
              caches.open(ASSET_CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return resp;
          })
      )
    );
    return;
  }

  // ─── 3) Qolgan hamma narsa (API, RSC) — oddiy tarmoq ───
});
