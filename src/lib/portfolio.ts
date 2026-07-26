import { db } from "@/lib/db";
import { readStringList, writeJsonField } from "@/lib/json-field";

/**
 * PORTFOLIO VA KO'NIKMALAR
 *
 * Developer profilining eng muhim qismi: mijoz aynan shu ikkitasiga
 * qarab tanlaydi. Reyting yangi mutaxassisda hali yo'q, portfolio esa
 * bor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  EGALIK TEKSHIRUVI — har funksiyada
 *
 *  `PortfolioItem` va `DeveloperSkill` yozuvlari `developerProfileId`
 *  orqali bog'langan, `userId` orqali emas. Ya'ni "bu yozuv menikimi?"
 *  degan savolga javob berish uchun ikki qadam kerak:
 *
 *    userId → developerProfile.id → yozuv.developerProfileId
 *
 *  Bu qadamni tashlab ketish oson va natijasi og'ir: boshqa odamning
 *  portfoliosini o'chirib yuborish mumkin bo'lardi. Shuning uchun
 *  har funksiya `userId` oladi va o'zi tekshiradi — chaqiruvchiga
 *  ishonmaydi.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export class PortfolioError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NO_PROFILE"
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "LIMIT_REACHED"
      | "SKILL_NOT_FOUND"
      | "DUPLICATE"
  ) {
    super(message);
    this.name = "PortfolioError";
  }
}

export function portfolioErrorMessage(error: unknown): string {
  if (error instanceof PortfolioError) return error.message;
  return "Amal bajarilmadi. Qayta urinib ko'ring.";
}

/**
 * Cheklovlar.
 *
 * Cheklov bo'lmasa profil cheksiz uzayib ketadi: uni o'qib bo'lmaydi va
 * sahifa sekinlashadi. 24 ta ish — eng faol mutaxassis uchun ham
 * yetarli, 30 ta ko'nikma esa haqiqatga to'g'ri kelmaydigan darajada
 * ko'p (odam 30 ta texnologiyani bir vaqtda yaxshi bilmaydi).
 */
const MAX_PORTFOLIO_ITEMS = 24;
const MAX_SKILLS = 30;

/** `userId` dan developer profil id'sini oladi. */
async function requireProfileId(userId: string): Promise<string> {
  const profile = await db.developerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    throw new PortfolioError(
      "Mutaxassis profili topilmadi. Avval profil sozlamalarini saqlang.",
      "NO_PROFILE"
    );
  }

  return profile.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio
// ─────────────────────────────────────────────────────────────────────────────

export type PortfolioEntry = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  coverUrl: string | null;
  tech: string[];
  year: number | null;
  isVisible: boolean;
  sortOrder: number;
  /** Loyiha tugagach avtomatik qo'shilgan — o'chirilmaydi, yashiriladi */
  fromProject: boolean;
};

export async function listPortfolio(userId: string): Promise<PortfolioEntry[]> {
  const profile = await db.developerProfile.findUnique({
    where: { userId },
    select: {
      portfolio: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          description: true,
          url: true,
          coverUrl: true,
          techJson: true,
          year: true,
          isVisible: true,
          sortOrder: true,
          sourceProjectId: true,
        },
      },
    },
  });

  if (!profile) return [];

  return profile.portfolio.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    url: item.url,
    coverUrl: item.coverUrl,
    // Buzuq JSON sahifani yiqitmaydi — bo'sh ro'yxat qaytadi.
    tech: readStringList(item.techJson, "PortfolioItem.techJson"),
    year: item.year,
    isVisible: item.isVisible,
    sortOrder: item.sortOrder,
    fromProject: item.sourceProjectId !== null,
  }));
}

export type PortfolioInput = {
  title: string;
  description?: string | undefined;
  url?: string | undefined;
  tech: string[];
  year?: number | undefined;
};

