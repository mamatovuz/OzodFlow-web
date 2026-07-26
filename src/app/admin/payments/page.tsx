import { Banknote } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PaymentActions } from "@/app/admin/payments/payment-actions";
import { Alert } from "@/components/ui/alert";
import { Card, EmptyState } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/current-user";
import { formatMoney } from "@/lib/money";
import { listAllPendingDeposits } from "@/lib/payments";

export const metadata: Metadata = {
  title: "To'lovlar",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  await requireAdmin("/admin/payments");
  const t = await getTranslations("admin.payments");

  const payments = await listAllPendingDeposits();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {t("title")}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{t("subtitle")}</p>
      </header>

      {payments.length > 0 && <Alert variant="warning">{t("confirmWarning")}</Alert>}

      <Card>
        {payments.length === 0 ? (
          <EmptyState icon={Banknote} title={t("empty")} />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {payments.map((payment) => (
              <li key={payment.id} className="flex flex-col gap-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t("code")}
                    </p>
                    <p className="amount mt-0.5 text-base font-semibold tracking-wider">
                      {payment.providerRef}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t("user")}
                    </p>
                    <p className="mt-0.5 text-sm font-medium">{payment.user.name}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {payment.user.email ?? payment.user.phone ?? payment.user.id}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t("amount")}
                    </p>
                    <p className="amount mt-0.5 text-lg font-semibold [font-variant-numeric:proportional-nums]">
                      {formatMoney(payment.amount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t("requestedAt")}
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {payment.createdAt.toLocaleDateString("uz-UZ", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <PaymentActions paymentId={payment.id} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
