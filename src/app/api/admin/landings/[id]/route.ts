import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";
import { slugify } from "@/lib/utils";
import { isReservedSlug } from "@/lib/reserved-slugs";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard("landings");
  if (!user) return res;
  const { id } = await params;
  const page = await prisma.landingPage.findUnique({
    where: { id },
    include: { _count: { select: { submissions: true } } },
  });
  if (!page) return fail("Sahifa topilmadi", 404);
  return ok(page);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard("landings");
  if (!user) return res;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return fail("Ma'lumot yo'q", 422);
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body.blocks === "string") data.blocks = body.blocks;
  if (typeof body.isPublished === "boolean") data.isPublished = body.isPublished;

  if (typeof body.slug === "string" && body.slug.trim()) {
    const s = slugify(body.slug);
    if (!s) return fail("Slug noto'g'ri", 422);
    if (isReservedSlug(s)) return fail("Bu slug band (tizim sahifasi)", 422);
    const clash = await prisma.landingPage.findFirst({ where: { slug: s, NOT: { id } } });
    if (clash) return fail("Bu slug band", 422);
    data.slug = s;
  }

  const page = await prisma.landingPage.update({ where: { id }, data }).catch(() => null);
  if (!page) return fail("Sahifa topilmadi", 404);
  return ok(page);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard("landings");
  if (!user) return res;
  const { id } = await params;
  await prisma.landingPage.delete({ where: { id } }).catch(() => {});
  return ok({ deleted: true });
}
