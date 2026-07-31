import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { getEffectivePlan } from "@/lib/plans";
import { TableMap } from "@/components/dashboard/table-map";
import { Card, Button } from "@/components/ui";
import { Lock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const user = (await getSessionUser())!;
  const restaurant = (await getUserRestaurant(user.id))!;
  const access = getEffectivePlan(restaurant);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Stol xaritasi</h1>
        <p className="mt-1 text-sm text-muted">
          Barcha stollar holati real vaqtda — chaqiruvlar va buyurtmalar
        </p>
      </div>
      {access.canService ? (
        <TableMap />
      ) : (
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted" />
            <p className="font-medium text-foreground">Table Map Pro tarifida</p>
          </div>
          <p className="mt-2 text-sm text-muted">
            Stol xaritasi, ofitsiant chaqirish va hisob so'rash Pro va Business
            tariflarida mavjud.
          </p>
          <Link href="/dashboard/settings" className="mt-4 inline-block">
            <Button variant="outline" size="sm">Tarifni yangilash</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
