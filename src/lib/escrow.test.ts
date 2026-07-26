/**
 * ESCROW INTEGRATSIYA TESTLARI
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  NEGA HAQIQIY DATABASE
 *
 *  Escrow mantig'ining eng xatarli qismi — TRANZAKSIYA ichidagi bir necha
 *  hamyonning birgalikda o'zgarishi. Mock bilan bu tekshirilmaydi: mock
 *  tranzaksiya rollback qilmaydi, unique constraint ishlamaydi, va
 *  `increment` bilan o'zgarish emulyatsiya qilinadi.
 *
 *  Shuning uchun har test uchun VAQTINCHALIK SQLite fayl yaratiladi,
 *  migratsiyalar qo'llanadi va haqiqiy Prisma bilan ishlanadi.
 *
 *  Asosiy tekshiriladigan xususiyat — PUL YO'QOLMAYDI VA PAYDO BO'LMAYDI:
 *  har amaldan keyin tizimdagi umumiy summa o'zgarmasligi kerak.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { sumToTiyin, type Tiyin } from "./money";
import { setupTestDatabase, type TestDatabase } from "./testing/test-db";

// Modullar DINAMIK import qilinadi — `DATABASE_URL` ni o'rnatgandan
// KEYIN. Oddiy import bo'lsa modul ishlab chiqish databasega ulanib
// qolardi va testlar haqiqiy ma'lumotni buzardi.
type DbModule = typeof import("./db");
type WalletModule = typeof import("./wallet");
type EscrowModule = typeof import("./escrow");

let dbModule: DbModule;
let walletModule: WalletModule;
let escrowModule: EscrowModule;

let testDb: TestDatabase;

before(async () => {
  testDb = setupTestDatabase("escrow");

  dbModule = await import("./db");
  walletModule = await import("./wallet");
  escrowModule = await import("./escrow");
});

after(async () => {
  await dbModule?.db.$disconnect();
  testDb?.cleanup();
});

// ─────────────────────────────────────────────────────────────────────────────
// Yordamchilar
// ─────────────────────────────────────────────────────────────────────────────

let counter = 0;

/** Har test uchun toza mijoz + developer + loyiha yaratadi. */
async function makeScenario(options: {
  budget: number;
  customerBalance: number;
  commissionBps?: number;
}) {
  const { db } = dbModule;
  const id = ++counter;

  const customer = await db.user.create({
    data: {
      email: `customer-${id}@test.uz`,
      name: `Mijoz ${id}`,
      role: "CUSTOMER",
      wallet: { create: { currency: "UZS" } },
      customerProfile: { create: {} },
    },
    select: { id: true },
  });

  const developer = await db.user.create({
    data: {
      email: `developer-${id}@test.uz`,
      name: `Developer ${id}`,
      role: "DEVELOPER",
      wallet: { create: { currency: "UZS" } },
      developerProfile: { create: {} },
    },
    select: { id: true },
  });

  const category = await db.category.upsert({
    where: { slug: "test-kategoriya" },
    update: {},
    create: { slug: "test-kategoriya", name: "Test" },
    select: { id: true },
  });

  const agreedAmount = sumToTiyin(options.budget);

  const project = await db.project.create({
    data: {
      publicId: `OZF-TEST${id}`,
      slug: `test-loyiha-${id}`,
      title: `Test loyiha ${id}`,
      description: "Test",
      customerId: customer.id,
      categoryId: category.id,
      assignedDeveloperId: developer.id,
      budgetMin: agreedAmount,
      budgetMax: agreedAmount,
      agreedAmount,
      commissionBps: options.commissionBps ?? 1500,
      status: "OPEN",
    },
    select: { id: true },
  });

  // Mijoz hamyonini to'ldiramiz.
  if (options.customerBalance > 0) {
    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: customer.id },
      select: { id: true },
    });

    await db.$transaction((tx) =>
      walletModule.credit(tx, wallet.id, sumToTiyin(options.customerBalance), {
        type: "DEPOSIT",
        reference: `test:deposit:${id}`,
        description: "Test depoziti",
      })
    );
  }

  return { customerId: customer.id, developerId: developer.id, projectId: project.id, agreedAmount };
}