export async function addPortfolioItem(
  userId: string,
  input: PortfolioInput
): Promise<{ id: string }> {
  const profileId = await requireProfileId(userId);

  const count = await db.portfolioItem.count({
    where: { developerProfileId: profileId },
  });

  if (count >= MAX_PORTFOLIO_ITEMS) {
    throw new PortfolioError(
      `Portfolioda ${MAX_PORTFOLIO_ITEMS} tadan ko'p ish bo'lmaydi. Eskilarini o'chiring.`,
      "LIMIT_REACHED"
    );
  }

  const item = await db.portfolioItem.create({
    data: {
      developerProfileId: profileId,
      title: input.title,
      description: input.description ?? null,
      url: input.url ?? null,
      techJson: writeJsonField(input.tech),
      year: input.year ?? null,
      // Yangi ish oxiriga qo'shiladi — mavjud tartib buzilmasligi kerak.
      sortOrder: count,
    },
    select: { id: true },
  });

  return item;
}

export async function updatePortfolioItem(params: {
  userId: string;
  itemId: string;
  input: PortfolioInput;
}): Promise<void> {
  const profileId = await requireProfileId(params.userId);

  // EGALIK: `updateMany` + `where` ikkalasini birga tekshiradi, ya'ni
  // "topish, keyin tekshirish" ikki qadamli poygasi yo'q.
  const result = await db.portfolioItem.updateMany({
    where: { id: params.itemId, developerProfileId: profileId },
    data: {
      title: params.input.title,
      description: params.input.description ?? null,
      url: params.input.url ?? null,
      techJson: writeJsonField(params.input.tech),
      year: params.input.year ?? null,
    },
  });

  if (result.count === 0) {
    throw new PortfolioError("Ish topilmadi", "NOT_FOUND");
  }
}

export async function deletePortfolioItem(params: {
  userId: string;
  itemId: string;
}): Promise<void> {
  const profileId = await requireProfileId(params.userId);

  const item = await db.portfolioItem.findFirst({
    where: { id: params.itemId, developerProfileId: profileId },
    select: { id: true, sourceProjectId: true },
  });

  if (!item) {
    throw new PortfolioError("Ish topilmadi", "NOT_FOUND");
  }

  /**
   * Platformadagi loyihadan kelgan ishni O'CHIRIB BO'LMAYDI.
   *
   * Sababi: u tasdiqlangan ish tarixi — mijoz qabul qilgan, pul
   * to'langan. Uni o'chirish "muvaffaqiyatsiz loyihalarni yashirish"
   * yo'li bo'lardi va portfolio ishonchini yo'qotardi.
   *
   * Yashirish esa mumkin: `isVisible` orqali.
   */
  if (item.sourceProjectId) {
    throw new PortfolioError(
      "Platformadagi loyiha o'chirilmaydi — uni yashirishingiz mumkin.",
      "FORBIDDEN"
    );
  }

  await db.portfolioItem.delete({ where: { id: item.id } });
}

/** Ishni ommaviy profilda ko'rsatish yoki yashirish. */
export async function setPortfolioVisibility(params: {
  userId: string;
  itemId: string;
  isVisible: boolean;
}): Promise<void> {
  const profileId = await requireProfileId(params.userId);

  const result = await db.portfolioItem.updateMany({
    where: { id: params.itemId, developerProfileId: profileId },
    data: { isVisible: params.isVisible },
  });

  if (result.count === 0) {
    throw new PortfolioError("Ish topilmadi", "NOT_FOUND");
  }
}

/**
 * Ishni ro'yxatda yuqoriga yoki pastga suradi.
 *
 * NEGA ALMASHTIRISH: "yangi tartibni to'liq yuborish" usuli ham bor,
 * lekin u drag-and-drop talab qiladi va JS o'chirilgan holatda
 * ishlamaydi. Qo'shni bilan almashtirish esa oddiy tugma bilan
 * bajariladi.
 */
