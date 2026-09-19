import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin } from "@/lib/site";
import { encryptApiKey, keyHint, detectApiKey } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Shaxsiy sayt admini AI kalit qo'shishi (ovozli o'qish va AI uchun).
// Gemini yoki OpenAI kaliti — provayder va model avtomatik aniqlanadi.

export async function GET() {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const keys = await prisma.aiKey.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, provider: true, hint: true, model: true, isActive: true, lastError: true },
  });
  return ok(keys);
}

export async function POST(req: NextRequest) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const body = await req.json().catch(() => null);
  const apiKey = String(body?.apiKey || "").trim();
  if (apiKey.length < 10) return fail("API kalit noto'g'ri", 422);

  // Kalitni tekshirib provayder + modelni aniqlaymiz (ishlamasa qo'shilmaydi)
  const d = await detectApiKey(apiKey);
  if (!d.ok) return fail(`Kalit ishlamadi: ${d.error || "noma'lum xato"}`, 422);

  const max = await prisma.aiKey.aggregate({ _max: { sortOrder: true } });
  const key = await prisma.aiKey.create({
    data: {
      provider: d.provider,
      name: d.provider === "openai" ? "OpenAI (sayt)" : "Gemini (sayt)",
      keyEnc: encryptApiKey(apiKey),
      hint: keyHint(apiKey),
      model: d.model,
      imageModel: d.imageModel,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
  return ok({ id: key.id, provider: d.provider, model: d.model, hint: keyHint(apiKey) }, 201);
}

export async function DELETE(req: NextRequest) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("id yo'q", 422);
  await prisma.aiKey.delete({ where: { id } }).catch(() => {});
  return ok({ deleted: true });
}
