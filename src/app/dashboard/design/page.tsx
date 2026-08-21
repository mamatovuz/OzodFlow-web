import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { getEffectivePlan } from "@/lib/plans";
import { parsePurchasedThemes } from "@/lib/themes";
import { DesignManager } from "@/components/dashboard/design-manager";
import { DomainForm } from "@/components/dashboard/domain-form";

export const dynamic = "force-dynamic";

export default async function DesignPage() {
  const user = (await getSessionUser())!;
  const restaurant = (await getUserRestaurant(user.id))!;
  const access = getEffectivePlan(restaurant);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Menyu dizaynlari</h1>
        <p className="mt-1 text-sm text-muted">
          Tayyor dizayn tanlang, so'ng "Sozlash" orqali ranglar, fon, bosh
          sahifa va logoni restoraningizga moslang.
        </p>
      </div>

      <DesignManager
        current={restaurant.menuTheme}
        canPremium={access.canPremiumThemes}
        purchased={parsePurchasedThemes(restaurant.purchasedThemes)}
        designConfig={restaurant.designConfig}
        restaurant={{
          name: restaurant.name,
          description: restaurant.description,
          logo: restaurant.logo,
        }}
      />

      <DomainForm current={restaurant.customDomain} slug={restaurant.slug} />
    </div>
  );
}
