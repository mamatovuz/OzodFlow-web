/**
 * Fon xizmatlari: long-lived token'larni muddati tugashidan oldin yangilash
 * va profil ma'lumotlarini (followers) yangilab turish. `/api/instagram/cron`
 * chaqiradi (start.mjs har necha soatda).
 */
import { prisma } from "@/lib/prisma";
import { decryptTokens, encryptTokens } from "./token";
import { refreshLongLivedToken, getProfile } from "./graph";

const REFRESH_BEFORE_MS = 7 * 24 * 60 * 60 * 1000; // muddat tugashiga 7 kun qolganda

/** Muddati yaqinlashgan token'larni yangilaydi va profilni sinxronlaydi */
export async function runIgMaintenance(): Promise<{ refreshed: number; synced: number }> {
  const accounts = await prisma.instagramAccount.findMany({
    where: { status: { not: "DISCONNECTED" } },
  });

  let refreshed = 0;
  let synced = 0;
  const now = Date.now();

  for (const acc of accounts) {
    try {
      const { token } = decryptTokens(acc.tokens);
      let activeToken = token;

      // 1) Token yangilash (muddat yaqin bo'lsa)
      const exp = acc.tokenExpiresAt ? new Date(acc.tokenExpiresAt).getTime() : 0;
      if (exp && exp - now < REFRESH_BEFORE_MS) {
        const res = await refreshLongLivedToken(token);
        activeToken = res.token;
        await prisma.instagramAccount.update({
          where: { id: acc.id },
          data: {
            tokens: encryptTokens({ token: res.token }),
            tokenExpiresAt: new Date(now + res.expiresIn * 1000),
            status: "CONNECTED",
            lastError: null,
          },
        });
        refreshed++;
      }

      // 2) Profil sinxroni (followers va h.k.)
      const p = await getProfile(activeToken);
      await prisma.instagramAccount.update({
        where: { id: acc.id },
        data: {
          username: p.username || acc.username,
          name: p.name ?? acc.name,
          profilePicture: p.profile_picture_url ?? acc.profilePicture,
          followers: p.followers_count ?? acc.followers,
          following: p.follows_count ?? acc.following,
          mediaCount: p.media_count ?? acc.mediaCount,
          lastSyncAt: new Date(),
        },
      });
      synced++;
    } catch (err) {
      await prisma.instagramAccount
        .update({
          where: { id: acc.id },
          data: { status: "ERROR", lastError: err instanceof Error ? err.message : "Sync xatosi" },
        })
        .catch(() => {});
    }
  }

  return { refreshed, synced };
}
