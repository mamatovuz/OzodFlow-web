import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyState } from "@/lib/instagram/oauth";
import { exchangeCode, getLongLivedToken, getProfile } from "@/lib/instagram/graph";
import { encryptTokens } from "@/lib/instagram/token";
import { getIgConfig } from "@/lib/instagram/config";

export const dynamic = "force-dynamic";

function back(status: "ok" | "error", message?: string) {
  const base = getIgConfig().appUrl;
  const url = new URL(`${base}/dashboard/instagram`);
  url.searchParams.set("connect", status);
  if (message) url.searchParams.set("msg", message);
  return NextResponse.redirect(url.toString());
}

// ─── OAuth callback: kodni tokenga almashtiradi va akkauntni saqlaydi ───
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const error = sp.get("error");
  const code = sp.get("code");
  const state = sp.get("state");

  if (error) return back("error", sp.get("error_description") || "Ulash bekor qilindi");
  if (!code || !state) return back("error", "Kod yoki state yo'q");

  const parsed = await verifyState(state);
  if (!parsed) return back("error", "State yaroqsiz yoki muddati o'tgan");

  // Restoran hali ham egaga tegishli ekanini tekshiramiz
  const restaurant = await prisma.restaurant.findUnique({ where: { id: parsed.restaurantId } });
  if (!restaurant) return back("error", "Restoran topilmadi");

  try {
    // 1) kod → short-lived → long-lived token
    const { token: shortToken } = await exchangeCode(code);
    const { token, expiresIn } = await getLongLivedToken(shortToken);

    // 2) profil
    const profile = await getProfile(token);
    const igUserId = String(profile.user_id);

    // 3) boshqa restoran shu akkauntga ulanmaganini tekshiramiz
    const clash = await prisma.instagramAccount.findUnique({ where: { igUserId } });
    if (clash && clash.restaurantId !== restaurant.id) {
      return back("error", "Bu Instagram akkaunti boshqa restoranga ulangan");
    }

    // 4) upsert
    const data = {
      igUserId,
      username: profile.username,
      name: profile.name ?? null,
      profilePicture: profile.profile_picture_url ?? null,
      followers: profile.followers_count ?? 0,
      following: profile.follows_count ?? 0,
      mediaCount: profile.media_count ?? 0,
      tokens: encryptTokens({ token }),
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      status: "CONNECTED",
      lastError: null,
      lastSyncAt: new Date(),
    };
    await prisma.instagramAccount.upsert({
      where: { restaurantId: restaurant.id },
      create: { restaurantId: restaurant.id, ...data },
      update: data,
    });

    return back("ok");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Ulashda xato";
    return back("error", msg);
  }
}
