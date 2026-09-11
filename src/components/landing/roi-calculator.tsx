"use client";

import { useState } from "react";
import { TrendingUp, Wallet, Printer, Sparkles } from "lucide-react";
import { formatPrice } from "@/lib/utils";

// ROI kalkulyatori — restoran egasi OzodFlow oyiga qancha qo'shimcha foyda
// keltirishini o'zi hisoblab ko'radi. Taxminlar konservativ (kam baholangan).
const UPSELL_PCT = 0.12; // rasmli menyu → o'rtacha chek ~12% oshadi (konservativ)
const PRINT_SAVING = 200_000; // qog'oz menyu chop etish/yangilash — oyiga o'rtacha

export function RoiCalculator({ price }: { price: number }) {
  const [guests, setGuests] = useState(60); // kunlik mijozlar
  const [check, setCheck] = useState(45_000); // o'rtacha chek (so'm)

  const monthlyRevenue = guests * check * 30;
  const upsell = Math.round(monthlyRevenue * UPSELL_PCT);
  const benefit = upsell + PRINT_SAVING; // oylik qo'shimcha foyda + tejash
  const net = benefit - price;
  const roi = price > 0 ? (benefit / price) : 0;

  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-card">
      <div className="grid md:grid-cols-2">
        {/* Chap: kiritmalar */}
        <div className="border-b border-border p-6 sm:p-8 md:border-b-0 md:border-r">
          <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Sparkles className="h-5 w-5 text-accent" /> Oyiga qancha yutasiz?
          </h3>
          <p className="mt-1 text-sm text-muted">
            Restoraningiz raqamlarini kiriting — taxminiy foydani ko'ring.
          </p>

          <div className="mt-6 space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Kunlik mijozlar</label>
                <span className="rounded-lg bg-accent-soft px-2.5 py-1 text-sm font-bold text-accent">
                  {guests}
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={400}
                step={5}
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">O'rtacha chek</label>
                <span className="rounded-lg bg-accent-soft px-2.5 py-1 text-sm font-bold text-accent">
                  {formatPrice(check, "UZS")}
                </span>
              </div>
              <input
                type="range"
                min={15_000}
                max={300_000}
                step={5_000}
                value={check}
                onChange={(e) => setCheck(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </div>

            <div className="rounded-xl bg-surface-2 p-3 text-sm text-muted">
              Oylik aylanma (taxminan):{" "}
              <b className="text-foreground">{formatPrice(monthlyRevenue, "UZS")}</b>
            </div>
          </div>
        </div>

        {/* O'ng: natija */}
        <div className="bg-gradient-to-br from-accent-soft/60 to-card p-6 sm:p-8">
          <p className="text-sm font-medium text-muted">Oyiga taxminiy qo'shimcha foyda</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight text-foreground">
            {formatPrice(benefit, "UZS")}
          </p>

          <div className="mt-5 space-y-2.5">
            <ResultRow
              icon={TrendingUp}
              label="Rasmli menyu — ko'proq sotuv (+12%)"
              value={`+ ${formatPrice(upsell, "UZS")}`}
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

          <div className="mt-5 rounded-2xl bg-card p-4 shadow-soft">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted">Sof foyda (oyiga)</p>
                <p className={`text-2xl font-bold ${net >= 0 ? "text-success" : "text-error"}`}>
                  {net >= 0 ? "+" : ""}
                  {formatPrice(net, "UZS")}
                </p>
              </div>
              {roi >= 1 && (
                <div className="text-right">
                  <p className="text-xs text-muted">Qaytim</p>
                  <p className="text-2xl font-bold text-accent">{roi.toFixed(1)}×</p>
                </div>
              )}
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-muted/70">
            * Taxminiy hisob. Haqiqiy natija menyu, joylashuv va mijozlarga bog'liq. Raqamlar
            konservativ baholangan.
          </p>
        </div>
      </div>
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
