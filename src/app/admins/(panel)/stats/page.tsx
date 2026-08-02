import { StatsManager } from "@/components/admin/stats-manager";

export const dynamic = "force-dynamic";

export default function AdminStatsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ko'rsatkichlar</h1>
        <p className="mt-1 text-sm text-muted">
          Bosh sahifada chiqadigan raqamlar (masalan: 500+ restoran). Bo'sh
          bo'lsa ko'rsatilmaydi.
        </p>
      </div>
      <StatsManager />
    </div>
  );
}
