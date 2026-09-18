import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin } from "@/lib/site";

export const dynamic = "force-dynamic";

// Reviziyalar ro'yxati
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const { id } = await params;
  const revisions = await prisma.siteRevision.findMany({
    where: { postId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return ok({ revisions });
}

// Reviziyani tiklash — joriy holatni ham snapshot qilib, tanlangan versiyani qaytaradi
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const revId = String(body?.revisionId || "");

  const rev = await prisma.siteRevision.findUnique({ where: { id: revId } });
  if (!rev || rev.postId !== id) return fail("Reviziya topilmadi", 404);

  const current = await prisma.sitePost.findUnique({ where: { id } });
  if (!current) return fail("Post topilmadi", 404);

  // Joriy holatni yo'qotmaymiz — snapshot
  await prisma.siteRevision
    .create({ data: { postId: id, title: current.title, excerpt: current.excerpt, contentHtml: current.contentHtml } })
    .catch(() => {});

  const post = await prisma.sitePost.update({
    where: { id },
    data: { title: rev.title, excerpt: rev.excerpt, contentHtml: rev.contentHtml },
  });
  return ok({ post: { title: post.title, excerpt: post.excerpt, contentHtml: post.contentHtml } });
}
