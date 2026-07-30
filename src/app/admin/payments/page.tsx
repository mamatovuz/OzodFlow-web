import { PaymentsModeration } from "@/components/admin/payments-moderation";

export const dynamic = "force-dynamic";

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">To'lovlar</h1>
        <p className="mt-1 text-sm text-muted">
          To'lov cheklarini tekshiring va tariflarni tasdiqlang
        </p>
      </div>
      <PaymentsModeration />
    </div>
  );
}
