# Domen va subdomen ulash — Cloudflare + Railway

Maqsad: menyular `ozodflow.uz/m/test` emas, **`test.ozodflow.uz`** ko'rinishida ochilsin.
Har bir restoran o'z slug'i bilan avtomatik subdomen oladi (`restoran-nomi.ozodflow.uz`).

Kod tayyor. Faqat quyidagi **bir martalik sozlash** kerak.

---

## 0. Talablar

- `ozodflow.uz` domeni sizda va **Cloudflare** orqali boshqariladi (nameserver Cloudflare).
- Railway'da **pullik reja** (Hobby yoki undan yuqori). Wildcard `*.ozodflow.uz`
  custom domain faqat pullik rejada mavjud. (Free trial'da wildcard bo'lmasa — pastdagi
  "Wildcard bo'lmasa" bo'limiga qarang.)

---

## 1. Railway — domenlarni qo'shish

Railway → loyiha → servis → **Settings → Networking → Custom Domain**:

1. `ozodflow.uz` qo'shing → Railway sizga **CNAME target** beradi
   (masalan `abcd1234.up.railway.app`). Uni ko'chirib oling.
2. `*.ozodflow.uz` qo'shing → yana CNAME target beradi (odatda bir xil).

> Ushbu target'ni keyingi qadamlarda `RAILWAY_TARGET` deb ataymiz.

---

## 2. Cloudflare — DNS yozuvlari

Cloudflare → `ozodflow.uz` → **DNS → Records → Add record**:

| Type  | Name (nom) | Target / Content   | Proxy status          |
|-------|------------|--------------------|-----------------------|
| CNAME | `@`        | `RAILWAY_TARGET`   | **DNS only** (kulrang) |
| CNAME | `*`        | `RAILWAY_TARGET`   | **DNS only** (kulrang) |
| CNAME | `www`      | `RAILWAY_TARGET`   | **DNS only** (kulrang) |

> ⚠️ **MUHIM:** bulut ikonasi **kulrang (DNS only)** bo'lsin — to'q sariq (Proxied) EMAS.
> Kulrang bo'lsa Railway o'z SSL (https) sertifikatini avtomatik beradi.
> (Agar to'q sariq — Proxied xohlasangiz: Cloudflare → SSL/TLS → Overview → **Full** rejimi.)

Cloudflare bepul **Universal SSL** `*.ozodflow.uz` (bitta daraja) ni qoplaydi —
subdomenlar https bo'ladi.

---

## 3. Railway — muhit o'zgaruvchilari (Variables)

Railway → servis → **Variables**:

```
NEXT_PUBLIC_BASE_DOMAIN=ozodflow.uz
NEXT_PUBLIC_APP_URL=https://ozodflow.uz
NEXT_PUBLIC_DOMAIN_CNAME=RAILWAY_TARGET
```

- `NEXT_PUBLIC_BASE_DOMAIN` — subdomen manzillari shu domendan quriladi.
- `NEXT_PUBLIC_DOMAIN_CNAME` — foydalanuvchi "o'zim ulayman"da to'g'ri CNAME ko'radi
  (A-record IP o'rniga).

---

## 4. Deploy va tekshirish

1. Yangi kodni push qiling (Railway avtomatik deploy qiladi).
2. DNS + SSL 5–30 daqiqada tayyor bo'ladi.
3. Brauzerda **`test.ozodflow.uz`** oching — "Ziravor" menyusi chiqishi kerak.
4. Ishlamasa: dashboard → Menyu dizayni → domen bo'limida **"Ulanishni tekshirish"**
   tugmasi aniq holatni aytadi.

---

## Wildcard bo'lmasa (Railway free / wildcard yo'q)

Wildcard `*.ozodflow.uz` qo'sha olmasangiz, har restoran subdomenini **alohida**
qo'shish kerak bo'ladi:

1. Railway'ga `restoran-slug.ozodflow.uz` ni Custom Domain sifatida qo'shing.
2. Cloudflare'da `restoran-slug` uchun CNAME (DNS only) qo'shing.

Bu qo'lda — ko'p restoran bo'lsa noqulay. Shu holda **Railway API orqali avtomatik
qo'shish** integratsiyasini yozib berishim mumkin (Railway API token kerak).

---

## Ishlash mantig'i (kod)

- `src/lib/urls.ts` — `menuUrl(slug)` = `https://<slug>.ozodflow.uz`, `slugFromHost(host)`.
- `src/app/page.tsx` — host'dan subdomenni aniqlab menyuni ko'rsatadi (`generateMetadata`
  restoran nomi + logosini tabga qo'yadi).
- Eski `ozodflow.uz/m/<slug>` manzil ham ishlashda davom etadi (eski QR buzilmaydi).
- QR kod (`/dashboard/qr`) endi subdomen manzilni beradi.
