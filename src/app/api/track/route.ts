import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, ok, readJson } from "@/lib/api";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";
import { parseUserAgent } from "@/lib/device";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  path: z.string().min(1).max(300),
  visitorId: z.string().max(128).optional().nullable(),
  referrer: z.string().max(300).optional().nullable(),
});

// Ommaviy — sayt tashrifini yozadi (admin analitikasi uchun).
// Ichki (dashboard/admin) sahifalar mijoz tomonda filtrlanadi va bu yerga kelmaydi.
export const POST = route(async (req) => {
  const limited = limitOrReject(req as NextRequest, "track", {
    limit: 60,
    windowMs: WINDOW.minute,
  });
  if (limited) return limited;

  const data = await readJson(req, schema);

  // Xavfsizlik: ichki yo'llarni hech qachon yozmaymiz (mijoz noto'g'ri yuborса ham)
  const p = data.path;
  if (/^\/(dashboard|admins|api|staff)(\/|$)/.test(p)) {
    return ok({ skipped: true });
  }

  const d = parseUserAgent((req as NextRequest).headers.get("user-agent"));

  await prisma.siteVisit.create({
    data: {
      path: p.slice(0, 300),
      visitorId: data.visitorId || null,
      referrer: data.referrer ? data.referrer.slice(0, 300) : null,
      device: d.type,
    },
  });

  return ok({ tracked: true });
});
