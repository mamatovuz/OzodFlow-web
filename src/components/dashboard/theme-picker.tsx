"use client";

import { useState } from "react";
import { Check, Lock, Loader2, Crown, X, Eye } from "lucide-react";
import { Card, Badge, Button } from "@/components/ui";
import { MENU_THEMES, type MenuTheme, type ThemeKey } from "@/lib/themes";
import Link from "next/link";

export function ThemePicker({
  current,
  canPremium,
}: {
  current: string;
  canPremium: boolean;
}) {
  const [selected, setSelected] = useState<string>(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<MenuTheme | null>(null);

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
        <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-accent/30 bg-accent-soft p-4">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Crown className="h-4 w-4 text-warning" />
            Premium dizaynlar <b>Pro Max</b> tarifida ochiladi
          </div>
          <Link href="/dashboard/settings" className="shrink-0 text-sm font-medium text-accent hover:underline">
            Yangilash →
          </Link>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MENU_THEMES.map((t) => {
          const locked = t.premium && !canPremium;
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
                  <Lock className="h-4 w-4 text-muted" />
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
              {preview.premium && !canPremium ? (
                <Link href="/dashboard/settings">
                  <Button className="w-full">
                    <Lock className="h-4 w-4" /> Pro Max bilan ochish
                  </Button>
                </Link>
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
    </div>
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
