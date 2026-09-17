import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin, getSiteSetting } from "@/lib/site";

export const dynamic = "force-dynamic";

const schema = z.object({
  heroTitle: z.string().max(60).optional(),
  heroRole: z.string().max(80).optional(),
  heroTagline: z.string().max(200).optional(),
  heroImage: z.string().optional(),
  profileImage: z.string().optional(),
  aboutHtml: z.string().optional(),
  youtube: z.string().optional(),
  github: z.string().optional(),
  linkedin: z.string().optional(),
  telegram: z.string().optional(),
  channel: z.string().optional(),
});

export async function GET() {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const s = await getSiteSetting();
  return ok(s);
}

export async function PUT(req: NextRequest) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Ma'lumot noto'g'ri", 422);

  await getSiteSetting(); // qator borligiga ishonch
  const s = await prisma.siteSetting.update({
    where: { id: "main" },
    data: parsed.data,
  });
  return ok(s);
}
