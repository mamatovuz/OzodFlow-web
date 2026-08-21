"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  UserRound,
  Copy,
  Check,
  Trophy,
} from "lucide-react";
import { Button, Input, Label, Badge } from "@/components/ui";
import { Modal } from "@/components/ui-modal";
import { formatPrice } from "@/lib/utils";

type Waiter = {
  id: string;
  name: string;
  lastName: string | null;
  age: number | null;
  code: string;
  isActive: boolean;
};

type StatRow = {
  id: string;
  name: string;
  lastName: string | null;
  code: string;
  isActive: boolean;
  orders: number;
  dishes: number;
  total: number;
};

const PERIODS = [
  { key: "today", label: "Bugun" },
  { key: "week", label: "Hafta" },
  { key: "month", label: "Oy" },
  { key: "all", label: "Butun davr" },
] as const;

export function WaitersManager({ currency }: { currency: string }) {
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Waiter | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState("");

  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("week");
  const [stats, setStats] = useState<StatRow[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  async function loadWaiters() {
    setLoading(true);
    const r = await fetch("/api/waiters");
    const j = await r.json();
    if (j.success) setWaiters(j.data);
    setLoading(false);
  }
  async function loadStats(p = period) {
    setStatsLoading(true);
    const r = await fetch(`/api/waiters/stats?period=${p}`);
    const j = await r.json();
    if (j.success) setStats(j.data.rows);
    setStatsLoading(false);
  }

  useEffect(() => {
    loadWaiters();
  }, []);
  useEffect(() => {
    loadStats(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function remove(w: Waiter) {
    if (!confirm(`${w.name} o'chirilsinmi? Statistikadagi eski buyurtmalar qoladi.`)) return;
    const r = await fetch(`/api/waiters/${w.id}`, { method: "DELETE" });
    if (r.ok) {
      setWaiters((list) => list.filter((x) => x.id !== w.id));
      loadStats();
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(""), 1500);
  }

  return (
    <div className="space-y-8">
      {/* ─── Statistika ─── */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-foreground">Sotuv statistikasi</h2>
          <div className="inline-flex rounded-full border border-border p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p.key ? "bg-accent text-white" : "text-muted hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {statsLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : stats.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Hozircha ofitsant yo'q.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="pb-2 pr-2 font-medium">Ofitsant</th>
                  <th className="pb-2 px-2 text-right font-medium">Buyurtma</th>
                  <th className="pb-2 px-2 text-right font-medium">Taom</th>
                  <th className="pb-2 pl-2 text-right font-medium">Summa</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={s.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-2">
                        {i === 0 && s.total > 0 ? (
                          <Trophy className="h-4 w-4 shrink-0 text-warning" />
                        ) : (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                            {s.name[0]?.toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {s.name} {s.lastName || ""}
                          </p>
                          <p className="truncate text-[11px] text-muted">Kod: {s.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 text-right text-foreground">{s.orders}</td>
                    <td className="px-2 text-right text-foreground">{s.dishes}</td>
                    <td className="pl-2 text-right font-semibold text-foreground">
                      {formatPrice(s.total, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── Ofitsantlar ro'yxati ─── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Ofitsantlar ro'yxati</h2>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Ofitsant qo'shish
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : waiters.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-12 text-center">
            <UserRound className="h-9 w-9 text-muted/40" />
            <p className="mt-3 text-sm text-muted">Hali ofitsant qo'shilmagan.</p>
            <Button className="mt-4" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Birinchi ofitsantni qo'shing
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {waiters.map((w) => (
              <div key={w.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                      {w.name[0]?.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {w.name} {w.lastName || ""}
                      </p>
                      {w.age ? <p className="text-xs text-muted">{w.age} yosh</p> : null}
                    </div>
                  </div>
                  {!w.isActive && <Badge>O'chiq</Badge>}
                </div>

                <button
                  onClick={() => copyCode(w.code)}
                  className="mt-3 flex w-full items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-left"
                >
                  <span>
                    <span className="block text-[11px] text-muted">Kod</span>
                    <span className="font-mono text-base font-bold text-foreground">{w.code}</span>
                  </span>
                  {copied === w.code ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted" />
                  )}
                </button>

                <div className="mt-3 flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setEditing(w)}>
                    <Pencil className="h-4 w-4" /> Tahrir
                  </Button>
                  <Button
                    variant="outline"
                    className="px-3 text-error"
                    onClick={() => remove(w)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {(creating || editing) && (
        <WaiterModal
          waiter={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            loadWaiters();
            loadStats();
          }}
        />
      )}
    </div>
  );
}

function WaiterModal({
  waiter,
  onClose,
  onSaved,
}: {
  waiter: Waiter | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(waiter?.name || "");
  const [lastName, setLastName] = useState(waiter?.lastName || "");
  const [age, setAge] = useState(waiter?.age ? String(waiter.age) : "");
  const [code, setCode] = useState(waiter?.code || "");
  const [isActive, setIsActive] = useState(waiter?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    if (!name.trim()) return setError("Ism kiriting");
    if (!code.trim()) return setError("Kod kiriting");
    setSaving(true);
    const payload = {
      name: name.trim(),
      lastName: lastName.trim() || null,
      age: age ? Number(age) : null,
      code: code.trim(),
      isActive,
    };
    const res = await fetch(waiter ? `/api/waiters/${waiter.id}` : "/api/waiters", {
      method: waiter ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) return setError(json.error || "Xatolik");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={waiter ? "Ofitsantni tahrirlash" : "Yangi ofitsant"}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Ism *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kamron" />
          </div>
          <div>
            <Label>Familiya</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Aliyev" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Yosh</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="23"
            />
          </div>
          <div>
            <Label>Kod *</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="1 yoki @kamron"
              className="font-mono"
            />
          </div>
        </div>
        <p className="text-xs text-muted">
          Kodni o'zingiz belgilaysiz: raqam (1, 2, 3...), harf yoki belgi (@#$%) —
          faqat bo'sh joysiz. Mijoz buyurtmada shu kodni kiritadi.
        </p>

        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <span className="text-sm text-foreground">Faol (buyurtma qabul qiladi)</span>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-5 w-5 accent-[var(--accent,#2563eb)]"
          />
        </label>

        {error && (
          <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Saqlash
          </Button>
        </div>
      </div>
    </Modal>
  );
}
