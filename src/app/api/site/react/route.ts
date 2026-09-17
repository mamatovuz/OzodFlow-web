import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  slug: z.string().min(1),
  type: z.enum(["like", "dislike"]),
  prev: z.enum(["like", "dislike"]).nullable().optional(),
});

// Ommaviy (login shart emas). Bitta brauzer bir ovoz beradi — oldingi ovoz
// `prev` orqali yuboriladi, shunga qarab hisob to'g'rilanadi.
export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "site-react", { limit: 40, windowMs: WINDOW.minute });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumot noto'g'ri", 422);
  const { slug, type, prev } = parsed.data;

  const post = await prisma.sitePost.findUnique({ where: { slug } });
  if (!post || post.status === "DRAFT") return fail("Maqola topilmadi", 404);

  let likes = post.likes;
  let dislikes = post.dislikes;
  let vote: "like" | "dislike" | null = type;

  const dec = (t: "like" | "dislike") => {
    if (t === "like") likes = Math.max(0, likes - 1);
    else dislikes = Math.max(0, dislikes - 1);
  };
  const inc = (t: "like" | "dislike") => {
    if (t === "like") likes += 1;
    else dislikes += 1;
  };

  if (prev === type) {
    // Xuddi shu tugma — ovozni bekor qilamiz (toggle)
    dec(type);
    vote = null;
  } else {
    if (prev) dec(prev); // oldingi qarama-qarshi ovozni olib tashlaymiz
    inc(type);
  }

  await prisma.sitePost.update({ where: { id: post.id }, data: { likes, dislikes } });
  return ok({ likes, dislikes, vote });
}
