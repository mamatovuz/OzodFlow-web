import { CardsManager } from "@/components/admin/cards-manager";

export const dynamic = "force-dynamic";

export default function AdminCardsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">To'lov kartalari</h1>
        <p className="mt-1 text-sm text-muted">
          Foydalanuvchilar to'lov qilishi uchun karta raqamlari
        </p>
      </div>
      <CardsManager />
    </div>
  );
}
