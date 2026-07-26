import { AUDIT, writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { ApplicationStatus, QuestionKind, UserRole } from "@/lib/enums";
import {
  questionOptionsSchema,
  readJsonField,
  readStringList,
  writeJsonField,
} from "@/lib/json-field";

/**
 * MUTAXASSIS ARIZASI
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  NEGA ARIZA KERAK
 *
 *  Spec talabi: mutaxassis "portfolio + texnik test + shaxs tasdig'i"
 *  dan o'tishi kerak. Sababi oddiy: mijoz pulini escrow'ga qo'yadi va
 *  ishni tekshirilmagan odamga topshirmasligi kerak.
 *
 *  OQIM:
 *    DRAFT          → ariza to'ldirilmoqda (ro'yxatdan o'tgach yaratiladi)
 *    SUBMITTED      → yuborildi, admin ko'rigini kutmoqda
 *    TEST_ASSIGNED  → admin testga ruxsat berdi
 *    TEST_SUBMITTED → test topshirildi, natija ko'rilmoqda
 *    APPROVED       → profil ommaviy bo'ldi, ish qabul qilish mumkin
 *    REJECTED       → sabab bilan rad etildi, qayta topshirish mumkin
 *
 *  ARIZA MA'LUMOTI `User` DAN ALOHIDA saqlanadi (`fullName`, `phone`…):
 *  u ariza paytidagi holatni MUZLATADI. Foydalanuvchi keyin ismini
 *  o'zgartirsa, arizada nima yozilganini bilish kerak bo'ladi.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export class ApplicationError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "NOT_DEVELOPER"
      | "WRONG_STATUS"
      | "TEST_NOT_READY"
      | "TEST_EXPIRED"
      | "INCOMPLETE"
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export function applicationErrorMessage(error: unknown): string {
  if (error instanceof ApplicationError) return error.message;
  return "Amal bajarilmadi. Qayta urinib ko'ring.";
}

/**
 * Testga ajratilgan vaqt.
 *
 * Cheklov SHART: vaqtsiz test "uyga vazifa" bo'lib qoladi va uni
 * boshqa odam ishlab berishi mumkin. 90 daqiqa — 8 savol uchun
 * shoshilmasdan yetadi.
 */
const TEST_DURATION_MINUTES = 90;

/** O'tish balli — foizda. */
const PASSING_SCORE = 60;

// ─────────────────────────────────────────────────────────────────────────────
// Arizani o'qish
// ─────────────────────────────────────────────────────────────────────────────

export type ApplicationView = {
  id: string;
  status: string;
  fullName: string;
  phone: string;
  email: string;
  telegram: string | null;
  github: string | null;
  linkedin: string | null;
  portfolio: string | null;
  yearsExperience: number;
  motivation: string | null;
  skills: string[];
  score: number | null;
  passedTest: boolean | null;
  rejectionReason: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  /** Test hali topshirilmagan va vaqti tugamagan */
  testOpen: boolean;
  testEndsAt: Date | null;
};

/** Foydalanuvchining arizasi. Yo'q bo'lsa `null`. */
export async function getMyApplication(
  userId: string
): Promise<ApplicationView | null> {
  const application = await db.developerApplication.findUnique({
    where: { userId },
    select: {
      id: true,
      status: true,
      fullName: true,
      phone: true,
      email: true,
      telegram: true,
      github: true,
      linkedin: true,
      portfolio: true,
      yearsExperience: true,
      motivation: true,
      skillsJson: true,
      score: true,
      passedTest: true,
      rejectionReason: true,
      submittedAt: true,
      reviewedAt: true,
      testEndsAt: true,
    },
  });

  if (!application) return null;

  return {
    ...application,
    skills: readStringList(application.skillsJson, "Application.skillsJson"),
    testOpen: isTestOpen(application.status, application.testEndsAt),
    testEndsAt: application.testEndsAt,
  };
}

/**
 * Test hozir topshirilishi mumkinmi.
 *
 * Ikki shart: holat `TEST_ASSIGNED` VA muddat tugamagan. Muddat
 * `null` bo'lsa test hali boshlanmagan — u ochiq hisoblanadi.
 */
function isTestOpen(status: string, testEndsAt: Date | null): boolean {
  if (status !== ApplicationStatus.TEST_ASSIGNED) return false;
  if (testEndsAt === null) return true;
  return testEndsAt.getTime() > Date.now();
}

// ─────────────────────────────────────────────────────────────────────────────
// Arizani yaratish va saqlash
// ─────────────────────────────────────────────────────────────────────────────

export type ApplicationInput = {
  fullName: string;
  phone: string;
  email: string;
  telegram?: string | undefined;
  github?: string | undefined;
  linkedin?: string | undefined;
  portfolio?: string | undefined;
  yearsExperience: number;
  motivation?: string | undefined;
  skills: string[];
};

/**
 * Arizani saqlaydi (yaratadi yoki yangilaydi).
 *
 * FAQAT `DRAFT` va `REJECTED` holatida tahrirlash mumkin. Yuborilgan
 * arizani o'zgartirish admin ko'rgan narsani almashtirib qo'yardi —
 * bu ko'rikni ma'nosiz qiladi.
 */
export async function saveApplication(params: {
  userId: string;
  input: ApplicationInput;
}): Promise<{ id: string }> {
  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: { role: true },
  });

  if (!user) {
    throw new ApplicationError("Foydalanuvchi topilmadi", "NOT_FOUND");
  }

  if (user.role !== UserRole.DEVELOPER) {
    throw new ApplicationError(
      "Ariza faqat mutaxassis roli uchun",
      "NOT_DEVELOPER"
    );
  }

  const existing = await db.developerApplication.findUnique({
    where: { userId: params.userId },
    select: { id: true, status: true },
  });

  const editable: string[] = [
    ApplicationStatus.DRAFT,
    ApplicationStatus.REJECTED,
  ];

  if (existing && !editable.includes(existing.status)) {
    throw new ApplicationError(
      "Yuborilgan arizani tahrirlash mumkin emas.",
      "WRONG_STATUS"
    );
  }

  const data = {
    fullName: params.input.fullName,
    phone: params.input.phone,
    email: params.input.email,
    telegram: params.input.telegram ?? null,
    github: params.input.github ?? null,
    linkedin: params.input.linkedin ?? null,
    portfolio: params.input.portfolio ?? null,
    yearsExperience: params.input.yearsExperience,
    motivation: params.input.motivation ?? null,
    skillsJson: writeJsonField(params.input.skills),
  };

  const application = await db.developerApplication.upsert({
    where: { userId: params.userId },
    update: data,
    create: { userId: params.userId, ...data },
    select: { id: true },
  });

  return application;
}

