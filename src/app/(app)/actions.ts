"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { authorizeAction } from "@/lib/auth/current-user";
import { UserRole } from "@/lib/enums";
import { escrowErrorMessage, fundEscrow } from "@/lib/escrow";
import {
  acceptProposal,
  approveProject,
  createProject,
  markDelivered,
  projectErrorMessage,
  requestRevision,
  submitProposal,
} from "@/lib/projects";
import { formatMoney } from "@/lib/money";
import { RULES, consume, rateLimitKey, rateLimitMessage } from "@/lib/rate-limit";
import { getRequestInfo } from "@/lib/request-info";
import {
  acceptProposalSchema,
  approveProjectSchema,
  createProjectSchema,
  deliverProjectSchema,
  requestRevisionSchema,
  submitProposalSchema,
} from "@/lib/validators/project";
import {
  formError,
  formSuccess,
  parseFormData,
  type FormState,
} from "@/lib/validators/form";

/**
 * LOYIHA OQIMI — server action'lari
 *
 * Har bir action uch qadamdan iborat:
 *   1. Huquqni tekshirish (`authorizeAction`)
 *   2. Ma'lumotni tekshirish (Zod)
 *   3. Xizmat qatlamini chaqirish (`lib/projects.ts`, `lib/escrow.ts`)
 *
 * Biznes mantig'i BU YERDA YOZILMAYDI. Sababi: action faqat HTTP
 * chegarasi. Mantiq xizmat qatlamida bo'lsa uni test qilish mumkin
 * (escrow testlari aynan shunday ishlaydi) va boshqa joydan — cron,
 * admin panel, API — qayta chaqirish mumkin.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Loyiha yaratish
// ─────────────────────────────────────────────────────────────────────────────

export async function createProjectAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return formError(auth.error);

  // Developer loyiha yarata olmaydi — u ish bajaradi, buyurtma bermaydi.
  if (auth.user.role === UserRole.DEVELOPER) {
    return formError("Mutaxassis hisobidan loyiha joylashtirib bo'lmaydi.");
  }

  const info = await getRequestInfo();
  const limit = consume(
    rateLimitKey("project_create", { ip: info.ip, identifier: auth.user.id }),
    RULES.WRITE
  );
  if (!limit.ok) return formError(rateLimitMessage(limit));

  const parsed = parseFormData(createProjectSchema, formData);
  if (!parsed.ok) {
    return { status: "error", fieldErrors: parsed.fieldErrors };
  }

  let publicId: string;

  try {
    const project = await createProject({
      customerId: auth.user.id,
      data: {
        title: parsed.data.title,
        categoryId: parsed.data.categoryId,
        serviceId: parsed.data.serviceId,
        description: parsed.data.description,
        requirements: parsed.data.requirements,
        budgetMin: parsed.data.budgetMin,
        budgetMax: parsed.data.budgetMax,
        deadlineAt: parsed.data.deadlineAt,
        isUrgent: parsed.data.isUrgent,
      },
      ip: info.ip,
      userAgent: info.userAgent,
    });

    publicId = project.publicId;
  } catch (error) {
    console.error("[project.create]", error);
    return formError(projectErrorMessage(error));
  }

  // `redirect` try/catch TASHQARISIDA: Next uni xato tashlash orqali
  // amalga oshiradi, catch ichida bo'lsa u ushlanib qolardi.
  revalidatePath("/my-projects");
  redirect(`/projects/${publicId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Taklif yuborish
// ─────────────────────────────────────────────────────────────────────────────

export async function submitProposalAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return formError(auth.error);

  if (auth.user.role !== UserRole.DEVELOPER) {
    return formError("Taklif faqat mutaxassis hisobidan yuboriladi.");
  }

  const info = await getRequestInfo();
  const limit = consume(
    rateLimitKey("proposal", { ip: info.ip, identifier: auth.user.id }),
    RULES.WRITE
  );
  if (!limit.ok) return formError(rateLimitMessage(limit));

  const parsed = parseFormData(submitProposalSchema, formData);
  if (!parsed.ok) {
    return { status: "error", fieldErrors: parsed.fieldErrors };
  }

  try {
    await submitProposal({
      developerId: auth.user.id,
      projectId: parsed.data.projectId,
      coverLetter: parsed.data.coverLetter,
      amount: parsed.data.amount,
      deliveryDays: parsed.data.deliveryDays,
    });
  } catch (error) {
    console.error("[project.proposal]", error);
    return formError(projectErrorMessage(error));
  }

  revalidatePath("/proposals");
  revalidatePath("/projects");

  return formSuccess("Taklif yuborildi. Mijoz javobini kuting.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Taklifni qabul qilish
// ─────────────────────────────────────────────────────────────────────────────

export async function acceptProposalAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return formError(auth.error);

  const parsed = parseFormData(acceptProposalSchema, formData);
  if (!parsed.ok) return formError("Taklif tanlanmagan.");

  const info = await getRequestInfo();

  try {
    const result = await acceptProposal({
      customerId: auth.user.id,
      proposalId: parsed.data.proposalId,
      ip: info.ip,
      userAgent: info.userAgent,
    });

    revalidatePath("/my-projects");

    return formSuccess(
      `Mutaxassis tanlandi. Ishni boshlash uchun ${formatMoney(result.amount)} escrow'ga to'lang.`
    );
  } catch (error) {
    console.error("[project.acceptProposal]", error);
    return formError(projectErrorMessage(error));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Escrow to'ldirish
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mijoz kelishilgan summani escrow'ga bloklaydi.
 *
 * Bu eng nozik amal: pul harakati. Xato bo'lsa `escrowErrorMessage`
 * TUSHUNARLI xabar beradi ("mablag' yetarli emas"), texnik tafsilot esa
 * faqat log'da qoladi.
 */
