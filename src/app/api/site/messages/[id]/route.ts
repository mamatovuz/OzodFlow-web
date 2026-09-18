import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const m = await prisma.siteMessage.update({ where: { id }, data: { read: !!body?.read } }).catch(() => null);
  if (!m) return fail("Topilmadi", 404);
  return ok(m);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const { id } = await params;
  await prisma.siteMessage.delete({ where: { id } }).catch(() => null);
  return ok({ success: true });
}
