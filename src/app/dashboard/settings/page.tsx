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
import { TelegramBotManager } from "@/components/dashboard/telegram-bot-manager";
import { PaymentCardSettings } from "@/components/dashboard/payment-card-settings";
import { SessionsManager } from "@/components/dashboard/sessions-manager";

export const dynamic = "force-dynamic";

// Bo'limlarga ajratilgan sozlamalar (§48) — bitta ulkan sahifa emas
const SECTIONS = [
  { id: "hisob", label: "Hisob" },
  { id: "buyurtmalar", label: "Buyurtmalar" },
  { id: "tolov", label: "To'lov" },
  { id: "telegram", label: "Telegram" },
  { id: "xavfsizlik", label: "Xavfsizlik" },
  { id: "obuna", label: "Obuna" },
];

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
        <p className="mt-1 text-sm text-muted">Hisob, buyurtma, to'lov va obuna sozlamalari</p>
      </div>

      {/* Bo'limlararo navigatsiya */}
      <nav className="sticky top-0 z-20 -mx-4 flex gap-1 overflow-x-auto border-b border-border bg-surface/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            {s.label}
          </a>
        ))}
      </nav>

      {/* ─── Hisob ─── */}
      <Section id="hisob" title="Hisob" desc="Shaxsiy va restoran ma'lumotlari">
        <Card className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Ism" value={user.name} />
            <Info label="Email / Telefon" value={user.email || user.phone || "—"} />
            <Info label="Restoran" value={restaurant.name} />
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <SlugEditor current={restaurant.slug} />
          </div>
        </Card>
      </Section>

      {/* ─── Buyurtma sozlamalari ─── */}
      <Section id="buyurtmalar" title="Buyurtmalar" desc="Buyurtma qabul qilish va ofitsant sozlamalari">
        <div className="space-y-6">
          <PhoneRequestToggle enabled={restaurant.askPhone} />
          <WaiterCodeToggle enabled={restaurant.waiterCodeEnabled} />
          <OrderChannel
            connected={!!restaurant.orderBotToken && !!restaurant.orderChatId}
            chatId={restaurant.orderChatId}
          />
        </div>
      </Section>

      {/* ─── To'lov ─── */}
      <Section id="tolov" title="To'lov" desc="Ofitsant panelida karta orqali to'lov uchun">
        <PaymentCardSettings
          number={restaurant.cardNumber}
          holder={restaurant.cardHolder}
          serviceRate={restaurant.serviceRate}
        />
      </Section>

      {/* ─── Telegram ─── */}
      <Section id="telegram" title="Telegram" desc="Mijozlar boti va Mini App">
        <TelegramBotManager
          connected={restaurant.botEnabled && !!restaurant.botToken}
          username={restaurant.botUsername}
        />
      </Section>

      {/* ─── Xavfsizlik ─── */}
      <Section id="xavfsizlik" title="Xavfsizlik" desc="Faol seanslar va qurilmalar">
        <SessionsManager />
      </Section>

      {/* ─── Obuna ─── */}
      <Section id="obuna" title="Obuna" desc="Tarif va to'lov muddati">
        <Billing
          currentPlan={access.plan}
          daysLeft={access.daysLeft}
          expired={access.expired}
        />
      </Section>

      {/* ─── Xavfli zona ─── */}
      <Section id="xavfli" title="Xavfli zona" desc="Qaytarib bo'lmaydigan amallar" danger>
        <ResetStats />
      </Section>
    </div>
  );
}

function Section({
  id,
  title,
  desc,
  danger,
  children,
}: {
  id: string;
  title: string;
  desc?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16">
      <div className="mb-3">
        <h2 className={`font-semibold ${danger ? "text-error" : "text-foreground"}`}>{title}</h2>
        {desc && <p className="text-sm text-muted">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

function Info({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-sm font-medium ${accent ? "text-accent" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
