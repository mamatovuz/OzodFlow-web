import { PlansForm } from "@/components/admin/plans-form";

export const dynamic = "force-dynamic";

export default function AdminPlansPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tarif narxlari</h1>
        <p className="mt-1 text-sm text-muted">
          Starter va Business tariflarining oylik narxini belgilang
        </p>
      </div>
      <PlansForm />
    </div>
  );
}
