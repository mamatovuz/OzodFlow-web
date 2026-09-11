import { redirect } from "next/navigation";
import { Ban } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { StopList } from "@/components/dashboard/stop-list";

export const dynamic = "force-dynamic";

export default async function StopListPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Ban className="h-6 w-6 text-error" /> Stop-list
        </h1>
        <p className="mt-1 text-sm text-muted">
          Tugagan taomlarni vaqtincha menyudan yashiring — bir bosishda
        </p>
      </div>
      <StopList currency={restaurant.currency} />
    </div>
  );
}
