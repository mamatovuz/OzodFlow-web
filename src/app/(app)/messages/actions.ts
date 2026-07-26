"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { authorizeAction } from "@/lib/auth/current-user";
import { chatErrorMessage, sendMessage } from "@/lib/chat";
import { consume, rateLimitKey, rateLimitMessage } from "@/lib/rate-limit";
import { getRequestInfo } from "@/lib/request-info";
import {
  formError,
  formSuccess,
  parseFormData,
  type FormState,
} from "@/lib/validators/form";

/**
 * CHAT — server action'lari
 *
 * Mantiq va egalik tekshiruvi `src/lib/chat.ts` da.
 */

const sendSchema = z.object({
  conversationId: z.string().min(1),
  body: z
    .string()
    .trim()
    .min(1, "Xabar bo'sh")
    // Uzun xabar KESILADI (xizmat qatlamida), lekin juda uzunini
    // umuman qabul qilmaymiz — bu database'ni to'ldirish yo'li.
    .max(8000, "Xabar juda uzun"),
});

/**
 * Xabar yuborish uchun rate limit.
 *
 * Oddiy `RULES.WRITE` dan YUMSHOQROQ: chat tez yozishni talab qiladi
 * va odam ketma-ket bir necha qisqa xabar yuborishi normal. Lekin
 * cheklovsiz qoldirish spam yo'lini ochadi.
 */
const CHAT_LIMIT = { windowMs: 60_000, max: 30, blockMs: 60_000 };

export async function sendMessageAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return formError(auth.error);

  const info = await getRequestInfo();
  const limit = consume(
    rateLimitKey("chat_send", { ip: info.ip, identifier: auth.user.id }),
    CHAT_LIMIT
  );
  if (!limit.ok) return formError(rateLimitMessage(limit));

  const parsed = parseFormData(sendSchema, formData);
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.fieldErrors };

  try {
    await sendMessage({
      conversationId: parsed.data.conversationId,
      senderId: auth.user.id,
      body: parsed.data.body,
    });
  } catch (error) {
    console.error("[chat.send]", error);
    return formError(chatErrorMessage(error));
  }

  // Suhbat va ro'yxat ikkalasi yangilanadi: ro'yxatda oxirgi xabar va
  // tartib o'zgaradi.
  revalidatePath(`/messages/${parsed.data.conversationId}`);
  revalidatePath("/messages");

  // Xabar YO'Q: yuborilgan xabar ro'yxatda paydo bo'ladi va "Yuborildi"
  // degan alohida bildirishnoma bezor qiladi.
  return formSuccess();
}
