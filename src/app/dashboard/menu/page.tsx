import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { MenuManager } from "@/components/dashboard/menu-manager";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const user = (await getSessionUser())!;
  const restaurant = (await getUserRestaurant(user.id))!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Menyu boshqaruvi</h1>
        <p className="mt-1 text-sm text-muted">
          Kategoriya va mahsulotlarni qo'shing, tahrirlang va boshqaring
        </p>
      </div>
      <MenuManager currency={restaurant.currency} />
    </div>
  );
}
