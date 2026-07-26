/**
 * HIMOYALANGAN SAHIFALARNI TEKSHIRISH
 *
 * Ishga tushirish (server allaqachon ishlab turishi kerak):
 *   npm run smoke
 *
 * Nima qiladi: har rol uchun haqiqiy sessiya yasaydi va barcha
 * himoyalangan sahifani ochib ko'radi.
 *
 * NEGA KERAK: `next build` sahifa KOMPILYATSIYA qilinganini
 * ko'rsatadi, lekin u ishga tushganda yiqilishi mumkin — noto'g'ri
 * so'rov, yo'q maydon, `undefined` ustida ishlash. Bu skript aynan
 * shuni ushlaydi.
 *
 * Bu TEST EMAS (`npm test` da ishlamaydi): u ishlab turgan serverni
 * talab qiladi. Deploy'dan keyin qo'lda ishga tushirish uchun.
 */

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/enums";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

/** Har rol uchun tekshiriladigan sahifalar. */
const ROUTES: Record<string, string[]> = {
  CUSTOMER: [
    "/dashboard",
    "/my-projects",
    "/messages",
    "/wallet",
    "/settings",
    "/settings/profile",
    "/settings/security",
    "/settings/notifications",
    "/projects/new",
  ],
  DEVELOPER: [
    "/dashboard",
    "/projects",
    "/proposals",
    "/my-projects",
    "/messages",
    "/wallet",
    "/apply",
    "/apply/status",
    "/settings/profile",
    "/settings/portfolio",
    "/settings/security",
  ],
  SUPER_ADMIN: [
    "/admin",
    "/admin/applications",
    "/admin/audit",
    "/admin/settings",
    "/admin/payments",
    "/admin/users",
    "/admin/moderation",
    "/dashboard",
    "/messages",
  ],
};

/** Test foydalanuvchisini yaratadi (yoki mavjudini oladi). */
async function makeUser(role: string) {
  const email = `smoke-${role.toLowerCase()}@ozodflow.local`;

  const user = await db.user.upsert({
    where: { email },
    update: { role, status: "ACTIVE" },
    create: {
      email,
      name: `Smoke ${role}`,
      role,
      status: "ACTIVE",
      // Parol kerak emas: sessiya to'g'ridan yasaladi.
      passwordHash: null,
      ...(role === UserRole.DEVELOPER
        ? { developerProfile: { create: {} } }
        : {}),
    },
    select: { id: true, role: true },
  });

  return user;
}

async function main(): Promise<void> {
  let failed = 0;
  let checked = 0;

  console.log(`\nManzil: ${BASE}\n`);

  for (const [role, routes] of Object.entries(ROUTES)) {
    const user = await makeUser(role);

    const tokens = await createSession(
      { id: user.id, role: user.role },
      { ip: "127.0.0.1", userAgent: "smoke-test" }
    );

    // Cookie nomlari KODDAN olinadi, qo'lda yozilmaydi — aks holda
    // nom o'zgarganda skript jimgina ishlamay qolardi.
    const cookie = [
      `${ACCESS_COOKIE}=${tokens.accessToken}`,
      `${REFRESH_COOKIE}=${tokens.refreshToken}`,
    ].join("; ");

    console.log(`── ${role} ${"─".repeat(Math.max(0, 40 - role.length))}`);

    for (const route of routes) {
      checked += 1;

      let status: number;
      let note = "";

      try {
        const response = await fetch(`${BASE}${route}`, {
          headers: { cookie },
          redirect: "manual",
        });

        status = response.status;

        // Yo'naltirish qayerga ketganini ko'rsatamiz — bu ko'pincha
        // muammoning o'zi (masalan kirish sahifasiga qaytarish).
        if (status >= 300 && status < 400) {
          note = ` → ${response.headers.get("location") ?? "?"}`;
        }
      } catch (error) {
        status = 0;
        note = ` (${error instanceof Error ? error.message : "xato"})`;
      }

      /**
       * 200 va 307 ikkalasi ham to'g'ri bo'lishi mumkin.
       *
       * Masalan tasdiqlanmagan developer `/proposals` dan
       * `/apply/status` ga yo'naltiriladi — bu KUTILGAN xatti-harakat.
       * Faqat 4xx va 5xx muammo.
       */
      const ok = status === 200 || (status >= 300 && status < 400);

      if (!ok) failed += 1;

      console.log(
        `  ${ok ? "✔" : "✖"} ${route.padEnd(30)} ${status}${note}`
      );
    }

    console.log("");
  }

  console.log(
    failed === 0
      ? `Hammasi ishlaydi (${checked} sahifa).\n`
      : `${failed} / ${checked} sahifa muammo bilan.\n`
  );

  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Tekshiruv bajarilmadi:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
