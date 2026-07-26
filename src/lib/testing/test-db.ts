import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * TEST UCHUN VAQTINCHALIK DATABASE
 *
 * Har test fayli o'z SQLite faylini oladi va migratsiyalar qo'llanadi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  NEGA HAQIQIY DATABASE, MOCK EMAS
 *
 *  Pul mantig'ining eng xatarli qismi — tranzaksiya ichidagi bir necha
 *  yozuvning birgalikda o'zgarishi. Mock buni tekshira olmaydi:
 *  u rollback qilmaydi, unique constraint'ni qo'llamaydi va
 *  `increment` ni faqat taqlid qiladi.
 *
 *  SQLite fayl bilan ishlash tez (bir necha yuz millisekund) va
 *  haqiqiy xatti-harakatni beradi.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * MUHIM: modullar DINAMIK import qilinishi kerak — `setupTestDatabase()`
 * dan KEYIN. Oddiy `import` bo'lsa `db.ts` ishlab chiqish databasega
 * ulanib qoladi va testlar haqiqiy ma'lumotni buzadi.
 */

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..", "..");

export type TestDatabase = {
  dbPath: string;
  cleanup: () => void;
};

/**
 * Vaqtinchalik database yaratadi va migratsiyalarni qo'llaydi.
 *
 * `before()` ichida, dinamik importlardan OLDIN chaqiriladi.
 */
export function setupTestDatabase(label: string): TestDatabase {
  const tempDir = mkdtempSync(path.join(tmpdir(), `ozodflow-${label}-`));
  const dbPath = path.join(tempDir, "test.db");

  process.env.DATABASE_URL = `file:${dbPath}`;
  // Testda barcha muhit qiymatlari kerak emas.
  process.env.SKIP_ENV_VALIDATION = "1";
  process.env.DEFAULT_CURRENCY = "UZS";

  // `execFileSync` — shell orqali emas: yo'lda probel bo'lsa ham ishlaydi
  // (Windows'da "OneDrive/Desktop" kabi yo'llar odatiy holat).
  execFileSync(
    process.execPath,
    [
      path.join(REPO_ROOT, "node_modules", "prisma", "build", "index.js"),
      "migrate",
      "deploy",
      "--schema",
      path.join(REPO_ROOT, "prisma", "schema.prisma"),
    ],
    { env: { ...process.env }, stdio: "pipe" }
  );

  return {
    dbPath,
    cleanup: () => {
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    },
  };
}
