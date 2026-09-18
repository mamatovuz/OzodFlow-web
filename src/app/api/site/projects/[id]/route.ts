import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin } from "@/lib/site";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  url: z.string().max(300).optional(),
  image: z.string().optional().nullable(),
  tags: z.array(z.string()).max(8).optional(),
  sort: z.number().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Ma'lumot noto'g'ri", 422);
  const d = parsed.data;
  const p = await prisma.siteProject
    .update({
      where: { id },
      data: {
        ...(d.title !== undefined ? { title: d.title.trim() } : {}),
        ...(d.description !== undefined ? { description: d.description.trim() } : {}),
        ...(d.url !== undefined ? { url: d.url.trim() } : {}),
        ...(d.image !== undefined ? { image: d.image?.trim() || null } : {}),
        ...(d.tags !== undefined ? { tags: JSON.stringify(d.tags) } : {}),
        ...(d.sort !== undefined ? { sort: d.sort } : {}),
      },
    })
    .catch(() => null);
  if (!p) return fail("Topilmadi", 404);
  return ok(p);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const { id } = await params;
  await prisma.siteProject.delete({ where: { id } }).catch(() => null);
  return ok({ success: true });
}
