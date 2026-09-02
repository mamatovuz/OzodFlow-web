import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getMembership } from "@/lib/api";
import { staffRoleLabel } from "@/lib/staff";
import { StaffHeader } from "@/components/staff/staff-header";
import { StaffOrders } from "@/components/staff/staff-orders";
import { KitchenDisplay } from "@/components/staff/kitchen-display";
import { WaiterPanel } from "@/components/staff/waiter-panel";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admins");

  const membership = await getMembership(user.id);
  if (!membership) redirect("/dashboard");
  if (membership.role === "MANAGER") redirect("/dashboard");

  const r = membership.restaurant;

  // Oshxona — to'liq ekran Kanban (KDS)
  if (membership.role === "KITCHEN") {
    return <KitchenDisplay restaurantName={r.name} staffName={user.name} />;
  }

  // Ofitsant — chaqiruvlar + yetkazish + kunlik statistika
  if (membership.role === "WAITER") {
    return <WaiterPanel restaurantName={r.name} staffName={user.name} currency={r.currency} />;
  }

  // Operator / Kassir — umumiy buyurtma ro'yxati
  return (
    <div className="min-h-screen bg-surface">
      <StaffHeader
        name={user.name}
        roleLabel={staffRoleLabel(membership.role)}
        restaurantName={r.name}
      />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold text-foreground">Buyurtmalar</h1>
        <StaffOrders role={membership.role} currency={r.currency} />
      </main>
    </div>
  );
}
