import { db } from "@/lib/db";
import { checkPasswordStrength, hashPassword } from "@/lib/auth/password";
import { SystemWallet, UserRole, UserStatus } from "@/lib/enums";
import { env } from "@/lib/env";
import { normalizeEmail } from "@/lib/utils";

/**
 * Tizimni birinchi ishga tushirishga tayyorlash.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  QOIDA: KODDA HECH QANDAY PAROL YO'Q
 *
 *  Birinchi super admin `.env` dagi OZODFLOW_ADMIN_EMAIL va
 *  OZODFLOW_ADMIN_PASSWORD dan yaratiladi. Bu qiymatlar git'ga tushmaydi.
 *
 *  Funksiyalar IDEMPOTENT — necha marta chaqirilsa ham bir xil natija beradi,
 *  shuning uchun ularni har deploy'da xavfsiz ishga tushirish mumkin.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type BootstrapResult = {
  superAdmin: "created" | "exists" | "skipped";
  wallets: number;
  messages: string[];
};

/**
 * Tizim hamyonlarini yaratadi.
 *
 * PLATFORM_REVENUE — komissiyalar tushadigan hisob.
 * ESCROW_HOLDING   — bloklangan mijoz pullarining umumiy hisobi.
 *
 * Bular foydalanuvchi hamyoni emas (`userId` = null), shuning uchun
 * `systemKey` orqali topiladi.
 */
export async function ensureSystemWallets(): Promise<number> {
  const keys = [SystemWallet.PLATFORM_REVENUE, SystemWallet.ESCROW_HOLDING];
  let created = 0;

  for (const systemKey of keys) {
    const existing = await db.wallet.findUnique({ where: { systemKey } });
    if (existing) continue;

    await db.wallet.create({
      data: { systemKey, currency: env.DEFAULT_CURRENCY },
    });
    created += 1;
  }

  return created;
}

/**
 * Birinchi super adminni yaratadi.
 *
 * MUHIM: super admin ALLAQACHON mavjud bo'lsa hech narsa o'zgartirilmaydi.
 * Sababi — admin kirgandan keyin parolini o'zgartirgan bo'lishi mumkin, va
 * har qayta ishga tushirishda uni `.env` qiymatiga qaytarish xavfsizlik
 * teshigi bo'lardi (eski `.env` qolib ketgan serverda parol tiklanib qolardi).
 */
export async function ensureSuperAdmin(): Promise<{
  status: BootstrapResult["superAdmin"];
  messages: string[];
}> {
  const messages: string[] = [];

  const existing = await db.user.findFirst({
    where: { role: UserRole.SUPER_ADMIN, deletedAt: null },
    select: { id: true, email: true },
  });

  if (existing) {
    messages.push(`Super admin allaqachon mavjud: ${existing.email ?? existing.id}`);
    return { status: "exists", messages };
  }

  const email = env.OZODFLOW_ADMIN_EMAIL;
  const password = env.OZODFLOW_ADMIN_PASSWORD;

  if (!email || !password) {
    messages.push(
      "OZODFLOW_ADMIN_EMAIL yoki OZODFLOW_ADMIN_PASSWORD to'ldirilmagan — " +
        "super admin yaratilmadi. .env faylni to'ldirib qayta ishga tushiring."
    );
    return { status: "skipped", messages };
  }

  // Zaif parol bilan super admin yaratish — eng katta xavf. Ruxsat berilmaydi.
  const strength = checkPasswordStrength(password);
  if (!strength.ok) {
    throw new Error(
      `OZODFLOW_ADMIN_PASSWORD yetarli mustahkam emas:\n` +
        strength.problems.map((problem) => `  • ${problem}`).join("\n")
    );
  }

  const normalizedEmail = normalizeEmail(email);

  // Bu email boshqa rolda ro'yxatdan o'tgan bo'lishi mumkin.
  const emailTaken = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, role: true },
  });

  if (emailTaken) {
    throw new Error(
      `${normalizedEmail} allaqachon ishlatilgan (rol: ${emailTaken.role}). ` +
        `Super admin uchun boshqa email tanlang yoki o'sha foydalanuvchining ` +
        `rolini admin panelda o'zgartiring.`
    );
  }

  const passwordHash = await hashPassword(password);

  // Foydalanuvchi, hamyon va xabarnoma sozlamalari — bittada, tranzaksiya
  // ichida. Yarim yaratilgan admin qolib ketmasligi kerak.
  const admin = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        name: env.OZODFLOW_ADMIN_NAME,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        // Birinchi admin emailini tasdiqlashini kutish mantiqsiz — u
        // tizimni o'rnatgan odam.
        emailVerifiedAt: new Date(),
        wallet: { create: { currency: env.DEFAULT_CURRENCY } },
        notificationPref: { create: {} },
      },
      select: { id: true, email: true },
    });

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "system.bootstrap_super_admin",
        entityType: "User",
        entityId: user.id,
        afterJson: JSON.stringify({
          email: user.email,
          role: UserRole.SUPER_ADMIN,
          source: "env",
        }),
      },
    });

    return user;
  });

  messages.push(`Super admin yaratildi: ${admin.email}`);
  messages.push(
    "Kirgandan keyin admin panelda parolni o'zgartirishni tavsiya qilamiz " +
      "va .env dagi OZODFLOW_ADMIN_PASSWORD ni bo'shatib qo'ying."
  );

  return { status: "created", messages };
}

/** Ikkalasini birga bajaradi. `scripts/bootstrap-admin.ts` shu funksiyani chaqiradi. */
export async function bootstrapSystem(): Promise<BootstrapResult> {
  const wallets = await ensureSystemWallets();
  const admin = await ensureSuperAdmin();

  return {
    superAdmin: admin.status,
    wallets,
    messages: admin.messages,
  };
}
