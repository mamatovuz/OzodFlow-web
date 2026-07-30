import { Check, Crown } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { Card, Badge, Button } from "@/components/ui";

export const dynamic = "force-dynamic";

const plans = [
  {
    key: "FREE",
    name: "Free",
    price: "0 so'm",
    features: ["20 ta mahsulot", "Asosiy QR", "Asosiy dizayn"],
  },
  {
    key: "PRO",
    name: "Pro",
    price: "99 000 so'm/oy",
    features: ["Cheksiz mahsulot", "Premium dizayn", "Statistika", "Cheksiz QR"],
  },
  {
    key: "BUSINESS",
    name: "Business",
    price: "299 000 so'm/oy",
    features: ["Filiallar", "Xodimlar", "Rollar", "Batafsil statistika", "API"],
  },
];

export default async function SettingsPage() {
  const user = (await getSessionUser())!;
  const restaurant = (await getUserRestaurant(user.id))!;

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
          <div>
            <p className="text-xs text-muted">Ism</p>
            <p className="text-sm font-medium text-foreground">{user.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Email / Telefon</p>
            <p className="text-sm font-medium text-foreground">
              {user.email || user.phone || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Restoran</p>
            <p className="text-sm font-medium text-foreground">{restaurant.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Menyu manzili</p>
            <p className="text-sm font-medium text-accent">/m/{restaurant.slug}</p>
          </div>
        </div>
      </Card>

      {/* Obuna */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Crown className="h-5 w-5 text-warning" />
          <h2 className="font-semibold text-foreground">Obuna tariflari</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((p) => {
            const current = restaurant.plan === p.key;
            return (
              <Card
                key={p.key}
                className={`p-5 ${current ? "border-accent ring-1 ring-accent" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{p.name}</h3>
                  {current && <Badge variant="accent">Joriy</Badge>}
                </div>
                <p className="mt-1 text-lg font-bold text-foreground">{p.price}</p>
                <ul className="mt-4 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-success" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                {!current && (
                  <Button
                    variant={p.key === "FREE" ? "outline" : "primary"}
                    className="mt-5 w-full"
                    disabled
                  >
                    {p.key === "FREE" ? "Bepul" : "Tez orada"}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">
          To'lov tizimi (Click, Payme, Paynet) integratsiyasi keyingi bosqichda
          qo'shiladi.
        </p>
      </div>
    </div>
  );
}