export async function fundEscrowAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return formError(auth.error);

  const projectId = String(formData.get("projectId") || "");
  if (!projectId) return formError("Loyiha ko'rsatilmagan.");

  const info = await getRequestInfo();

  // Egalik tekshiruvi: `fundEscrow` loyihani id bo'yicha topadi, lekin
  // u kimning loyihasi ekanini tekshirmaydi — bu qatlamning vazifasi.
  const { db } = await import("@/lib/db");
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { customerId: true },
  });

  if (!project) return formError("Loyiha topilmadi.");
  if (project.customerId !== auth.user.id) {
    return formError("Bu loyiha sizga tegishli emas.");
  }

  try {
    const result = await fundEscrow({
      projectId,
      actorId: auth.user.id,
      ip: info.ip,
      userAgent: info.userAgent,
    });

    revalidatePath("/my-projects");
    revalidatePath("/wallet");

    return formSuccess(
      `${formatMoney(result.amount)} escrow'da bloklandi. Ish boshlandi.`
    );
  } catch (error) {
    console.error("[escrow.fund]", error);
    return formError(escrowErrorMessage(error));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ishni topshirish
// ─────────────────────────────────────────────────────────────────────────────

export async function deliverProjectAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return formError(auth.error);

  const parsed = parseFormData(deliverProjectSchema, formData);
  if (!parsed.ok) {
    return { status: "error", fieldErrors: parsed.fieldErrors };
  }

  try {
    await markDelivered({
      developerId: auth.user.id,
      projectId: parsed.data.projectId,
      message: parsed.data.message,
    });

    revalidatePath("/my-projects");

    return formSuccess("Ish topshirildi. Mijoz tekshiruvini kuting.");
  } catch (error) {
    console.error("[project.deliver]", error);
    return formError(projectErrorMessage(error));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tuzatish so'rash
// ─────────────────────────────────────────────────────────────────────────────

export async function requestRevisionAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return formError(auth.error);

  const parsed = parseFormData(requestRevisionSchema, formData);
  if (!parsed.ok) {
    return { status: "error", fieldErrors: parsed.fieldErrors };
  }

  try {
    const result = await requestRevision({
      customerId: auth.user.id,
      projectId: parsed.data.projectId,
      reason: parsed.data.reason,
    });

    revalidatePath("/my-projects");

    const remaining = result.freeRevisions - result.revisionCount;

    return formSuccess(
      remaining > 0
        ? `Tuzatish so'raldi. Yana ${remaining} ta bepul tuzatish qoldi.`
        : "Tuzatish so'raldi. Bepul tuzatishlar tugadi — keyingilari kelishuv asosida."
    );
  } catch (error) {
    console.error("[project.revision]", error);
    return formError(projectErrorMessage(error));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hamyonni to'ldirish so'rovi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bank o'tkazmasi yo'li natijasi — klient uni ko'rsatma sifatida chizadi.
 *
 * Shlyuz yo'lida natija QAYTMAYDI: foydalanuvchi to'lov sahifasiga
 * yo'naltiriladi (`redirect`).
 */
export type DepositResult = { code: string; amount: string };

export async function requestDepositAction(
  // Oldingi holat ham `DepositResult` tipida: `useActionState` action
  // va boshlang'ich holatning tiplari MOS bo'lishini talab qiladi.
  _prevState: FormState<DepositResult>,
  formData: FormData
): Promise<FormState<DepositResult>> {
  const auth = await authorizeAction();
  if (!auth.ok) return formError(auth.error);

  const info = await getRequestInfo();
  const limit = consume(
    rateLimitKey("deposit", { ip: info.ip, identifier: auth.user.id }),
    RULES.WRITE
  );
  if (!limit.ok) return formError(rateLimitMessage(limit));

  const { depositSchema } = await import("@/lib/validators/project");
  const parsed = parseFormData(depositSchema, formData);

  if (!parsed.ok) {
    return { status: "error", fieldErrors: parsed.fieldErrors };
  }

  const {
    CHECKOUT_MAX_SUM,
    checkoutErrorMessage,
    isCheckoutConfigured,
    requestManualDeposit,
    startGatewayDeposit,
  } = await import("@/lib/payments");

  const amount = parsed.data.amount;
  const amountSum = Number(amount / 100n);

  /**
   * Shlyuz yo'li mumkinmi.
   *
   * Uch shart: sozlangan, foydalanuvchi tanlagan va shlyuz limitiga
   * sig'adi. Bittasi bajarilmasa bank o'tkazmasi yo'liga o'tiladi —
   * foydalanuvchi "to'lov ishlamayapti" degan devorga urilmasligi kerak.
   */
  const useGateway =
    parsed.data.method === "GATEWAY" &&
    isCheckoutConfigured() &&
    amount % 100n === 0n &&
    amountSum <= CHECKOUT_MAX_SUM;

  if (useGateway) {
    let paymentUrl: string;

    try {
      const deposit = await startGatewayDeposit({
        userId: auth.user.id,
        amount,
        userName: auth.user.name,
      });

      paymentUrl = deposit.paymentUrl;
    } catch (error) {
      console.error("[wallet.deposit.gateway]", error);
      return formError(checkoutErrorMessage(error));
    }

    // `redirect` try/catch TASHQARISIDA: Next uni xato tashlash orqali
    // amalga oshiradi va catch ichida bo'lsa ushlanib qolardi.
    redirect(paymentUrl);
  }

  // ── Bank o'tkazmasi (admin tasdig'i bilan) ────────────────────────────
  try {
    const payment = await requestManualDeposit({
      userId: auth.user.id,
      amount,
      method: parsed.data.method,
    });

    revalidatePath("/wallet");

    return formSuccess("To'lov so'rovi yaratildi.", {
      code: payment.code,
      amount: formatMoney(payment.amount),
    });
  } catch (error) {
    console.error("[wallet.deposit.manual]", error);
    return formError("So'rovni yaratib bo'lmadi. Qayta urinib ko'ring.");
  }
}

/**
 * Kutilayotgan shlyuz to'lovlarini qayta tekshiradi.
 *
 * NEGA KERAK: webhook yetib kelmasligi mumkin — tarmoq uzilishi, deploy
 * paytidagi to'xtash yoki shlyuz tomonidagi nosozlik. CHECKOUT.UZ
 * webhook'ni QAYTA YUBORMAYDI (hujjatda shunday yozilgan).
 *
 * Shu sababli mijozda "tekshirish" tugmasi bo'lishi SHART, aks holda u
 * to'lagan pulini kutib qoladi va yordam xizmatiga yozishga majbur
 * bo'ladi.
 */
export async function recheckDepositsAction(
  _prevState: FormState,
  _formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return formError(auth.error);

  const info = await getRequestInfo();
  const limit = consume(
    rateLimitKey("deposit_recheck", { ip: info.ip, identifier: auth.user.id }),
    // Har tekshiruv shlyuzga tashqi so'rov yuboradi — tez-tez bosishga
    // yo'l qo'yilmaydi.
    { windowMs: 60_000, max: 6, blockMs: 60_000 }
  );
  if (!limit.ok) return formError(rateLimitMessage(limit));

  try {
    const { recheckPendingGatewayPayments } = await import("@/lib/payments");
    const result = await recheckPendingGatewayPayments(auth.user.id);

    revalidatePath("/wallet");

    if (result.credited === 0) {
      return formSuccess(
        "Yangi tasdiqlangan to'lov topilmadi. To'lovni hozir tugatgan bo'lsangiz, bir daqiqadan keyin qayta tekshiring."
      );
    }

    return formSuccess(
      `${result.credited} ta to'lov tasdiqlandi — ${formatMoney(result.total)} qo'shildi.`
    );
  } catch (error) {
    console.error("[wallet.recheck]", error);
    return formError("Tekshirib bo'lmadi. Qayta urinib ko'ring.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ishni qabul qilish va to'lash
// ─────────────────────────────────────────────────────────────────────────────

export async function approveProjectAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return formError(auth.error);

  const parsed = parseFormData(approveProjectSchema, formData);
  if (!parsed.ok) return formError("Loyiha ko'rsatilmagan.");

  const info = await getRequestInfo();

  try {
    const result = await approveProject({
      customerId: auth.user.id,
      projectId: parsed.data.projectId,
      ip: info.ip,
      userAgent: info.userAgent,
    });

    revalidatePath("/my-projects");
    revalidatePath("/wallet");
    revalidatePath("/dashboard");

    return formSuccess(
      `Ish qabul qilindi. Mutaxassisga ${formatMoney(result.developerAmount)} o'tkazildi.`
    );
  } catch (error) {
    console.error("[project.approve]", error);
    return formError(escrowErrorMessage(error));
  }
}
