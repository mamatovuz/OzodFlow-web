import { QrScanner } from "@/components/dashboard/qr-scanner";

export const dynamic = "force-dynamic";

export default function ScannerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">QR Scanner</h1>
        <p className="mt-1 text-sm text-muted">
          Stol QR kodini skanerlab holati va buyurtmalarini ko'ring
        </p>
      </div>
      <QrScanner />
    </div>
  );
}
