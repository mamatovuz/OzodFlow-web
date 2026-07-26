/**
 * SERVICE WORKER — O'CHIRISH KALITI (kill switch)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  NEGA BU FAYL BO'SH EMAS, BALKI O'ZINI O'CHIRADI
 *
 *  Eski Vite sayti bu manzilda keshlaydigan service worker ro'yxatga
 *  olgan edi. U statik so'rovlarni "kesh-birinchi" tartibda berardi.
 *
 *  Next.js esa klient navigatsiyasida sahifa ma'lumotini (RSC yuklamasini)
 *  oddiy `fetch` bilan oladi — u `mode: "navigate"` EMAS, shuning uchun
 *  o'sha kesh-birinchi shoxiga tushardi. Natijada brauzer eski, endi
 *  mavjud bo'lmagan javoblarni qaytarib, 404 ko'rsatardi. Ikkinchi
 *  bosishda Next to'liq sahifa yuklashga o'tib, ishlab ketardi —
 *  "bir marta 404, keyin ishlaydi" muammosining aynan sababi shu.
 *
 *  Faylni shunchaki O'CHIRISH YETARLI EMAS: brauzerda allaqachon
 *  o'rnatilgan service worker o'z nusxasini ishlatishda davom etadi va
 *  yangi faylni topmasa ham darhol o'lmaydi.
 *
 *  Shu sababli bu yerda hech narsa keshlamaydigan, barcha keshni
 *  tozalaydigan va o'zini ro'yxatdan chiqaradigan versiya turadi.
 *  Har bir brauzer bir marta shu faylni olgach, eski service worker
 *  butunlay yo'qoladi.
 *
 *  MUHIM: bu faylda `fetch` hodisasi tinglovchisi ATAYLAB YO'Q —
 *  hech qanday so'rov tutilmaydi.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Yangi service worker kerak bo'lsa (offline rejim, push xabarnomalar),
 *  u BOSHQA fayl nomida yozilishi va Next.js'ning `/_next/` yo'llarini
 *  hech qachon keshlamasligi kerak.
 */

self.addEventListener("install", () => {
  // Kutmasdan darhol faollashadi — eski versiyani almashtiradi.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 1. Eski service worker qoldirgan barcha keshlarni o'chiramiz.
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch {
        // Kesh API mavjud bo'lmasa ham ro'yxatdan chiqishni davom ettiramiz.
      }

      // 2. O'zimizni ro'yxatdan chiqaramiz.
      try {
        await self.registration.unregister();
      } catch {
        // Ro'yxatdan chiqmasa ham fetch tutilmagani uchun zarar yo'q.
      }

      // 3. Ochiq oynalarni yangilaymiz — ular endi service worker'siz,
      //    to'g'ridan-to'g'ri tarmoq bilan ishlaydi.
      try {
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
          client.navigate(client.url);
        }
      } catch {
        // Yangilanmasa foydalanuvchi o'zi sahifani yangilaganda tuzaladi.
      }
    })()
  );
});
