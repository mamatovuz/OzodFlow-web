import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { getEffectivePlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { StaffManager } from "@/components/dashboard/staff-manager";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) redirect("/login");

  // Faqat egasi xodim boshqaradi
  if (restaurant.ownerId !== user.id) redirect("/dashboard");

  const access = getEffectivePlan(restaurant);
  const staff = access.canStaff
    ? await prisma.membership.findMany({
        where: { restaurantId: restaurant.id },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Xodimlar</h1>
        <p className="mt-1 text-sm text-muted">
          Oshxona va ofitsant uchun alohida akkaunt yarating — ular o'z panellariga kiradi
        </p>
      </div>

      <StaffManager
        initial={staff.map((s) => ({ id: s.id, role: s.role, user: { name: s.user.name, email: s.user.email } }))}
        canStaff={access.canStaff}
      />
    </div>
  );
}
