/**
 * PORTFOLIO VA KO'NIKMALAR — INTEGRATSIYA TESTLARI
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ENG MUHIM TEKSHIRUV: EGALIK
 *
 *  `PortfolioItem` yozuvlari `developerProfileId` orqali bog'langan,
 *  `userId` orqali emas. Ya'ni "bu yozuv menikimi?" degan savolga javob
 *  ikki qadam talab qiladi va bu qadamni tashlab ketish oson.
 *
 *  Natijasi og'ir: boshqa mutaxassisning portfoliosini o'chirib
 *  yuborish yoki tahrirlash mumkin bo'lardi. Shu sababli bu fayl
 *  har amal uchun "begona odam qila olmaydi" holatini tekshiradi.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { setupTestDatabase, type TestDatabase } from "./testing/test-db";

type DbModule = typeof import("./db");
type PortfolioModule = typeof import("./portfolio");

let dbModule: DbModule;
let portfolio: PortfolioModule;

let testDb: TestDatabase;

before(async () => {
  testDb = setupTestDatabase("portfolio");

  dbModule = await import("./db");
  portfolio = await import("./portfolio");
});

after(async () => {
  await dbModule?.db.$disconnect();
  testDb?.cleanup();
});

// ─────────────────────────────────────────────────────────────────────────────
// Yordamchilar
// ─────────────────────────────────────────────────────────────────────────────

let counter = 0;

/** Profil bilan developer yaratadi. */
async function makeDeveloper() {
  const { db } = dbModule;
  const id = ++counter;

  const user = await db.user.create({
    data: {
      email: `dev-${id}@test.uz`,
      username: `dev-${id}`,
      name: `Mutaxassis ${id}`,
      passwordHash: "x",
      role: "DEVELOPER",
      status: "ACTIVE",
      developerProfile: { create: {} },
    },
    select: { id: true, developerProfile: { select: { id: true } } },
  });

  return { userId: user.id, profileId: user.developerProfile?.id ?? "" };
}

/** Profilsiz foydalanuvchi — mijoz. */
async function makeCustomer() {
  const { db } = dbModule;
  const id = ++counter;

  const user = await db.user.create({
    data: {
      email: `customer-${id}@test.uz`,
      name: `Mijoz ${id}`,
      passwordHash: "x",
      role: "CUSTOMER",
      status: "ACTIVE",
    },
    select: { id: true },
  });

  return user.id;
}

