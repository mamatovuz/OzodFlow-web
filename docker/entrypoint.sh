#!/bin/sh
set -e

# ═══════════════════════════════════════════════════════════════════════════
#  Konteyner ishga tushganda:
#    1. sozlamalarni tekshirish
#    2. database migratsiyalarini qo'llash
#    3. serverni ishga tushirish
#
#  Super admin yaratish BU YERDA EMAS — u `src/instrumentation.ts` da,
#  server start bo'lganda bajariladi (`tsx` va devDependencies kerak emas).
# ═══════════════════════════════════════════════════════════════════════════

# ── DATABASE_URL bormi ────────────────────────────────────────────────────
if [ -z "${DATABASE_URL}" ]; then
  echo "" >&2
  echo "XATO: DATABASE_URL berilmagan." >&2
  echo "" >&2
  echo "Railway/Docker sozlamalarida quyidagini qo'shing:" >&2
  echo "  DATABASE_URL=file:/data/ozodflow.db" >&2
  echo "" >&2
  exit 1
fi

# ── SQLite fayl uchun katalog yoziladigan holatdami ───────────────────────
#
# Nega bu tekshiruv kerak: konteyner `node` foydalanuvchisi sifatida
# ishlaydi, tashqi volume esa (Railway, Docker `-v`) ko'pincha root'ga
# tegishli bo'lib mount qilinadi. Bunda SQLite "unable to open database
# file" degan tushunarsiz xato beradi va sabab uzoq izlanadi.
#
# Faqat `file:` manzillarida tekshiramiz — Postgres'ga o'tilganda bu
# blok o'zi chetlab o'tiladi.
case "${DATABASE_URL}" in
  file:*)
    DB_PATH="${DATABASE_URL#file:}"
    DB_DIR="$(dirname "${DB_PATH}")"

    if [ ! -d "${DB_DIR}" ]; then
      mkdir -p "${DB_DIR}" 2>/dev/null || true
    fi

    if [ ! -w "${DB_DIR}" ]; then
      echo "" >&2
      echo "XATO: ${DB_DIR} katalogiga yozib bo'lmaydi." >&2
      echo "" >&2
      echo "Konteyner '$(id -un)' foydalanuvchisi sifatida ishlamoqda," >&2
      echo "katalog esa boshqa egaga tegishli:" >&2
      ls -ld "${DB_DIR}" >&2 2>/dev/null || true
      echo "" >&2
      echo "Yechim variantlari:" >&2
      echo "  1. Volume mount yo'lini tekshiring (kutilgan: /data)" >&2
      echo "  2. Hosting sozlamasida volume egasini o'zgartiring" >&2
      echo "" >&2
      exit 1
    fi
    ;;
esac

# ── Migratsiyalar ─────────────────────────────────────────────────────────
echo "→ Migratsiyalar qo'llanmoqda..."

# `migrate deploy` — production uchun: faqat mavjud migratsiyalarni qo'llaydi,
# yangi migratsiya yaratmaydi va ma'lumotni o'chirmaydi.
# `migrate dev` ni production'da ishlatish MUMKIN EMAS — u schema mos
# kelmasa databaseni tozalab tashlashi mumkin.
#
# CLI `/opt/prisma-cli` da turadi, ilova node_modules'ida emas: uning o'z
# bog'liqliklari bor va ular standalone bundle'ga sig'maydi (Dockerfile'dagi
# izohga qarang). `--schema` aniq ko'rsatiladi, chunki CLI boshqa katalogda.
node /opt/prisma-cli/node_modules/prisma/build/index.js migrate deploy \
  --schema /app/prisma/schema.prisma

echo "→ Server ishga tushmoqda (port ${PORT:-3000})"

exec "$@"
