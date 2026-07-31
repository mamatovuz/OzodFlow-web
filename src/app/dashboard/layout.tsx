import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant, isOwner, getMembership } from "@/lib/api";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

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

  return (
    <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
      <Sidebar
        user={{ name: user.name, email: user.email, phone: user.phone }}
        restaurantSlug={restaurant.slug}
      />
      <main className="flex-1">
        <div className="hidden items-center justify-end gap-2 border-b border-border bg-card px-6 py-3 lg:flex">
          <ThemeToggle />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
