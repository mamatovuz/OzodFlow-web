# OzodFlow

Raqamli xizmatlar marketplace: mijozlar loyiha joylashtiradi, tekshirilgan
mutaxassislar bajaradi, pul escrow orqali himoyalanadi.

**Domen:** [ozodflow.uz](https://ozodflow.uz)

---

## Holat

Loyiha fazalar bilan quriladi. Quyida nima tayyor va nima yo'q — ochiq holat.

### Tayyor va ishlaydi

| Qism | Izoh |
| --- | --- |
| Poydevor | Next.js 16 (App Router), TypeScript, Tailwind v4 |
| Dizayn tizimi | OKLCH palitra, yorqin/qorong'i rejim, tipografiya, soyalar |
| Domen modeli | 40+ Prisma modeli |
| **Pul matematikasi** | `src/lib/money.ts` — tiyin + basis point, **42 test** |
| **Hamyon dvigateli** | `src/lib/wallet.ts` — idempotent tranzaksiyalar, bloklash |
| **Escrow** | To'ldirish, taqsimlash, qaytarish, nizo bo'linishi — **12 test** |
| **Loyiha oqimi** | Yaratish → moderatsiya → taklif → escrow → topshirish → qabul, **6 test** |
| **Auth** | JWT + rotatsiyali refresh, o'g'irlik aniqlash, rate limit, CSP |
| Parol xavfsizligi | bcrypt (cost 12), mustahkamlik tekshiruvi, timing himoyasi |
| Parolni tiklash | Bir martalik token (HMAC), barcha sessiyalar yopiladi |
| Birinchi admin | `.env` dan avtomatik yaratiladi, kodda parol yo'q |
| **Kabinetlar** | Mijoz va mutaxassis uchun rolga qarab |
| **Hamyon sahifasi** | Balans, tranzaksiyalar tarixi, to'ldirish so'rovi |
| **To'lov shlyuzi** | inPAY — Click/Payme/Plum orqali to'ldirish, **19 test** |
| **Sozlamalar** | Profil, xavfsizlik (parol/email), kirgan qurilmalar, xabarnomalar |
| **Portfolio va ko'nikmalar** | Developer o'z ishlarini va ko'nikmalarini boshqaradi, **19 test** |
| **Admin panel** | Buxgalteriya tekshiruvi, to'lovlar, moderatsiya, foydalanuvchilar |
| **Ommaviy profillar** | `/dev/username` — SSG, `Person` schema.org bilan |
| Xizmatlar katalogi | `/services` va kategoriya sahifalari, SSG |
| Bosh sahifa | SSR, haqiqiy ma'lumot, `Organization` + `FAQPage` schema |
| SEO | Dinamik sitemap va robots, canonical, Open Graph |
| i18n | Barcha matn `messages/uz.json` da — `ru`/`en` faqat tarjima ishi |
| Docker | Ko'p bosqichli image, doimiy volume, healthcheck |

### Hali yo'q

| Qism | Izoh |
| --- | --- |
| Chat | Real vaqt xabar almashish (`Conversation` modeli tayyor) |
| Developer arizasi | Texnik test, portfolio yuklash, shaxs tasdig'i. **Hozircha** tasdiqlashni admin panelda admin bajaradi |
| Boshqa to'lov shlyuzlari | Click, Payme to'g'ridan-to'g'ri (hozir inPAY orqali) |
| Pul yechib olish | Model va admin ko'rinishi tayyor, avtomatik o'tkazma yo'q |
| Email yuborish | `src/lib/mail.ts` tayyor, SMTP transport ulanmagan — xat log'ga yoziladi |
| Fayl yuklash | S3/MinIO integratsiyasi |
| Sharh va reyting | Model tayyor, forma va hisoblash yo'q |
| AI funksiyalari | Tavsif generatori, byudjet taxmini, spam filtri |
| Blog / CMS | Model tayyor, sahifalar yo'q |
| Huquqiy hujjatlar | Sahifalar bor, matn yuridik ko'rikni kutmoqda |

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
| `npm run db:seed:reference` | Faqat katalog va ko'nikmalar (admin yaratmaydi) |
| `npm run db:studio` | Databaseni brauzerda ko'rish |
| `npm run db:reset` | Databaseni tozalab qayta yasash |
| `npm run bootstrap` | Super adminni qo'lda yaratish |
| `npm run inpay:check` | To'lov shlyuzi ulanishini tekshirish (faqat o'qish) |

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

