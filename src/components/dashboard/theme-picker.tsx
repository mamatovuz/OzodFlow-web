"use client";

import { useState } from "react";
import { Check, Lock, Loader2, Crown } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { MENU_THEMES, type ThemeKey } from "@/lib/themes";
import Link from "next/link";

export function ThemePicker({
  current,
  canPremium,
}: {
  current: string;
  canPremium: boolean;
}) {
  const [selected, setSelected] = useState<string>(current);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function choose(key: ThemeKey, premium: boolean) {
    if (premium && !canPremium) return;
    if (key === selected) return;
    setSaving(key);
    setError("");
    const res = await fetch("/api/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuTheme: key }),
    });
    const json = await res.json();
    setSaving(null);
    if (!res.ok) {
      setError(json.error || "Xatolik");
      return;
    }
    setSelected(key);
  }

  return (
    <div>
      {!canPremium && (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-accent/30 bg-accent-soft p-4">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Crown className="h-4 w-4 text-warning" />
            Premium dizaynlar <b>Pro Max</b> tarifida ochiladi
          </div>
          <Link
            href="/dashboard/settings"
            className="shrink-0 text-sm font-medium text-accent hover:underline"
          >
            Yangilash →
          </Link>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MENU_THEMES.map((t) => {
          const locked = t.premium && !canPremium;
          const active = selected === t.key;
          const accent = t.accent || "#2563EB";
          return (
            <Card
              key={t.key}
              className={`relative cursor-pointer overflow-hidden p-0 transition-all ${
                active ? "ring-2 ring-accent" : "hover:shadow-card"
              } ${locked ? "opacity-70" : ""}`}
              onClick={() => choose(t.key, t.premium)}
            >
              {/* Mini preview */}
              <div
                className="h-32 p-3"
                style={{ background: t.colors.background }}
              >
                <div
                  className="flex items-center gap-2 rounded-lg p-2"
                  style={{ background: t.colors.card, border: `1px solid ${t.colors.border}` }}
                >
                  <div
                    className="h-8 w-8 rounded-md"
                    style={{ background: accent }}
                  />
                  <div className="flex-1">
                    <div
                      className="h-2 w-16 rounded"
                      style={{ background: t.colors.foreground, opacity: 0.8 }}
                    />
                    <div
                      className="mt-1 h-2 w-10 rounded"
                      style={{ background: t.colors.muted, opacity: 0.6 }}
                    />
                  </div>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-4 flex-1 rounded"
                      style={{ background: i === 0 ? accent : t.colors.surface2 }}
                    />
                  ))}
                </div>
                <div
                  className="mt-2 h-8 rounded-lg"
                  style={{ background: t.colors.surface }}
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border bg-card px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {t.name}
                  {t.premium && (
                    <Badge variant="warning" className="px-1.5 py-0">
                      Premium
                    </Badge>
                  )}
                </span>
                {saving === t.key ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                ) : active ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                    <Check className="h-3 w-3" />
                  </span>
                ) : locked ? (
                  <Lock className="h-4 w-4 text-muted" />
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
