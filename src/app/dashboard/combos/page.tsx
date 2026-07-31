import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { ComboBuilder } from "@/components/dashboard/combo-builder";

export const dynamic = "force-dynamic";

export default async function CombosPage() {
  const user = (await getSessionUser())!;
  const restaurant = (await getUserRestaurant(user.id))!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Combo takliflar</h1>
        <p className="mt-1 text-sm text-muted">
          Bir nechta taomni to'plamga birlashtiring — menyuda alohida ko'rinadi
        </p>
      </div>
      <ComboBuilder currency={restaurant.currency} />
    </div>
  );
}
