import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { MobileAppManager } from "@/components/dashboard/mobile-app-manager";

export const dynamic = "force-dynamic";

export default async function MobileAppPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mobil ilova</h1>
        <p className="mt-1 text-sm text-muted">
          Mijozlaringiz uchun Android ilova yarating — menyu ilova ichida ochiladi, browsersiz.
        </p>
      </div>

      <MobileAppManager />
    </div>
  );
}
