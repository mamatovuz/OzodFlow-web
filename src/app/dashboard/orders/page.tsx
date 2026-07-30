import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { OrdersBoard } from "@/components/dashboard/orders-board";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = (await getSessionUser())!;
  const restaurant = (await getUserRestaurant(user.id))!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Buyurtmalar</h1>
        <p className="mt-1 text-sm text-muted">
          Real vaqt rejimida yangilanadi — yangi buyurtmada ovozli signal chiqadi
        </p>
      </div>
      <OrdersBoard currency={restaurant.currency} />
    </div>
  );
}
