import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getMembership } from "@/lib/api";
import { staffRoleLabel } from "@/lib/staff";
import { StaffHeader } from "@/components/staff/staff-header";
import { StaffOrders } from "@/components/staff/staff-orders";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admins");

  const membership = await getMembership(user.id);
  if (!membership) redirect("/dashboard");
  if (membership.role === "MANAGER") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-surface">
      <StaffHeader
        name={user.name}
        roleLabel={staffRoleLabel(membership.role)}
        restaurantName={membership.restaurant.name}
      />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold text-foreground">Buyurtmalar</h1>
        <StaffOrders role={membership.role} currency={membership.restaurant.currency} />
      </main>
    </div>
  );
}
