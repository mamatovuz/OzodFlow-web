import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { buildAuthUrl, googleConfigured, GOOGLE_STATE_COOKIE } from "@/lib/google";

// Google bilan kirishni boshlaydi: CSRF uchun "state" yaratib, foydalanuvchini
// Google rozilik sahifasiga yo'naltiradi.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_off", req.url));
  }

  const state = crypto.randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10 daqiqa
  });

  return NextResponse.redirect(buildAuthUrl(req, state));
}
