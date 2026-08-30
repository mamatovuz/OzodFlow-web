import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Bosh sahifada ko'rsatiladigan (yulduzchali) bloglar maksimal soni
export const MAX_FEATURED = 5;

const schema = z.object({
  title: z.string().min(1, "Sarlavha kiritilishi shart"),
  slug: z.string().optional(),
  description: z.string().min(1, "Qisqa tavsif kiritilishi shart"),
  body: z.string().optional(),
  coverImage: z.string().optional(),
  images: z.array(z.string()).max(10, "Ko'pi bilan 10 ta rasm").optional(),
  version: z.string().optional(),
  publishDate: z.string().optional(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export async function GET() {
  const { user, res } = await adminGuard("blog");
  if (!user) return res;
  const posts = await prisma.blogPost.findMany({
    orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
  });
  return ok(posts);
}

export async function POST(req: NextRequest) {
  const { user, res } = await adminGuard("blog");
  if (!user) return res;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Ma'lumotlar noto'g'ri", 422);
  const d = parsed.data;

  // slug — berilmasa sarlavhadan hosil qilinadi; band bo'lsa raqam qo'shiladi
  let slug = slugify(d.slug?.trim() || d.title);
  if (!slug) return fail("Slug hosil bo'lmadi, sarlavhani o'zgartiring", 422);
  const exists = await prisma.blogPost.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  // Yulduzcha (featured) limitini nazorat qilamiz
  let isFeatured = !!d.isFeatured;
  if (isFeatured) {
    const featuredCount = await prisma.blogPost.count({ where: { isFeatured: true } });
    if (featuredCount >= MAX_FEATURED) isFeatured = false;
  }

  const post = await prisma.blogPost.create({
    data: {
      title: d.title.trim(),
      slug,
      description: d.description.trim(),
      body: d.body?.trim() || null,
      coverImage: d.coverImage?.trim() || (d.images && d.images[0]) || null,
      images: JSON.stringify((d.images || []).slice(0, 10)),
      version: d.version?.trim() || null,
      publishDate: d.publishDate ? new Date(d.publishDate) : new Date(),
      isPublished: d.isPublished ?? false,
      isFeatured,
    },
  });
  return ok(post, 201);
}
