"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Loader2,
  Crown,
  X,
  Eye,
  Copy,
  Upload,
  ShoppingBag,
  Clock,
} from "lucide-react";
import { Card, Badge, Button, Label } from "@/components/ui";
import { Modal } from "@/components/ui-modal";
import { MENU_THEMES, type MenuTheme, type ThemeKey } from "@/lib/themes";
import { THEME_PRICE } from "@/lib/plans";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

type PayCard = {
  id: string;
  bankName: string;
  cardNumber: string;
  cardHolder: string;
};

export function ThemePicker({
  current,
  canPremium,
  purchased,
}: {
  current: string;
  canPremium: boolean;
  purchased: string[];
}) {
  const [owned] = useState<string[]>(purchased);
  const [selected, setSelected] = useState<string>(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<MenuTheme | null>(null);
  const [buy, setBuy] = useState<MenuTheme | null>(null);
  const [pending, setPending] = useState(false); // to'lov so'rovi tekshirilmoqda
  const [justSent, setJustSent] = useState(false);

  // Kutilayotgan to'lov so'rovi bor-yo'qligini tekshiramiz
  useEffect(() => {
    fetch("/api/payment/request")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setPending(j.data.some((r: { status: string }) => r.status === "PENDING"));
      })
      .catch(() => {});
  }, []);

  // Dizaynni ishlatish mumkinmi (bepul, tarif ochgan yoki sotib olingan)
  function isOwned(t: MenuTheme) {
    return !t.premium || canPremium || owned.includes(t.key);
  }

  async function apply(key: ThemeKey) {
    setSaving(true);
    setError("");
    const res = await fetch("/api/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuTheme: key }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Xatolik");
      return;
    }
    setSelected(key);
    setPreview(null);
  }

  return (
    <div>
      {!canPremium && (
        <div className="mb-4 flex flex-col gap-1 rounded-xl border border-accent/30 bg-accent-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Crown className="h-4 w-4 shrink-0 text-warning" />
            Har bir premium dizaynni <b>{formatPrice(THEME_PRICE, "UZS")}</b> ga umrbodga sotib
            olishingiz mumkin
          </div>
          <Link
            href="/dashboard/settings"
            className="shrink-0 text-sm font-medium text-accent hover:underline"
          >
            Yoki Business tarifi →
          </Link>
        </div>
      )}

      {justSent && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
          <Check className="h-4 w-4" /> So'rov yuborildi. Admin tasdiqlagach dizayn ochiladi.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MENU_THEMES.map((t) => {
          const unlocked = isOwned(t);
          const locked = t.premium && !unlocked;
          const active = selected === t.key;
          return (
            <Card
              key={t.key}
              className={`relative overflow-hidden p-0 transition-all ${
                active ? "ring-2 ring-accent" : "hover:shadow-card"
              } ${locked ? "opacity-80" : ""}`}
            >
              <button
                onClick={() => setPreview(t)}
                className="block w-full text-left"
              >
                <ThemeMock theme={t} />
              </button>
              <div className="flex items-center justify-between border-t border-border bg-card px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {t.name}
                  {t.premium && (
                    <Badge variant="warning" className="px-1.5 py-0">
                      Premium
                    </Badge>
                  )}
                </span>
                {active ? (
                  <span className="flex h-5 items-center gap-1 rounded-full bg-success/10 px-2 text-xs font-medium text-success">
                    <Check className="h-3 w-3" /> Faol
                  </span>
                ) : locked ? (
                  pending ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-warning">
                      <Clock className="h-3.5 w-3.5" /> Kutilmoqda
                    </span>
                  ) : (
                    <button
                      onClick={() => setBuy(t)}
                      className="flex items-center gap-1 text-xs font-medium text-accent"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" /> {formatPrice(THEME_PRICE, "UZS")}
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => setPreview(t)}
                    className="flex items-center gap-1 text-xs font-medium text-accent"
                  >
                    <Eye className="h-3.5 w-3.5" /> Ko'rish
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPreview(null)} />
          <div className="relative z-10 max-h-[92vh] w-full max-w-sm overflow-hidden rounded-t-3xl bg-card animate-fade-up sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <span className="flex items-center gap-2 font-semibold text-foreground">
                {preview.name}
                {preview.premium && <Badge variant="warning">Premium</Badge>}
              </span>
              <button onClick={() => setPreview(null)} className="text-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              <ThemeMock theme={preview} large />
            </div>
            <div className="border-t border-border p-4">
              {preview.premium && !isOwned(preview) ? (
                pending ? (
                  <Button className="w-full" variant="outline" disabled>
                    <Clock className="h-4 w-4" /> To'lov tekshirilmoqda
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => {
                      const t = preview;
                      setPreview(null);
                      setBuy(t);
                    }}
                  >
                    <ShoppingBag className="h-4 w-4" /> Sotib olish — {formatPrice(THEME_PRICE, "UZS")}
                  </Button>
                )
              ) : selected === preview.key ? (
                <Button className="w-full" variant="outline" disabled>
                  <Check className="h-4 w-4" /> Joriy dizayn
                </Button>
              ) : (
                <Button className="w-full" onClick={() => apply(preview.key)} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Shu dizaynni qo'llash
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sotib olish modali */}
      {buy && (
        <PurchaseModal
          theme={buy}
          onClose={() => setBuy(null)}
          onDone={() => {
            setBuy(null);
            setPending(true);
            setJustSent(true);
          }}
        />
      )}
    </div>
  );
}

// Bitta premium dizaynni sotib olish (karta → chek → admin tasdiqlaydi)
function PurchaseModal({
  theme,
  onClose,
  onDone,
}: {
  theme: MenuTheme;
  onClose: () => void;
  onDone: () => void;
}) {
  const [cards, setCards] = useState<PayCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [receipt, setReceipt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetch("/api/payment/cards")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setCards(j.data);
        setLoadingCards(false);
      });
  }, []);

  async function uploadReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(json.error || "Yuklashda xatolik");
      return;
    }
    setReceipt(json.data.url);
  }

  async function submit() {
    if (!receipt) {
      setError("Iltimos, to'lov chekini yuklang");
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/payment/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "THEME", themeKey: theme.key, receiptImage: receipt }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error || "Xatolik");
      return;
    }
    onDone();
  }

  function copyCard(num: string) {
    navigator.clipboard.writeText(num.replace(/\s/g, ""));
    setCopied(num);
    setTimeout(() => setCopied(""), 2000);
  }

  return (
    <Modal open onClose={onClose} title={`${theme.name} dizaynini sotib olish`}>
      <div className="space-y-5">
        <div className="rounded-xl bg-accent-soft p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Umrbod dizayn</span>
            <span className="text-2xl font-bold text-accent">
              {formatPrice(THEME_PRICE, "UZS")}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Bir marta to'laysiz — bu dizayn umrbod sizniki bo'lib qoladi.
          </p>
        </div>

        <div>
          <Label>1. Quyidagi kartaga o'tkazing</Label>
          {loadingCards ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
            </div>
          ) : cards.length === 0 ? (
            <p className="rounded-lg bg-surface-2 p-3 text-sm text-muted">
              Hozircha to'lov kartasi qo'shilmagan. Admin bilan bog'laning.
            </p>
          ) : (
            <div className="space-y-2">
              {cards.map((c) => (
                <div key={c.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted">{c.bankName}</span>
                    <button
                      onClick={() => copyCard(c.cardNumber)}
                      className="flex items-center gap-1 text-xs text-accent"
                    >
                      {copied === c.cardNumber ? (
                        <>
                          <Check className="h-3 w-3" /> Nusxalandi
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Nusxalash
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 font-mono text-lg tracking-wider text-foreground">
                    {c.cardNumber}
                  </p>
                  <p className="text-sm text-muted">{c.cardHolder}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label>2. To'lov chekini yuklang</Label>
          {receipt ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receipt}
                alt="chek"
                className="h-32 rounded-lg border border-border object-cover"
              />
              <button
                onClick={() => setReceipt("")}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-error text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border py-6 text-muted hover:border-accent hover:text-accent">
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <Upload className="h-6 w-6" />
                  <span className="mt-1 text-sm">Chek rasmini tanlang</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={uploadReceipt}
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={submit} disabled={submitting || !receipt}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            So'rov yuborish
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Menyu ko'rinishi mock (tema ranglari + layout)
function ThemeMock({ theme: t, large = false }: { theme: MenuTheme; large?: boolean }) {
  const c = t.colors;
  const accent = t.accent;
  const at = t.accentText;
  const scale = large ? 1.4 : 1;
  const r = t.radius * 0.5 * scale;

  const Card2 = ({ grid }: { grid: boolean }) =>
    grid ? (
      <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: r }} className="overflow-hidden">
        <div style={{ background: c.surface2, aspectRatio: "1" }} />
        <div className="p-1.5">
          <div style={{ background: c.foreground, opacity: 0.85, height: 4 * scale, width: "70%", borderRadius: 2 }} />
          <div style={{ background: accent, height: 5 * scale, width: "40%", borderRadius: 2, marginTop: 3 }} />
        </div>
      </div>
    ) : (
      <div
        style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: r }}
        className="flex gap-2 p-1.5"
      >
        <div style={{ background: c.surface2, width: 34 * scale, height: 34 * scale, borderRadius: r * 0.7 }} />
        <div className="flex-1 pt-0.5">
          <div style={{ background: c.foreground, opacity: 0.85, height: 4 * scale, width: "60%", borderRadius: 2 }} />
          <div style={{ background: c.muted, opacity: 0.5, height: 3 * scale, width: "80%", borderRadius: 2, marginTop: 3 }} />
          <div style={{ background: accent, height: 5 * scale, width: "30%", borderRadius: 2, marginTop: 4 }} />
        </div>
      </div>
    );

  return (
    <div style={{ background: c.background }} className="p-2.5">
      {/* header */}
      <div className="flex items-center gap-2">
        <div style={{ background: accent, width: 22 * scale, height: 22 * scale, borderRadius: r * 0.8 }} />
        <div className="flex-1">
          <div style={{ background: c.foreground, opacity: 0.9, height: 5 * scale, width: "50%", borderRadius: 2 }} />
          <div style={{ background: c.muted, opacity: 0.5, height: 3 * scale, width: "35%", borderRadius: 2, marginTop: 3 }} />
        </div>
      </div>
      {/* banner */}
      <div
        style={{ background: `linear-gradient(90deg, ${accent}, ${c.surface2})`, height: 26 * scale, borderRadius: r, marginTop: 6 }}
        className="flex items-center px-2"
      >
        <div style={{ background: at, opacity: 0.9, height: 4 * scale, width: "45%", borderRadius: 2 }} />
      </div>
      {/* search */}
      <div style={{ background: c.surface, border: `1px solid ${c.border}`, height: 12 * scale, borderRadius: 999, marginTop: 6 }} />
      {/* cards */}
      <div className={`mt-2 ${t.layout === "grid" ? "grid grid-cols-2 gap-1.5" : "space-y-1.5"}`}>
        <Card2 grid={t.layout === "grid"} />
        <Card2 grid={t.layout === "grid"} />
        {t.layout === "grid" && <Card2 grid />}
        {t.layout === "grid" && <Card2 grid />}
      </div>
      {/* bottom bar */}
      <div
        style={{ background: accent, height: 14 * scale, borderRadius: r, marginTop: 6 }}
        className="flex items-center justify-between px-2"
      >
        <div style={{ background: at, opacity: 0.9, height: 4 * scale, width: "30%", borderRadius: 2 }} />
        <div style={{ background: at, opacity: 0.9, height: 4 * scale, width: "25%", borderRadius: 2 }} />
      </div>
    </div>
  );
}
