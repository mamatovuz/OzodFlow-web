"use client";

import { useState } from "react";
import { TrendingUp, Wallet, Printer, Sparkles, Clock, CalendarDays } from "lucide-react";
import { formatPrice } from "@/lib/utils";

// ROI kalkulyatori — restoran egasi OzodFlow oyiga qancha qo'shimcha DAROMAD
// keltirishini o'zi hisoblab ko'radi. Ta'sir foizi — egasi sozlaydi (shaffof).
const PRINT_SAVING = 200_000; // qog'oz menyu chop etish/yangilash — oyiga o'rtacha

export function RoiCalculator({ price }: { price: number }) {
  const [guests, setGuests] = useState(60); // kunlik mijozlar
  const [check, setCheck] = useState(45_000); // o'rtacha chek (so'm)
  const [uplift, setUplift] = useState(8); // rasmli menyu → o'rtacha chek oshishi (%)

  const monthlyRevenue = guests * check * 30;
  const extraSales = Math.round((monthlyRevenue * uplift) / 100); // qo'shimcha savdo
  const benefit = extraSales + PRINT_SAVING; // oylik qo'shimcha daromad + tejash
  const net = benefit - price;
  const yearly = benefit * 12;
  // OzodFlow necha kunda o'zini oqlaydi
  const daily = benefit / 30;
  const paybackDays = daily > 0 ? Math.max(1, Math.round(price / daily)) : 0;

  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-card">
      <div className="grid md:grid-cols-2">
        {/* Chap: kiritmalar */}
        <div className="border-b border-border p-6 sm:p-8 md:border-b-0 md:border-r">
          <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Sparkles className="h-5 w-5 text-accent" /> Oyiga qancha yutasiz?
          </h3>
          <p className="mt-1 text-sm text-muted">
            Restoraningiz raqamlarini kiriting — taxminiy natijani ko'ring.
          </p>

          <div className="mt-6 space-y-6">
            <Slider
              label="Kunlik mijozlar"
              value={String(guests)}
              min={10}
              max={400}
              step={5}
              raw={guests}
              onChange={setGuests}
            />
            <Slider
              label="O'rtacha chek"
              value={formatPrice(check, "UZS")}
              min={15_000}
              max={300_000}
              step={5_000}
              raw={check}
              onChange={setCheck}
            />
            <Slider
              label="Rasmli menyu ta'siri"
              value={`+${uplift}%`}
              min={3}
              max={20}
              step={1}
              raw={uplift}
              onChange={setUplift}
              hint="Rasmli, tavsifli menyu bilan mijoz o'rtacha ko'proq buyurtma qiladi"
            />

            <div className="rounded-xl bg-surface-2 p-3 text-sm text-muted">
              Oylik aylanma (taxminan):{" "}
              <b className="text-foreground">{formatPrice(monthlyRevenue, "UZS")}</b>
            </div>
          </div>
        </div>

        {/* O'ng: natija */}
        <div className="bg-gradient-to-br from-accent-soft/60 to-card p-6 sm:p-8">
          <p className="text-sm font-medium text-muted">Oyiga taxminiy qo'shimcha daromad</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight text-foreground">
            {formatPrice(benefit, "UZS")}
          </p>

          <div className="mt-5 space-y-2.5">
            <ResultRow
              icon={TrendingUp}
              label={`Rasmli menyu — ko'proq sotuv (+${uplift}%)`}
              value={`+ ${formatPrice(extraSales, "UZS")}`}
            />
            <ResultRow
              icon={Printer}
              label="Qog'oz menyu chop etishdan tejash"
              value={`+ ${formatPrice(PRINT_SAVING, "UZS")}`}
            />
            <ResultRow
              icon={Wallet}
              label="OzodFlow Business tarifi"
              value={`− ${formatPrice(price, "UZS")}`}
              muted
            />
          </div>

          {/* Sof foyda */}
          <div className="mt-5 rounded-2xl bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">Sof foyda (oyiga)</p>
              <p className={`text-2xl font-bold ${net >= 0 ? "text-success" : "text-error"}`}>
                {net >= 0 ? "+" : ""}
                {formatPrice(net, "UZS")}
              </p>
            </div>
          </div>

          {/* Yillik + o'zini oqlash muddati */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-card p-4 shadow-soft">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <CalendarDays className="h-4 w-4" />
              </span>
              <p className="mt-2 text-lg font-bold text-foreground">{formatPrice(yearly, "UZS")}</p>
              <p className="text-[11px] text-muted">Yiliga qo'shimcha</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-soft">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Clock className="h-4 w-4" />
              </span>
              <p className="mt-2 text-lg font-bold text-foreground">
                {paybackDays <= 1 ? "1 kun" : `${paybackDays} kun`}
              </p>
              <p className="text-[11px] text-muted">O'zini oqlaydi</p>
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-muted/70">
            * Taxminiy hisob — natija menyu, joylashuv va mijozlarga bog'liq. &quot;Ta'sir&quot; foizini
            o'zingiz sozlaysiz.
          </p>
        </div>
      </div>
    </div>
  );
}

// Slayder + jonli qiymat yorlig'i
function Slider({
  label,
  value,
  min,
  max,
  step,
  raw,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  raw: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span className="rounded-lg bg-accent-soft px-2.5 py-1 text-sm font-bold text-accent">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={raw}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
      {hint && <p className="mt-1 text-[11px] leading-snug text-muted/70">{hint}</p>}
    </div>
  );
}

function ResultRow({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm text-muted">
        <Icon className="h-4 w-4 shrink-0 text-accent" />
        {label}
      </span>
      <span className={`shrink-0 text-sm font-semibold ${muted ? "text-muted" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
