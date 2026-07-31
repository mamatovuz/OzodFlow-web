import { PromosManager } from "@/components/admin/promos-manager";

export const dynamic = "force-dynamic";

export default function AdminPromosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Promo kodlar</h1>
        <p className="mt-1 text-sm text-muted">
          Yashirin promo kodlar yarating — saytda ko'rinmaydi, lekin ishlatsa
          bo'ladi. Har kod bo'yicha to'lovlar va ziyon ko'rinadi.
        </p>
      </div>
      <PromosManager />
    </div>
  );
}
