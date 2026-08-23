import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";

export const dynamic = "force-dynamic";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analitika</h1>
        <p className="mt-1 text-sm text-muted">
          Saytga kim, qachon kirdi — davr bo'yicha tashriflar, mijozlar va tushum.
        </p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
