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

# Faqat manifest fayllar ko'chiriladi: kod o'zgarganda bu qatlam
# keshdan olinadi va `npm ci` qayta ishlamaydi.
COPY package.json package-lock.json ./
RUN npm ci


# ── 2. Build ───────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build vaqtida maxfiy kalitlar yo'q va database mavjud emas.
# `src/lib/env.ts` shu bayroqni ko'rib tekshiruvni o'tkazib yuboradi;
# marketing so'rovlari try/catch ichida, shuning uchun bosh sahifa
# prerender qilinishi baribir muvaffaqiyatli bo'ladi.
ENV SKIP_ENV_VALIDATION=1
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

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

# Prisma CLI va engine. Standalone bundle faqat klientni oladi, CLI'ni emas.
COPY --from=builder --chown=node:node /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=node:node /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=node:node /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

COPY --chown=node:node docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x ./docker/entrypoint.sh

USER node

EXPOSE 3000

# Healthcheck `/api/health` ga uriladi — deploy platformasi shu orqali
# konteyner tayyor bo'lganini biladi.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["node", "server.js"]
