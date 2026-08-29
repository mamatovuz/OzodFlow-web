import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { superAdminGuard, ok, fail } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { sanitizePerms, parseAdminPerms } from "@/lib/admin-perms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Faqat qo'shimcha adminni (isSuperAdmin=false) topadi — bosh adminni tahrirlab bo'lmaydi.
async function findSubAdmin(id: string) {
  return prisma.user.findFirst({ where: { id, role: "ADMIN", isSuperAdmin: false } });
}

// ─── Qo'shimcha adminni tahrirlash (ruxsat / ism / parol) ───
// Body: { name?, perms?: string[], password? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await superAdminGuard();
  if (!user) return res;
  const { id } = await params;

  const target = await findSubAdmin(id);
  if (!target) return fail("Admin topilmadi", 404);

  const body = await req.json().catch(() => null);
  const data: { name?: string; adminPerms?: string; password?: string } = {};

  if (typeof body?.name === "string") {
    const name = body.name.trim();
    if (name.length < 2) return fail("Ism juda qisqa", 422);
    data.name = name;
  }
  if (body?.perms !== undefined) {
    const perms = sanitizePerms(body.perms);
    if (perms.length === 0) return fail("Kamida bitta ruxsat yoqing", 422);
    data.adminPerms = JSON.stringify(perms);
  }
  if (body?.password) {
    if (String(body.password).length < 6) return fail("Parol kamida 6 belgi", 422);
    data.password = await hashPassword(String(body.password));
    // Parol o'zgarsa — barcha eski seanslarini chiqarib yuboramiz.
    await prisma.session.deleteMany({ where: { userId: id } }).catch(() => {});
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, adminPerms: true, createdAt: true },
  });

  return ok({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    perms: parseAdminPerms(updated.adminPerms),
    createdAt: updated.createdAt,
  });
}

// ─── Qo'shimcha adminni o'chirish (seanslari cascade bilan o'chadi) ───
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await superAdminGuard();
  if (!user) return res;
  const { id } = await params;

  const target = await findSubAdmin(id);
  if (!target) return fail("Admin topilmadi", 404);

  await prisma.user.delete({ where: { id } });
  return ok({ deleted: true });
}
