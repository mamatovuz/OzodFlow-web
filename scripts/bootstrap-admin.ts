/**
 * Super adminni va tizim hamyonlarini qo'lda yaratish.
 *
 *   npm run bootstrap
 *
 * Odatda buni chaqirish kerak emas — `src/instrumentation.ts` server ishga
 * tushganda o'zi bajaradi. Bu skript quyidagi holatlar uchun:
 *
 *  • server ishga tushganda `.env` to'ldirilmagan edi, keyin to'ldirildi
 *  • admin hisobini qayta tiklash kerak (avvalgisi o'chirilgan)
 *  • CI/CD'da migratsiyadan keyin alohida qadam sifatida bajarish
 */

import { db } from "@/lib/db";
import { bootstrapSystem } from "@/lib/auth/bootstrap";

async function main() {
  console.log("\n  OzodFlow — tizimni tayyorlash\n");

  const result = await bootstrapSystem();

  const statusLabel = {
    created: "yaratildi",
    exists: "allaqachon mavjud",
    skipped: "yaratilmadi",
  }[result.superAdmin];

  console.log(`  Super admin       ${statusLabel}`);
  console.log(`  Tizim hamyonlari  ${result.wallets} yangi`);

  if (result.messages.length > 0) {
    console.log("");
    for (const message of result.messages) {
      console.log(`  → ${message}`);
    }
  }

  console.log("");

  // Admin yaratilmagan bo'lsa nol bo'lmagan kod — CI/CD buni sezishi kerak.
  if (result.superAdmin === "skipped") {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("\n  Bajarilmadi:\n");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
