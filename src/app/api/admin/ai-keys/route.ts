import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { superAdminGuard, ok, fail } from "@/lib/api";
import { encryptApiKey, keyHint, detectApiKey } from "@/lib/ai";

// Bosh admin: AI kalitlarini boshqarish (menyu importi uchun).
// Kalitlar failover tartibida ishlatiladi — cheksiz zaxira.

export async function GET() {
  const { user, res } = await superAdminGuard();
  if (!user) return res;
  const keys = await prisma.aiKey.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      provider: true,
      name: true,
      hint: true,
      model: true,
      imageModel: true,
      isActive: true,
      sortOrder: true,
      lastUsedAt: true,
      failCount: true,
      lastError: true,
      cooldownUntil: true,
      createdAt: true,
    },
  });
  return ok(keys);
}

// Yangi kalit qo'shish. Body: { name, apiKey, provider?, model?, imageModel? }
// Provayder va model AVTOMATIK aniqlanadi (Gemini yoki OpenAI). Aniqlash
// bir vaqtning o'zida kalitni ham tekshiradi — ishlamasa qo'shilmaydi.
export async function POST(req: NextRequest) {
  const { user, res } = await superAdminGuard();
  if (!user) return res;
  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();
  const apiKey = String(body?.apiKey || "").trim();
  if (!name) return fail("Nom kiriting", 422);
  if (apiKey.length < 10) return fail("API kalit noto'g'ri", 422);

  // Kalitni tekshirib, provayder + eng mos modelni avtomatik topamiz.
  const d = await detectApiKey(apiKey);
  if (!d.ok) return fail(`Kalit ishlamadi: ${d.error || "noma'lum xato"}`, 422);

  // Admin qo'lda model bergan bo'lsa — hurmat qilamiz, aks holda avtomatik.
  const provider = d.provider;
  const model = String(body?.model || d.model).trim();
  const imageModel = String(body?.imageModel || d.imageModel).trim();

  const max = await prisma.aiKey.aggregate({ _max: { sortOrder: true } });
  const key = await prisma.aiKey.create({
    data: {
      provider,
      name,
      keyEnc: encryptApiKey(apiKey),
      hint: keyHint(apiKey),
      model,
      imageModel,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
  return ok({ id: key.id, provider, model, imageModel }, 201);
}
