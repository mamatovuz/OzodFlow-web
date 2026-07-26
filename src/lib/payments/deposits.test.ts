/**
 * TO'LOVLARNI YOPISH — INTEGRATSIYA TESTLARI
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  NIMA UCHUN BU TESTLAR ENG MUHIMI
 *
 *  inPAY webhook'ida IMZO YO'Q va manzil ochiq. Ya'ni istalgan odam
 *  bizga "to'lov muvaffaqiyatli" degan so'rov yuborishi mumkin.
 *
 *  Agar `settleGatewayPayment` webhook tanasiga ishonsa — bu bepul pul
 *  ishlab chiqaruvchi teshik bo'ladi. Shu sababli bu fayl aynan
 *  QO'SHILMAGANLIKNI tekshiradi:
 *
 *    • shlyuz "success" demasa — hamyon o'zgarmaydi
 *    • summa mos kelmasa — hamyon o'zgarmaydi va audit yoziladi
 *    • takroriy webhook ikkinchi marta pul qo'shmaydi
 *    • notanish buyurtma hech narsa qilmaydi
 *
 *  Shlyuzga HAQIQIY so'rov yuborilmaydi: tasdiqlovchi funksiya `verify`
 *  parametri orqali almashtiriladi. Testlar tarmoqqa chiqmasligi kerak —
 *  aks holda ular CI'da tasodifiy yiqiladi, har ishga tushirish uchun
 *  haqiqiy pul kerak bo'ladi va shlyuzning soatlik limitini yeb qo'yadi.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { sumToTiyin, type Tiyin } from "../money";
import { setupTestDatabase, type TestDatabase } from "../testing/test-db";

// Modullar DINAMIK import qilinadi — `DATABASE_URL` o'rnatilgandan KEYIN.
type DbModule = typeof import("../db");
type DepositsModule = typeof import("./deposits");
type InpayModule = typeof import("./inpay");

let dbModule: DbModule;
let deposits: DepositsModule;

let testDb: TestDatabase;

before(async () => {
  testDb = setupTestDatabase("deposits");

  dbModule = await import("../db");
  deposits = await import("./deposits");
});

after(async () => {
  await dbModule?.db.$disconnect();
  testDb?.cleanup();
});

// ─────────────────────────────────────────────────────────────────────────────
// Yordamchilar
// ─────────────────────────────────────────────────────────────────────────────

let counter = 0;

/**
 * inPAY uslubidagi buyurtma id.
 *
 * Haqiqiy shlyuz 16 belgili hex qaytaradi (`1ff2f5a6d66f6e9c`). Testda
 * ham shu shakl ishlatiladi: son emasligiga ishonch kerak — kod
 * `Number(orderId)` qilib qo'ysa test buni ushlashi kerak.
 */
function makeOrderId(index: number): string {
  return `${index.toString(16).padStart(4, "0")}f5a6d66f6e9c`;
}

