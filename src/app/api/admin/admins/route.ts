import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { superAdminGuard, ok, fail } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { sanitizePerms, parseAdminPerms } from "@/lib/admin-perms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── Qo'shimcha (sub) adminlar ro'yxati ───
// Faqat bosh admin ko'radi/boshqaradi.
export async function GET() {
  const { user, res } = await superAdminGuard();
  if (!user) return res;

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isSuperAdmin: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      adminPerms: true,
      createdAt: true,
      _count: { select: { sessions: true } },
    },
  });

  return ok(
    admins.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      perms: parseAdminPerms(a.adminPerms),
      sessionCount: a._count.sessions,
      createdAt: a.createdAt,
    }))
  );
}

// ─── Yangi qo'shimcha admin yaratish ───
// Body: { name, email, password, perms: string[] }
export async function POST(req: NextRequest) {
  const { user, res } = await superAdminGuard();
  if (!user) return res;

  const body = await req.json().catch(() => null);
  const name = (body?.name || "").trim();
  const email = (body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const perms = sanitizePerms(body?.perms);

  if (name.length < 2) return fail("Ismni kiriting", 422);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Email noto'g'ri", 422);
  if (password.length < 6) return fail("Parol kamida 6 belgi bo'lsin", 422);
  if (perms.length === 0) return fail("Kamida bitta ruxsat yoqing", 422);

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return fail("Bu email allaqachon band", 409);

  const created = await prisma.user.create({
    data: {
      name,
      email,
      password: await hashPassword(password),
      role: "ADMIN",
      isSuperAdmin: false,
      adminPerms: JSON.stringify(perms),
    },
    select: { id: true, name: true, email: true, adminPerms: true, createdAt: true },
  });

  return ok(
    {
      id: created.id,
      name: created.name,
      email: created.email,
      perms: parseAdminPerms(created.adminPerms),
      sessionCount: 0,
      createdAt: created.createdAt,
    },
    201
  );
}
