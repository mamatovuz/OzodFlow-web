import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getMembership } from "@/lib/api";
import { KitchenDisplay } from "@/components/staff/kitchen-display";
import { WaiterPanel } from "@/components/staff/waiter-panel";
import { ImpersonationBanner } from "@/components/impersonation-banner";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admins");

  const membership = await getMembership(user.id);
  if (!membership) redirect("/dashboard");
  if (membership.role === "MANAGER") redirect("/dashboard");

  const r = membership.restaurant;
  const impersonated = user.impersonatedBy ? <ImpersonationBanner name={user.name} /> : null;

  // Oshxona — to'liq ekran Kanban (KDS)
  if (membership.role === "KITCHEN") {
    return (
      <>
        {impersonated}
        <KitchenDisplay restaurantName={r.name} staffName={user.name} />
      </>
    );
  }

  // Ofitsant (va boshqa har qanday operatsion xodim) — POS paneli
  return (
    <>
      {impersonated}
      <WaiterPanel restaurantName={r.name} staffName={user.name} staffId={user.id} currency={r.currency} />
    </>
  );
}
