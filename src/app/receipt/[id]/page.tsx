import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { guardRestaurant, getMembership } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ReceiptView } from "@/components/dashboard/receipt-view";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      restaurant: {
        select: { id: true, name: true, logo: true, phone: true, address: true, currency: true },
      },
    },
  });
  if (!order) notFound();

  // Owner yoki xodim
  const owns = await guardRestaurant(user.id, order.restaurantId);
  if (!owns) {
    const m = await getMembership(user.id);
    if (m?.restaurant.id !== order.restaurantId) redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-surface py-8">
      <ReceiptView
        data={{
          number: order.number,
          tableName: order.tableName,
          createdAt: order.createdAt.toISOString(),
          items: order.items,
          total: order.total,
          phone: order.phone,
          comment: order.comment,
          restaurant: order.restaurant,
        }}
      />
    </div>
  );
}
