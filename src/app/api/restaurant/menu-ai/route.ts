import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { encryptApiKey, detectApiKey } from "@/lib/ai";

const STYLES = ["bubble", "minimal", "bar"];

// Restoran egasi: menyu AI (mijozlar uchun) sozlamalari.
// Restoran O'Z kalitini qo'yadi (platforma kaliti emas).
// POST body: { enabled?, apiKey?, style? }
export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};

  if (typeof body?.enabled === "boolean") data.menuAiEnabled = body.enabled;
  if (typeof body?.style === "string" && STYLES.includes(body.style)) data.menuAiStyle = body.style;

  // Kalit berilgan bo'lsa — tekshirib, provayder+modelni aniqlab, shifrlab saqlaymiz
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (apiKey) {
    if (apiKey.length < 10) return fail("API kalit noto'g'ri", 422);
    const d = await detectApiKey(apiKey);
    if (!d.ok) return fail(`Kalit ishlamadi: ${d.error || "noma'lum xato"}`, 422);
    data.menuAiKeyEnc = encryptApiKey(apiKey);
    data.menuAiProvider = d.provider;
    data.menuAiModel = d.model;
  }

  // Kalitni o'chirish
  if (body?.removeKey === true) {
    data.menuAiKeyEnc = null;
    data.menuAiProvider = null;
    data.menuAiModel = null;
    data.menuAiEnabled = false;
  }

  if (Object.keys(data).length === 0) return fail("O'zgartirish yo'q", 422);

  const updated = await prisma.restaurant.update({
    where: { id: restaurant.id },
    data,
    select: { menuAiEnabled: true, menuAiProvider: true, menuAiModel: true, menuAiStyle: true, menuAiKeyEnc: true },
  });

  return ok({
    enabled: updated.menuAiEnabled,
    provider: updated.menuAiProvider,
    model: updated.menuAiModel,
    style: updated.menuAiStyle,
    hasKey: !!updated.menuAiKeyEnc,
  });
}
