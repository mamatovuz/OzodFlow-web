import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().email("To'g'ri email kiriting"),
  website: z.string().optional(), // honeypot
});

export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "site-subscribe", { limit: 5, windowMs: WINDOW.fiveMin });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Email noto'g'ri", 422);
  if (parsed.data.website) return ok({ subscribed: true });

  const email = parsed.data.email.toLowerCase();
  await prisma.siteSubscriber.upsert({ where: { email }, update: {}, create: { email } }).catch(() => null);
  return ok({ subscribed: true }, 201);
}
