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

### Demo hisoblar
- **Restoran egasi:** `demo@ozodflow.uz` / `demo1234`
- **Admin:** `admin@ozodflow.uz` / `admin1234` → `/admin`
- **Menyu:** http://localhost:3000/m/osh-markazi

## Railway'ga deploy

1. Loyihani GitHub'ga push qiling, Railway'da "New Project → Deploy from GitHub".
2. **Volume** qo'shing (bitta volume yetarli — baza ham, rasmlar ham unda saqlanadi):
   - Service → **Volumes** → **New Volume**
   - **Mount path:** `/app/data`  ← bu **papka yo'li** (`file` emas!)
3. Environment variables (Variables bo'limi):
   ```
   JWT_SECRET=<uzun-tasodifiy-satr>
   NEXT_PUBLIC_APP_URL=https://sizning-domeningiz.uz
   PLATFORM_HOSTS=sizning-domeningiz.uz
   TELEGRAM_BOT_TOKEN=<@BotFather token>
   TELEGRAM_ADMIN_CHAT_ID=<@userinfobot chat id>
   ```

**Ma'lumot saqlanishi (muhim):**
- Volume `/app/data` ga ulansa, ilova bazani va rasmlarni **avtomatik** o'sha
  volume ichiga yozadi (`scripts/start.mjs` Railway volume'ni aniqlaydi).
  `DATABASE_URL` ni qo'lda o'zgartirish **shart emas**.
- Baza `/app/data/prod.db`, rasmlar `/app/data/uploads` — redeploy'da **o'chmaydi**.
- **Volume ulanmasa, har deploy'da hamma narsa o'chadi!** Avval volume qo'shing.

**Admin akkaunt:** har ishga tushishda avtomatik yaratiladi (yo'q bo'lsa).
Standart: `mamatovo354@gmail.com` / `123@Ozod`. `ADMIN_EMAIL` va `ADMIN_PASSWORD`
env orqali o'zgartirish mumkin. Admin panel: `/admins`.

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

## 2-bosqich imkoniyatlari

- ✅ Qo'lda to'lov: admin karta qo'shadi → foydalanuvchi chek yuklaydi →
  admin moderatsiyada tasdiqlaydi → tarif faollashadi
- ✅ Admin panel (`/admin`): to'lovlar, kartalar, restoranlar
- ✅ 7 kunlik Free sinov muddati
- ✅ 7 ta menyu dizayn temasi (2 tekin + 5 premium Pro Max uchun)
- ✅ Custom domain — o'z domeningizni ulash (Pro/Pro Max)
- ✅ Yangi tarif modeli: Pro 30 000 so'm **bir martalik (umrbod)**

## Keyingi bosqichlar

- OTP tasdiqlash (telefon/email)
- Avtomatik to'lov (Click, Payme, Paynet)
- Stol QR kodlari
- Filiallar, xodimlar/rollar
- PostgreSQL + Redis (miqyoslash uchun)

---

© OzodFlow
