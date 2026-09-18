import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { slugify } from "@/lib/utils";
import { isSiteAdmin, stripHtml, maybeNotifyTelegram, maybeEmailSubscribers } from "@/lib/site";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
  contentHtml: z.string().optional(),
  excerpt: z.string().optional(),
  coverImage: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLIC", "SITE", "UNLISTED"]).optional(),
  publishDate: z.string().optional(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  tags: z.array(z.string()).max(12).optional(),
  password: z.string().max(60).optional().nullable(),
  series: z.string().max(60).optional().nullable(),
  seriesOrder: z.number().int().optional(),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).max(20).optional(),
  summary: z.string().max(600).optional().nullable(),
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

  // Reviziya snapshoti — matn/sarlavha/qisqacha o'zgargan bo'lsa oldingi holatni saqlaymiz
  const contentChanged =
    (d.contentHtml !== undefined && d.contentHtml !== current.contentHtml) ||
    (d.title !== undefined && nextTitle !== current.title) ||
    (d.excerpt !== undefined && d.excerpt.trim() !== current.excerpt);
  if (contentChanged && current.contentHtml.trim()) {
    await prisma.siteRevision
      .create({ data: { postId: id, title: current.title, excerpt: current.excerpt, contentHtml: current.contentHtml } })
      .catch(() => {});
    // Faqat oxirgi 20 tasini saqlaymiz
    const old = await prisma.siteRevision.findMany({
      where: { postId: id },
      orderBy: { createdAt: "desc" },
      skip: 20,
      select: { id: true },
    });
    if (old.length) await prisma.siteRevision.deleteMany({ where: { id: { in: old.map((o) => o.id) } } }).catch(() => {});
  }

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
      metaTitle: d.metaTitle === undefined ? current.metaTitle : d.metaTitle?.trim() || null,
      metaDescription:
        d.metaDescription === undefined ? current.metaDescription : d.metaDescription?.trim() || null,
      ogImage: d.ogImage === undefined ? current.ogImage : d.ogImage?.trim() || null,
      tags:
        d.tags === undefined
          ? current.tags
          : JSON.stringify(d.tags.map((t) => t.trim()).filter(Boolean).slice(0, 12)),
      password: d.password === undefined ? current.password : d.password?.trim() || null,
      series: d.series === undefined ? current.series : d.series?.trim() || null,
      seriesOrder: d.seriesOrder === undefined ? current.seriesOrder : d.seriesOrder,
      faq:
        d.faq === undefined
          ? current.faq
          : JSON.stringify(d.faq.filter((f) => f.q.trim() && f.a.trim()).map((f) => ({ q: f.q.trim(), a: f.a.trim() })).slice(0, 20)),
      summary: d.summary === undefined ? current.summary : d.summary?.trim() || null,
    },
  });
  // Endigina e'lon qilingan bo'lsa Telegram + email (fon)
  maybeNotifyTelegram(post).catch(() => {});
  maybeEmailSubscribers(post).catch(() => {});
  return ok(post);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const { id } = await params;
  await prisma.sitePost.delete({ where: { id } }).catch(() => null);
  return ok({ success: true });
}
