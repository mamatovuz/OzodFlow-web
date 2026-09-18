import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";
import { sendWelcomeEmail } from "@/lib/site";

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
  const existing = await prisma.siteSubscriber.findUnique({ where: { email } }).catch(() => null);
  await prisma.siteSubscriber.upsert({ where: { email }, update: {}, create: { email } }).catch(() => null);
  // Yangi obunachiga xush kelibsiz xati (fon rejimida — javobni kutmaymiz)
  if (!existing) sendWelcomeEmail(email).catch(() => {});
  return ok({ subscribed: true }, 201);
}