/** Test uchun ko'nikma yaratadi. */
async function makeSkill(name: string) {
  const { db } = dbModule;
  const id = ++counter;

  return db.skill.create({
    data: { slug: `${name}-${id}`, name, kind: "FRAMEWORK" },
    select: { id: true, name: true },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Egalik — eng muhim guruh
// ─────────────────────────────────────────────────────────────────────────────

describe("portfolio — egalik", () => {
  it("begona odam boshqaning ishini tahrirlay olmaydi", async () => {
    const owner = await makeDeveloper();
    const stranger = await makeDeveloper();

    const item = await portfolio.addPortfolioItem(owner.userId, {
      title: "Mening ishim",
      tech: ["Next.js"],
    });

    await assert.rejects(
      () =>
        portfolio.updatePortfolioItem({
          userId: stranger.userId,
          itemId: item.id,
          input: { title: "O'zlashtirildi", tech: [] },
        }),
      (error: unknown) =>
        error instanceof portfolio.PortfolioError && error.code === "NOT_FOUND"
    );

    // Sarlavha O'ZGARMAGAN bo'lishi kerak.
    const works = await portfolio.listPortfolio(owner.userId);
    assert.equal(works[0]?.title, "Mening ishim");
  });

  it("begona odam boshqaning ishini o'chira olmaydi", async () => {
    const owner = await makeDeveloper();
    const stranger = await makeDeveloper();

    const item = await portfolio.addPortfolioItem(owner.userId, {
      title: "O'chirilmasin",
      tech: [],
    });

    await assert.rejects(
      () =>
        portfolio.deletePortfolioItem({
          userId: stranger.userId,
          itemId: item.id,
        }),
      (error: unknown) =>
        error instanceof portfolio.PortfolioError && error.code === "NOT_FOUND"
    );

    const works = await portfolio.listPortfolio(owner.userId);
    assert.equal(works.length, 1, "Begona odam ishni o'chirib yubordi");
  });

  it("begona odam boshqaning ishini yashira olmaydi", async () => {
    const owner = await makeDeveloper();
    const stranger = await makeDeveloper();

    const item = await portfolio.addPortfolioItem(owner.userId, {
      title: "Ko'rinib turishi kerak",
      tech: [],
    });

    await assert.rejects(
      () =>
        portfolio.setPortfolioVisibility({
          userId: stranger.userId,
          itemId: item.id,
          isVisible: false,
        }),
      (error: unknown) =>
        error instanceof portfolio.PortfolioError && error.code === "NOT_FOUND"
    );

    const works = await portfolio.listPortfolio(owner.userId);
    assert.equal(works[0]?.isVisible, true);
  });

  it("begona odam boshqaning tartibini o'zgartira olmaydi", async () => {
    const owner = await makeDeveloper();
    const stranger = await makeDeveloper();

    await portfolio.addPortfolioItem(owner.userId, { title: "Birinchi", tech: [] });
    const second = await portfolio.addPortfolioItem(owner.userId, {
      title: "Ikkinchi",
      tech: [],
    });

    await assert.rejects(
      () =>
        portfolio.movePortfolioItem({
          userId: stranger.userId,
          itemId: second.id,
          direction: "up",
        }),
      (error: unknown) =>
        error instanceof portfolio.PortfolioError && error.code === "NOT_FOUND"
    );

    const works = await portfolio.listPortfolio(owner.userId);
    assert.equal(works[0]?.title, "Birinchi", "Tartib o'zgarib ketdi");
  });

  it("profilsiz foydalanuvchi ish qo'sha olmaydi", async () => {
    const customerId = await makeCustomer();

    await assert.rejects(
      () =>
        portfolio.addPortfolioItem(customerId, {
          title: "Mijozning ishi",
          tech: [],
        }),
      (error: unknown) =>
        error instanceof portfolio.PortfolioError && error.code === "NO_PROFILE"
    );
  });

  it("profilsiz foydalanuvchida ro'yxat bo'sh, xato yo'q", async () => {
    // O'qish xato TASHLAMAYDI: sahifa yiqilmasligi kerak.
    const customerId = await makeCustomer();

    assert.deepEqual(await portfolio.listPortfolio(customerId), []);
    assert.deepEqual(await portfolio.listMySkills(customerId), []);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Platformadagi loyiha
// ─────────────────────────────────────────────────────────────────────────────

describe("portfolio — platformadagi loyiha", () => {
  it("loyihadan kelgan ishni o'chirib bo'lmaydi, yashirish mumkin", async () => {
    const { db } = dbModule;
    const owner = await makeDeveloper();
    const customerId = await makeCustomer();

    // Tugagan loyiha va undan kelgan portfolio yozuvi.
    const projectNumber = ++counter;
    const budget = 5_000_000n;

    // `categoryId` majburiy — loyiha kategoriyasiz bo'lmaydi.
    const category = await db.category.create({
      data: { slug: `kategoriya-${projectNumber}`, name: "Botlar" },
      select: { id: true },
    });

    const project = await db.project.create({
      data: {
        publicId: `OZF-PF${projectNumber}`,
        slug: `mijoz-uchun-bot-${projectNumber}`,
        customerId,
        categoryId: category.id,
        assignedDeveloperId: owner.userId,
        title: "Mijoz uchun bot",
        description: "Tavsif",
        budgetMin: budget,
        budgetMax: budget,
        agreedAmount: budget,
        commissionBps: 1500,
        status: "COMPLETED",
      },
      select: { id: true },
    });

    const item = await db.portfolioItem.create({
      data: {
        developerProfileId: owner.profileId,
        title: "Mijoz uchun bot",
        sourceProjectId: project.id,
      },
      select: { id: true },
    });

    /**
     * O'CHIRISH RAD ETILADI.
     *
     * Sababi: bu tasdiqlangan ish tarixi — mijoz qabul qilgan, pul
     * to'langan. O'chirishga ruxsat berilsa mutaxassis muvaffaqiyatsiz
     * loyihalarni yashirib yurardi va portfolio ishonchini yo'qotardi.
     */
    await assert.rejects(
      () =>
        portfolio.deletePortfolioItem({
          userId: owner.userId,
          itemId: item.id,
        }),
      (error: unknown) =>
        error instanceof portfolio.PortfolioError && error.code === "FORBIDDEN"
    );

    // Lekin YASHIRISH mumkin — bu adolatli o'rta yo'l.
    await portfolio.setPortfolioVisibility({
      userId: owner.userId,
      itemId: item.id,
      isVisible: false,
    });

    const works = await portfolio.listPortfolio(owner.userId);
    assert.equal(works[0]?.isVisible, false);
    assert.equal(works[0]?.fromProject, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tartib
// ─────────────────────────────────────────────────────────────────────────────

describe("portfolio — tartib", () => {
  it("ishni yuqoriga va pastga suradi", async () => {
    const owner = await makeDeveloper();

    await portfolio.addPortfolioItem(owner.userId, { title: "A", tech: [] });
    await portfolio.addPortfolioItem(owner.userId, { title: "B", tech: [] });
    const c = await portfolio.addPortfolioItem(owner.userId, {
      title: "C",
      tech: [],
    });

    const titles = async () =>
      (await portfolio.listPortfolio(owner.userId)).map((w) => w.title);

    assert.deepEqual(await titles(), ["A", "B", "C"]);

    // C ni yuqoriga: A, C, B
    await portfolio.movePortfolioItem({
      userId: owner.userId,
      itemId: c.id,
      direction: "up",
    });
    assert.deepEqual(await titles(), ["A", "C", "B"]);

    // C ni yana yuqoriga: C, A, B
    await portfolio.movePortfolioItem({
      userId: owner.userId,
      itemId: c.id,
      direction: "up",
    });
    assert.deepEqual(await titles(), ["C", "A", "B"]);

    // C ni pastga: A, C, B
    await portfolio.movePortfolioItem({
      userId: owner.userId,
      itemId: c.id,
      direction: "down",
    });
    assert.deepEqual(await titles(), ["A", "C", "B"]);
  });

  it("chegarada surish xato bermaydi va tartibni buzmaydi", async () => {
    const owner = await makeDeveloper();

    const first = await portfolio.addPortfolioItem(owner.userId, {
      title: "Birinchi",
      tech: [],
    });
    const last = await portfolio.addPortfolioItem(owner.userId, {
      title: "Oxirgi",
      tech: [],
    });

    // Birinchini yuqoriga — hech narsa o'zgarmaydi, xato ham yo'q.
    await portfolio.movePortfolioItem({
      userId: owner.userId,
      itemId: first.id,
      direction: "up",
    });

    // Oxirgini pastga — xuddi shunday.
    await portfolio.movePortfolioItem({
      userId: owner.userId,
      itemId: last.id,
      direction: "down",
    });

    const titles = (await portfolio.listPortfolio(owner.userId)).map(
      (w) => w.title
    );
    assert.deepEqual(titles, ["Birinchi", "Oxirgi"]);
  });

  it("sortOrder hammasi 0 bo'lsa ham tartib to'g'ri qayta yoziladi", async () => {
    // Eski yozuvlarda `sortOrder` standart 0 bo'lishi mumkin. Qiymatni
    // shunchaki almashtirish bu holatda ishlamaydi — kod butun ro'yxatni
    // qayta raqamlaydi.
    const { db } = dbModule;
    const owner = await makeDeveloper();

    await db.portfolioItem.createMany({
      data: [
        { developerProfileId: owner.profileId, title: "X", sortOrder: 0 },
        { developerProfileId: owner.profileId, title: "Y", sortOrder: 0 },
        { developerProfileId: owner.profileId, title: "Z", sortOrder: 0 },
      ],
    });

    const before = await portfolio.listPortfolio(owner.userId);
    const target = before[2];
    assert.ok(target);

    await portfolio.movePortfolioItem({
      userId: owner.userId,
      itemId: target.id,
      direction: "up",
    });

    const after = await portfolio.listPortfolio(owner.userId);

    // Uchinchi element ikkinchi o'ringa chiqqan bo'lishi kerak.
    assert.equal(after[1]?.id, target.id);
    // Va tartib raqamlari endi takrorlanmasligi kerak.
    assert.deepEqual(
      after.map((w) => w.sortOrder),
      [0, 1, 2]
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cheklovlar
// ─────────────────────────────────────────────────────────────────────────────

describe("portfolio — cheklovlar", () => {
  it("24 tadan ko'p ish qo'shib bo'lmaydi", async () => {
    const owner = await makeDeveloper();

    for (let index = 0; index < 24; index += 1) {
      await portfolio.addPortfolioItem(owner.userId, {
        title: `Ish ${index}`,
        tech: [],
      });
    }

    await assert.rejects(
      () =>
        portfolio.addPortfolioItem(owner.userId, {
          title: "25-chi",
          tech: [],
        }),
      (error: unknown) =>
        error instanceof portfolio.PortfolioError &&
        error.code === "LIMIT_REACHED"
    );

    const works = await portfolio.listPortfolio(owner.userId);
    assert.equal(works.length, 24);
  });

  it("buzuq techJson ro'yxatni yiqitmaydi", async () => {
    const { db } = dbModule;
    const owner = await makeDeveloper();

    await db.portfolioItem.create({
      data: {
        developerProfileId: owner.profileId,
        title: "Buzuq JSON",
        techJson: "{ bu JSON emas",
      },
    });

    const works = await portfolio.listPortfolio(owner.userId);
    assert.equal(works.length, 1);
    assert.deepEqual(works[0]?.tech, []);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ko'nikmalar
// ─────────────────────────────────────────────────────────────────────────────

describe("ko'nikmalar", () => {
  it("qo'shadi va ro'yxatda qaytaradi", async () => {
    const owner = await makeDeveloper();
    const skill = await makeSkill("React");

    await portfolio.addSkill({
      userId: owner.userId,
      skillId: skill.id,
      level: 4,
      yearsExperience: 3,
    });

    const mine = await portfolio.listMySkills(owner.userId);
    assert.equal(mine.length, 1);
    assert.equal(mine[0]?.name, "React");
    assert.equal(mine[0]?.level, 4);
    assert.equal(mine[0]?.yearsExperience, 3);
  });

  it("takroriy qo'shish dublikat yaratmaydi, darajani yangilaydi", async () => {
    const owner = await makeDeveloper();
    const skill = await makeSkill("Vue");

    await portfolio.addSkill({
      userId: owner.userId,
      skillId: skill.id,
      level: 2,
      yearsExperience: 1,
    });

    // Foydalanuvchi xuddi shu ko'nikmani qayta tanladi. "Bu allaqachon
    // bor" degan xatodan ko'ra darajasini yangilash foydali.
    await portfolio.addSkill({
      userId: owner.userId,
      skillId: skill.id,
      level: 5,
      yearsExperience: 6,
    });

    const mine = await portfolio.listMySkills(owner.userId);
    assert.equal(mine.length, 1, "Dublikat yaratildi");
    assert.equal(mine[0]?.level, 5);
    assert.equal(mine[0]?.yearsExperience, 6);
  });

  it("mavjud bo'lmagan ko'nikma qo'shib bo'lmaydi", async () => {
    const owner = await makeDeveloper();

    await assert.rejects(
      () =>
        portfolio.addSkill({
          userId: owner.userId,
          skillId: "yoq-bunday-id",
          level: 3,
          yearsExperience: 0,
        }),
      (error: unknown) =>
        error instanceof portfolio.PortfolioError &&
        error.code === "SKILL_NOT_FOUND"
    );
  });

  it("o'chirilgan ko'nikma qo'shib bo'lmaydi", async () => {
    const { db } = dbModule;
    const owner = await makeDeveloper();
    const skill = await makeSkill("Eskirgan");

    await db.skill.update({
      where: { id: skill.id },
      data: { isActive: false },
    });

    await assert.rejects(
      () =>
        portfolio.addSkill({
          userId: owner.userId,
          skillId: skill.id,
          level: 3,
          yearsExperience: 0,
        }),
      (error: unknown) =>
        error instanceof portfolio.PortfolioError &&
        error.code === "SKILL_NOT_FOUND"
    );
  });

  it("begona odam boshqaning ko'nikmasini olib tashlay olmaydi", async () => {
    const owner = await makeDeveloper();
    const stranger = await makeDeveloper();
    const skill = await makeSkill("Svelte");

    await portfolio.addSkill({
      userId: owner.userId,
      skillId: skill.id,
      level: 3,
      yearsExperience: 2,
    });

    await assert.rejects(
      () =>
        portfolio.removeSkill({
          userId: stranger.userId,
          skillId: skill.id,
        }),
      (error: unknown) =>
        error instanceof portfolio.PortfolioError && error.code === "NOT_FOUND"
    );

    const mine = await portfolio.listMySkills(owner.userId);
    assert.equal(mine.length, 1, "Begona odam ko'nikmani o'chirdi");
  });

  it("o'z ko'nikmasini olib tashlaydi", async () => {
    const owner = await makeDeveloper();
    const skill = await makeSkill("Angular");

    await portfolio.addSkill({
      userId: owner.userId,
      skillId: skill.id,
      level: 3,
      yearsExperience: 1,
    });

    await portfolio.removeSkill({ userId: owner.userId, skillId: skill.id });

    assert.deepEqual(await portfolio.listMySkills(owner.userId), []);
  });

  it("faqat faol ko'nikmalar tanlovda ko'rinadi", async () => {
    const { db } = dbModule;
    const active = await makeSkill("Faol");
    const inactive = await makeSkill("Nofaol");

    await db.skill.update({
      where: { id: inactive.id },
      data: { isActive: false },
    });

    const options = await portfolio.listAvailableSkills();
    const ids = options.map((option) => option.id);

    assert.ok(ids.includes(active.id));
    assert.ok(!ids.includes(inactive.id), "Nofaol ko'nikma tanlovda ko'rindi");
  });
});
