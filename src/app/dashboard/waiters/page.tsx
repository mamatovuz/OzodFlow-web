import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { WaitersManager } from "@/components/dashboard/waiters-manager";
import { Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WaitersPage() {
  const user = (await getSessionUser())!;
  const restaurant = (await getUserRestaurant(user.id))!;

  if (!restaurant.waiterCodeEnabled) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Ofitsantlar</h1>
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted">
          Bu funksiya hozircha o'chirilgan. Uni yoqish uchun{" "}
          <Link href="/dashboard/settings" className="inline-flex items-center gap-1 font-medium text-accent">
            <Settings className="h-4 w-4" /> Sozlamalar
          </Link>{" "}
          bo'limiga o'ting va &ldquo;Ofitsant kodi&rdquo; funksiyasini yoqing.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ofitsantlar</h1>
        <p className="mt-1 text-sm text-muted">
          Ofitsant qo'shing va har biriga alohida kod bering. Mijoz buyurtma
          rasmiylashtirishда shu kodni kiritadi — statistikaga tushadi.
        </p>
      </div>
      <WaitersManager currency={restaurant.currency} />
    </div>
  );
}
