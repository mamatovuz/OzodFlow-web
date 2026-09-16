import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant, isOwner } from "@/lib/api";
import { getPlanPrices } from "@/lib/plan-prices";
import { inpayConfigured } from "@/lib/inpay";
import { FREE_TRIAL_DAYS } from "@/lib/plans";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export const dynamic = "force-dynamic";

const PLACEHOLDER = "Mening restoranim";

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admins");

  const owner = await isOwner(user.id);
  if (!owner) redirect("/staff");

  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) redirect("/login");
  if (restaurant.onboarded) redirect("/dashboard");

  const prices = await getPlanPrices();

  return (
    <OnboardingWizard
      initialName={restaurant.name === PLACEHOLDER ? "" : restaurant.name}
      prices={{ STARTER: prices.STARTER, BUSINESS: prices.BUSINESS }}
      inpayEnabled={inpayConfigured()}
      trialDays={FREE_TRIAL_DAYS}
    />
  );
}
