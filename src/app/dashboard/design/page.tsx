import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { getEffectivePlan } from "@/lib/plans";
import { ThemePicker } from "@/components/dashboard/theme-picker";
import { DomainForm } from "@/components/dashboard/domain-form";

export const dynamic = "force-dynamic";

export default async function DesignPage() {
  const user = (await getSessionUser())!;
  const restaurant = (await getUserRestaurant(user.id))!;
  const access = getEffectivePlan(restaurant);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Menyu dizayni</h1>
        <p className="mt-1 text-sm text-muted">
          Menyungiz uchun dizayn tanlang va o'z domeningizni ulang
        </p>
      </div>

      <ThemePicker current={restaurant.menuTheme} canPremium={access.canPremiumThemes} />

      <DomainForm
        current={restaurant.customDomain}
        slug={restaurant.slug}
        canCustomDomain={access.canCustomDomain}
      />
    </div>
  );
}
