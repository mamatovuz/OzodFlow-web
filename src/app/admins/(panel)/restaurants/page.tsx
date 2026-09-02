import { prisma } from "@/lib/prisma";
import { decryptPasswordPlain } from "@/lib/auth";
import { PLANS, type PlanKey, getPaymentStatus } from "@/lib/plans";
import {
  RestaurantsManager,
  type AdminRestaurantRow,
} from "@/components/admin/restaurants-manager";

export const dynamic = "force-dynamic";

export default async function AdminRestaurantsPage() {
  const [restaurants, unreadGroups] = await Promise.all([
    prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true, passwordEnc: true } },
        memberships: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { products: true } },
      },
    }),
    prisma.supportMessage.groupBy({
      by: ["restaurantId"],
      where: { isRead: false, sender: { not: "ADMIN" } },
      _count: { _all: true },
    }),
  ]);

  const unreadMap = new Map(
    unreadGroups.map((g) => [g.restaurantId, g._count._all])
  );

  const rows: AdminRestaurantRow[] = restaurants.map((r) => {
    const pay = getPaymentStatus(r);
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      ownerId: r.owner.id,
      ownerName: r.owner.name,
      ownerContact: r.owner.email || r.owner.phone || "—",
      ownerPassword: decryptPasswordPlain(r.owner.passwordEnc),
      staff: r.memberships.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email || "—",
        role: m.role,
      })),
      plan: r.plan,
      planName: PLANS[r.plan as PlanKey]?.name || r.plan,
      isBlocked: r.isBlocked,
      productCount: r._count.products,
      createdAt: r.createdAt.toISOString(),
      pay: {
        isPaid: pay.isPaid,
        locked: pay.locked,
        overdue: pay.overdue,
        warning: pay.warning,
        daysLeft: pay.daysLeft,
      },
      unread: unreadMap.get(r.id) || 0,
    };
  });

  const blockedCount = rows.filter((r) => r.isBlocked).length;
  const overdueCount = rows.filter((r) => r.pay.locked || r.pay.overdue).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Restoranlar</h1>
        <p className="mt-1 text-sm text-muted">
          Jami {rows.length} ta · {blockedCount} bloklangan · {overdueCount} to'lamagan
        </p>
      </div>

      <RestaurantsManager rows={rows} />
    </div>
  );
}