/** Toza foydalanuvchi + kutilayotgan shlyuz to'lovi yaratadi. */
async function makePendingGatewayPayment(amountSum: number) {
  const { db } = dbModule;
  const id = ++counter;
  const orderId = makeOrderId(id);
  const amount = sumToTiyin(amountSum);

  const user = await db.user.create({
    data: {
      email: `payer-${id}@test.uz`,
      name: `To'lovchi ${id}`,
      passwordHash: "x",
      role: "CUSTOMER",
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const payment = await db.payment.create({
    data: {
      userId: user.id,
      provider: "INPAY",
      providerRef: orderId,
      amount,
      status: "PENDING",
      rawJson: JSON.stringify({
        paymentUrl: `https://inpay.uz/checkout/${orderId}`,
      }),
    },
    select: { id: true },
  });

  return { userId: user.id, paymentId: payment.id, orderId, amount };
}

/** Foydalanuvchi hamyonidagi balans (hamyon bo'lmasa 0). */
async function balanceOf(userId: string): Promise<Tiyin> {
  const wallet = await dbModule.db.wallet.findUnique({
    where: { userId },
    select: { balance: true },
  });
  return wallet?.balance ?? 0n;
}

/**
 * Shlyuz javobini yasaydi.
 *
 * Haqiqiy `getInpayPaymentStatus` o'rniga ishlatiladi.
 */
function fakeGateway(options: {
  status: string;
  amountSum: number;
  method?: string;
}): (orderId: string) => Promise<
  Awaited<ReturnType<InpayModule["getInpayPaymentStatus"]>>
> {
  // `isPaid` ni QO'LDA bermaymiz — u statusdan kelib chiqadi, xuddi
  // haqiqiy klientda bo'lgani kabi. Aks holda test "faqat success
  // to'langan hisoblanadi" qoidasini chetlab o'tardi.
  const isPaid = options.status === "success";

  return async (orderId) => ({
    orderId,
    status: options.status,
    isPaid,
    amountSum: options.amountSum,
    method: options.method ?? "click",
    paidAt: isPaid ? new Date() : null,
  });
}

/** Chaqirilmasligi kerak bo'lgan tasdiqlovchi. */
const neverCalled = async (): Promise<never> => {
  throw new Error("Shlyuzga so'rov yuborilmasligi kerak edi");
};

// ─────────────────────────────────────────────────────────────────────────────
// Soxta webhook — eng muhim guruh
// ─────────────────────────────────────────────────────────────────────────────

describe("settleGatewayPayment — soxta webhook", () => {
  it("shlyuz 'success' demasa pul qo'shilmaydi", async () => {
    const scenario = await makePendingGatewayPayment(50_000);

    // Hujumchi bizga "status: success" yubordi. Lekin shlyuzda to'lov
    // hali kutilmoqda.
    const result = await deposits.settleGatewayPayment({
      orderId: scenario.orderId,
      webhookPayload: {
        status: "success",
        order_id: scenario.orderId,
        amount: "50000.00",
        transaction_id: 149,
      },
      verify: fakeGateway({ status: "pending", amountSum: 0 }),
    });

    assert.equal(result.status, "not_paid");
    assert.equal(
      await balanceOf(scenario.userId),
      0n,
      "Soxta webhook hamyonga pul qo'shdi — BU XAVFSIZLIK TESHIGI"
    );

    // To'lov PENDING holatida qolishi kerak: haqiqiy to'lov keyin
    // kelsa u yopilishi mumkin bo'lishi kerak.
    const payment = await dbModule.db.payment.findUnique({
      where: { id: scenario.paymentId },
      select: { status: true, paidAt: true },
    });
    assert.equal(payment?.status, "PENDING");
    assert.equal(payment?.paidAt, null);
  });

  it("'failed' va 'cancelled' holatlari ham pul qo'shmaydi", async () => {
    for (const status of ["failed", "cancelled", "SUCCESSFUL", "ok", ""]) {
      const scenario = await makePendingGatewayPayment(10_000);

      const result = await deposits.settleGatewayPayment({
        orderId: scenario.orderId,
        // Summa TO'G'RI — faqat holat "success" emas. Ya'ni test
        // aynan holat tekshiruvini sinaydi.
        verify: fakeGateway({ status, amountSum: 10_000 }),
      });

      assert.equal(
        result.status,
        "not_paid",
        `"${status}" holati to'langan deb qabul qilindi`
      );
      assert.equal(await balanceOf(scenario.userId), 0n);
    }
  });

  it("webhook tanasidagi summa E'TIBORGA OLINMAYDI", async () => {
    // Lokal yozuv 20 000 so'm. Hujumchi webhook'da 100 mln yozdi.
    const scenario = await makePendingGatewayPayment(20_000);

    const result = await deposits.settleGatewayPayment({
      orderId: scenario.orderId,
      webhookPayload: {
        status: "success",
        order_id: scenario.orderId,
        amount: "100000000.00",
      },
      // Shlyuz haqiqiy summani tasdiqlaydi.
      verify: fakeGateway({ status: "success", amountSum: 20_000 }),
    });

    assert.equal(result.status, "credited");

    // Hamyonga LOKAL yozuvdagi summa tushdi, webhook'dagi emas.
    assert.equal(await balanceOf(scenario.userId), sumToTiyin(20_000));
  });

  it("notanish buyurtmaga shlyuzga so'rov ham yuborilmaydi", async () => {
    // Hujumchi tasodifiy qiymat yubordi. Bizda bunday yozuv yo'q, ya'ni
    // shlyuzga so'rov yuborishning ma'nosi yo'q — bu bizni tashqi
    // so'rovlar bilan yuklash va shlyuz limitini tugatish yo'lini yopadi.
    const result = await deposits.settleGatewayPayment({
      orderId: "deadbeefdeadbeef",
      verify: neverCalled,
    });

    assert.equal(result.status, "unknown_order");
  });

  it("boshqa provayderning yozuvi shlyuz to'lovi deb qabul qilinmaydi", async () => {
    const { db } = dbModule;
    const id = ++counter;

    const user = await db.user.create({
      data: {
        email: `manual-ref-${id}@test.uz`,
        name: "Mijoz",
        passwordHash: "x",
        role: "CUSTOMER",
        status: "ACTIVE",
      },
      select: { id: true },
    });

    // Qo'lda to'lov yozuvi, lekin `providerRef` shlyuz buyurtmasiga
    // o'xshaydi. Hujumchi shu kod bilan webhook yuborsa ham to'lov
    // topilmasligi kerak — `provider` filtri buni ushlaydi.
    const orderId = makeOrderId(id);

    await db.payment.create({
      data: {
        userId: user.id,
        provider: "MANUAL",
        providerRef: orderId,
        amount: sumToTiyin(500_000),
        status: "PENDING",
      },
    });

    const result = await deposits.settleGatewayPayment({
      orderId,
      verify: neverCalled,
    });

    assert.equal(result.status, "unknown_order");
    assert.equal(await balanceOf(user.id), 0n);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Summa mosligi
// ─────────────────────────────────────────────────────────────────────────────

describe("settleGatewayPayment — summa mosligi", () => {
  it("shlyuzdagi summa kamroq bo'lsa xato beradi va pul qo'shmaydi", async () => {
    const scenario = await makePendingGatewayPayment(100_000);

    await assert.rejects(
      () =>
        deposits.settleGatewayPayment({
          orderId: scenario.orderId,
          // Shlyuz "success" dedi, lekin summa 1 000 so'm.
          verify: fakeGateway({ status: "success", amountSum: 1_000 }),
        }),
      (error: unknown) =>
        error instanceof deposits.PaymentError &&
        error.code === "AMOUNT_MISMATCH"
    );

    assert.equal(await balanceOf(scenario.userId), 0n);

    // Bu jiddiy holat — audit izi qolishi kerak.
    const audit = await dbModule.db.auditLog.findFirst({
      where: { entityType: "Payment", entityId: scenario.paymentId },
      select: { afterJson: true },
    });

    assert.ok(audit, "Summa mos kelmaganda audit yozuvi yo'q");
    assert.match(String(audit.afterJson), /amount_mismatch/);
  });

  it("shlyuzdagi summa ko'proq bo'lsa ham xato beradi", async () => {
    // Ko'p pul kelgani ham xato: buni qo'lda ko'rib chiqish kerak,
    // avtomatik qo'shib qo'yish nizoga olib keladi.
    const scenario = await makePendingGatewayPayment(50_000);

    await assert.rejects(
      () =>
        deposits.settleGatewayPayment({
          orderId: scenario.orderId,
          verify: fakeGateway({ status: "success", amountSum: 90_000 }),
        }),
      (error: unknown) =>
        error instanceof deposits.PaymentError &&
        error.code === "AMOUNT_MISMATCH"
    );

    assert.equal(await balanceOf(scenario.userId), 0n);
  });

  it("bir tiyinlik farq ham o'tmaydi", async () => {
    // 50 000 so'm = 5 000 000 tiyin. Shlyuz 49 999 so'm desa — 100
    // tiyin farq. Yaxlitlash bilan "yaqin" deb qabul qilish MUMKIN
    // EMAS: shu teshikdan har to'lovda bir necha tiyin o'g'irlash
    // mumkin bo'lardi.
    const scenario = await makePendingGatewayPayment(50_000);

    await assert.rejects(
      () =>
        deposits.settleGatewayPayment({
          orderId: scenario.orderId,
          verify: fakeGateway({ status: "success", amountSum: 49_999 }),
        }),
      (error: unknown) =>
        error instanceof deposits.PaymentError &&
        error.code === "AMOUNT_MISMATCH"
    );

    assert.equal(await balanceOf(scenario.userId), 0n);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Muvaffaqiyatli yo'l va idempotentlik
// ─────────────────────────────────────────────────────────────────────────────

describe("settleGatewayPayment — muvaffaqiyatli yo'l", () => {
  it("to'lovni yopadi, hamyonni to'ldiradi va daftarga yozadi", async () => {
    const scenario = await makePendingGatewayPayment(75_000);

    const result = await deposits.settleGatewayPayment({
      orderId: scenario.orderId,
      verify: fakeGateway({
        status: "success",
        amountSum: 75_000,
        method: "payme",
      }),
    });

    assert.equal(result.status, "credited");
    assert.equal(await balanceOf(scenario.userId), scenario.amount);

    const payment = await dbModule.db.payment.findUnique({
      where: { id: scenario.paymentId },
      select: { status: true, paidAt: true, rawJson: true },
    });
    assert.equal(payment?.status, "PAID");
    assert.ok(payment?.paidAt, "paidAt yozilmadi");

    // Qaysi to'lov tizimi ishlatilgani saqlanishi kerak — buxgalteriya
    // va nizoda kerak bo'ladi.
    assert.match(String(payment?.rawJson), /payme/);

    // Daftarda aynan bitta DEPOSIT yozuvi bo'lishi kerak.
    const wallet = await dbModule.db.wallet.findUnique({
      where: { userId: scenario.userId },
      select: { id: true, totalIn: true },
    });

    const entries = await dbModule.db.walletTransaction.findMany({
      where: { walletId: wallet?.id },
      select: { type: true, amount: true, reference: true, balanceAfter: true },
    });

    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.type, "DEPOSIT");
    assert.equal(entries[0]?.amount, scenario.amount);
    assert.equal(entries[0]?.balanceAfter, scenario.amount);
    assert.equal(entries[0]?.reference, `payment:gateway:${scenario.paymentId}`);
    assert.equal(wallet?.totalIn, scenario.amount);
  });

  it("takroriy webhook ikkinchi marta pul qo'shmaydi", async () => {
    const scenario = await makePendingGatewayPayment(30_000);
    const gateway = fakeGateway({ status: "success", amountSum: 30_000 });

    const first = await deposits.settleGatewayPayment({
      orderId: scenario.orderId,
      verify: gateway,
    });
    assert.equal(first.status, "credited");

    // inPAY webhook'ni QAYTA YUBORADI (hujjatda shunday). Ikkinchi
    // marta shlyuzga so'rov ham yuborilmasligi kerak — holat
    // allaqachon PAID.
    const second = await deposits.settleGatewayPayment({
      orderId: scenario.orderId,
      verify: neverCalled,
    });
    assert.equal(second.status, "already_settled");

    assert.equal(await balanceOf(scenario.userId), scenario.amount);

    const count = await dbModule.db.walletTransaction.count({
      where: { reference: `payment:gateway:${scenario.paymentId}` },
    });
    assert.equal(count, 1, "Bir to'lov ikki marta hisoblandi");
  });

  it("parallel kelgan ikki webhook bitta marta hisoblanadi", async () => {
    const scenario = await makePendingGatewayPayment(40_000);
    const gateway = fakeGateway({ status: "success", amountSum: 40_000 });

    // Ikkalasi ham "PENDING" ko'radi, keyin tranzaksiyaga kiradi.
    // Tranzaksiya ichidagi qayta tekshiruv yoki `reference` unique
    // cheklovi ikkinchisini to'xtatishi kerak.
    const results = await Promise.allSettled([
      deposits.settleGatewayPayment({
        orderId: scenario.orderId,
        verify: gateway,
      }),
      deposits.settleGatewayPayment({
        orderId: scenario.orderId,
        verify: gateway,
      }),
    ]);

    const credited = results.filter(
      (r) => r.status === "fulfilled" && r.value.status === "credited"
    );
    assert.equal(credited.length, 1, "Ikki webhook ikki marta pul qo'shdi");

    assert.equal(await balanceOf(scenario.userId), scenario.amount);
  });

  it("bekor qilingan to'lovni tiriltirib bo'lmaydi", async () => {
    const scenario = await makePendingGatewayPayment(60_000);

    await dbModule.db.payment.update({
      where: { id: scenario.paymentId },
      data: { status: "CANCELLED" },
    });

    const result = await deposits.settleGatewayPayment({
      orderId: scenario.orderId,
      verify: neverCalled,
    });

    assert.equal(result.status, "not_paid");
    assert.equal(await balanceOf(scenario.userId), 0n);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Qayta tekshirish (webhook yo'qolganda)
// ─────────────────────────────────────────────────────────────────────────────

describe("recheckPendingGatewayPayments", () => {
  it("webhook kelmagan to'langan buyurtmani topib qo'shadi", async () => {
    const scenario = await makePendingGatewayPayment(25_000);

    const result = await deposits.recheckPendingGatewayPayments(
      scenario.userId,
      fakeGateway({ status: "success", amountSum: 25_000 })
    );

    assert.equal(result.credited, 1);
    assert.equal(result.total, scenario.amount);
    assert.equal(await balanceOf(scenario.userId), scenario.amount);
  });

  it("to'lanmagan buyurtmalarni o'zgarishsiz qoldiradi", async () => {
    const scenario = await makePendingGatewayPayment(25_000);

    const result = await deposits.recheckPendingGatewayPayments(
      scenario.userId,
      fakeGateway({ status: "pending", amountSum: 0 })
    );

    assert.equal(result.credited, 0);
    assert.equal(result.total, 0n);
    assert.equal(await balanceOf(scenario.userId), 0n);
  });

  it("bitta to'lov xato bersa qolganlari tekshirilishda davom etadi", async () => {
    const { db } = dbModule;
    const id = ++counter;

    const user = await db.user.create({
      data: {
        email: `multi-${id}@test.uz`,
        name: `Ko'p to'lov ${id}`,
        passwordHash: "x",
        role: "CUSTOMER",
        status: "ACTIVE",
      },
      select: { id: true },
    });

    // Birinchisi summasi mos kelmaydi (xato beradi), ikkinchisi to'g'ri.
    const broken = `broken${id.toString(16).padStart(4, "0")}aaaa`;
    const good = `good${id.toString(16).padStart(4, "0")}bbbbbb`;

    await db.payment.createMany({
      data: [
        {
          userId: user.id,
          provider: "INPAY",
          providerRef: broken,
          amount: sumToTiyin(10_000),
          status: "PENDING",
        },
        {
          userId: user.id,
          provider: "INPAY",
          providerRef: good,
          amount: sumToTiyin(35_000),
          status: "PENDING",
        },
      ],
    });

    const result = await deposits.recheckPendingGatewayPayments(
      user.id,
      async (orderId) => ({
        orderId,
        status: "success",
        isPaid: true,
        // Buzuq buyurtmaga noto'g'ri summa qaytaramiz.
        amountSum: orderId === broken ? 999_999 : 35_000,
        method: "click",
        paidAt: new Date(),
      })
    );

    assert.equal(result.credited, 1, "Xato birinchi to'lov qolganini to'xtatdi");
    assert.equal(result.total, sumToTiyin(35_000));
    assert.equal(await balanceOf(user.id), sumToTiyin(35_000));
  });

  it("boshqa foydalanuvchining to'lovini tekshirmaydi", async () => {
    // Egalik tekshiruvi: `recheck` faqat O'Z to'lovlarini ko'radi.
    const mine = await makePendingGatewayPayment(15_000);
    const other = await makePendingGatewayPayment(90_000);

    const result = await deposits.recheckPendingGatewayPayments(
      mine.userId,
      fakeGateway({ status: "success", amountSum: 15_000 })
    );

    assert.equal(result.credited, 1);
    assert.equal(await balanceOf(mine.userId), mine.amount);

    // Boshqa odamning hamyoni tegilmagan.
    assert.equal(await balanceOf(other.userId), 0n);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Qo'lda to'ldirish (zaxira yo'l)
// ─────────────────────────────────────────────────────────────────────────────

describe("qo'lda to'ldirish", () => {
  it("to'lov kodi adashtirmaydigan belgilardan tuziladi", async () => {
    const { db } = dbModule;
    const user = await db.user.create({
      data: {
        email: `manual-${++counter}@test.uz`,
        name: "Qo'lda",
        passwordHash: "x",
        role: "CUSTOMER",
        status: "ACTIVE",
      },
      select: { id: true },
    });

    const request = await deposits.requestManualDeposit({
      userId: user.id,
      amount: sumToTiyin(200_000),
      method: "BANK",
    });

    // TL-XXXX-XXXX; 0/O va 1/I yo'q — kod telefonda aytiladi.
    assert.match(request.code, /^TL-[23456789A-HJ-NP-Z]{4}-[23456789A-HJ-NP-Z]{4}$/);

    // So'rov PENDING — pul hali qo'shilmagan.
    assert.equal(await balanceOf(user.id), 0n);
  });

  it("admin tasdiqlagach pul qo'shiladi, ikkinchi tasdiq o'tmaydi", async () => {
    const { db } = dbModule;
    const id = ++counter;

    const [user, admin] = await Promise.all([
      db.user.create({
        data: {
          email: `manual-ok-${id}@test.uz`,
          name: "Mijoz",
          passwordHash: "x",
          role: "CUSTOMER",
          status: "ACTIVE",
        },
        select: { id: true },
      }),
      db.user.create({
        data: {
          email: `admin-${id}@test.uz`,
          name: "Admin",
          passwordHash: "x",
          role: "ADMIN",
          status: "ACTIVE",
        },
        select: { id: true },
      }),
    ]);

    const request = await deposits.requestManualDeposit({
      userId: user.id,
      amount: sumToTiyin(500_000),
      method: "BANK",
    });

    const confirmed = await deposits.confirmDeposit({
      paymentId: request.id,
      adminId: admin.id,
    });

    assert.equal(confirmed.amount, sumToTiyin(500_000));
    assert.equal(await balanceOf(user.id), sumToTiyin(500_000));

    // Ikkinchi tasdiq — pul ikki marta qo'shilmasligi kerak.
    await assert.rejects(
      () =>
        deposits.confirmDeposit({
          paymentId: request.id,
          adminId: admin.id,
        }),
      (error: unknown) =>
        error instanceof deposits.PaymentError && error.code === "INVALID_STATE"
    );

    assert.equal(await balanceOf(user.id), sumToTiyin(500_000));
  });

  it("rad etilgan to'lovni tasdiqlab bo'lmaydi", async () => {
    const { db } = dbModule;
    const id = ++counter;

    const [user, admin] = await Promise.all([
      db.user.create({
        data: {
          email: `manual-rej-${id}@test.uz`,
          name: "Mijoz",
          passwordHash: "x",
          role: "CUSTOMER",
          status: "ACTIVE",
        },
        select: { id: true },
      }),
      db.user.create({
        data: {
          email: `admin-rej-${id}@test.uz`,
          name: "Admin",
          passwordHash: "x",
          role: "ADMIN",
          status: "ACTIVE",
        },
        select: { id: true },
      }),
    ]);

    const request = await deposits.requestManualDeposit({
      userId: user.id,
      amount: sumToTiyin(300_000),
      method: "BANK",
    });

    await deposits.rejectDeposit({
      paymentId: request.id,
      adminId: admin.id,
      reason: "O'tkazma kelmadi",
    });

    await assert.rejects(
      () =>
        deposits.confirmDeposit({
          paymentId: request.id,
          adminId: admin.id,
        }),
      (error: unknown) =>
        error instanceof deposits.PaymentError && error.code === "INVALID_STATE"
    );

    assert.equal(await balanceOf(user.id), 0n);
  });

  it("nol yoki manfiy summa qabul qilinmaydi", async () => {
    const { db } = dbModule;
    const user = await db.user.create({
      data: {
        email: `manual-zero-${++counter}@test.uz`,
        name: "Mijoz",
        passwordHash: "x",
        role: "CUSTOMER",
        status: "ACTIVE",
      },
      select: { id: true },
    });

    for (const amount of [0n, -1n, -sumToTiyin(50_000)] as Tiyin[]) {
      await assert.rejects(
        () =>
          deposits.requestManualDeposit({
            userId: user.id,
            amount,
            method: "BANK",
          }),
        (error: unknown) =>
          error instanceof deposits.PaymentError &&
          error.code === "INVALID_AMOUNT"
      );
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// O'qish
// ─────────────────────────────────────────────────────────────────────────────

describe("listPendingDeposits", () => {
  it("shlyuz to'lovida havola, qo'lda to'lovda kod qaytaradi", async () => {
    const { db } = dbModule;
    const id = ++counter;

    const user = await db.user.create({
      data: {
        email: `list-${id}@test.uz`,
        name: "Mijoz",
        passwordHash: "x",
        role: "CUSTOMER",
        status: "ACTIVE",
      },
      select: { id: true },
    });

    const orderId = makeOrderId(id);

    await db.payment.create({
      data: {
        userId: user.id,
        provider: "INPAY",
        providerRef: orderId,
        amount: sumToTiyin(80_000),
        status: "PENDING",
        rawJson: JSON.stringify({
          paymentUrl: `https://inpay.uz/checkout/${orderId}`,
        }),
      },
    });

    const manual = await deposits.requestManualDeposit({
      userId: user.id,
      amount: sumToTiyin(150_000),
      method: "BANK",
    });

    const pending = await deposits.listPendingDeposits(user.id);
    assert.equal(pending.length, 2);

    const gateway = pending.find((p) => p.provider === "INPAY");
    assert.ok(gateway);
    assert.equal(gateway.code, null, "Shlyuz to'lovida kod bo'lmasligi kerak");
    assert.equal(gateway.paymentUrl, `https://inpay.uz/checkout/${orderId}`);

    const bank = pending.find((p) => p.provider === "MANUAL");
    assert.ok(bank);
    assert.equal(bank.code, manual.code);
    assert.equal(bank.paymentUrl, null, "Bank yo'lida havola bo'lmasligi kerak");

    // Summa matni serverda yasaladi — bigint klientga uzatilmaydi.
    assert.match(bank.amountLabel, /150/);
  });

  it("buzuq rawJson sahifani yiqitmaydi", async () => {
    const { db } = dbModule;
    const id = ++counter;

    const user = await db.user.create({
      data: {
        email: `broken-json-${id}@test.uz`,
        name: "Mijoz",
        passwordHash: "x",
        role: "CUSTOMER",
        status: "ACTIVE",
      },
      select: { id: true },
    });

    await db.payment.create({
      data: {
        userId: user.id,
        provider: "INPAY",
        providerRef: makeOrderId(id),
        amount: sumToTiyin(10_000),
        status: "PENDING",
        rawJson: "{ bu JSON emas",
      },
    });

    const pending = await deposits.listPendingDeposits(user.id);
    assert.equal(pending.length, 1);
    assert.equal(pending[0]?.paymentUrl, null);
  });

  it("eski CHECKOUT yozuvlari ham ro'yxatda ko'rinadi", async () => {
    // Shlyuz almashtirildi, lekin eski PENDING yozuvlar databaseda
    // qolgan. Mijoz ularni ko'rmasa "pulim qayoqqa ketdi?" degan
    // savol bilan qoladi.
    const { db } = dbModule;
    const id = ++counter;

    const user = await db.user.create({
      data: {
        email: `legacy-${id}@test.uz`,
        name: "Mijoz",
        passwordHash: "x",
        role: "CUSTOMER",
        status: "ACTIVE",
      },
      select: { id: true },
    });

    await db.payment.create({
      data: {
        userId: user.id,
        provider: "CHECKOUT",
        providerRef: "45180",
        amount: sumToTiyin(70_000),
        status: "PENDING",
        rawJson: JSON.stringify({
          paymentUrl: "https://checkout.uz/invoice/45180",
        }),
      },
    });

    const pending = await deposits.listPendingDeposits(user.id);
    assert.equal(pending.length, 1);
    assert.equal(pending[0]?.provider, "CHECKOUT");
    assert.equal(
      pending[0]?.paymentUrl,
      "https://checkout.uz/invoice/45180",
      "Eski to'lov havolasi ko'rsatilmadi"
    );
  });

  it("yopilgan to'lovlar ro'yxatga tushmaydi", async () => {
    const scenario = await makePendingGatewayPayment(15_000);

    await deposits.settleGatewayPayment({
      orderId: scenario.orderId,
      verify: fakeGateway({ status: "success", amountSum: 15_000 }),
    });

    const pending = await deposits.listPendingDeposits(scenario.userId);
    assert.equal(pending.length, 0);
  });
});
