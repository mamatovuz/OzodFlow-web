import { IntegrationsManager } from "@/components/dashboard/integrations-manager";
import { ApiAccessManager } from "@/components/dashboard/api-access-manager";

export const dynamic = "force-dynamic";

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integratsiyalar</h1>
        <p className="mt-1 text-sm text-muted">
          Kassa (POS) tizimini ulang — mahsulotlar avtomatik sinxronlanadi
        </p>
      </div>
      <IntegrationsManager />

      <div className="pt-2">
        <h2 className="text-lg font-semibold text-foreground">Dasturchilar uchun</h2>
        <p className="mt-1 text-sm text-muted">
          API kalitlar va webhooklar — o'z tizimingizni OzodFlow bilan bog'lang
        </p>
      </div>
      <ApiAccessManager />
    </div>
  );
}
