import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { makeUnlockCookie } from "@/lib/site";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({ slug: z.string().min(1), password: z.string().min(1) });

// Qulflangan maqolani parol bilan ochish
export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "site-unlock", { limit: 15, windowMs: WINDOW.fiveMin });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumot noto'g'ri", 422);

  const post = await prisma.sitePost.findUnique({ where: { slug: parsed.data.slug } });
  if (!post || post.status === "DRAFT") return fail("Maqola topilmadi", 404);
  if (!post.password) return ok({ unlocked: true }); // qulflanmagan

  if (post.password !== parsed.data.password) return fail("Parol noto'g'ri", 401);

  await makeUnlockCookie(post.id);
  return ok({ unlocked: true });
}
