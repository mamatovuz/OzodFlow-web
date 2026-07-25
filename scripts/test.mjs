/**
 * Test runner.
 *
 * Node 20 da `node --test` glob naqshini qo'llamaydi (u Node 22 da qo'shilgan)
 * va standart topish naqshi `.ts` fayllarni ko'rmaydi. Shuning uchun test
 * fayllarni o'zimiz topib, ro'yxat sifatida uzatamiz.
 *
 * Qo'shimcha kutubxona kerak emas va Node 18+ da ishlaydi.
 *
 *   npm test                    — barcha testlar
 *   npm test -- money           — nomida "money" bo'lgan fayllar
 */

import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SEARCH_DIRS = ["src", "prisma"];
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "legacy", "data", ".git"]);

/** Katalogni rekursiv aylanib `*.test.ts` fayllarni yig'adi. */
function findTests(dir) {
  const found = [];

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found; // katalog yo'q — muammo emas
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      found.push(...findTests(fullPath));
    } else if (/\.test\.tsx?$/.test(entry.name)) {
      found.push(fullPath);
    }
  }

  return found;
}

const filter = process.argv[2];

let testFiles = SEARCH_DIRS.flatMap((dir) => findTests(path.join(ROOT, dir)));

if (filter) {
  testFiles = testFiles.filter((file) => file.includes(filter));
}

if (testFiles.length === 0) {
  console.log(filter ? `"${filter}" bo'yicha test topilmadi.` : "Test fayl topilmadi.");
  process.exit(0);
}

const relative = testFiles.map((file) => path.relative(ROOT, file));
console.log(`${testFiles.length} test fayl:\n${relative.map((f) => `  • ${f}`).join("\n")}\n`);

// `.env` mavjud bo'lsa yuklaymiz — ba'zi testlar `src/lib/env.ts` orqali
// sozlamalarga tegadi. Fayl yo'q bo'lsa bayroq berilmaydi, aks holda Node
// xato bilan to'xtaydi.
const envFlags = existsSync(path.join(ROOT, ".env")) ? ["--env-file=.env"] : [];

const child = spawn(
  process.execPath,
  [...envFlags, "--import", "tsx", "--test", "--test-reporter", "spec", ...testFiles],
  { cwd: ROOT, stdio: "inherit" }
);

child.on("exit", (code) => process.exit(code ?? 1));
