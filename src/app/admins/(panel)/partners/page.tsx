import { PartnersManager } from "@/components/admin/partners-manager";

export const dynamic = "force-dynamic";

export default function AdminPartnersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hamkorlarimiz</h1>
        <p className="mt-1 text-sm text-muted">
          Bosh sahifada aylanib turadigan hamkor logolari
        </p>
      </div>
      <PartnersManager />
    </div>
  );
}
