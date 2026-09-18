import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin } from "@/lib/site";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  postId: z.string().min(1),
  name: z.string().trim().min(1, "Ism kiriting").max(50),
  body: z.string().trim().min(2, "Izoh juda qisqa").max(1000),
  // Bot tuzoq (honeypot) — to'ldirilsa spam deb hisoblanadi.
  website: z.string().optional(),
});

// GET — admin uchun barcha izohlar (moderatsiya)
export async function GET() {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const comments = await prisma.siteComment.findMany({ orderBy: { createdAt: "desc" } });
  // Har izohga post sarlavhasini biriktiramiz
  const postIds = [...new Set(comments.map((c) => c.postId))];
  const posts = await prisma.sitePost.findMany({ where: { id: { in: postIds } }, select: { id: true, title: true, slug: true } });
  const map = new Map(posts.map((p) => [p.id, p]));
  return ok(comments.map((c) => ({ ...c, post: map.get(c.postId) || null })));
}

// POST — ommaviy izoh yuborish (tasdiqlanmagan holatda)
export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "site-comment", { limit: 6, windowMs: WINDOW.fiveMin });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Ma'lumot noto'g'ri", 422);
  const d = parsed.data;
  if (d.website) return ok({ pending: true }); // honeypot — jimgina qabul qilingandek

  const post = await prisma.sitePost.findUnique({ where: { id: d.postId } });
  if (!post || post.status === "DRAFT") return fail("Maqola topilmadi", 404);

  await prisma.siteComment.create({
    data: { postId: d.postId, name: d.name, body: d.body, approved: false },
  });
  return ok({ pending: true }, 201);
}
