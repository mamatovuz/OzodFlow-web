import { prisma } from "@/lib/prisma";
import { ok, fail, route, ApiError } from "@/lib/api";
import { getIgOwner } from "@/lib/instagram/access";
import { decryptTokens, encryptTokens } from "@/lib/instagram/token";
import { refreshLongLivedToken, getProfile } from "@/lib/instagram/graph";

// ─── Token'ni qo'lda yangilash + profilni sinxronlash ───
export const POST = route(async () => {
  const acc = await getIgOwner();
  if (acc.error === "UNAUTHORIZED") return fail("Avtorizatsiya talab qilinadi", 401);
  if (acc.error === "FORBIDDEN") return fail("Ruxsat yo'q", 403);

  const account = await prisma.instagramAccount.findUnique({
    where: { restaurantId: acc.restaurant.id },
  });
  if (!account) throw new ApiError("Instagram akkaunti ulanmagan", 404);

  const { token } = decryptTokens(account.tokens);
  try {
    const refreshed = await refreshLongLivedToken(token).catch(() => null);
    const activeToken = refreshed?.token || token;
    const profile = await getProfile(activeToken);

    await prisma.instagramAccount.update({
      where: { id: account.id },
      data: {
        ...(refreshed
          ? {
              tokens: encryptTokens({ token: refreshed.token }),
              tokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
            }
          : {}),
        username: profile.username,
        name: profile.name ?? null,
        profilePicture: profile.profile_picture_url ?? null,
        followers: profile.followers_count ?? 0,
        following: profile.follows_count ?? 0,
        mediaCount: profile.media_count ?? 0,
        status: "CONNECTED",
        lastError: null,
        lastSyncAt: new Date(),
      },
    });
    return ok({ reconnected: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Yangilashda xato";
    await prisma.instagramAccount
      .update({ where: { id: account.id }, data: { status: "ERROR", lastError: msg } })
      .catch(() => {});
    throw new ApiError(msg, 502);
  }
});