## To'lov tizimi

Hamyonni to'ldirishning **ikki yo'li** bor va ikkalasi ham ishlab turadi.

| Yo'l | Provayder | Qachon |
| --- | --- | --- |
| Karta orqali | **inPAY** (Click, Payme, Plum) | Asosiy yo'l. Minimal 1 000 so'm |
| Bank o'tkazmasi | `MANUAL` | Shlyuz sozlanmaganda, juda katta summada, yoki mijoz tanlaganda |

Kod: `src/lib/payments/inpay.ts` (shlyuz klienti),
`src/lib/payments/deposits.ts` (biznes mantiq),
`src/app/webhook/tolov/route.ts` (webhook).

> **Ism qoidasi:** `src/lib/payments/index.ts` shlyuzdan mustaqil nomlar
> beradi (`isGatewayConfigured`, `GATEWAY_MIN_SUM`, `settleGatewayPayment`).
> UI va action'lar shu nomlarni ishlatadi, shuning uchun shlyuz almashsa
> faqat barrel faylning oxirgi to'rt qatori o'zgaradi. Bu CHECKOUT.UZ →
> inPAY o'tishida amalda tekshirildi.

### Sozlash

1. [inpay.uz](https://inpay.uz) da ro'yxatdan o'tib kassa yarating.
2. **Merchant ID** ni oling → `INPAY_MERCHANT_ID`
3. **Merchant token** (32 belgi) ni oling → `INPAY_MERCHANT_TOKEN`
4. Callback domenini whitelist'ga qo'shing: `ozodflow.uz`

Tekshirish (pul harakatlanmaydi, faqat o'qish):

```bash
npm run inpay:check
```

O'zgaruvchilar bo'sh qoldirilsa karta orqali to'lov **jimgina o'chadi** va
hamyon sahifasida faqat bank o'tkazmasi ko'rinadi. Ilova yiqilmaydi — bu
ataylab shunday.

### Token keshi — ixtiyoriy optimizatsiya emas

inPAY'da har IP uchun **soatiga 100 so'rov** limiti bor. Bearer token 24
soat amal qiladi.

Agar har to'lov uchun avval token olsak, keyin to'lov yaratsak — bitta
to'lov 2 so'rov yeydi va soatiga faqat 50 to'lov qabul qilardik. Shu
sababli token modul xotirasida 23 soat keshlanadi (bir soatlik zaxira
bilan) va bir vaqtda ketayotgan token so'rovi bitta bilan chegaralanadi.

### Webhook'ga ISHONILMAYDI

Bu qismning eng muhim qarori.

inPAY webhook'ida **imzo yo'q** — hujjatda signature, HMAC yoki umumiy
maxfiy kalit ko'rsatilmagan. Manzil esa ochiq. Ya'ni istalgan odam bizga
quyidagini yuborishi mumkin:

```json
{ "status": "success", "order_id": "1ff2f5a6d66f6e9c",
  "amount": "100000000.00", "transaction_id": 149 }
```

Shu sababli webhook **faqat signal** sifatida qabul qilinadi:

1. Tanadan **faqat `order_id`** olinadi. Summa, holat, tranzaksiya id —
   hammasi e'tiborga olinmaydi.
2. Shlyuzning o'zidan `/transactions/` orqali **mustaqil tasdiq** olinadi.
3. Faqat `status: "success"` to'langan hisoblanadi.
4. Shlyuz aytgan summa **lokal yozuv bilan solishtiriladi** — bir tiyinlik
   farq ham o'tmaydi. Mos kelmasa: audit yoziladi va pul qo'shilmaydi.
5. `reference` unique — bir to'lov ikki marta hisoblanmaydi.

Natijada soxta webhook hech narsa qilmaydi. Bu
`src/lib/payments/deposits.test.ts` da qulflangan — 19 test, jumladan
`"shlyuz 'success' demasa pul qo'shilmaydi"`.

> Shu tartibni buzmaslik kerak. Webhook tanasidagi summaga ishonish —
> bepul pul ishlab chiqaruvchi teshik.

### Webhook yo'qolsa

inPAY 200 dan boshqa kod kelsa webhook'ni **qayta yuboradi**. Shuning
uchun kutilmagan xatoda `500` qaytaramiz — to'lov yo'qolmaydi. Soxta
webhook va boshqa "normal" natijalar esa `200` oladi: ularni qayta
yuborish hech narsani o'zgartirmaydi.

Zaxira yo'l ham bor: mijoz hamyon sahifasida **"Holatni tekshirish"**
tugmasini bosib holatni shlyuzdan qayta so'rashi mumkin
(`recheckPendingGatewayPayments`, bir bosishda maksimum 10 ta so'rov —
soatlik limitni bekorga yemasligi uchun).

### Butun so'm cheklovi

Shlyuz **so'mda** ishlaydi, bizda hisob **tiyinda**. Shu sababli shlyuz
orqali faqat butun so'mlik summa yuboriladi (`amount % 100n === 0n`),
aks holda `/transactions/` qaytargan summa lokal yozuvga hech qachon teng
bo'lmasdi va har to'lov "summa mos kelmadi" bo'lib qolardi. Butun
bo'lmagan summa avtomatik bank yo'liga o'tadi.

---

## Deploy

SQLite **doimiy diskni** talab qiladi, shuning uchun:

| Platforma | Ishlaydimi | Izoh |
| --- | --- | --- |
| Railway | ✅ | Volume kerak (pastga qarang) |
| VPS + Docker | ✅ | `docker compose up -d` |
| Fly.io | ✅ | Fly Volume |
| **Vercel** | ❌ | Fayl tizimi vaqtinchalik — SQLite saqlanmaydi |

Vercel'da ishlatish kerak bo'lsa Postgres'ga o'tish shart (pastga qarang).

### Railway

**1. Volume ulash — bu qadam MAJBURIY.**

Railway service → **Settings → Volumes → New Volume**, mount path:

```
/data
```

> Volume ulanmasa har deploy'da database noldan yaratiladi: barcha
> foydalanuvchi, loyiha va to'lov tarixi yo'qoladi. SQLite fayl konteyner
> ichida turadi, konteyner esa har deploy'da yangidan yasaladi.

**2. O'zgaruvchilarni kiritish** — Railway service → **Variables**.
Fayl orqali emas, aynan shu bo'limda:

```bash
DATABASE_URL=file:/data/ozodflow.db      # ← volume mount path'iga mos bo'lsin
NEXT_PUBLIC_APP_URL=https://ozodflow.uz  # https, http emas

JWT_ACCESS_SECRET=<48 baytlik tasodifiy qiymat>
JWT_REFRESH_SECRET=<boshqa 48 baytlik qiymat>

OZODFLOW_ADMIN_EMAIL=<email>
OZODFLOW_ADMIN_PASSWORD=<kuchli parol>

INPAY_MERCHANT_ID=<inpay.uz merchant raqami>
INPAY_MERCHANT_TOKEN=<32 belgili merchant token>
```

Kalitlarni yasash:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`PORT` ni qo'lda kiritish kerak emas — Railway o'zi beradi.

**3. Build va Start buyruqlarini BO'SH qoldiring.**

Railway service → **Settings → Build** va **Settings → Deploy**:

| Sozlama | Qiymat |
| --- | --- |
| Builder | `Dockerfile` |
| Build Command | **bo'sh** |
| Custom Start Command | **bo'sh** |
| Pre-deploy Command | **bo'sh** |

> **Bu eng ko'p uchraydigan xato.** Custom Start Command'ga `npm start`
> yozilgan bo'lsa, Railway Dockerfile'dagi `ENTRYPOINT` ni **chetlab
> o'tadi** — natijada migratsiyalar qo'llanmaydi va konteyner
> `sh: 1: next: not found` bilan yiqiladi (`next` binarysi standalone
> image'da yo'q, u faqat runtime bog'liqliklarini oladi).
>
> Dockerfile o'zi hamma narsani biladi: migratsiya → server.
>
> Agar biror sababdan start command kerak bo'lsa, u entrypoint'dan
> o'tishi shart:
>
> ```
> ./docker/entrypoint.sh node server.js
> ```

**4. Deploy.** Konteyner ishga tushganda ketma-ketlik shunday:

| Qadam | Qayerda | Nima qiladi |
| --- | --- | --- |
| 1 | `docker/entrypoint.sh` | `prisma migrate deploy` — jadvallar yasaladi |
| 2 | `src/instrumentation.ts` | Ma'lumotnoma yoziladi: katalog, ko'nikmalar, sozlamalar, nishonlar, savollar |
| 3 | `src/instrumentation.ts` | Super admin va tizim hamyonlari yaratiladi |

Ikkinchi qadam **majburiy**: Railway'da database bo'sh volume'da
yaratiladi. Migratsiyalar jadval yasaydi, lekin jadvallar bo'sh bo'ladi —
seed ishlamasa sayt ochiladi-yu, xizmatlar katalogi bo'm-bo'sh chiqadi va
komissiya sozlamasi topilmaydi.

Birinchi start ~2.5 sekund uzoq davom etadi. Keyingi startlarda seed
o'tkazib yuboriladi (`system.reference_data_version` belgisi bo'yicha).

> Seed ma'lumotini o'zgartirsangiz — `src/lib/seed/index.ts` dagi
> `REFERENCE_DATA_VERSION` ni oshiring, aks holda yangi kategoriya
> production'ga tushmaydi.

Admin yaratilgandan keyin `OZODFLOW_ADMIN_PASSWORD` ni Variables'dan
o'chirib qo'yish tavsiya etiladi — u boshqa kerak bo'lmaydi.

> **Diqqat:** `npm ci` lock fayl `package.json` bilan aynan mos bo'lishini
> talab qiladi. `package.json` ni qo'lda tahrirlagandan keyin albatta
> `npm install` ni ishga tushiring va `package-lock.json` ni ham commit
> qiling — aks holda Railway build'i "Missing ... from lock file" xatosi
> bilan yiqiladi.

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

Hozir **149 test**. Pul bilan ishlaydigan qismlar (money, wallet, escrow,
deposits) va egalik tekshiruvi talab qiladigan qismlar (portfolio)
haqiqiy SQLite databaseda tekshiriladi — mock bilan emas, chunki
mock tranzaksiyani rollback qilmaydi va unique cheklovni bilmaydi.

Testlar **tashqi tarmoqqa chiqmaydi**. Shlyuz javobi `verify` parametri
orqali almashtiriladi — aks holda har ishga tushirish uchun haqiqiy
to'lov kerak bo'lardi.

---

## Xavfsizlik

- Parollar bcrypt (cost 12) bilan hashlanadi, xom holda saqlanmaydi
- Refresh token **xom holda saqlanmaydi** — HMAC-SHA256 hash, rotatsiya
  zanjiri va qayta ishlatishni aniqlash bilan (`src/lib/auth/session.ts`)
- To'lov webhook'iga ishonilmaydi — summa shlyuzdan mustaqil tasdiqlanadi
  (yuqoridagi "To'lov tizimi" bo'limiga qarang)
- Hamyon balansi faqat tranzaksiya ichida va idempotent `reference` bilan
  o'zgaradi
- Xavfsizlik sarlavhalari va nonce'li CSP `src/middleware.ts` da
- Hech qanday maxfiy qiymat kodda yo'q — faqat `.env` (git'ga tushmaydi).
  `.env.example` da **faqat bo'sh joy va namuna qiymatlar** bo'lishi kerak

Zaiflik topsangiz: <info@ozodflow.uz>