/**
 * Arizani ko'rikka yuboradi.
 *
 * Yuborilgach TAHRIRLASH YOPILADI — yuqoridagi izohga qarang.
 */
export async function submitApplication(userId: string): Promise<void> {
  const application = await db.developerApplication.findUnique({
    where: { userId },
    select: {
      id: true,
      status: true,
      fullName: true,
      phone: true,
      email: true,
      skillsJson: true,
    },
  });

  if (!application) {
    throw new ApplicationError(
      "Avval ariza ma'lumotlarini to'ldiring.",
      "NOT_FOUND"
    );
  }

  const submittable: string[] = [
    ApplicationStatus.DRAFT,
    ApplicationStatus.REJECTED,
  ];

  if (!submittable.includes(application.status)) {
    throw new ApplicationError("Ariza allaqachon yuborilgan.", "WRONG_STATUS");
  }

  /**
   * To'liqlik TEKRA tekshiriladi.
   *
   * Validator forma yuborilganda tekshiradi, lekin ariza bo'laklab
   * saqlanadi (`DRAFT`). Yuborishdan oldin qayta tekshirish shart:
   * aks holda yarim to'ldirilgan ariza admin stoliga tushardi.
   */
  const skills = readStringList(application.skillsJson);

  if (!application.fullName || !application.phone || skills.length === 0) {
    throw new ApplicationError(
      "Ism, telefon va kamida bitta ko'nikma to'ldirilishi kerak.",
      "INCOMPLETE"
    );
  }

  await db.developerApplication.update({
    where: { id: application.id },
    data: {
      status: ApplicationStatus.SUBMITTED,
      submittedAt: new Date(),
      // Qayta topshirishda eski rad etish sababi tozalanadi.
      rejectionReason: null,
    },
  });

  await writeAudit({
    actorId: userId,
    action: AUDIT.APPLICATION_SUBMITTED,
    entityType: "DeveloperApplication",
    entityId: application.id,
    after: { status: ApplicationStatus.SUBMITTED },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Texnik test
// ─────────────────────────────────────────────────────────────────────────────

export type TestQuestion = {
  id: string;
  kind: string;
  prompt: string;
  /** Variantli savol uchun */
  options: Array<{ id: string; text: string }>;
  points: number;
  language: string | null;
  timeLimitMinutes: number | null;
};

/**
 * Test savollari.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  TO'G'RI JAVOB HECH QACHON QAYTARILMAYDI
 *
 *  `correctAnswer` va `explanation` maydonlari `select` ga KIRITILMAYDI.
 *  Ular klientga uzatilsa, brauzer konsolida yoki HTML manbasida
 *  ko'rinardi va test ma'nosini butunlay yo'qotardi.
 *
 *  Baholash faqat serverda (`gradeTest`) bajariladi.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function getTestQuestions(): Promise<TestQuestion[]> {
  const questions = await db.applicationQuestion.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      kind: true,
      prompt: true,
      optionsJson: true,
      points: true,
      language: true,
      timeLimit: true,
      // `correctAnswer` VA `explanation` ATAYLAB YO'Q.
    },
  });

  return questions.map((question) => ({
    id: question.id,
    kind: question.kind,
    prompt: question.prompt,
    options: readJsonField(
      question.optionsJson,
      questionOptionsSchema,
      [],
      "ApplicationQuestion.optionsJson"
    ),
    points: question.points,
    language: question.language,
    timeLimitMinutes: question.timeLimit,
  }));
}

/**
 * Test taymerini boshlaydi.
 *
 * Birinchi ochilishda `testEndsAt` qo'yiladi. Keyingi ochilishlarda u
 * O'ZGARMAYDI — aks holda sahifani yangilab vaqtni cheksiz uzaytirish
 * mumkin bo'lardi.
 */
export async function startTest(userId: string): Promise<{ endsAt: Date }> {
  const application = await db.developerApplication.findUnique({
    where: { userId },
    select: { id: true, status: true, testStartedAt: true, testEndsAt: true },
  });

  if (!application) {
    throw new ApplicationError("Ariza topilmadi", "NOT_FOUND");
  }

  if (application.status !== ApplicationStatus.TEST_ASSIGNED) {
    throw new ApplicationError(
      "Test hali tayinlanmagan yoki allaqachon topshirilgan.",
      "TEST_NOT_READY"
    );
  }

  // Allaqachon boshlangan — mavjud muddatni qaytaramiz.
  if (application.testEndsAt) {
    if (application.testEndsAt.getTime() <= Date.now()) {
      throw new ApplicationError("Test vaqti tugagan.", "TEST_EXPIRED");
    }
    return { endsAt: application.testEndsAt };
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + TEST_DURATION_MINUTES * 60_000);

  await db.developerApplication.update({
    where: { id: application.id },
    data: { testStartedAt: now, testEndsAt: endsAt },
  });

  return { endsAt };
}

export type TestResult = {
  score: number;
  passed: boolean;
  /** Avtomatik baholanmagan savollar soni — admin ko'radi */
  manualCount: number;
};

/**
 * Test javoblarini saqlaydi va avtomatik baholaydi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  BAHOLASH QOIDASI
 *
 *  • `MULTIPLE_CHOICE` — avtomatik: javob `correctAnswer` ga tengmi
 *  • Qolganlari (CODING, LOGIC, PRACTICAL, OPEN) — QO'LDA baholanadi
 *
 *  Avtomatik ball darhol hisoblanadi, lekin `passedTest` **null**
 *  qoladi agar qo'lda baholanadigan savol bo'lsa: yakuniy qarorni
 *  admin qabul qiladi. Aks holda kod yozish savoliga "javob bor" deb
 *  ball berib qo'yardik.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function gradeTest(params: {
  userId: string;
  /** questionId → javob */
  answers: Record<string, string>;
}): Promise<TestResult> {
  const application = await db.developerApplication.findUnique({
    where: { userId: params.userId },
    select: { id: true, status: true, testEndsAt: true },
  });

  if (!application) {
    throw new ApplicationError("Ariza topilmadi", "NOT_FOUND");
  }

  if (application.status !== ApplicationStatus.TEST_ASSIGNED) {
    throw new ApplicationError(
      "Test topshirish holati emas.",
      "TEST_NOT_READY"
    );
  }

  /**
   * Muddat SERVERDA tekshiriladi.
   *
   * Klientdagi taymerga ishonish mumkin emas — uni to'xtatib qo'yish
   * bir necha bosishlik ish.
   *
   * Kichik zaxira beramiz (30 soniya): forma yuborilishi tarmoqda
   * bir necha soniya ketishi mumkin va aynan chegarada rad etish
   * insofdan emas.
   */
  if (
    application.testEndsAt &&
    application.testEndsAt.getTime() + 30_000 < Date.now()
  ) {
    throw new ApplicationError("Test vaqti tugagan.", "TEST_EXPIRED");
  }

  // To'g'ri javoblar FAQAT shu yerda o'qiladi.
  const questions = await db.applicationQuestion.findMany({
    where: { isActive: true },
    select: {
      id: true,
      kind: true,
      points: true,
      correctAnswer: true,
    },
  });

  let earned = 0;
  let total = 0;
  let manualCount = 0;

  const rows: Array<{
    questionId: string;
    answer: string;
    isCorrect: boolean | null;
    points: number;
  }> = [];

  for (const question of questions) {
    total += question.points;

    const answer = params.answers[question.id]?.trim() ?? "";

    // Javob berilmagan — 0 ball, qo'lda ko'rish kerak emas.
    if (answer === "") {
      rows.push({
        questionId: question.id,
        answer: "",
        isCorrect: false,
        points: 0,
      });
      continue;
    }

    const isAuto =
      question.kind === QuestionKind.MULTIPLE_CHOICE &&
      question.correctAnswer !== null;

    if (isAuto) {
      const isCorrect = answer === question.correctAnswer;
      const points = isCorrect ? question.points : 0;

      earned += points;
      rows.push({
        questionId: question.id,
        answer,
        isCorrect,
        points,
      });
      continue;
    }

    // Qo'lda baholanadi: `isCorrect` null, ball 0 — admin qo'yadi.
    manualCount += 1;
    rows.push({
      questionId: question.id,
      answer,
      isCorrect: null,
      points: 0,
    });
  }

  /**
   * Ball FOIZDA saqlanadi.
   *
   * `total` 0 bo'lishi mumkin (savol yo'q) — nolga bo'lishdan
   * himoyalanamiz.
   */
  const score = total > 0 ? Math.round((earned / total) * 100) : 0;

  // Qo'lda baholanadigan savol bo'lsa yakuniy qaror adminda.
  const passed = manualCount > 0 ? null : score >= PASSING_SCORE;

  await db.$transaction(async (tx) => {
    // Javoblar QAYTA YOZILADI: takroriy yuborishda dublikat bo'lmasligi
    // kerak (`@@unique([applicationId, questionId])`).
    await tx.applicationAnswer.deleteMany({
      where: { applicationId: application.id },
    });

    if (rows.length > 0) {
      await tx.applicationAnswer.createMany({
        data: rows.map((row) => ({
          applicationId: application.id,
          questionId: row.questionId,
          answer: row.answer,
          isCorrect: row.isCorrect,
          points: row.points,
        })),
      });
    }

    await tx.developerApplication.update({
      where: { id: application.id },
      data: {
        status: ApplicationStatus.TEST_SUBMITTED,
        score,
        passedTest: passed,
      },
    });
  });

  await writeAudit({
    actorId: params.userId,
    action: AUDIT.APPLICATION_SUBMITTED,
    entityType: "DeveloperApplication",
    entityId: application.id,
    after: { status: ApplicationStatus.TEST_SUBMITTED, score, manualCount },
  });

  return { score, passed: passed === true, manualCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin: ko'rib chiqish
// ─────────────────────────────────────────────────────────────────────────────

export type PendingApplication = {
  id: string;
  userId: string;
  status: string;
  fullName: string;
  email: string;
  phone: string;
  yearsExperience: number;
  skills: string[];
  github: string | null;
  portfolio: string | null;
  motivation: string | null;
  score: number | null;
  passedTest: boolean | null;
  submittedAt: Date | null;
  answerCount: number;
};

/** Admin ko'rigini kutayotgan arizalar. */
export async function listPendingApplications(): Promise<PendingApplication[]> {
  const applications = await db.developerApplication.findMany({
    where: {
      status: {
        in: [
          ApplicationStatus.SUBMITTED,
          ApplicationStatus.UNDER_REVIEW,
          ApplicationStatus.TEST_ASSIGNED,
          ApplicationStatus.TEST_SUBMITTED,
        ],
      },
    },
    orderBy: { submittedAt: "asc" },
    take: 100,
    select: {
      id: true,
      userId: true,
      status: true,
      fullName: true,
      email: true,
      phone: true,
      yearsExperience: true,
      skillsJson: true,
      github: true,
      portfolio: true,
      motivation: true,
      score: true,
      passedTest: true,
      submittedAt: true,
      _count: { select: { answers: true } },
    },
  });

  return applications.map((application) => ({
    id: application.id,
    userId: application.userId,
    status: application.status,
    fullName: application.fullName,
    email: application.email,
    phone: application.phone,
    yearsExperience: application.yearsExperience,
    skills: readStringList(application.skillsJson),
    github: application.github,
    portfolio: application.portfolio,
    motivation: application.motivation,
    score: application.score,
    passedTest: application.passedTest,
    submittedAt: application.submittedAt,
    answerCount: application._count.answers,
  }));
}

/** Admin testga ruxsat beradi. */
export async function assignTest(params: {
  applicationId: string;
  adminId: string;
}): Promise<void> {
  const application = await db.developerApplication.findUnique({
    where: { id: params.applicationId },
    select: { id: true, status: true },
  });

  if (!application) {
    throw new ApplicationError("Ariza topilmadi", "NOT_FOUND");
  }

  const allowed: string[] = [
    ApplicationStatus.SUBMITTED,
    ApplicationStatus.UNDER_REVIEW,
  ];

  if (!allowed.includes(application.status)) {
    throw new ApplicationError(
      "Bu holatda test tayinlab bo'lmaydi.",
      "WRONG_STATUS"
    );
  }

  await db.developerApplication.update({
    where: { id: application.id },
    data: {
      status: ApplicationStatus.TEST_ASSIGNED,
      reviewerId: params.adminId,
      // Taymer test OCHILGANDA boshlanadi, tayinlanganda emas —
      // aks holda xabarni ko'rmagan odam vaqtini yo'qotardi.
      testStartedAt: null,
      testEndsAt: null,
    },
  });

  await writeAudit({
    actorId: params.adminId,
    action: AUDIT.APPLICATION_APPROVED,
    entityType: "DeveloperApplication",
    entityId: application.id,
    after: { status: ApplicationStatus.TEST_ASSIGNED },
  });
}

/**
 * Arizani tasdiqlaydi — profil OMMAVIY bo'ladi.
 *
 * Ikki narsa birga bajariladi: ariza holati va `DeveloperProfile.verifiedAt`.
 * Tranzaksiya SHART: biri bajarilib ikkinchisi bajarilmasa, ariza
 * "tasdiqlangan" bo'lib profil ko'rinmay qolardi.
 */
export async function approveApplication(params: {
  applicationId: string;
  adminId: string;
  notes?: string | undefined;
}): Promise<{ userId: string }> {
  return db.$transaction(async (tx) => {
    const application = await tx.developerApplication.findUnique({
      where: { id: params.applicationId },
      select: { id: true, userId: true, status: true },
    });

    if (!application) {
      throw new ApplicationError("Ariza topilmadi", "NOT_FOUND");
    }

    if (application.status === ApplicationStatus.APPROVED) {
      throw new ApplicationError("Ariza allaqachon tasdiqlangan.", "WRONG_STATUS");
    }

    await tx.developerApplication.update({
      where: { id: application.id },
      data: {
        status: ApplicationStatus.APPROVED,
        reviewerId: params.adminId,
        reviewNotes: params.notes ?? null,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });

    // Profil bo'lmasa yaratiladi: rol DEVELOPER bo'lgani bilan profil
    // qatori bo'lmasligi mumkin.
    await tx.developerProfile.upsert({
      where: { userId: application.userId },
      update: { verifiedAt: new Date() },
      create: { userId: application.userId, verifiedAt: new Date() },
    });

    await writeAudit(
      {
        actorId: params.adminId,
        action: AUDIT.APPLICATION_APPROVED,
        entityType: "DeveloperApplication",
        entityId: application.id,
        before: { status: application.status },
        after: { status: ApplicationStatus.APPROVED, userId: application.userId },
      },
      tx
    );

    return { userId: application.userId };
  });
}

/**
 * Arizani rad etadi.
 *
 * Sabab MAJBURIY: "rad etildi" degan xabar foydalanuvchiga hech narsa
 * bermaydi va u nima qilishni bilmaydi. Qayta topshirish mumkin —
 * `REJECTED` holati tahrirlanadigan holatlar ro'yxatida.
 */
export async function rejectApplication(params: {
  applicationId: string;
  adminId: string;
  reason: string;
}): Promise<void> {
  const application = await db.developerApplication.findUnique({
    where: { id: params.applicationId },
    select: { id: true, status: true },
  });

  if (!application) {
    throw new ApplicationError("Ariza topilmadi", "NOT_FOUND");
  }

  await db.developerApplication.update({
    where: { id: application.id },
    data: {
      status: ApplicationStatus.REJECTED,
      reviewerId: params.adminId,
      rejectionReason: params.reason,
      reviewedAt: new Date(),
    },
  });

  await writeAudit({
    actorId: params.adminId,
    action: AUDIT.APPLICATION_REJECTED,
    entityType: "DeveloperApplication",
    entityId: application.id,
    before: { status: application.status },
    after: { status: ApplicationStatus.REJECTED, reason: params.reason },
  });
}

/** Admin uchun: bitta arizaning test javoblari. */
export async function getApplicationAnswers(applicationId: string) {
  return db.applicationAnswer.findMany({
    where: { applicationId },
    orderBy: { question: { sortOrder: "asc" } },
    select: {
      id: true,
      answer: true,
      isCorrect: true,
      points: true,
      question: {
        select: {
          prompt: true,
          kind: true,
          points: true,
          language: true,
          // Admin uchun to'g'ri javob KO'RINADI — u baholaydi.
          correctAnswer: true,
          explanation: true,
        },
      },
    },
  });
}
