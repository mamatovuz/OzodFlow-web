import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin, notifyCommentReply, notifyAdminNewComment } from "@/lib/site";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  postId: z.string().min(1),
  parentId: z.string().optional().nullable(), // javob bo'lsa — ota izoh id
  name: z.string().trim().min(1, "Ism kiriting").max(50),
  email: z.string().trim().email("To'g'ri email kiriting").optional().or(z.literal("")),
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

  // Admin (muallif) javobi — darhol tasdiqlanadi va ajratib ko'rsatiladi.
  const admin = await isSiteAdmin();

  // Oddiy foydalanuvchi izoh yozsa — email majburiy (muallif javobi shu emailga boradi)
  if (!admin && !d.email) return fail("Email kiriting", 422);

  // Javob bo'lsa — ota izohni bir daraja chuqurlikka tekislaymiz (javobga javob
  // ham asosiy izoh tagida turadi). Ota izohning egasini ham topib olamiz.
  let parentId: string | null = null;
  let parentComment: { email: string | null; name: string } | null = null;
  if (d.parentId) {
    const parent = await prisma.siteComment.findUnique({ where: { id: d.parentId } });
    if (parent && parent.postId === d.postId) {
      parentId = parent.parentId || parent.id;
      parentComment = { email: parent.email, name: parent.name };
    }
  }

  const created = await prisma.siteComment.create({
    data: {
      postId: d.postId,
      parentId,
      name: admin ? d.name || "Muallif" : d.name,
      email: d.email || null,
      body: d.body,
      approved: admin,
      isAuthor: admin,
    },
  });

  // Muallif javob bersa — izoh egasining emailiga xabar (fon rejimida)
  if (admin && parentComment?.email) {
    notifyCommentReply(parentComment, { title: post.title, slug: post.slug }, d.body).catch(() => {});
  }
  // Oddiy izoh — adminga moderatsiya xabari (fon rejimida)
  if (!admin) {
    notifyAdminNewComment({ name: d.name, body: d.body }, { title: post.title, slug: post.slug }, !!parentId).catch(() => {});
  }

  if (admin) {
    // Tasdiqlangan — mijoz darhol ro'yxatga qo'shsin
    return ok(
      {
        pending: false,
        comment: {
          id: created.id,
          name: created.name,
          body: created.body,
          createdAt: created.createdAt,
          parentId: created.parentId,
          isAuthor: created.isAuthor,
        },
      },
      201
    );
  }
  return ok({ pending: true }, 201);
}
