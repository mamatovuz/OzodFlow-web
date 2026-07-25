#!/bin/sh
set -e

# ═══════════════════════════════════════════════════════════════════════════
#  Konteyner ishga tushganda:
#    1. database migratsiyalarini qo'llash
#    2. serverni ishga tushirish
#
#  Super admin yaratish BU YERDA EMAS — u `src/instrumentation.ts` da,
#  server start bo'lganda bajariladi (`tsx` va devDependencies kerak emas).
# ═══════════════════════════════════════════════════════════════════════════

echo "→ Migratsiyalar qo'llanmoqda..."

# `migrate deploy` — production uchun: faqat mavjud migratsiyalarni qo'llaydi,
# yangi migratsiya yaratmaydi va ma'lumotni o'chirmaydi.
# `migrate dev` ni production'da ishlatish MUMKIN EMAS — u schema mos
# kelmasa databaseni tozalab tashlashi mumkin.
#
# CLI to'g'ridan-to'g'ri `node` bilan chaqiriladi, `.bin/prisma` symlink'i
# orqali emas — Dockerfile'dagi izohga qarang.
node ./node_modules/prisma/build/index.js migrate deploy

echo "→ Server ishga tushmoqda (port ${PORT:-3000})"

exec "$@"
