import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { ReviewsManager } from "@/components/dashboard/reviews-manager";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Izohlar (otziv)</h1>
        <p className="mt-1 text-sm text-muted">
          QR orqali mijoz baho beradi — izoh Telegram kanalingizga tushadi. Yuqori baho bo'lsa mijoz Google/Yandex xaritasiga yo'naltiriladi.
        </p>
      </div>
      <ReviewsManager
        slug={restaurant.slug}
        settings={{
          reviewEnabled: restaurant.reviewEnabled,
          reviewGoogleUrl: restaurant.reviewGoogleUrl,
          reviewYandexUrl: restaurant.reviewYandexUrl,
          reviewThreshold: restaurant.reviewThreshold,
          hasReviewChannel: !!(restaurant.reviewBotToken && restaurant.reviewChatId),
        }}
        hasOrderChannel={!!(restaurant.orderBotToken && restaurant.orderChatId)}
      />
    </div>
  );
}
