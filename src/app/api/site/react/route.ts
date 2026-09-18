import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";
import { REACTIONS, parseReactions } from "@/lib/site";

export const dynamic = "force-dynamic";

const schema = z.object({
  slug: z.string().min(1),
  emoji: z.enum(REACTIONS),
  prev: z.enum(REACTIONS).nullable().optional(), // bu brauzer avval bosgan emoji
});

// Ommaviy (login shart emas). Bitta brauzer bitta reaksiya beradi — oldingi
// tanlov `prev` orqali yuboriladi, shunga qarab sanoq to'g'rilanadi (toggle/almashish).
export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "site-react", { limit: 40, windowMs: WINDOW.minute });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumot noto'g'ri", 422);
  const { slug, emoji, prev } = parsed.data;

  const post = await prisma.sitePost.findUnique({ where: { slug } });
  if (!post || post.status === "DRAFT") return fail("Maqola topilmadi", 404);

  const counts = parseReactions(post.reactions);
  let vote: (typeof REACTIONS)[number] | null = emoji;

  if (prev === emoji) {
    // Xuddi shu emoji — bekor qilamiz
    counts[emoji] = Math.max(0, counts[emoji] - 1);
    vote = null;
  } else {
    if (prev) counts[prev] = Math.max(0, counts[prev] - 1); // oldingisini olib tashlaymiz
    counts[emoji] += 1;
  }

  await prisma.sitePost.update({ where: { id: post.id }, data: { reactions: JSON.stringify(counts) } });
  return ok({ reactions: counts, vote });
}
