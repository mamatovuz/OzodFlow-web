import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { getEffectivePlan } from "@/lib/plans";
import { Card } from "@/components/ui";
import { Billing } from "@/components/dashboard/billing";
import { SlugEditor } from "@/components/dashboard/slug-editor";
import { ResetStats } from "@/components/dashboard/reset-stats";
import { WaiterCodeToggle } from "@/components/dashboard/waiter-code-toggle";
import { PhoneRequestToggle } from "@/components/dashboard/phone-request-toggle";
import { OrderChannel } from "@/components/dashboard/order-channel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) redirect("/login");
  const access = getEffectivePlan(restaurant);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sozlamalar</h1>
        <p className="mt-1 text-sm text-muted">Hisob va obuna sozlamalari</p>
      </div>

      {/* Hisob */}
      <Card className="p-6">
        <h2 className="mb-4 font-semibold text-foreground">Hisob</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Info label="Ism" value={user.name} />
          <Info label="Email / Telefon" value={user.email || user.phone || "—"} />
          <Info label="Restoran" value={restaurant.name} />
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <SlugEditor current={restaurant.slug} />
        </div>
      </Card>

      {/* Funksiyalar — ofitsant kodi */}
      <WaiterCodeToggle enabled={restaurant.waiterCodeEnabled} />

      {/* Buyurtmada telefon raqam so'rash */}
      <PhoneRequestToggle enabled={restaurant.askPhone} />

      {/* Buyurtmalarni Telegram kanaliga yuborish */}
      <OrderChannel
        connected={!!restaurant.orderBotToken && !!restaurant.orderChatId}
        chatId={restaurant.orderChatId}
      />

      {/* Obuna / to'lov */}
      <Billing
        currentPlan={access.plan}
        daysLeft={access.daysLeft}
        expired={access.expired}
      />

      {/* Xavfli zona — statistikani nolga qaytarish */}
      <ResetStats />
    </div>
  );
}

function Info({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-sm font-medium ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
