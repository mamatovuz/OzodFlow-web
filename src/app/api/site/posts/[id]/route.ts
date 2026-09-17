import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { slugify } from "@/lib/utils";
import { isSiteAdmin, stripHtml } from "@/lib/site";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
  contentHtml: z.string().optional(),
  excerpt: z.string().optional(),
  coverImage: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLIC", "SITE"]).optional(),
  publishDate: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const { id } = await params;

  const current = await prisma.sitePost.findUnique({ where: { id } });
  if (!current) return fail("Post topilmadi", 404);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Ma'lumot noto'g'ri", 422);
  const d = parsed.data;

  const nextTitle = d.title?.trim() ?? current.title;
  const nextHtml = d.contentHtml ?? current.contentHtml;
  const clean = stripHtml(nextHtml);

  // slug — berilsa yoki sarlavha o'zgarsa qayta hisoblanadi
  let slug = current.slug;
  if (d.slug !== undefined || d.title !== undefined) {
    const base = slugify(d.slug?.trim() || nextTitle);
    if (base && base !== current.slug) {
      const clash = await prisma.sitePost.findFirst({
        where: { slug: base, id: { not: id } },
      });
      slug = clash ? `${base}-${Date.now().toString(36).slice(-4)}` : base;
    }
  }

  const post = await prisma.sitePost.update({
    where: { id },
    data: {
      title: nextTitle,
      slug,
      contentHtml: nextHtml,
      excerpt: d.excerpt?.trim() || clean.slice(0, 160),
      coverImage: d.coverImage === undefined ? current.coverImage : d.coverImage?.trim() || null,
      status: d.status ?? current.status,
      publishDate: d.publishDate ? new Date(d.publishDate) : current.publishDate,
    },
  });
  return ok(post);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const { id } = await params;
  await prisma.sitePost.delete({ where: { id } }).catch(() => null);
  return ok({ success: true });
}
