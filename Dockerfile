# ═══════════════════════════════════════════════════════════════════════════
#  OzodFlow — production image
#
#  Ko'p bosqichli build: yakuniy image'da devDependencies va manba kod yo'q.
#
#  `node:22-slim` (Debian) tanlandi, `alpine` emas. Sabab: Prisma o'zining
#  Rust query engine binarysini ishlatadi va Alpine'ning musl libc'si uchun
#  alohida `binaryTargets` sozlash kerak bo'ladi. Debian'da standart binary
#  ishlaydi — bitta sozlash muammosi kamayadi.
# ═══════════════════════════════════════════════════════════════════════════

# ── 1. Bog'liqliklar ───────────────────────────────────────────────────────
FROM node:22-slim AS deps

WORKDIR /app

# Prisma engine OpenSSL'ga bog'lanadi.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# npm versiyasini QADAB QO'YAMIZ.
#
# `node:22-slim` image'i npm 10.x bilan keladi, lekin package-lock.json npm 11
# bilan yasalgan. Ikki versiya platformaga bog'liq optional paketlarni
# (@emnapi/*, @img/sharp-*, @swc/helpers) turlicha yozadi va `npm ci`
# "Missing from lock file" xatosi bilan yiqiladi.
#
# Lock faylni yasagan npm bilan bir xil versiya ishlatilsa bu muammo
# butunlay yo'qoladi. Versiyani o'zgartirsangiz — lock faylni ham
# o'sha npm bilan qayta yasang.
ARG NPM_VERSION=11.6.2
RUN npm install -g "npm@${NPM_VERSION}"

# Manifest fayllar VA Prisma schema.
#
# Schema shu yerda kerak, chunki `package.json` da `postinstall` skripti bor
# va u `prisma generate` ni chaqiradi. Schema bo'lmasa `npm ci` shu joyda
# "Could not find Prisma Schema" xatosi bilan yiqiladi.
#
# Ilova kodi ATAYLAB ko'chirilmaydi: kod o'zgarganda bu qatlam keshdan
# olinadi va `npm ci` qayta ishlamaydi (bu build vaqtining eng katta qismi).
COPY package.json package-lock.json ./
COPY prisma ./prisma

# `postinstall` → `prisma generate` uchun soxta manzil. Generatsiya
# databasega ULANMAYDI, lekin o'zgaruvchi mavjud bo'lishini kutadi.
ENV DATABASE_URL="file:/tmp/build-placeholder.db"

RUN npm ci


# ── 2. Build ───────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# npm versiyasini QADAB QO'YAMIZ.
#
# `node:22-slim` image'i npm 10.x bilan keladi, lekin package-lock.json npm 11
# bilan yasalgan. Ikki versiya platformaga bog'liq optional paketlarni
# (@emnapi/*, @img/sharp-*, @swc/helpers) turlicha yozadi va `npm ci`
# "Missing from lock file" xatosi bilan yiqiladi.
#
# Lock faylni yasagan npm bilan bir xil versiya ishlatilsa bu muammo
# butunlay yo'qoladi. Versiyani o'zgartirsangiz — lock faylni ham
# o'sha npm bilan qayta yasang.
ARG NPM_VERSION=11.6.2
RUN npm install -g "npm@${NPM_VERSION}"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build vaqtida maxfiy kalitlar yo'q va database mavjud emas.
# `src/lib/env.ts` shu bayroqni ko'rib tekshiruvni o'tkazib yuboradi;
# marketing so'rovlari try/catch ichida, shuning uchun bosh sahifa
# prerender qilinishi baribir muvaffaqiyatli bo'ladi.
ENV SKIP_ENV_VALIDATION=1
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build vaqtidagi SOXTA database manzili.
#
# `prisma generate` va bosh sahifani prerender qilish `DATABASE_URL` ni
# o'qiydi. Build'da haqiqiy database yo'q, lekin o'zgaruvchi UMUMAN
# berilmasa Prisma "Environment variable not found" xatosini log'ga
# to'ldiradi. Bu qiymat faqat build'da yashaydi va runtime'da
# docker-compose / Railway bergan haqiqiy manzil bilan almashadi.
ENV DATABASE_URL="file:/tmp/build-placeholder.db"

# `output: "standalone"` ni yoqadi (next.config.ts'ga qarang). Faqat shu
# yerda: lokal va Railway `next start` ishlatadi, u standalone bilan mos emas.
ENV DOCKER_BUILD=1

RUN npm run build


# ── 3. Ishga tushirish ─────────────────────────────────────────────────────
FROM node:22-slim AS runner

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Bu bosqichda npm ISHLATILMAYDI (server `node server.js` bilan turadi),
# shuning uchun npm qadab qo'yilmaydi — image bekorga kattalashmasin.

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Root'dan ishlatmaymiz. `node` foydalanuvchisi node:22 image'da mavjud.
# SQLite fayl turadigan katalog shu foydalanuvchiga tegishli bo'lishi kerak.
RUN mkdir -p /data && chown -R node:node /data

# `output: "standalone"` faqat kerakli node_modules'ni o'z ichiga oladi.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# Migratsiyalar va schema — konteyner ichida `prisma migrate deploy` uchun.
COPY --from=builder --chown=node:node /app/prisma ./prisma

# Prisma CLI va engine. Standalone bundle faqat klientni oladi, CLI'ni emas —
# migratsiyalarni qo'llash uchun CLI kerak.
#
# `node_modules/.bin/prisma` ATAYLAB ko'chirilmaydi: u symlink, Docker COPY
# uni oddiy faylga aylantiradi va bajarish huquqi yo'qolib qolishi mumkin.
# Buning o'rniga entrypoint CLI'ni to'g'ridan-to'g'ri `node` bilan chaqiradi.
COPY --from=builder --chown=node:node /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=node:node /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma

COPY --chown=node:node docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x ./docker/entrypoint.sh

# ── `npm start` ni ham ishlaydigan qilamiz ─────────────────────────────────
#
# MUAMMO: deploy platformalari (Railway, Render) konteynerni ko'pincha o'z
# "Custom Start Command" bilan ishga tushiradi — masalan `npm start`. Bu
# Dockerfile'dagi ENTRYPOINT'ni CHETLAB O'TADI, ya'ni:
#
#   • migratsiyalar qo'llanmaydi
#   • `npm start` standalone bundle ichidagi package.json'ni o'qiydi, u yerda
#     `start` hamon `next start` — lekin `next` binarysi bu image'da YO'Q
#     (standalone faqat runtime bog'liqliklarini oladi)
#
# Natija: `sh: 1: next: not found`.
#
# YECHIM: image ichidagi `start` skriptini qayta yozamiz, shunda `npm start`
# ham entrypoint orqali o'tadi va migratsiyalar bajariladi. Endi konteyner
# platformaning sozlamasi qanday bo'lishidan qat'i nazar to'g'ri ishga tushadi.
#
# Eng to'g'ri yo'l — platformada custom start command'ni BO'SH qoldirish,
# lekin bu himoya eski sozlama qolib ketgan holatni ham qutqaradi.
RUN node -e "const fs=require('node:fs'); \
const manifest=JSON.parse(fs.readFileSync('package.json','utf8')); \
manifest.scripts={start:'sh ./docker/entrypoint.sh node server.js'}; \
fs.writeFileSync('package.json', JSON.stringify(manifest,null,2)+'\n');" \
  && chown node:node package.json

USER node

EXPOSE 3000

# Healthcheck `/api/health` ga uriladi — deploy platformasi shu orqali
# konteyner tayyor bo'lganini biladi.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["node", "server.js"]
