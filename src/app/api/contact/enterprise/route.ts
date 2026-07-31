import { NextRequest } from "next/server";
import { ok } from "@/lib/api";
import { sendTelegramMessage } from "@/lib/telegram";

// Enterprise tarif so'rovi — adminga Telegram xabar yuboradi
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = (body?.name || "").toString().slice(0, 80);
  const phone = (body?.phone || "").toString().slice(0, 40);

  await sendTelegramMessage(
    `💎 <b>Enterprise so'rovi</b>\n` +
      `Kimdir Enterprise tarif narxini so'radi.\n` +
      (name ? `Ism: ${name}\n` : "") +
      (phone ? `Telefon: ${phone}\n` : "") +
      `\nWebsayt orqali (narx kelishiladi).`
  ).catch(() => {});

  return ok({ sent: true });
}
