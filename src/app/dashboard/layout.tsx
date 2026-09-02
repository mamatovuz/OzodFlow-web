import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant, isOwner, getMembership } from "@/lib/api";
import { getPaymentStatus, type PlanKey } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { BlockedScreen, PaymentLockScreen } from "@/components/dashboard/lock-screen";
import { PaymentWarning } from "@/components/dashboard/payment-warning";
import { ImpersonationBanner } from "@/components/impersonation-banner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admins");

  // Xodim (menejer emas) → staff paneli
  const owner = await isOwner(user.id);
  if (!owner) {
    const membership = await getMembership(user.id);
    if (membership && membership.role !== "MANAGER") redirect("/staff");
  }

  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) redirect("/login");

  const impersonated = user.impersonatedBy ? <ImpersonationBanner name={user.name} /> : null;

  // 1) Bloklangan bo'lsa — butun panel qulflanadi
  if (restaurant.isBlocked) {
    return (
      <>
        {impersonated}
        <BlockedScreen reason={restaurant.blockReason} />
      </>
    );
  }

  // 2) To'lov muddati (qo'shimcha muhlat bilan) o'tgan bo'lsa — panel qulflanadi
  const pay = getPaymentStatus(restaurant);
  if (pay.locked) {
    // Adminni bir marta ogohlantiramiz (har to'lov sikli uchun)
    const notBefore = restaurant.planUntil ? new Date(restaurant.planUntil) : null;
    const already =
      restaurant.overdueNotified &&
      notBefore &&
      new Date(restaurant.overdueNotified) >= notBefore;
    if (!already) {
      await prisma.restaurant
        .update({ where: { id: restaurant.id }, data: { overdueNotified: new Date() } })
        .catch(() => {});
      await sendTelegramMessage(
        `⚠️ To'lov muddati o'tdi\n<b>${restaurant.name}</b> (/m/${restaurant.slug}) hali ham to'lov qilmadi.\nTarif: ${restaurant.plan}`
      ).catch(() => {});
    }
    return (
      <>
        {impersonated}
        <PaymentLockScreen plan={restaurant.plan as PlanKey} />
      </>
    );
  }

  const showWarning = pay.warning || pay.overdue;

  return (
    <>
    {impersonated}
    <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
      <Sidebar
        user={{ name: user.name, email: user.email, phone: user.phone }}
        restaurantSlug={restaurant.slug}
        waiterCodeEnabled={restaurant.waiterCodeEnabled}
      />
      <main className="flex-1">
        <div className="hidden items-center justify-end gap-2 border-b border-border bg-card px-6 py-3 lg:flex">
          <ThemeToggle />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          {showWarning && (
            <div className="mb-6">
              <PaymentWarning
                daysLeft={pay.daysLeft}
                overdue={pay.overdue}
                graceUntil={pay.graceUntil}
              />
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
    </>
  );
}
