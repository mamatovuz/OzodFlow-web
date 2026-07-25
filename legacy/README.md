# Legacy — OzodFlow studiya sayti (arxiv)

Bu papkada OzodFlow'ning **birinchi versiyasi** turadi: bir studiya uchun qilingan
landing sayt va JSON faylga yozadigan CMS admin panel.

**Ishlab chiqishda ishlatilmaydi.** Faqat referens uchun saqlanadi:

- dizayn qarorlari (rang palitrasi, hero struktura, xizmat kartochkalari)
- o'zbekcha matnlar va SEO tavsiflari
- Telegram lead integratsiyasi (`server/index.js` → `sendLeadToTelegram`)
- blog postlari (`src/lib/blog.js`)

## Nima edi

| Qism | Texnologiya |
| --- | --- |
| Frontend | Vite + React 19 + TanStack Router (SPA, SSR yo'q) |
| UI | Tailwind v4 + shadcn/ui |
| Backend | Express 5, ma'lumotlar JSON fayllarda |
| Auth | `X-Admin-Password` header, bitta parol |
| Deploy | Vercel (static) + Railway (server) |

## Nega almashtirildi

Marketplace talablari (5 rol, escrow to'lovlar, real-time chat, SSR/SEO,
tranzaksiyalar) bu arxitekturaga sig'maydi:

- SPA bo'lgani uchun developer profillari Google'da indekslanmaydi
- JSON fayl parallel yozishda ma'lumot yo'qotadi — hamyon/escrow uchun xavfli
- bitta umumiy parol rol tizimini qo'llab-quvvatlamaydi

Yangi versiya: Next.js 16 (App Router) + Prisma + SQLite, repo ildizida.

## Ishga tushirish (agar kerak bo'lsa)

```bash
cd legacy
npm install
npm run dev
```
