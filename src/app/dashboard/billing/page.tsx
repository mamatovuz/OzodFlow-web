import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { getEffectivePlan } from "@/lib/plans";
import { Billing } from "@/components/dashboard/billing";

export const dynamic = "force-dynamic";

// To'lov sahifasi — ogohlantirishdagi "To'lash" shu yerga olib keladi
// (sozlamalarga emas, to'g'ridan-to'g'ri to'lov qismiga).
export default async function BillingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) redirect("/login");
  const access = getEffectivePlan(restaurant);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">To'lov</h1>
        <p className="mt-1 text-sm text-muted">Obunani to'lang va tarifni tanlang</p>
      </div>

      <Billing
        currentPlan={access.plan}
        daysLeft={access.daysLeft}
        expired={access.expired}
      />
    </div>
  );
}
