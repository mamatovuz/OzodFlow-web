# OzodFlow

Raqamli xizmatlar marketplace: mijozlar loyiha joylashtiradi, tekshirilgan
mutaxassislar bajaradi, pul escrow orqali himoyalanadi.

**Domen:** [ozodflow.uz](https://ozodflow.uz)

---

## Holat

Loyiha fazalar bilan quriladi. Quyida nima tayyor va nima yo'q — ochiq holat.

### Tayyor

| Qism | Izoh |
| --- | --- |
| Poydevor | Next.js 16 (App Router), TypeScript, Tailwind v4 |
| Dizayn tizimi | OKLCH palitra, yorqin/qorong'i rejim, tipografiya, soyalar |
| Domen modeli | 40+ Prisma modeli — foydalanuvchi, loyiha, escrow, chat, obro' |
| Pul matematikasi | `src/lib/money.ts` — tiyin + basis point, 42 test bilan qoplangan |
| Sozlamalar tizimi | Biznes qoidalari databaseda, kodda emas |
| Parol xavfsizligi | bcrypt (cost 12), mustahkamlik tekshiruvi, timing himoyasi |
| Birinchi admin | `.env` dan avtomatik yaratiladi, kodda parol yo'q |
| Bosh sahifa | SSR, haqiqiy ma'lumot bilan, to'liq SEO + schema.org |
| i18n | Barcha matn `messages/uz.json` da — `ru`/`en` faqat tarjima ishi |
| Docker | Ko'p bosqichli image, doimiy volume, healthcheck |

### Hali yo'q

| Qism | Izoh |
| --- | --- |
| JWT sessiyalar | Token yaratish/yangilash, kirish-chiqish, rol guardlari |
| Kabinetlar | Mijoz va developer dashboardlari |
| Admin panel | Barcha bo'limlar |
| Loyiha oqimi | Yaratish, taklif, qabul qilish, topshirish |
| Escrow amaliyoti | Model bor, tranzaksiya mantig'i yo'q |
| Chat | Real vaqt xabar almashish |
| To'lov tizimlari | Click, Payme, Uzum integratsiyasi |
| AI funksiyalari | Tavsif generatori, byudjet taxmini, spam filtri |

---

## Texnologiyalar

- **Next.js 16** — App Router, Server Components, SSR/ISR
- **TypeScript** — `strict` rejim, `noUncheckedIndexedAccess`
- **Tailwind CSS v4** — CSS o'zgaruvchilari asosidagi dizayn tokenlari
- **Prisma 6 + SQLite** — Postgres'ga o'tish bir satrlik o'zgarish
- **next-intl** — matnlar kodda emas, tarjima faylida
- **jose** — JWT (Edge runtime bilan mos)
- **bcryptjs** — parol hash (native modul kerak emas)
- **Zod 4** — kirish ma'lumotlarini tekshirish

---

## Ishga tushirish

Kerak: Node.js 20.9+ va npm.

```bash
# 1. Bog'liqliklar
npm install

# 2. Muhit sozlamalari
cp .env.example .env
```

`.env` da kamida shularni to'ldiring:

```bash
# Har biri kamida 32 belgi, HAR XIL bo'lsin:
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

# Birinchi admin (parol: 8+ belgi, katta-kichik harf, raqam):
OZODFLOW_ADMIN_EMAIL=
OZODFLOW_ADMIN_PASSWORD=
```

Maxfiy kalit yasash:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Keyin:

```bash
# 3. Database yaratish va boshlang'ich ma'lumot
npm run db:migrate
npm run db:seed

# 4. Ishga tushirish
npm run dev
```

Sayt: <http://localhost:3000>

---

## Buyruqlar

| Buyruq | Vazifasi |
| --- | --- |
| `npm run dev` | Ishlab chiqish serveri |
| `npm run build` | Production build |
| `npm start` | Production serverni ishga tushirish |
| `npm test` | Testlar |
| `npm run typecheck` | TypeScript tekshiruvi |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Yangi migratsiya yaratish va qo'llash |
| `npm run db:deploy` | Migratsiyalarni qo'llash (production) |
| `npm run db:seed` | Boshlang'ich ma'lumot (idempotent) |
| `npm run db:studio` | Databaseni brauzerda ko'rish |
| `npm run db:reset` | Databaseni tozalab qayta yasash |
| `npm run bootstrap` | Super adminni qo'lda yaratish |

---

## Docker

```bash
cp .env.example .env    # qiymatlarni to'ldiring
docker compose up --build
```

Migratsiyalar konteyner ishga tushganda avtomatik qo'llanadi
(`docker/entrypoint.sh`), super admin esa server start bo'lganda
(`src/instrumentation.ts`).

Ixtiyoriy servislar profillar orqali:

```bash
docker compose --profile storage up   # + MinIO (S3 mos fayl saqlash)
docker compose --profile cache up     # + Redis
```

> **Diqqat:** SQLite fayl `ozodflow-data` volume'ida turadi. Volume o'chirilsa
> barcha ma'lumot yo'qoladi. Zaxira nusxa — shu volume'dagi `ozodflow.db`
> faylini ko'chirish.

---

## Deploy

SQLite **doimiy diskni** talab qiladi, shuning uchun:

| Platforma | Ishlaydimi | Izoh |
| --- | --- | --- |
| Railway | ✅ | Volume'ni `/data` ga ulang, `DATABASE_URL=file:/data/ozodflow.db` |
| VPS + Docker | ✅ | `docker compose up -d` |
| Fly.io | ✅ | Fly Volume |
| **Vercel** | ❌ | Fayl tizimi vaqtinchalik — SQLite saqlanmaydi |

Vercel'da ishlatish kerak bo'lsa Postgres'ga o'tish shart (pastga qarang).

---

## Postgres'ga o'tish

SQLite boshlang'ich tanlov. O'tish uchun:

1. `prisma/schema.prisma` da `provider = "postgresql"`
2. `DATABASE_URL` ni Postgres manziliga o'zgartirish
3. `rm -rf prisma/migrations && npm run db:migrate`

Schema **ataylab portativ** yozilgan, shuning uchun boshqa o'zgarish kerak emas:

- `enum` ishlatilmagan (SQLite qo'llamaydi) → `String` + `src/lib/enums.ts`
- skalyar massiv ishlatilmagan → alohida jadval yoki `...Json String`
- `Json` tipi ishlatilmagan → `String` ichida JSON

---

## Loyiha tuzilishi

```
prisma/
  schema.prisma          40+ model, portativlik qoidalari izohda
  migrations/            versiyalangan schema tarixi
  seed.ts                boshlang'ich ma'lumot (idempotent)
  seed/                  katalog, ko'nikmalar, nishonlar, test savollari

src/
  app/
    (marketing)/         ommaviy SSR sahifalar
    api/                 REST endpointlar
    layout.tsx           shriftlar, metadata, tema
    globals.css          dizayn tokenlari
  components/
    ui/                  bazaviy primitivlar (button, badge)
    marketing/           landing bo'limlari
    theme/               yorqin/qorong'i rejim
  lib/
    money.ts             PUL — barcha hisob-kitob shu yerda
    enums.ts             holat qiymatlarining yagona manbasi
    settings.ts          biznes qoidalari (databasedan)
    db.ts                Prisma klienti
    env.ts               muhit tekshiruvi
    auth/                parol, bootstrap
    queries/             ma'lumot o'qish
  i18n/request.ts        til sozlamasi
  instrumentation.ts     server start hooki

messages/uz.json         BARCHA interfeys matnlari
legacy/                  eski Vite sayti (arxiv, referens uchun)
```

---

## Muhim konvensiyalar

Bu qoidalar buzilsa xatolar jimgina kirib keladi — shuning uchun ular kod
ichida ham izohlangan.

### 1. Pul — faqat `src/lib/money.ts` orqali

Summalar `bigint`, birlik **tiyin** (1 so'm = 100 tiyin). `number` yoki
`Float` bilan pul hisoblanmaydi.

Foizlar **basis point** da: 1500 bps = 15%. Sababi — `0.15` bilan
ko'paytirish yaxlitlash xatosini keltiradi.

Bo'lish funksiyalari yig'indi aynan saqlanishini kafolatlaydi
(`splitCommission`, `splitByShare`, `splitEvenly`) — bu xususiyat minglab
tasodifiy qiymatda test qilinadi.

### 2. Holat qiymatlari — `src/lib/enums.ts`

SQLite'da Prisma `enum` ni qo'llamaydi, shuning uchun schema'da ular `String`.
Tip xavfsizligi shu fayl orqali. Yangi qiymat qo'shsangiz — `messages/uz.json`
ga tarjimasini ham qo'shing.

Loyiha holat o'tishlari `PROJECT_TRANSITIONS` jadvalida: mantiq bir joyda,
komponentlarga sochilmagan.

### 3. Biznes qoidalari — databaseda

Komissiya foizi, minimal yechib olish, moderatsiya — hammasi `Setting`
jadvalidan. `.env` faqat boshlang'ich qiymat beradi.

Loyiha yaratilganda komissiya `Project.commissionBps` ga **muzlatiladi** —
admin keyin foizni o'zgartirsa, boshlangan loyihalar ta'sirlanmaydi.

### 4. Matnlar — `messages/uz.json`

Komponentlarda qattiq yozilgan foydalanuvchiga ko'rinadigan matn bo'lmasligi
kerak.

Yana bir sabab bor: Turbopack (SWC) JSX ichida `{ifoda}` dan keyingi matnning
birinchi qatoridagi probelni kesib tashlaydi. `Misol {summa} uchun` deb
yozilsa `Misol 5 000 so'muchun` bo'lib qoladi. Butun gapni tarjima faylida
`{placeholder}` bilan yozish bu tuzoqni butunlay yo'q qiladi.

### 5. Hamyon balansi — faqat tranzaksiya bilan

`Wallet.balance` ni to'g'ridan-to'g'ri yozish taqiqlanadi. Har o'zgarish
`WalletTransaction` yozuvi bilan birga, bitta DB tranzaksiyasi ichida
bo'lishi kerak. `WalletTransaction.reference` unique — takroriy so'rov
pulni ikki marta o'tkazmaydi.

---

## Testlar

```bash
npm test              # barchasi
npm test money        # nomida "money" bo'lgan fayllar
```

Node.js'ning o'zining test runneri ishlatiladi (`node:test`) — qo'shimcha
kutubxona yo'q. Test fayllari `*.test.ts`, kod bilan yonma-yon turadi.

---

## Xavfsizlik

- Parollar bcrypt (cost 12) bilan hashlanadi, xom holda saqlanmaydi
- Refresh token modeli SHA-256 hash va rotatsiya zanjiri bilan loyihalangan
  (`Session` modeli) — amaliyoti keyingi fazada
- Xavfsizlik sarlavhalari `next.config.ts` da
- Hech qanday maxfiy qiymat kodda yoki git'da yo'q — faqat `.env`

Zaiflik topsangiz: <info@ozodflow.uz>
