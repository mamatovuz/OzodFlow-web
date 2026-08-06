import { prisma } from "@/lib/prisma";
import { fail, ok, route, ApiError } from "@/lib/api";
import { getIgOwner } from "@/lib/instagram/access";
import { decryptTokens } from "@/lib/instagram/token";
import { getMedia } from "@/lib/instagram/graph";

export const dynamic = "force-dynamic";

// ─── Instagram postlari (per-post qoida uchun tanlash ro'yxati) ───
export const GET = route(async () => {
  const acc = await getIgOwner();
  if (acc.error === "UNAUTHORIZED") return fail("Avtorizatsiya talab qilinadi", 401);
  if (acc.error === "FORBIDDEN") return fail("Ruxsat yo'q", 403);

  const account = await prisma.instagramAccount.findUnique({
    where: { restaurantId: acc.restaurant.id },
  });
  if (!account) throw new ApiError("Instagram akkaunti ulanmagan", 404);

  const { token } = decryptTokens(account.tokens);
  const media = await getMedia(token, 30);

  return ok({
    posts: media.map((m) => ({
      id: m.id,
      caption: m.caption ? m.caption.slice(0, 120) : "",
      mediaType: m.media_type,
      thumbnail: m.thumbnail_url || m.media_url,
      permalink: m.permalink,
      comments: m.comments_count ?? 0,
      timestamp: m.timestamp,
    })),
  });
});
