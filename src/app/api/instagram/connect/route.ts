import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { getIgOwner } from "@/lib/instagram/access";
import { buildAuthUrl } from "@/lib/instagram/oauth";
import { isIgConfigured } from "@/lib/instagram/config";

export const dynamic = "force-dynamic";

// ─── Instagram ulash: OAuth sahifasiga yo'naltiradi ───
export async function GET() {
  const acc = await getIgOwner();
  if (acc.error === "UNAUTHORIZED") return fail("Avtorizatsiya talab qilinadi", 401);
  if (acc.error === "FORBIDDEN") return fail("Ruxsat yo'q", 403);
  if (!isIgConfigured()) {
    return fail("Instagram App sozlanmagan (IG_APP_ID / IG_APP_SECRET kerak)", 503);
  }

  const url = await buildAuthUrl(acc.restaurant.id);
  return NextResponse.redirect(url);
}
