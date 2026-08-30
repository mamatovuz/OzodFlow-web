import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";
import { slugify } from "@/lib/utils";
import { isReservedSlug } from "@/lib/reserved-slugs";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().min(1, "Nom kiritilishi shart"),
  slug: z.string().optional(),
  blocks: z.string().optional(), // JSON string
  isPublished: z.boolean().optional(),
});

export async function GET() {
  const { user, res } = await adminGuard("landings");
  if (!user) return res;
  const pages = await prisma.landingPage.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { submissions: true } },
    },
  });
  // to'ldirilmagan (yangi) arizalar sonini ham qo'shamiz
  const withStats = await Promise.all(
    pages.map(async (p) => ({
      ...p,
      submissionCount: p._count.submissions,
      newCount: await prisma.landingSubmission.count({
        where: { pageId: p.id, contacted: false },
      }),
    }))
  );
  return ok(withStats);
}

export async function POST(req: NextRequest) {
  const { user, res } = await adminGuard("landings");
  if (!user) return res;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Ma'lumotlar noto'g'ri", 422);
  const d = parsed.data;

  let slug = slugify(d.slug?.trim() || d.title);
  if (!slug) return fail("Slug hosil bo'lmadi", 422);
  if (isReservedSlug(slug)) return fail("Bu slug band (tizim sahifasi)", 422);
  const exists = await prisma.landingPage.findUnique({ where: { slug } });
  if (exists) return fail("Bu slug allaqachon ishlatilgan", 422);

  const page = await prisma.landingPage.create({
    data: {
      title: d.title.trim(),
      slug,
      blocks: d.blocks || "[]",
      isPublished: d.isPublished ?? false,
    },
  });
  return ok(page, 201);
}
