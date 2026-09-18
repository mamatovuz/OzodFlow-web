import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { slugify } from "@/lib/utils";
import { isSiteAdmin, stripHtml, maybeNotifyTelegram, maybeEmailSubscribers } from "@/lib/site";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().min(1, "Sarlavha kiritilishi shart"),
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
});

export async function GET() {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const posts = await prisma.sitePost.findMany({
    orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
  });
  return ok(posts);
}

export async function POST(req: NextRequest) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Ma'lumot noto'g'ri", 422);
  const d = parsed.data;

  const clean = stripHtml(d.contentHtml || "");
  if (!clean) return fail("Blog matni bo'sh bo'lmasligi kerak", 422);

  let slug = slugify(d.slug?.trim() || d.title);
  if (!slug) return fail("Slug hosil bo'lmadi, sarlavhani o'zgartiring", 422);
  const exists = await prisma.sitePost.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const post = await prisma.sitePost.create({
    data: {
      title: d.title.trim(),
      slug,
      contentHtml: d.contentHtml || "",
      excerpt: (d.excerpt?.trim() || clean.slice(0, 160)) ?? "",
      coverImage: d.coverImage?.trim() || null,
      status: d.status || "DRAFT",
      publishDate: d.publishDate ? new Date(d.publishDate) : new Date(),
      metaTitle: d.metaTitle?.trim() || null,
      metaDescription: d.metaDescription?.trim() || null,
      ogImage: d.ogImage?.trim() || null,
      tags: JSON.stringify((d.tags || []).map((t) => t.trim()).filter(Boolean).slice(0, 12)),
      password: d.password?.trim() || null,
      series: d.series?.trim() || null,
      seriesOrder: d.seriesOrder ?? 0,
    },
  });
  // Telegram + email (agar sozlangan bo'lsa) — fon rejimida
  maybeNotifyTelegram(post).catch(() => {});
  maybeEmailSubscribers(post).catch(() => {});
  return ok(post, 201);
}
