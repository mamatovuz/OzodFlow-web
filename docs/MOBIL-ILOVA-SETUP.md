# Haqiqiy mobil ilova (.apk) — sozlash qo'llanmasi

Restoran egasi dashboard'da **"Ilova yaratish"** bosganда, tizim uning restorani
nomi, logosi va rangi bilan **haqiqiy imzolangan Android `.apk`** quradi. APK
GitHub Actions'da (bepul, JDK + Android SDK oldindan bor) quriladi va tayyor
bo'lgach egasi uni telefonga yuklab oladi.

Bir marta quyidagilarni sozlash kerak. ~15 daqiqa.

---

## 1-qadam — Imzo kalitini yaratish (bir marta)

Barcha ilovalar bitta imzo kaliti bilan imzolanadi.

1. GitHub'da repoga kiring → **Actions** bo'limi.
2. Chapdan **"Generate signing keystore (bir marta)"** workflow'ini tanlang.
3. **Run workflow** → alias'ni `ozodflow` qoldiring → **Run**.
4. Tugagach, ishga tushgan run ichida:
   - **Summary**'da `ANDROID_CERT_SHA256` qiymati chiqadi (bu ommaviy).
   - Pastda **keystore-secrets** artifact'ini yuklab oling (zip). Ichida:
     `ANDROID_KEYSTORE_B64.txt`, `ANDROID_KEY_ALIAS.txt`,
     `ANDROID_KEYSTORE_PASSWORD.txt`, `ANDROID_KEY_PASSWORD.txt`,
     `ANDROID_CERT_SHA256.txt`.

> ⚠️ Bu artifact'ni saqlang, lekin hech kimga bermang — bu ilovalaringizning
> imzo kaliti. 1 kundan keyin GitHub'dan o'chadi.

---

## 2-qadam — GitHub Secrets qo'shish

Repo → **Settings → Secrets and variables → Actions → New repository secret**.
Quyidagi 5 ta sirni qo'shing (qiymatlarni artifact fayllaridan oling):

| Secret nomi | Qiymat |
|---|---|
| `ANDROID_KEYSTORE_B64` | `ANDROID_KEYSTORE_B64.txt` ichidagi uzun satr |
| `ANDROID_KEY_ALIAS` | `ozodflow` |
| `ANDROID_KEYSTORE_PASSWORD` | `ANDROID_KEYSTORE_PASSWORD.txt` |
| `ANDROID_KEY_PASSWORD` | `ANDROID_KEY_PASSWORD.txt` |
| `APK_BUILD_SECRET` | O'zingiz tanlagan tasodifiy satr (`openssl rand -hex 24`) |

`APK_BUILD_SECRET` — build tugagach APK ni serverга qaytarish uchun. Xuddi shu
qiymat 3-qadamda Railway env'ga ham qo'yiladi (ikkalasi mos bo'lishi shart).

---

## 3-qadam — GitHub Personal Access Token (server → Actions)

Server workflow'ni ishga tushirishi uchun token kerak.

1. GitHub → **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**.
2. **Repository access**: faqat `OzodFlow-web` reposi.
3. **Permissions → Repository → Actions: Read and write**.
4. Yarating va tokenni nusxa oling (`github_pat_...`).

---

## 4-qadam — Railway env o'zgaruvchilari

Railway loyihasi → **Variables** ga qo'shing:

```
GITHUB_REPO=mamatovuz/OzodFlow-web
GH_DISPATCH_TOKEN=github_pat_...        # 3-qadamdagi token
APK_BUILD_SECRET=<2-qadamdagi bilan BIR XIL>
ANDROID_CERT_SHA256=<1-qadamdagi SHA-256>
NEXT_PUBLIC_APP_URL=https://ozodflow.uz
```

> `NEXT_PUBLIC_APP_URL` — haqiqiy HTTPS domeningiz. Callback, ikonka va menyu
> havolalari shundan yasaladi.

APK fayllar volume'ga (`UPLOAD_DIR/apk/`) saqlanadi — Railway'da Volume ulangan
bo'lsa redeploy'da o'chmaydi.

---

## 5-qadam — Kodni push qiling

`.github/workflows/*.yml` fayllar `main` branch'da bo'lishi shart (aks holda
`workflow_dispatch` topilmaydi):

```
git add .
git commit -m "Mobil ilova: haqiqiy APK build (GitHub Actions)"
git push
```

---

## Tekshirish

1. Restoran egasi sifatida kiring → **Mobil ilova** sahifasi.
2. Nom/rangни sozlang → **Ilova yaratish**.
3. "Ilova qurilmoqda…" chiqadi. GitHub → Actions'да **"Build restaurant APK"**
   run'i ishlaydi (~3–5 daqiqa).
4. Tugagach dashboard'да **"Ilovani yuklab olish"** tugmasi jonlanadi.
5. Telefonда APK ni ochib o'rnating (Android "noma'lum manba"ga ruxsat so'raydi).

### URL panelini (Chrome bar) yashirish

Ilova ochilganда tepada yupqa Chrome manzil paneli ko'rinsa — bu
`assetlinks.json` hali tarqamaganидан. `ANDROID_CERT_SHA256` to'g'ri qo'yilган
bo'lsa, `https://ozodflow.uz/.well-known/assetlinks.json` avtomatik to'g'ri
javob beradi va bir necha soат ichида panel yo'qoladi (Chrome keshni yangilagach).

---

## Muammolar

- **"Ilovani qurishni boshlab bo'lmadi"** → `GH_DISPATCH_TOKEN` yoki `GITHUB_REPO`
  noto'g'ri, yoki tokenда Actions write ruxsati yo'q.
- **Build FAILED** → GitHub → Actions'да run logini oching. Ko'p hollarда 5 ta
  Secret to'liq qo'shilмaган bo'ladi.
- **APK qaytmadi (BUILDING'da qoldi)** → `APK_BUILD_SECRET` GitHub Secret va
  Railway env'да bir xil emas, yoki `NEXT_PUBLIC_APP_URL` noto'g'ri.
- **Yuklab olishда 404** → build hali tugamаган yoki callback yetib bormаган;
  Actions logidagi "Send APK back" qadamини tekshiring.