async function walletOf(userId: string) {
  return dbModule.db.wallet.findUniqueOrThrow({
    where: { userId },
    select: { balance: true, lockedBalance: true, totalIn: true, totalOut: true },
  });
}

async function platformBalance(): Promise<Tiyin> {
  const wallet = await dbModule.db.wallet.findUnique({
    where: { systemKey: "PLATFORM_REVENUE" },
    select: { balance: true },
  });
  return wallet?.balance ?? 0n;
}

/**
 * Tizimdagi umumiy pul: barcha hamyonlardagi ishlatsa bo'ladigan va
 * bloklangan summalar yig'indisi.
 *
 * Bu qiymat escrow amallaridan KEYIN O'ZGARMASLIGI kerak — pul faqat
 * bir hamyondan boshqasiga o'tadi, yaratilmaydi va yo'qolmaydi.
 */
async function totalMoneyInSystem(): Promise<Tiyin> {
  const result = await dbModule.db.wallet.aggregate({
    _sum: { balance: true, lockedBalance: true },
  });
  return (result._sum.balance ?? 0n) + (result._sum.lockedBalance ?? 0n);
}

// ─────────────────────────────────────────────────────────────────────────────
// To'ldirish
// ─────────────────────────────────────────────────────────────────────────────

describe("fundEscrow", () => {
  it("mijoz pulini bloklaydi va loyihani ishga tushiradi", async () => {
    const scenario = await makeScenario({ budget: 5_000_000, customerBalance: 10_000_000 });

    const before = await walletOf(scenario.customerId);
    assert.equal(before.balance, sumToTiyin(10_000_000));
    assert.equal(before.lockedBalance, 0n);

    await escrowModule.fundEscrow({
      projectId: scenario.projectId,
      actorId: scenario.customerId,
    });

    const wallet = await walletOf(scenario.customerId);

    // Pul balansdan bloklangan qismga o'tdi.
    assert.equal(wallet.balance, sumToTiyin(5_000_000));
    assert.equal(wallet.lockedBalance, sumToTiyin(5_000_000));

    // `totalOut` OSHMASLIGI kerak — pul hamyonni hali tark etmagan.
    assert.equal(wallet.totalOut, 0n);

    const project = await dbModule.db.project.findUniqueOrThrow({
      where: { id: scenario.projectId },
      select: { status: true, startedAt: true },
    });
    assert.equal(project.status, "IN_PROGRESS");
    assert.ok(project.startedAt);
  });

  it("mablag' yetmasa rad etadi va HECH NARSA o'zgartirmaydi", async () => {
    const scenario = await makeScenario({ budget: 5_000_000, customerBalance: 1_000_000 });

    await assert.rejects(
      () =>
        escrowModule.fundEscrow({
          projectId: scenario.projectId,
          actorId: scenario.customerId,
        }),
      (error: Error) => error.name === "WalletError"
    );

    // Tranzaksiya butunlay orqaga qaytishi kerak: escrow yozuvi ham
    // yaratilmasligi, loyiha holati ham o'zgarmasligi kerak.
    const wallet = await walletOf(scenario.customerId);
    assert.equal(wallet.balance, sumToTiyin(1_000_000));
    assert.equal(wallet.lockedBalance, 0n);

    const project = await dbModule.db.project.findUniqueOrThrow({
      where: { id: scenario.projectId },
      select: { status: true },
    });
    assert.equal(project.status, "OPEN", "loyiha holati o'zgarmasligi kerak");

    const escrow = await dbModule.db.escrow.findUnique({
      where: { projectId: scenario.projectId },
    });
    assert.equal(escrow, null, "escrow yozuvi yaratilmasligi kerak");
  });

  it("ikkinchi marta to'ldirishni rad etadi (idempotentlik)", async () => {
    const scenario = await makeScenario({ budget: 3_000_000, customerBalance: 10_000_000 });

    await escrowModule.fundEscrow({
      projectId: scenario.projectId,
      actorId: scenario.customerId,
    });

    await assert.rejects(
      () =>
        escrowModule.fundEscrow({
          projectId: scenario.projectId,
          actorId: scenario.customerId,
        }),
      (error: Error) => error.name === "EscrowError"
    );

    // Pul faqat BIR MARTA bloklangan bo'lishi kerak.
    const wallet = await walletOf(scenario.customerId);
    assert.equal(wallet.lockedBalance, sumToTiyin(3_000_000));
    assert.equal(wallet.balance, sumToTiyin(7_000_000));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Taqsimlash
// ─────────────────────────────────────────────────────────────────────────────

describe("releaseEscrow", () => {
  it("developer va platforma orasida to'g'ri taqsimlaydi", async () => {
    const scenario = await makeScenario({
      budget: 10_000_000,
      customerBalance: 10_000_000,
      commissionBps: 1500, // 15%
    });

    await escrowModule.fundEscrow({
      projectId: scenario.projectId,
      actorId: scenario.customerId,
    });

    const platformBefore = await platformBalance();

    const result = await escrowModule.releaseEscrow({
      projectId: scenario.projectId,
      actorId: scenario.customerId,
    });

    // 10 000 000 dan 15% = 1 500 000, developerga 8 500 000
    assert.equal(result.commissionAmount, sumToTiyin(1_500_000));
    assert.equal(result.developerAmount, sumToTiyin(8_500_000));

    const customer = await walletOf(scenario.customerId);
    const developer = await walletOf(scenario.developerId);

    // Mijozdan pul butunlay chiqdi.
    assert.equal(customer.lockedBalance, 0n);
    assert.equal(customer.balance, 0n);
    assert.equal(customer.totalOut, sumToTiyin(10_000_000));

    // Developer o'z ulushini oldi.
    assert.equal(developer.balance, sumToTiyin(8_500_000));

    // Platforma komissiyani oldi.
    assert.equal(
      (await platformBalance()) - platformBefore,
      sumToTiyin(1_500_000)
    );
  });

  it("KAFOLAT: pul yo'qolmaydi va paydo bo'lmaydi", async () => {
    const scenario = await makeScenario({
      budget: 3_333_333,
      customerBalance: 5_000_000,
      // Toq foiz — yaxlitlash qoldig'i chiqadigan holat
      commissionBps: 1234,
    });

    const totalBefore = await totalMoneyInSystem();

    await escrowModule.fundEscrow({
      projectId: scenario.projectId,
      actorId: scenario.customerId,
    });

    const totalAfterFund = await totalMoneyInSystem();
    assert.equal(totalAfterFund, totalBefore, "bloklashda umumiy summa o'zgardi");

    await escrowModule.releaseEscrow({
      projectId: scenario.projectId,
      actorId: scenario.customerId,
    });

    const totalAfterRelease = await totalMoneyInSystem();
    assert.equal(
      totalAfterRelease,
      totalBefore,
      "taqsimlashda umumiy summa o'zgardi — pul yo'qoldi yoki paydo bo'ldi"
    );
  });

  it("developer va mijoz statistikasini yangilaydi", async () => {
    const scenario = await makeScenario({ budget: 2_000_000, customerBalance: 5_000_000 });

    await escrowModule.fundEscrow({
      projectId: scenario.projectId,
      actorId: scenario.customerId,
    });
    await escrowModule.releaseEscrow({
      projectId: scenario.projectId,
      actorId: scenario.customerId,
    });

    const devProfile = await dbModule.db.developerProfile.findUniqueOrThrow({
      where: { userId: scenario.developerId },
      select: { completedProjects: true, totalEarned: true },
    });
    assert.equal(devProfile.completedProjects, 1);
    assert.equal(devProfile.totalEarned, sumToTiyin(1_700_000)); // 85%

    const customerProfile = await dbModule.db.customerProfile.findUniqueOrThrow({
      where: { userId: scenario.customerId },
      select: { projectsDone: true, totalSpent: true },
    });
    assert.equal(customerProfile.projectsDone, 1);
    assert.equal(customerProfile.totalSpent, sumToTiyin(2_000_000));
  });

  it("to'ldirilmagan escrow'ni taqsimlashni rad etadi", async () => {
    const scenario = await makeScenario({ budget: 1_000_000, customerBalance: 5_000_000 });

    await assert.rejects(
      () =>
        escrowModule.releaseEscrow({
          projectId: scenario.projectId,
          actorId: scenario.customerId,
        }),
      (error: Error) => error.name === "EscrowError"
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Qaytarish
// ─────────────────────────────────────────────────────────────────────────────

describe("refundEscrow", () => {
  it("to'liq qaytarishda pul mijozga tushadi va loyiha bekor bo'ladi", async () => {
    const scenario = await makeScenario({ budget: 4_000_000, customerBalance: 4_000_000 });

    await escrowModule.fundEscrow({
      projectId: scenario.projectId,
      actorId: scenario.customerId,
    });

    await escrowModule.refundEscrow({
      projectId: scenario.projectId,
      actorId: scenario.customerId,
      reason: "Ish bajarilmadi",
    });

    const wallet = await walletOf(scenario.customerId);
    assert.equal(wallet.balance, sumToTiyin(4_000_000), "pul to'liq qaytishi kerak");
    assert.equal(wallet.lockedBalance, 0n);

    const project = await dbModule.db.project.findUniqueOrThrow({
      where: { id: scenario.projectId },
      select: { status: true, cancelReason: true },
    });
    assert.equal(project.status, "CANCELLED");
    assert.equal(project.cancelReason, "Ish bajarilmadi");
  });

  it("qaytarishda ham umumiy summa o'zgarmaydi", async () => {
    const scenario = await makeScenario({ budget: 1_500_000, customerBalance: 2_000_000 });
    const totalBefore = await totalMoneyInSystem();

    await escrowModule.fundEscrow({
      projectId: scenario.projectId,
      actorId: scenario.customerId,
    });
    await escrowModule.refundEscrow({
      projectId: scenario.projectId,
      actorId: scenario.customerId,
      reason: "Test",
    });

    assert.equal(await totalMoneyInSystem(), totalBefore);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Nizo
// ─────────────────────────────────────────────────────────────────────────────

describe("resolveDisputeSplit", () => {
  it("summani ulush bo'yicha bo'ladi, komissiya faqat developer qismidan olinadi", async () => {
    const scenario = await makeScenario({
      budget: 10_000_000,
      customerBalance: 10_000_000,
      commissionBps: 1500,
    });

    await escrowModule.fundEscrow({
      projectId: scenario.projectId,
      actorId: scenario.customerId,
    });

    const platformBefore = await platformBalance();

    // 40% mijozga, 60% developerga
    const result = await escrowModule.resolveDisputeSplit({
      projectId: scenario.projectId,
      customerShareBps: 4000,
      actorId: scenario.customerId,
      note: "Ish qisman bajarilgan",
    });

    assert.equal(result.customerAmount, sumToTiyin(4_000_000));

    // Developer qismi 6 000 000, undan 15% komissiya = 900 000
    assert.equal(result.commissionAmount, sumToTiyin(900_000));
    assert.equal(result.developerAmount, sumToTiyin(5_100_000));

    const customer = await walletOf(scenario.customerId);
    const developer = await walletOf(scenario.developerId);

    assert.equal(customer.balance, sumToTiyin(4_000_000));
    assert.equal(customer.lockedBalance, 0n);
    assert.equal(developer.balance, sumToTiyin(5_100_000));
    assert.equal(
      (await platformBalance()) - platformBefore,
      sumToTiyin(900_000)
    );
  });

  it("nizo yechimida ham pul yo'qolmaydi", async () => {
    const scenario = await makeScenario({
      budget: 7_777_777,
      customerBalance: 8_000_000,
      commissionBps: 1750,
    });

    const totalBefore = await totalMoneyInSystem();

    await escrowModule.fundEscrow({
      projectId: scenario.projectId,
      actorId: scenario.customerId,
    });
    await escrowModule.resolveDisputeSplit({
      projectId: scenario.projectId,
      customerShareBps: 3333,
      actorId: scenario.customerId,
      note: "Test",
    });

    assert.equal(await totalMoneyInSystem(), totalBefore);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Buxgalteriya tekshiruvi
// ─────────────────────────────────────────────────────────────────────────────

describe("reconcileEscrow", () => {
  it("bloklangan summa to'ldirilgan escrow'lar yig'indisiga teng", async () => {
    const scenario = await makeScenario({ budget: 2_500_000, customerBalance: 3_000_000 });

    await escrowModule.fundEscrow({
      projectId: scenario.projectId,
      actorId: scenario.customerId,
    });

    const report = await escrowModule.reconcileEscrow();

    assert.equal(report.ok, true, `buxgalteriya farqi: ${report.difference}`);
    assert.equal(report.difference, 0n);
  });
});
