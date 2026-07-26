/**
 * SESSIYA ROTATSIYASI TESTLARI
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  NEGA BU TESTLAR MUHIM
 *
 *  Rotatsiya mantig'i ikki qarama-qarshi talabni bajarishi kerak:
 *
 *    1. O'g'irlangan tokenni ANIQLASH — ishlatilgan token qayta kelsa
 *       barcha sessiyalar yopilishi kerak.
 *
 *    2. Brauzerning PARALLEL so'rovlarini o'g'irlik deb HISOBLAMASLIK —
 *       aks holda foydalanuvchi har 15 daqiqada tizimdan chiqib ketadi.
 *
 *  Ikkisini ajratadigan narsa — grace oynasi. Agar u buzilsa, xato
 *  jimgina kirib keladi: kod ishlayotgandek ko'rinadi, lekin
 *  foydalanuvchilar tushunarsiz sabablarga ko'ra tizimdan chiqib ketadi
 *  (yoki aksincha, o'g'irlik aniqlanmaydi). Shuning uchun ikkalasi ham
 *  test bilan qulflangan.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { setupTestDatabase, type TestDatabase } from "../testing/test-db";

type DbModule = typeof import("../db");
type SessionModule = typeof import("./session");
type TokensModule = typeof import("./tokens");

let dbModule: DbModule;
let sessionModule: SessionModule;
let tokensModule: TokensModule;

let testDb: TestDatabase;

before(async () => {
  testDb = setupTestDatabase("session");

  // Tokenlar uchun maxfiy kalitlar kerak — testda soxta, lekin
  // uzunlik talabiga mos qiymatlar.
  process.env.JWT_ACCESS_SECRET =
    "test-access-secret-kamida-32-belgi-bolishi-kerak-xxxxx";
  process.env.JWT_REFRESH_SECRET =
    "test-refresh-secret-kamida-32-belgi-bolishi-kerak-yyyy";
  process.env.ACCESS_TOKEN_TTL = "15m";
  process.env.REFRESH_TOKEN_TTL = "30d";

  dbModule = await import("../db");
  sessionModule = await import("./session");
  tokensModule = await import("./tokens");
});

after(async () => {
  await dbModule?.db.$disconnect();
  testDb?.cleanup();
});

let counter = 0;

async function makeUser(status = "ACTIVE") {
  const id = ++counter;

  return dbModule.db.user.create({
    data: {
      email: `session-${id}@test.uz`,
      name: `Foydalanuvchi ${id}`,
      role: "CUSTOMER",
      status,
    },
    select: { id: true, role: true },
  });
}

async function activeSessionCount(userId: string): Promise<number> {
  return dbModule.db.session.count({
    where: { userId, revokedAt: null },
  });
}

// ─────────────────────────────────────────────────────────────────────────────

describe("createSession", () => {
  it("access va refresh token beradi", async () => {
    const user = await makeUser();
    const tokens = await sessionModule.createSession(user);

    assert.ok(tokens.accessToken.length > 20);
    assert.ok(tokens.refreshToken.length > 20);
    assert.ok(tokens.sessionId);

    // Access token tekshirilishi va to'g'ri ma'lumot berishi kerak.
    const claims = await tokensModule.verifyAccessToken(tokens.accessToken);
    assert.ok(claims);
    assert.equal(claims.userId, user.id);
    assert.equal(claims.sessionId, tokens.sessionId);
  });

  it("refresh tokenni XOM HOLDA saqlamaydi", async () => {
    const user = await makeUser();
    const tokens = await sessionModule.createSession(user);

    const stored = await dbModule.db.session.findUniqueOrThrow({
      where: { id: tokens.sessionId },
      select: { refreshTokenHash: true },
    });

    // Databasedagi qiymat xom token BO'LMASLIGI kerak.
    assert.notEqual(stored.refreshTokenHash, tokens.refreshToken);
    // HMAC-SHA256 — 64 belgili hex.
    assert.match(stored.refreshTokenHash, /^[0-9a-f]{64}$/);
  });
});

describe("rotateSession — oddiy holat", () => {
  it("yangi juftlik beradi va eskisini bekor qiladi", async () => {
    const user = await makeUser();
    const first = await sessionModule.createSession(user);

    const result = await sessionModule.rotateSession(first.refreshToken);

    assert.equal(result.status, "ok");
    if (result.status !== "ok") return;

    // Yangi tokenlar eskisidan farq qilishi kerak.
    assert.notEqual(result.tokens.refreshToken, first.refreshToken);
    assert.notEqual(result.tokens.sessionId, first.sessionId);

    // Eski sessiya ROTATED deb belgilanadi va zanjir bog'lanadi.
    const old = await dbModule.db.session.findUniqueOrThrow({
      where: { id: first.sessionId },
      select: { revokedAt: true, revokedReason: true, replacedById: true },
    });

    assert.ok(old.revokedAt);
    assert.equal(old.revokedReason, "ROTATED");
    assert.equal(old.replacedById, result.tokens.sessionId);

    // Faol sessiya faqat BITTA bo'lishi kerak.
    assert.equal(await activeSessionCount(user.id), 1);
  });

  it("yangi token bilan qayta yangilash ishlaydi", async () => {
    const user = await makeUser();
    const first = await sessionModule.createSession(user);

    const second = await sessionModule.rotateSession(first.refreshToken);
    assert.equal(second.status, "ok");
    if (second.status !== "ok") return;

    const third = await sessionModule.rotateSession(second.tokens.refreshToken);
    assert.equal(third.status, "ok");
  });
});

describe("rotateSession — parallel so'rovlar (grace oynasi)", () => {
  it("bir xil token ikki marta kelsa O'G'IRLIK deb hisoblanmaydi", async () => {
    const user = await makeUser();
    const first = await sessionModule.createSession(user);

    const winner = await sessionModule.rotateSession(first.refreshToken);
    assert.equal(winner.status, "ok");

    // Ikkinchi so'rov O'SHA eski token bilan keladi — brauzer parallel
    // so'rov yuborgan holat.
    const racer = await sessionModule.rotateSession(first.refreshToken);

    assert.equal(
      racer.status,
      "raced",
      "parallel so'rov 'raced' bo'lishi kerak, o'g'irlik emas"
    );

    // ENG MUHIMI: sessiyalar YOPILMASLIGI kerak.
    assert.equal(
      await activeSessionCount(user.id),
      1,
      "parallel so'rov sessiyalarni yopmasligi kerak"
    );
  });

  it("bir necha parallel so'rov ham sessiyani yopmaydi", async () => {
    const user = await makeUser();
    const first = await sessionModule.createSession(user);

    await sessionModule.rotateSession(first.refreshToken);

    // Next.js bir sahifada o'nlab havolani oldindan yuklashi mumkin.
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        sessionModule.rotateSession(first.refreshToken)
      )
    );

    for (const result of results) {
      assert.equal(result.status, "raced");
    }

    assert.equal(await activeSessionCount(user.id), 1);
  });
});

describe("rotateSession — o'g'irlikni aniqlash", () => {
  it("grace oynasidan KEYIN ishlatilgan token barcha sessiyalarni yopadi", async () => {
    const user = await makeUser();
    const first = await sessionModule.createSession(user);

    const rotated = await sessionModule.rotateSession(first.refreshToken);
    assert.equal(rotated.status, "ok");

    /**
     * Vaqtni "orqaga surish": eski sessiyaning bekor qilingan vaqtini
     * grace oynasidan oldinga o'tkazamiz.
     *
     * Testda 30 soniya kutishning ma'nosi yo'q — biz mantiqni
     * tekshiryapmiz, taymerni emas.
     */
    await dbModule.db.session.update({
      where: { id: first.sessionId },
      data: { revokedAt: new Date(Date.now() - 5 * 60_000) },
    });

    const stolen = await sessionModule.rotateSession(first.refreshToken);

    assert.equal(stolen.status, "reuse_detected");

    // Barcha sessiyalar yopilishi kerak — haqiqiy egasi ham chiqib
    // ketadi, lekin hisob qo'ldan chiqmaydi.
    assert.equal(
      await activeSessionCount(user.id),
      0,
      "o'g'irlik aniqlanganda barcha sessiyalar yopilishi kerak"
    );

    // Audit jurnaliga yozilishi kerak.
    const audit = await dbModule.db.auditLog.findFirst({
      where: { actorId: user.id, action: "auth.refresh_token_reuse_detected" },
      select: { id: true },
    });
    assert.ok(audit, "o'g'irlik audit jurnaliga yozilishi kerak");
  });
});

