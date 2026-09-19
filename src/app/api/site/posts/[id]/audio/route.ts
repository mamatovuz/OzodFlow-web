import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin } from "@/lib/site";
import { generatePostAudio, clearPostAudio } from "@/lib/site-audio";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Qo'lda ovoz yaratish/yangilash (masalan kalit keyin qo'shilganda).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const { id } = await params;
  const post = await prisma.sitePost.findUnique({
    where: { id },
    select: { id: true, slug: true, contentHtml: true, audioUrl: true, audioHash: true },
  });
  if (!post) return fail("Post topilmadi", 404);

  // Qayta yaratish uchun hash'ni tozalaymiz
  const url = await generatePostAudio({ ...post, audioHash: null });
  if (!url) return fail("Ovoz yaratilmadi — AI kalit (Gemini/OpenAI) qo'yganingizni tekshiring", 400);
  return ok({ audioUrl: url });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const { id } = await params;
  const post = await prisma.sitePost.findUnique({ where: { id }, select: { id: true, audioUrl: true } });
  if (post) await clearPostAudio(post).catch(() => {});
  return ok({ cleared: true });
}
