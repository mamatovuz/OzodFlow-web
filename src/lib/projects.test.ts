/**
 * LOYIHA HAYOTIY DAVRI — uchdan-uchgacha test
 *
 * Butun oqim bitta testda tekshiriladi:
 *
 *   yaratish → moderatsiya → taklif → tanlash → escrow → topshirish → qabul
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  NEGA BITTA UZUN TEST
 *
 *  Har qadamni alohida test qilish mumkin edi, lekin bu oqimda qadamlar
 *  BIR-BIRIGA BOG'LIQ: taklif qabul qilinmasa escrow to'ldirilmaydi,
 *  escrow bo'lmasa ish topshirilmaydi.
 *
 *  Alohida testlar har biri uchun sun'iy holat yasashga majbur qilardi —
 *  va o'sha sun'iy holat haqiqiy oqimdan farq qilib qolishi mumkin.
 *  Ketma-ket test aynan foydalanuvchi bosib o'tadigan yo'lni tekshiradi.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { sumToTiyin, type Tiyin } from "./money";
import { setupTestDatabase, type TestDatabase } from "./testing/test-db";

type DbModule = typeof import("./db");
type WalletModule = typeof import("./wallet");
type EscrowModule = typeof import("./escrow");
type ProjectsModule = typeof import("./projects");

let dbModule: DbModule;
let walletModule: WalletModule;
let escrowModule: EscrowModule;
let projectsModule: ProjectsModule;

let testDb: TestDatabase;

before(async () => {
  testDb = setupTestDatabase("projects");

  dbModule = await import("./db");
  walletModule = await import("./wallet");
  escrowModule = await import("./escrow");
  projectsModule = await import("./projects");
});

after(async () => {
  await dbModule?.db.$disconnect();
  testDb?.cleanup();
});

// ─────────────────────────────────────────────────────────────────────────────
// Yordamchilar
// ─────────────────────────────────────────────────────────────────────────────

let counter = 0;

async function makeActors(customerBalance: number) {
  const { db } = dbModule;
  const id = ++counter;

  const customer = await db.user.create({
    data: {
      email: `c${id}@test.uz`,
      name: `Mijoz ${id}`,
      role: "CUSTOMER",
      wallet: { create: { currency: "UZS" } },
      customerProfile: { create: {} },
    },
    select: { id: true },
  });

  const developer = await db.user.create({
    data: {
      email: `d${id}@test.uz`,
      name: `Developer ${id}`,
      role: "DEVELOPER",
      wallet: { create: { currency: "UZS" } },
      developerProfile: { create: {} },
    },
    select: { id: true },
  });

  const admin = await db.user.create({
    data: { email: `a${id}@test.uz`, name: `Admin ${id}`, role: "ADMIN" },
    select: { id: true },
  });

  const category = await db.category.upsert({
    where: { slug: "test" },
    update: {},
    create: { slug: "test", name: "Test" },
    select: { id: true },
  });

  if (customerBalance > 0) {
    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: customer.id },
      select: { id: true },
    });

    await db.$transaction((tx) =>
      walletModule.credit(tx, wallet.id, sumToTiyin(customerBalance), {
        type: "DEPOSIT",
        reference: `test:deposit:${id}`,
      })
    );
  }

  return {
    customerId: customer.id,
    developerId: developer.id,
    adminId: admin.id,
    categoryId: category.id,
  };
}

async function statusOf(projectId: string): Promise<string> {
  const project = await dbModule.db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { status: true },
  });
  return project.status;
}

async function balanceOf(userId: string): Promise<{ balance: Tiyin; locked: Tiyin }> {
  const wallet = await dbModule.db.wallet.findUniqueOrThrow({
    where: { userId },
    select: { balance: true, lockedBalance: true },
  });
  return { balance: wallet.balance, locked: wallet.lockedBalance };
}

// ─────────────────────────────────────────────────────────────────────────────
// To'liq oqim
// ─────────────────────────────────────────────────────────────────────────────

describe("Loyiha hayotiy davri", () => {
  it("g'oyadan to'lovgacha to'liq oqim", async () => {
    const actors = await makeActors(10_000_000);

    // ── 1. Mijoz loyiha yaratadi ─────────────────────────────────────────
    const created = await projectsModule.createProject({
      customerId: actors.customerId,
      data: {
        title: "Restoran uchun yetkazib berish sayti",
        categoryId: actors.categoryId,
        description: "Katalog, savat, buyurtma va to'lov. Mobil moslashuv shart.",
        budgetMin: sumToTiyin(3_000_000),
        budgetMax: sumToTiyin(6_000_000),
        deadlineAt: new Date(Date.now() + 30 * 86_400_000),
        isUrgent: false,
      },
    });

    // Moderatsiya standart holatda YOQILGAN — loyiha darhol ochilmaydi.
    assert.equal(created.status, "PENDING_REVIEW");
    assert.ok(created.publicId.startsWith("OZF-"));

    // Komissiya loyihada MUZLATILGAN bo'lishi kerak.
    const frozen = await dbModule.db.project.findUniqueOrThrow({
      where: { id: created.id },
      select: { commissionBps: true },
    });
    assert.equal(frozen.commissionBps, 1500, "standart komissiya 15% bo'lishi kerak");

    // ── 2. Admin tasdiqlaydi ─────────────────────────────────────────────
    await projectsModule.moderateProject({
      projectId: created.id,
      adminId: actors.adminId,
      approve: true,
    });

    assert.equal(await statusOf(created.id), "OPEN");

    // ── 3. Developer taklif yuboradi ─────────────────────────────────────
    const proposal = await projectsModule.submitProposal({
      developerId: actors.developerId,
      projectId: created.id,
      coverLetter:
        "Shunga o'xshash uchta loyiha qilganman. Katalog va to'lovni Payme bilan ulayman.",
      amount: sumToTiyin(5_000_000),
      deliveryDays: 21,
    });

    assert.ok(proposal.id);

    // Ikkinchi marta yuborib bo'lmaydi.
    await assert.rejects(
      () =>
        projectsModule.submitProposal({
          developerId: actors.developerId,
          projectId: created.id,
          coverLetter: "Ikkinchi urinish, kamida saksan belgi bo'lishi kerak shuning uchun uzaytiraman.",
          amount: sumToTiyin(4_000_000),
          deliveryDays: 14,
        }),
      (error: Error) => error.name === "ProjectError"
    );

    // ── 4. Mijoz taklifni qabul qiladi ───────────────────────────────────
    const accepted = await projectsModule.acceptProposal({
      customerId: actors.customerId,
      proposalId: proposal.id,
    });

    assert.equal(accepted.developerId, actors.developerId);
    assert.equal(accepted.amount, sumToTiyin(5_000_000));

    // MUHIM: loyiha hali IN_PROGRESS EMAS — pul bloklanmagan.
    assert.equal(
      await statusOf(created.id),
      "OPEN",
      "escrow to'ldirilmaguncha ish boshlanmasligi kerak"
    );

    // ── 5. Escrow to'ldiriladi ───────────────────────────────────────────
    const escrow = await escrowModule.fundEscrow({
      projectId: created.id,
      actorId: actors.customerId,
    });

    assert.equal(escrow.amount, sumToTiyin(5_000_000));
    assert.equal(escrow.commissionAmount, sumToTiyin(750_000)); // 15%
    assert.equal(escrow.developerAmount, sumToTiyin(4_250_000)); // 85%

    assert.equal(await statusOf(created.id), "IN_PROGRESS");

    const customerAfterFund = await balanceOf(actors.customerId);
    assert.equal(customerAfterFund.balance, sumToTiyin(5_000_000));
    assert.equal(customerAfterFund.locked, sumToTiyin(5_000_000));

    // ── 6. Developer ishni topshiradi ────────────────────────────────────
    await projectsModule.markDelivered({
      developerId: actors.developerId,
      projectId: created.id,
      message: "Sayt tayyor, test manzili: https://example.uz",
    });

    assert.equal(await statusOf(created.id), "DELIVERED");

    // ── 7. Mijoz tuzatish so'raydi ───────────────────────────────────────
    const revision = await projectsModule.requestRevision({
      customerId: actors.customerId,
      projectId: created.id,
      reason: "Mobil versiyada savat tugmasi ko'rinmayapti, tuzatish kerak.",
    });

    assert.equal(revision.revisionCount, 1);
    assert.equal(await statusOf(created.id), "IN_REVISION");

    // ── 8. Developer qayta topshiradi ────────────────────────────────────
    await projectsModule.markDelivered({
      developerId: actors.developerId,
      projectId: created.id,
      message: "Mobil savat tugmasi tuzatildi.",
    });

    assert.equal(await statusOf(created.id), "DELIVERED");

    // ── 9. Mijoz qabul qiladi — pul taqsimlanadi ─────────────────────────
    const payment = await projectsModule.approveProject({
      customerId: actors.customerId,
      projectId: created.id,
    });

    assert.equal(payment.developerAmount, sumToTiyin(4_250_000));
    assert.equal(payment.commissionAmount, sumToTiyin(750_000));

    assert.equal(await statusOf(created.id), "COMPLETED");

    // ── Yakuniy balanslar ────────────────────────────────────────────────
    const customerFinal = await balanceOf(actors.customerId);
    const developerFinal = await balanceOf(actors.developerId);

    // Mijozda 10 mln edi, 5 mln sarfladi.
    assert.equal(customerFinal.balance, sumToTiyin(5_000_000));
    assert.equal(customerFinal.locked, 0n);

    // Developer 85% oldi.
    assert.equal(developerFinal.balance, sumToTiyin(4_250_000));

    // Platforma 15% oldi.
    const platform = await dbModule.db.wallet.findUniqueOrThrow({
      where: { systemKey: "PLATFORM_REVENUE" },
      select: { balance: true },
    });
    assert.equal(platform.balance, sumToTiyin(750_000));

    // Buxgalteriya toza.
    const report = await escrowModule.reconcileEscrow();
    assert.equal(report.ok, true, `farq: ${report.difference}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Huquq tekshiruvlari
// ─────────────────────────────────────────────────────────────────────────────

describe("Huquqlar", () => {
  it("begona odam taklifni qabul qila olmaydi", async () => {
    const actors = await makeActors(5_000_000);
    const other = await makeActors(0);

    const project = await projectsModule.createProject({
      customerId: actors.customerId,
      data: {
        title: "Test loyiha huquq tekshiruvi uchun",
        categoryId: actors.categoryId,
        description: "Bu loyiha huquqlarni tekshirish uchun yaratilgan matn.",
        budgetMin: sumToTiyin(1_000_000),
        budgetMax: sumToTiyin(2_000_000),
        deadlineAt: new Date(Date.now() + 10 * 86_400_000),
        isUrgent: false,
      },
    });

    await projectsModule.moderateProject({
      projectId: project.id,
      adminId: actors.adminId,
      approve: true,
    });

    const proposal = await projectsModule.submitProposal({
      developerId: actors.developerId,
      projectId: project.id,
      coverLetter: "Bu ishni bajara olaman va tajribam bor, matn yetarli uzunlikda bo'lishi kerak.",
      amount: sumToTiyin(1_500_000),
      deliveryDays: 7,
    });

    // BOSHQA mijoz taklifni qabul qilishga urinadi.
    await assert.rejects(
      () =>
        projectsModule.acceptProposal({
          customerId: other.customerId,
          proposalId: proposal.id,
        }),
      (error: Error) =>
        error.name === "ProjectError" && /tegishli emas/.test(error.message)
    );
  });

  it("boshqa developer ishni topshira olmaydi", async () => {
    const actors = await makeActors(5_000_000);
    const other = await makeActors(0);

    const project = await projectsModule.createProject({
      customerId: actors.customerId,
      data: {
        title: "Topshirish huquqini tekshirish loyihasi",
        categoryId: actors.categoryId,
        description: "Bu loyiha topshirish huquqini tekshirish uchun yaratilgan.",
        budgetMin: sumToTiyin(1_000_000),
        budgetMax: sumToTiyin(2_000_000),
        deadlineAt: new Date(Date.now() + 10 * 86_400_000),
        isUrgent: false,
      },
    });

    await projectsModule.moderateProject({
      projectId: project.id,
      adminId: actors.adminId,
      approve: true,
    });

    const proposal = await projectsModule.submitProposal({
      developerId: actors.developerId,
      projectId: project.id,
      coverLetter: "Taklif matni yetarli uzunlikda bo'lishi kerak shuning uchun uzaytiraman.",
      amount: sumToTiyin(1_500_000),
      deliveryDays: 7,
    });

    await projectsModule.acceptProposal({
      customerId: actors.customerId,
      proposalId: proposal.id,
    });

    await escrowModule.fundEscrow({
      projectId: project.id,
      actorId: actors.customerId,
    });

    await assert.rejects(
      () =>
        projectsModule.markDelivered({
          developerId: other.developerId,
          projectId: project.id,
          message: "Men topshiraman",
        }),
      (error: Error) =>
        error.name === "ProjectError" && /tayinlanmagan/.test(error.message)
    );
  });

  it("o'z loyihasiga taklif yuborib bo'lmaydi", async () => {
    const actors = await makeActors(2_000_000);

    const project = await projectsModule.createProject({
      customerId: actors.customerId,
      data: {
        title: "O'z loyihasiga taklif tekshiruvi",
        categoryId: actors.categoryId,
        description: "Bu loyiha o'z-o'ziga taklif yuborishni tekshirish uchun.",
        budgetMin: sumToTiyin(1_000_000),
        budgetMax: sumToTiyin(2_000_000),
        deadlineAt: new Date(Date.now() + 10 * 86_400_000),
        isUrgent: false,
      },
    });

    await projectsModule.moderateProject({
      projectId: project.id,
      adminId: actors.adminId,
      approve: true,
    });

    await assert.rejects(
      () =>
        projectsModule.submitProposal({
          developerId: actors.customerId,
          projectId: project.id,
          coverLetter: "O'zimning loyihamga taklif yuboryapman, matn yetarlicha uzun bo'lsin.",
          amount: sumToTiyin(1_500_000),
          deliveryDays: 7,
        }),
      (error: Error) => error.name === "ProjectError"
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Holat o'tishlari
// ─────────────────────────────────────────────────────────────────────────────

describe("Holat o'tishlari", () => {
  it("boshlanmagan ishni topshirib bo'lmaydi", async () => {
    const actors = await makeActors(5_000_000);

    const project = await projectsModule.createProject({
      customerId: actors.customerId,
      data: {
        title: "Holat o'tishini tekshirish loyihasi",
        categoryId: actors.categoryId,
        description: "Bu loyiha holat o'tishlarini tekshirish uchun yaratilgan.",
        budgetMin: sumToTiyin(1_000_000),
        budgetMax: sumToTiyin(2_000_000),
        deadlineAt: new Date(Date.now() + 10 * 86_400_000),
        isUrgent: false,
      },
    });

    // PENDING_REVIEW holatidan DELIVERED ga o'tib bo'lmaydi.
    await assert.rejects(
      () =>
        projectsModule.markDelivered({
          developerId: actors.developerId,
          projectId: project.id,
          message: "Tayyor",
        }),
      (error: Error) => error.name === "ProjectError"
    );
  });

  it("rad etilgan loyiha bekor qilinadi va sabab saqlanadi", async () => {
    const actors = await makeActors(1_000_000);

    const project = await projectsModule.createProject({
      customerId: actors.customerId,
      data: {
        title: "Rad etish tekshiruvi uchun loyiha",
        categoryId: actors.categoryId,
        description: "Bu loyiha moderatsiyada rad etilishi kerak bo'lgan misol.",
        budgetMin: sumToTiyin(1_000_000),
        budgetMax: sumToTiyin(2_000_000),
        deadlineAt: new Date(Date.now() + 10 * 86_400_000),
        isUrgent: false,
      },
    });

    await projectsModule.moderateProject({
      projectId: project.id,
      adminId: actors.adminId,
      approve: false,
      reason: "Tavsif juda umumiy",
    });

    const result = await dbModule.db.project.findUniqueOrThrow({
      where: { id: project.id },
      select: { status: true, cancelReason: true },
    });

    assert.equal(result.status, "CANCELLED");
    assert.equal(result.cancelReason, "Tavsif juda umumiy");
  });
});
