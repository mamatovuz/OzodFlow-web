"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, BarChart3, Save, Wand2 } from "lucide-react";
import { Button, Card, Input, Label, Switch } from "@/components/ui";
import { Modal } from "@/components/ui-modal";

type Metric = "restaurants" | "products" | "scans";

type Stat = {
  id: string;
  value: string;
  label: string;
  metric: Metric | null;
  auto: boolean;
  isActive: boolean;
};

type Counts = Record<Metric, number>;

// Metrikaning odam o'qiy oladigan nomi
const METRIC_LABEL: Record<Metric, string> = {
  restaurants: "Restoran va kafe",
  products: "Menyu mahsuloti",
  scans: "QR skaner",
};

// Katta sonni ixcham ko'rinishga: 1234 → "1.2K+", 1_200_000 → "1.2M+"
function formatMetricValue(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")}M+`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")}K+`;
  }
  return `${n}+`;
}

export function StatsManager() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");

  async function load() {
    const res = await fetch("/api/admin/stats");
    const json = await res.json();
    if (json.success) {
      setStats(json.data.stats);
      setCounts(json.data.counts);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openModal() {
    setValue("");
    setLabel("");
    setError("");
    setModal(true);
  }

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value, label }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error || "Xatolik");
      return;
    }
    setModal(false);
    load();
  }

  async function save(s: Stat) {
    await fetch(`/api/admin/stats/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        value: s.value,
        label: s.label,
        metric: s.metric,
        auto: s.auto,
      }),
    });
    load();
  }

  async function toggle(s: Stat) {
    await fetch(`/api/admin/stats/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Ko'rsatkich o'chirilsinmi?")) return;
    await fetch(`/api/admin/stats/${id}`, { method: "DELETE" });
    load();
  }

  function edit(id: string, patch: Partial<Stat>) {
    setStats((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  // Metrikaga mos haqiqiy son (tavsiya uchun)
  function realOf(metric: Metric | null): number | null {
    if (!metric || !counts) return null;
    return counts[metric];
  }

  return (
    <div>
      {/* Haqiqiy sonlar — tavsiya paneli */}
      {counts && (
        <Card className="mb-4 p-4">
          <p className="text-sm font-medium text-foreground">
            Platformadagi haqiqiy sonlar
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Bularni ko'rsatkich qiymati sifatida ishlatishingiz mumkin. Yoki
            “Avto”ni yoqsangiz — bosh sahifada shu son avtomatik yangilanib turadi.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            {(Object.keys(METRIC_LABEL) as Metric[]).map((m) => (
              <div key={m} className="rounded-xl bg-surface-2 py-3">
                <p className="text-lg font-bold text-foreground">
                  {counts[m].toLocaleString("uz-UZ")}
                </p>
                <p className="text-[11px] text-muted">{METRIC_LABEL[m]}</p>
                <p className="mt-0.5 text-[11px] font-medium text-accent">
                  {formatMetricValue(counts[m])}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="mb-4 flex justify-end">
        <Button onClick={openModal}>
          <Plus className="h-4 w-4" /> Ko'rsatkich qo'shish
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : stats.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <BarChart3 className="h-10 w-10 text-muted/40" />
          <p className="mt-3 font-medium text-foreground">Ko'rsatkich yo'q</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Masalan: qiymat “500+”, izoh “Restoran”. Qo'shsangiz bosh sahifada
            chiqadi.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => {
            const real = realOf(s.metric);
            const suggestion = real != null ? formatMetricValue(real) : null;
            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-medium text-muted">Ko'rsatkich</span>
                  <button
                    onClick={() => remove(s.id)}
                    className="text-muted hover:text-error"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  <div>
                    <Label className="text-xs">Qiymat</Label>
                    <Input
                      value={s.auto && suggestion ? suggestion : s.value}
                      onChange={(e) => edit(s.id, { value: e.target.value })}
                      placeholder="500+"
                      disabled={s.auto}
                    />
                    {s.auto && (
                      <p className="mt-1 text-[11px] text-accent">
                        Avto — bosh sahifada haqiqiy son ko'rsatiladi
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Izoh</Label>
                    <Input
                      value={s.label}
                      onChange={(e) => edit(s.id, { label: e.target.value })}
                      placeholder="Restoran"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Haqiqiy ko'rsatkichga bog'lash</Label>
                    <select
                      value={s.metric ?? ""}
                      onChange={(e) =>
                        edit(s.id, {
                          metric: (e.target.value || null) as Metric | null,
                          // metrika olib tashlansa — avto ham o'chadi
                          auto: e.target.value ? s.auto : false,
                        })
                      }
                      className="h-10 w-full rounded-lg border border-border bg-card px-2 text-sm text-foreground outline-none focus:border-accent"
                    >
                      <option value="">— Bog'lanmagan (qo'lda)</option>
                      <option value="restaurants">Restoran va kafe soni</option>
                      <option value="products">Menyu mahsuloti soni</option>
                      <option value="scans">QR skaner soni</option>
                    </select>
                  </div>
                  {/* Tavsiya: haqiqiy sonni qiymatga qo'yish */}
                  {suggestion && !s.auto && (
                    <button
                      type="button"
                      onClick={() => edit(s.id, { value: suggestion })}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-accent/50 py-2 text-xs font-medium text-accent hover:bg-accent/5"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      Tavsiya: {suggestion} ({real!.toLocaleString("uz-UZ")}) — qo'llash
                    </button>
                  )}
                </div>
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {s.metric && (
                    <Switch
                      checked={s.auto}
                      onChange={() => edit(s.id, { auto: !s.auto })}
                      label={s.auto ? "Avto (haqiqiy son)" : "Qo'lda qiymat"}
                    />
                  )}
                  <div className="flex items-center justify-between">
                    <Switch
                      checked={s.isActive}
                      onChange={() => toggle(s)}
                      label={s.isActive ? "Ko'rinadi" : "Yashirin"}
                    />
                    <Button size="sm" variant="outline" onClick={() => save(s)}>
                      <Save className="h-3.5 w-3.5" /> Saqlash
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Yangi ko'rsatkich">
        <form onSubmit={create} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </div>
          )}
          <div>
            <Label>Qiymat</Label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="500+"
              required
            />
          </div>
          <div>
            <Label>Izoh</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Restoran"
              required
            />
          </div>
          <p className="text-xs text-muted">
            Qo'shgandan so'ng kartada haqiqiy songa bog'lash va “Avto”ni yoqishingiz
            mumkin.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>
              Bekor
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