describe("rotateSession — yaroqsiz holatlar", () => {
  it("mavjud bo'lmagan tokenni rad etadi", async () => {
    const result = await sessionModule.rotateSession("mutlaqo-yaroqsiz-token");
    assert.equal(result.status, "invalid");
  });

  it("muddati o'tgan tokenni rad etadi", async () => {
    const user = await makeUser();
    const tokens = await sessionModule.createSession(user);

    await dbModule.db.session.update({
      where: { id: tokens.sessionId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const result = await sessionModule.rotateSession(tokens.refreshToken);
    assert.equal(result.status, "invalid");
  });

  it("bloklangan foydalanuvchiga token bermaydi", async () => {
    const user = await makeUser();
    const tokens = await sessionModule.createSession(user);

    await dbModule.db.user.update({
      where: { id: user.id },
      data: { status: "BANNED" },
    });

    const result = await sessionModule.rotateSession(tokens.refreshToken);

    assert.equal(result.status, "user_blocked");
    if (result.status === "user_blocked") {
      assert.equal(result.reason, "BANNED");
    }
  });

  it("o'chirilgan foydalanuvchiga token bermaydi", async () => {
    const user = await makeUser();
    const tokens = await sessionModule.createSession(user);

    await dbModule.db.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date() },
    });

    const result = await sessionModule.rotateSession(tokens.refreshToken);
    assert.equal(result.status, "user_blocked");
  });
});

describe("revokeAllUserSessions", () => {
  it("bittasidan tashqari hammasini yopadi", async () => {
    const user = await makeUser();

    const a = await sessionModule.createSession(user);
    await sessionModule.createSession(user);
    await sessionModule.createSession(user);

    assert.equal(await activeSessionCount(user.id), 3);

    const revoked = await sessionModule.revokeAllUserSessions(
      user.id,
      "ADMIN",
      { exceptSessionId: a.sessionId }
    );

    assert.equal(revoked, 2);
    assert.equal(await activeSessionCount(user.id), 1);
  });
});
