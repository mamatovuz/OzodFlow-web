import { ArrowDownLeft, ArrowUpRight, Banknote, Clock, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { DepositForm } from "@/app/(app)/wallet/deposit-form";
import { RecheckButton } from "@/app/(app)/wallet/recheck-button";
import { StatGrid, StatTile } from "@/components/app/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current-user";
import { PaymentProvider, TransactionDirection } from "@/lib/enums";
import { formatMoney, sumToTiyin } from "@/lib/money";
import {
  CHECKOUT_MAX_SUM,
  CHECKOUT_MIN_SUM,
  isCheckoutConfigured,
  listPendingDeposits,
} from "@/lib/payments";
import { getLedgerPage, getWalletSummary } from "@/lib/wallet";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Hamyon",
  robots: { index: false, follow: false },
};

export default async function WalletPage() {
  const user = await requireUser("/wallet");
  const t = await getTranslations("wallet");

  const wallet = await getWalletSummary(user.id);

  // Hamyon ro'yxatdan o'tishda yaratiladi. Bo'lmasa — eski hisob;
  // birinchi pul amalida `getOrCreateUserWallet` uni yaratadi.
  const [ledger, pendingDeposits] = wallet
    ? await Promise.all([getLedgerPage(wallet.id, { take: 20 }), listPendingDeposits(user.id)])
    : [{ items: [], hasMore: false }, []];

  const gatewayEnabled = isCheckoutConfigured();

  // Limit matni SERVERDA yasaladi — `formatMoney` bigint bilan ishlaydi
  // va uni klientga uzatib bo'lmaydi.
  const gatewayLimitLabel = t("gatewayLimit", {
    min: formatMoney(sumToTiyin(CHECKOUT_MIN_SUM)),
    max: formatMoney(sumToTiyin(CHECKOUT_MAX_SUM)),
  });

  // Shlyuz to'lovi kutilayotgan bo'lsa "tekshirish" tugmasi ko'rsatiladi.
  const hasPendingGateway = pendingDeposits.some(
    (deposit) => deposit.provider === PaymentProvider.CHECKOUT
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {t("title")}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{t("subtitle")}</p>
      </header>

      <StatGrid>
        <StatTile
          label={t("balance")}
          value={formatMoney(wallet?.balance ?? 0n)}
          hint={t("balanceHint")}
          icon={Banknote}
          emphasis
        />
        <StatTile
          label={t("locked")}
          value={formatMoney(wallet?.lockedBalance ?? 0n)}
          hint={t("lockedHint")}
          icon={Lock}
        />
        <StatTile
          label={t("totalIn")}
          value={formatMoney(wallet?.totalIn ?? 0n)}
          icon={ArrowDownLeft}
        />
        <StatTile
          label={t("totalOut")}
          value={formatMoney(wallet?.totalOut ?? 0n)}
          icon={ArrowUpRight}
        />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* ── Tranzaksiyalar ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t("historyTitle")}</CardTitle>
          </CardHeader>

          {ledger.items.length === 0 ? (
            <EmptyState icon={Banknote} title={t("historyEmpty")} />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {ledger.items.map((entry) => {
                const isIncoming = entry.direction === TransactionDirection.IN;

                return (
                  <li
                    key={entry.id}
                    className="flex items-start gap-3 px-5 py-4 sm:px-6"
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg",
                        isIncoming
                          ? "bg-success-soft text-success-soft-foreground"
                          : "bg-surface-2 text-muted-foreground"
                      )}
                    >
                      {isIncoming ? (
                        <ArrowDownLeft className="size-4" strokeWidth={2} aria-hidden />
                      ) : (
                        <ArrowUpRight className="size-4" strokeWidth={2} aria-hidden />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {tType(t, entry.type)}
                      </p>

                      {entry.description && (
                        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                          {entry.description}
                        </p>
                      )}

                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {entry.createdAt.toLocaleDateString("uz-UZ", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {entry.project && (
                          <>
                            {" · "}
                            <Link
                              href={`/projects/${entry.project.publicId}`}
                              className="transition-colors hover:text-foreground"
                            >
                              {entry.project.publicId}
                            </Link>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Summa ustunda — shuning uchun `.tabular` bilan
                        tekislanadi. */}
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          "amount text-sm font-semibold",
                          isIncoming ? "text-success" : "text-foreground"
                        )}
                      >
                        {formatMoney(entry.amount, { signed: isIncoming })}
                      </p>
                      <p className="amount mt-0.5 text-[11px] text-muted-foreground">
                        {formatMoney(entry.balanceAfter, { currency: false })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* ── To'ldirish ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <DepositForm
            gatewayEnabled={gatewayEnabled}
            gatewayLimitLabel={gatewayLimitLabel}
          />

          {pendingDeposits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-4 text-warning" strokeWidth={2} aria-hidden />
                  {t("pendingTitle")}
                </CardTitle>
              </CardHeader>

              <CardContent className="flex flex-col gap-3">
                {pendingDeposits.map((deposit) => (
                  <div
                    key={deposit.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      {/* Bank yo'lida to'lov kodi, shlyuz yo'lida esa
                          tugallanmagan to'lovga qaytish havolasi. */}
                      {deposit.code ? (
                        <p className="amount text-[13px] font-medium">
                          {deposit.code}
                        </p>
                      ) : (
                        <p className="text-[13px] font-medium">
                          {t("methodGateway")}
                        </p>
                      )}

                      <p className="text-[11px] text-muted-foreground">
                        {/* Bank yo'li admin tasdig'ini kutadi, shlyuz yo'li
                            esa mijozning o'zi to'lovni tugatishini. */}
                        {deposit.provider === PaymentProvider.MANUAL
                          ? t("pendingHint")
                          : t("pendingHintGateway")}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="warning" size="sm">
                        {deposit.amountLabel}
                      </Badge>

                      {deposit.paymentUrl && (
                        <Button asChild variant="secondary" size="sm">
                          {/* Tashqi manzil — `rel` bilan */}
                          <a
                            href={deposit.paymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t("continuePayment")}
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {hasPendingGateway && <RecheckButton />}
        </div>
      </div>
    </div>
  );
}

/**
 * Tranzaksiya turini tarjima qiladi.
 *
 * Tarjima topilmasa xom qiymat ko'rsatiladi — databaseda yangi tur
 * paydo bo'lsa sahifa yiqilmasligi kerak.
 */
function tType(
  t: Awaited<ReturnType<typeof getTranslations<"wallet">>>,
  type: string
): string {
  const key = `type.${type}` as Parameters<typeof t>[0];
  return t.has(key) ? t(key) : type;
}
