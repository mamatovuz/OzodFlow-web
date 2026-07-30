import { headers } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { QrGenerator } from "@/components/dashboard/qr-generator";

export const dynamic = "force-dynamic";

export default async function QrPage() {
  const user = (await getSessionUser())!;
  const restaurant = (await getUserRestaurant(user.id))!;

  const h = await headers();
  const host = h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "http";
  const base = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
  const url = `${base}/m/${restaurant.slug}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">QR kod</h1>
        <p className="mt-1 text-sm text-muted">
          QR kodni sozlang, yuklab oling va stollarga joylashtiring
        </p>
      </div>
      <QrGenerator url={url} />
    </div>
  );
}
