import { PrismaClient } from "@prisma/client";

import { isDevelopment } from "@/lib/env";

/**
 * Prisma klientining yagona nusxasi.
 *
 * Dev rejimida Next.js modullarni qayta yuklaydi va har yuklashda yangi
 * `PrismaClient` yaratilsa, ulanishlar to'planib ketadi. Shuning uchun
 * global obyektda keshlaymiz — bu Prisma'ning rasmiy tavsiyasi.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDevelopment ? ["warn", "error"] : ["error"],
  });

if (isDevelopment) {
  globalForPrisma.prisma = db;
}

/**
 * Tranzaksiya ichida ishlaydigan funksiyalar uchun tip.
 *
 * Pul bilan ishlaydigan har bir funksiya shu tipni qabul qiladi, shunda
 * uni `db.$transaction(...)` ichida ham, tashqarisida ham chaqirish mumkin —
 * lekin escrow oqimida har doim tranzaksiya ichida chaqiriladi.
 */
export type DbClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;
