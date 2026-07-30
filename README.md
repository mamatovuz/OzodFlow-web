# OzodFlow

Restoran, kafe va fast food maskanlari uchun **professional elektron menyu SaaS platformasi**. QR kod orqali zamonaviy menyu, statistika va barcha filiallarni bitta paneldan boshqarish.

## Texnologiyalar

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — premium dizayn tizimi (Light/Dark mode)
- **Prisma ORM** + **SQLite** (keyinchalik PostgreSQL'ga oson o'tadi)
- **JWT** autentifikatsiya (jose + bcrypt), sessiya boshqaruvi
- **qrcode** — QR generatsiya

## Ishga tushirish

```bash
npm install          # bog'liqliklarni o'rnatish
npm run db:push      # SQLite bazasini yaratish
npm run db:seed      # demo ma'lumot (ixtiyoriy)
npm run dev          # http://localhost:3000
```

### Demo hisob
- **Login:** `demo@ozodflow.uz` / `demo1234`
- **Menyu:** http://localhost:3000/m/osh-markazi

## Skriptlar

| Buyruq | Vazifasi |
|--------|----------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run db:push` | Schema'ni bazaga qo'llash |
| `npm run db:seed` | Demo ma'lumot yuklash |
| `npm run db:studio` | Prisma Studio (baza ko'rish) |

## Tuzilma

```
prisma/
  schema.prisma      # DB modellari (User, Restaurant, Category, Product, ...)
  seed.ts            # demo ma'lumot
src/
  app/
    page.tsx         # Landing page
    (auth)/          # Kirish / Ro'yxatdan o'tish
    dashboard/       # Boshqaruv paneli (menyu, profil, QR, statistika, sozlamalar)
    m/[slug]/        # Mijoz ko'radigan ommaviy menyu
    api/             # REST API (auth, categories, products, restaurant, scan)
  components/        # UI komponentlari
  lib/               # prisma, auth, stats, validation, utils
```

## Tayyor imkoniyatlar (1-bosqich)

- ✅ Premium Landing page (Hero, imkoniyatlar, tariflar, FAQ, SEO)
- ✅ Auth: ro'yxatdan o'tish / kirish, JWT sessiya
- ✅ Dashboard: statistika kartalari, haftalik grafik
- ✅ Menyu boshqaruvi: kategoriya + mahsulot CRUD, belgilar, qidiruv
- ✅ Restoran profili: logo, aloqa, manzil, brend rangi
- ✅ QR kod: sozlash + PNG/SVG yuklab olish
- ✅ Statistika: QR skanerlar, mashhur mahsulotlar
- ✅ Ommaviy menyu: mobil-first, Dark/Light, qidiruv/filtr, detal oyna
- ✅ FREE tarif limiti (20 mahsulot)

## Keyingi bosqichlar

- OTP tasdiqlash (telefon/email)
- To'lov integratsiyasi (Click, Payme, Paynet)
- Rasm yuklash (Cloudflare R2 / local upload)
- Stol QR kodlari va batafsil statistika
- Admin panel, filiallar, xodimlar/rollar
- PostgreSQL + Redis + Docker deployment

---

© OzodFlow
