import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { getOrCreateTaplink } from "@/lib/taplink-db";
import { menuUrl } from "@/lib/urls";
import { TaplinkEditor } from "@/components/dashboard/taplink-editor";

export const dynamic = "force-dynamic";

export default async function TaplinkPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) redirect("/dashboard");

  const taplink = await getOrCreateTaplink(restaurant);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Taplink</h1>
        <p className="mt-1 text-sm text-muted">
          Restoraningiz uchun bitta havola — logo, tugmalar, video, menyu va QR. Vizitka ham shu yerda.
        </p>
      </div>
      <TaplinkEditor
        initial={{
          handle: taplink.handle,
          enabled: taplink.enabled,
          displayName: taplink.displayName,
          firstName: taplink.firstName,
          lastName: taplink.lastName,
          bio: taplink.bio,
          logo: taplink.logo,
          videoUrl: taplink.videoUrl,
          links: taplink.links,
          showMenuButton: taplink.showMenuButton,
          design: taplink.design,
          cardConfig: taplink.cardConfig,
        }}
        restaurantName={restaurant.name}
        restaurantLogo={restaurant.logo}
        menuUrl={menuUrl(restaurant.slug, restaurant.customDomain)}
      />
    </div>
  );
}
