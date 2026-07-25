import { ArrowRight, Building2, Lock, RotateCcw, Scale, ShieldCheck, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/marketing/section-heading";
import { bpsToPercent, formatBps, formatMoney, splitCommission, sumToTiyin } from "@/lib/money";
import { getCommissionBps } from "@/lib/settings";

/**
 * Escrow tushuntirish bo'limi — platformaning eng muhim savdo argumenti.
 *
 * Foizlar KODDA YOZILMAGAN: `Setting` jadvalidan o'qiladi. Admin komissiyani
 * o'zgartirsa, marketing sahifasidagi raqam ham o'ziga o'zi yangilanadi.
 * Aks holda sayt bir narsani, tizim boshqa narsani ko'rsatib qolardi.
 */
export async function Escrow() {
  const t = await getTranslations("home.escrow");
  const commissionBps = await getCommissionBps();

  const points = [
    { key: "hold", icon: Lock },
    { key: "release", icon: ShieldCheck },
    { key: "dispute", icon: Scale },
    { key: "refund", icon: RotateCcw },
  ] as const;

  return (
    <Section id="escrow" className="border-y border-border bg-surface-1">
      <div className="container-content">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          {/* ── Chap: sarlavha va diagramma ─────────────────────────────── */}
          <div className="lg:col-span-5">
            <SectionHeading
              label={t("label")}
              title={t("title")}
              subtitle={t("subtitle")}
              align="left"
            />

            <MoneyFlowDiagram commissionBps={commissionBps} />
          </div>

          {/* ── O'ng: to'rt nuqta ───────────────────────────────────────── */}
          <div className="lg:col-span-7">
            <dl className="grid gap-5 sm:grid-cols-2">
              {points.map((point) => (
                <div
                  key={point.key}
                  className="rounded-2xl border border-border bg-card p-6 shadow-xs"
                >
                  <span className="grid size-10 place-items-center rounded-lg bg-success-soft text-success-soft-foreground">
                    <point.icon className="size-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <dt className="mt-4 font-display text-[15px] font-semibold">
                    {t(`points.${point.key}.title`)}
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                    {t(`points.${point.key}.body`)}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 flex gap-2.5 rounded-xl border border-info/20 bg-info-soft/50 p-4 text-sm leading-relaxed text-info-soft-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
              {t("commissionNote")}
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

/**
 * Pul harakati diagrammasi: mijoz → escrow → mutaxassis + platforma.
 *
 * Summalar haqiqiy `splitCommission` funksiyasi bilan hisoblanadi — ya'ni
 * diagrammada ko'rsatilgan raqamlar tizim ishlatadigan matematikaning
 * aynan o'zi. Qo'lda yozilgan misol vaqt o'tib haqiqatdan uzilib qolardi.
 */
async function MoneyFlowDiagram({ commissionBps }: { commissionBps: number }) {
  const t = await getTranslations("home.escrow.diagram");

  const example = sumToTiyin(5_000_000);
  const split = splitCommission(example, commissionBps);
  const developerPercent = 100 - bpsToPercent(commissionBps);

  return (
    <div className="mt-10 rounded-2xl border border-border bg-card p-5 shadow-sm">
      {/* 1-qadam: mijoz to'laydi */}
      <Row
        icon={Wallet}
        tone="neutral"
        title={t("customerPays")}
        amount={formatMoney(split.total)}
      />

      <Connector />

      {/* 2-qadam: escrow'da bloklanadi */}
      <Row
        icon={Lock}
        tone="success"
        title={t("locked")}
        amount={formatMoney(split.total)}
        note={t("lockedNote")}
      />

      <Connector />

      {/* 3-qadam: taqsimlanadi */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-brand/25 bg-brand-soft/50 p-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-brand-soft-foreground/80">
            {t("developerShare", { percent: developerPercent })}
          </p>
          <p className="amount mt-1 text-[15px] font-semibold text-brand-soft-foreground">
            {formatMoney(split.net)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface-2 p-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Building2 className="size-3" strokeWidth={2} aria-hidden />
            {t("platformShare", { percent: formatBps(commissionBps) })}
          </p>
          <p className="amount mt-1 text-[15px] font-semibold text-muted-foreground">
            {formatMoney(split.commission)}
          </p>
        </div>
      </div>

      {/*
        Gap butunlay tarjima faylida turadi va `{amount}` o'rnini almashtirish
        orqali yasaladi. Bu ATAYLAB: JSX ichida `Misol {expr} summa uchun` deb
        yozilsa, Turbopack (SWC) ifodadan keyingi matnning birinchi qatoridagi
        probelni kesib tashlaydi va "so'msumma" bo'lib qoladi. Butun gapni
        bitta matn sifatida olish bu noaniqlikni yo'q qiladi.
      */}
      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        {t("example", { amount: formatMoney(example) })}
      </p>
    </div>
  );
}

function Row({
  icon: Icon,
  tone,
  title,
  amount,
  note,
}: {
  icon: typeof Wallet;
  tone: "neutral" | "success";
  title: string;
  amount: string;
  note?: string;
}) {
  const toneClasses =
    tone === "success"
      ? "border-success/25 bg-success-soft/50"
      : "border-border bg-surface-2";
  const iconClasses =
    tone === "success" ? "bg-success/15 text-success" : "bg-card text-muted-foreground";

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3.5 ${toneClasses}`}>
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${iconClasses}`}>
        <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">{title}</p>
        {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
      </div>
      <span className="amount shrink-0 text-[13px] font-semibold">{amount}</span>
    </div>
  );
}

/** Bosqichlar orasidagi pastga qaragan strelka. */
function Connector() {
  return (
    <div className="flex justify-center py-2" aria-hidden>
      <ArrowRight
        className="size-4 rotate-90 text-muted-foreground/50"
        strokeWidth={2}
      />
    </div>
  );
}
