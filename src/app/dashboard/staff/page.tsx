import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { getEffectivePlan } from "@/lib/plans";
import { StaffManager } from "@/components/dashboard/staff-manager";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const user = (await getSessionUser())!;
  const restaurant = (await getUserRestaurant(user.id))!;
  const access = getEffectivePlan(restaurant);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Xodimlar</h1>
        <p className="mt-1 text-sm text-muted">
          Oshxona, ofitsiant, operator uchun hisoblar yarating — har biri o'z
          paneliga tushadi
        </p>
      </div>
      <StaffManager isPaid={access.isPaid} />
    </div>
  );
}
