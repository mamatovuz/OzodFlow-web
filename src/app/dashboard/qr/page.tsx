import { headers } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { QrGenerator } from "@/components/dashboard/qr-generator";
import { TableQrManager } from "@/components/dashboard/table-qr-manager";

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">QR kod</h1>
        <p className="mt-1 text-sm text-muted">
          Umumiy QR kodni sozlang yoki har bir stol uchun alohida QR yarating
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-foreground">Umumiy menyu QR kodi</h2>
        <QrGenerator url={url} />
      </div>

      <div>
        <h2 className="mb-1 font-semibold text-foreground">Stollar uchun alohida QR</h2>
        <p className="mb-3 text-sm text-muted">
          Har bir stolga o'z QR kodi. Mijoz skanerlaganda buyurtma o'sha stolga bog'lanadi.
        </p>
        <TableQrManager baseUrl={url} />
      </div>
    </div>
  );
}
