#!/bin/sh
set -e

# ═══════════════════════════════════════════════════════════════════════════
# OzodFlow Entrypoint
#
# 1. DATABASE_URL tekshirish
# 2. SQLite katalogini tayyorlash
# 3. Migratsiyalarni qo'llash
# 4. Serverni ishga tushirish
# ═══════════════════════════════════════════════════════════════════════════

# ──────────────────────────────────────────────────────────────────────────
# DATABASE_URL tekshirish
# ──────────────────────────────────────────────────────────────────────────
if [ -z "${DATABASE_URL}" ]; then
  echo ""
  echo "❌ XATO: DATABASE_URL topilmadi."
  echo ""
  echo "Misol:"
  echo "DATABASE_URL=file:/data/ozodflow.db"
  echo ""
  exit 1
fi

# ──────────────────────────────────────────────────────────────────────────
# SQLite bo'lsa katalogni tekshirish
# ──────────────────────────────────────────────────────────────────────────
case "${DATABASE_URL}" in
  file:*)
    DB_PATH="${DATABASE_URL#file:}"
    DB_DIR="$(dirname "${DB_PATH}")"

    echo "SQLite database:"
    echo "  ${DB_PATH}"

    mkdir -p "${DB_DIR}" 2>/dev/null || true

    # Test fayl yaratib ko'ramiz
    if touch "${DB_DIR}/.permission_test" 2>/dev/null; then
      rm -f "${DB_DIR}/.permission_test"
      echo "✓ ${DB_DIR} ga yozish mumkin."
    else
      echo ""
      echo "══════════════════════════════════════════════"
      echo "❌ XATO: ${DB_DIR} katalogiga yozib bo'lmadi."
      echo "══════════════════════════════════════════════"
      echo ""

      echo "Current user:"
      id

      echo ""
      echo "Directory:"
      ls -ld "${DB_DIR}" 2>/dev/null || true

      echo ""
      echo "DATABASE_URL=${DATABASE_URL}"
      echo ""

      echo "Bu Dockerfile xatosi emas."
      echo "Bu Railway Volume permission muammosi."
      echo ""

      exit 1
    fi
    ;;
esac

# ──────────────────────────────────────────────────────────────────────────
# Prisma migratsiyalari
# ──────────────────────────────────────────────────────────────────────────
echo ""
echo "→ Migratsiyalar qo'llanmoqda..."
echo ""

node /opt/prisma-cli/node_modules/prisma/build/index.js migrate deploy \
  --schema /app/prisma/schema.prisma

echo ""
echo "✓ Migratsiyalar muvaffaqiyatli tugadi."
echo ""

echo "→ Server ishga tushmoqda (PORT=${PORT:-3000})"

exec "$@"