export async function movePortfolioItem(params: {
  userId: string;
  itemId: string;
  direction: "up" | "down";
}): Promise<void> {
  const profileId = await requireProfileId(params.userId);

  await db.$transaction(async (tx) => {
    const items = await tx.portfolioItem.findMany({
      where: { developerProfileId: profileId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: { id: true, sortOrder: true },
    });

    const index = items.findIndex((item) => item.id === params.itemId);

    if (index === -1) {
      throw new PortfolioError("Ish topilmadi", "NOT_FOUND");
    }

    const targetIndex = params.direction === "up" ? index - 1 : index + 1;

    // Chegarada — hech narsa qilmaymiz. Xato tashlash noto'g'ri
    // bo'lardi: foydalanuvchi tugmani bosdi, amal bajarilmadi, lekin
    // bu xato holat emas.
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const current = items[index];
    const target = items[targetIndex];
    if (!current || !target) return;

    /**
     * `sortOrder` qiymatlari takrorlanishi mumkin (masalan hammasi 0 —
     * eski yozuvlar). Shu sababli qiymatlarni almashtirish yetarli
     * emas: butun ro'yxatni QAYTA raqamlaymiz.
     *
     * Ro'yxat kichik (maksimum 24), ya'ni bu arzon.
     */
    const reordered = [...items];
    reordered[index] = target;
    reordered[targetIndex] = current;

    await Promise.all(
      reordered.map((item, position) =>
        tx.portfolioItem.update({
          where: { id: item.id },
          data: { sortOrder: position },
        })
      )
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Ko'nikmalar
// ─────────────────────────────────────────────────────────────────────────────

export type SkillOption = {
  id: string;
  name: string;
  kind: string;
};

/** Tanlash uchun mavjud ko'nikmalar (seed'dan keladi). */
export async function listAvailableSkills(): Promise<SkillOption[]> {
  return db.skill.findMany({
    where: { isActive: true },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    select: { id: true, name: true, kind: true },
  });
}

export type DeveloperSkillEntry = {
  id: string;
  skillId: string;
  name: string;
  kind: string;
  /** 1..5 */
  level: number;
  yearsExperience: number;
};

export async function listMySkills(
  userId: string
): Promise<DeveloperSkillEntry[]> {
  const profile = await db.developerProfile.findUnique({
    where: { userId },
    select: {
      skills: {
        orderBy: [{ level: "desc" }, { skill: { name: "asc" } }],
        select: {
          id: true,
          skillId: true,
          level: true,
          yearsExperience: true,
          skill: { select: { name: true, kind: true } },
        },
      },
    },
  });

  if (!profile) return [];

  return profile.skills.map((row) => ({
    id: row.id,
    skillId: row.skillId,
    name: row.skill.name,
    kind: row.skill.kind,
    level: row.level,
    yearsExperience: row.yearsExperience,
  }));
}

export async function addSkill(params: {
  userId: string;
  skillId: string;
  level: number;
  yearsExperience: number;
}): Promise<void> {
  const profileId = await requireProfileId(params.userId);

  const skill = await db.skill.findFirst({
    where: { id: params.skillId, isActive: true },
    select: { id: true },
  });

  if (!skill) {
    throw new PortfolioError("Bunday ko'nikma topilmadi", "SKILL_NOT_FOUND");
  }

  const count = await db.developerSkill.count({
    where: { developerProfileId: profileId },
  });

  if (count >= MAX_SKILLS) {
    throw new PortfolioError(
      `${MAX_SKILLS} tadan ko'p ko'nikma qo'shib bo'lmaydi.`,
      "LIMIT_REACHED"
    );
  }

  /**
   * `upsert` — takroriy qo'shishda xato bermaydi, yangilaydi.
   *
   * Foydalanuvchi allaqachon qo'shilgan ko'nikmani qayta tanlasa,
   * "bu allaqachon bor" degan xato ko'rsatishdan ko'ra darajasini
   * yangilash foydaliroq.
   */
  await db.developerSkill.upsert({
    where: {
      developerProfileId_skillId: {
        developerProfileId: profileId,
        skillId: params.skillId,
      },
    },
    update: {
      level: params.level,
      yearsExperience: params.yearsExperience,
    },
    create: {
      developerProfileId: profileId,
      skillId: params.skillId,
      level: params.level,
      yearsExperience: params.yearsExperience,
    },
  });
}

export async function removeSkill(params: {
  userId: string;
  skillId: string;
}): Promise<void> {
  const profileId = await requireProfileId(params.userId);

  const result = await db.developerSkill.deleteMany({
    where: { developerProfileId: profileId, skillId: params.skillId },
  });

  if (result.count === 0) {
    throw new PortfolioError("Ko'nikma topilmadi", "NOT_FOUND");
  }
}
