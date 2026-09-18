import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1, "Ism kiriting").max(60),
  contact: z.string().trim().max(120).optional(),
  body: z.string().trim().min(3, "Xabar juda qisqa").max(2000),
  website: z.string().optional(), // honeypot
});

export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "site-contact", { limit: 5, windowMs: WINDOW.fiveMin });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Ma'lumot noto'g'ri", 422);
  const d = parsed.data;
  if (d.website) return ok({ sent: true });

  await prisma.siteMessage.create({
    data: { name: d.name, contact: d.contact || "", body: d.body },
  });
  return ok({ sent: true }, 201);
}
