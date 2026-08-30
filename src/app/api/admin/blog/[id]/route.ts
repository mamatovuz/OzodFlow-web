import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";
import { slugify } from "@/lib/utils";
import { MAX_FEATURED } from "../route";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard("blog");
  if (!user) return res;
  const { id } = await params;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) return fail("Blog topilmadi", 404);
  return ok(post);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard("blog");
  if (!user) return res;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return fail("Ma'lumot yo'q", 422);
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body.description === "string") data.description = body.description.trim();
  if (typeof body.body === "string") data.body = body.body.trim() || null;
  if (typeof body.coverImage === "string") data.coverImage = body.coverImage.trim() || null;
  if (Array.isArray(body.images))
    data.images = JSON.stringify(body.images.filter((x: unknown) => typeof x === "string").slice(0, 10));
  if (typeof body.version === "string") data.version = body.version.trim() || null;
  if (typeof body.publishDate === "string" && body.publishDate)
    data.publishDate = new Date(body.publishDate);
  if (typeof body.isPublished === "boolean") data.isPublished = body.isPublished;

  // slug o'zgartirilsa — tozalanadi va bandligi tekshiriladi
  if (typeof body.slug === "string" && body.slug.trim()) {
    const s = slugify(body.slug);
    if (s) {
      const clash = await prisma.blogPost.findFirst({ where: { slug: s, NOT: { id } } });
      if (clash) return fail("Bu slug band", 422);
      data.slug = s;
    }
  }

  // Yulduzcha (featured) — yoqilsa limit tekshiriladi
  if (typeof body.isFeatured === "boolean") {
    if (body.isFeatured) {
      const featuredCount = await prisma.blogPost.count({
        where: { isFeatured: true, NOT: { id } },
      });
      if (featuredCount >= MAX_FEATURED)
        return fail(`Bosh sahifada ko'pi bilan ${MAX_FEATURED} ta blog bo'lishi mumkin`, 422);
    }
    data.isFeatured = body.isFeatured;
  }

  const post = await prisma.blogPost.update({ where: { id }, data }).catch(() => null);
  if (!post) return fail("Blog topilmadi", 404);
  return ok(post);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard("blog");
  if (!user) return res;
  const { id } = await params;
  await prisma.blogPost.delete({ where: { id } }).catch(() => {});
  return ok({ deleted: true });
}
