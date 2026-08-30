import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";
import { parseBlocks, fieldBlocks } from "@/lib/landing-blocks";

export const dynamic = "force-dynamic";

// Ariza sahifasidan mijoz ma'lumotini qabul qilish (ommaviy).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const limited = limitOrReject(req, "landing-submit", { limit: 8, windowMs: WINDOW.fiveMin });
  if (limited) return limited;

  const { slug } = await params;
  const page = await prisma.landingPage.findUnique({ where: { slug } });
  if (!page || !page.isPublished) return fail("Sahifa topilmadi", 404);

  const body = await req.json().catch(() => null);
  const values: Record<string, string> = body?.values && typeof body.values === "object" ? body.values : {};

  const fields = fieldBlocks(parseBlocks(page.blocks));

  // Majburiy maydonlarni tekshiramiz
  for (const f of fields) {
    const key = f.field === "custom" ? f.id : f.field;
    const val = (values[key] || "").trim();
    if (f.required && !val) return fail(`"${f.label}" to'ldirilishi shart`, 422);
  }

  // Standart maydonlarni ustunlarga, qolganini extra JSON'ga yozamiz
  const std: Record<string, string> = {};
  const extra: Record<string, string> = {};
  for (const f of fields) {
    const key = f.field === "custom" ? f.id : f.field;
    const val = (values[key] || "").trim().slice(0, 500);
    if (!val) continue;
    if (f.field === "custom") extra[f.label] = val;
    else std[f.field] = val;
  }

  const sub = await prisma.landingSubmission.create({
    data: {
      pageId: page.id,
      name: std.name || "—",
      lastName: std.lastName || null,
      phone: std.phone || null,
      brand: std.brand || null,
      telegram: std.telegram || null,
      extra: Object.keys(extra).length ? JSON.stringify(extra) : null,
    },
  });
  return ok({ id: sub.id }, 201);
}
