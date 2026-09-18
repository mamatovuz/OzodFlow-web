import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin } from "@/lib/site";

export const dynamic = "force-dynamic";

// PATCH — tasdiqlash/bekor qilish
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const approved = !!body?.approved;
  const c = await prisma.siteComment.update({ where: { id }, data: { approved } }).catch(() => null);
  if (!c) return fail("Izoh topilmadi", 404);
  return ok(c);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const { id } = await params;
  await prisma.siteComment.delete({ where: { id } }).catch(() => null);
  return ok({ success: true });
}
