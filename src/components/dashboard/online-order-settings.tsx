"use client";

import { useState } from "react";
import { Loader2, Plus, X, ShoppingBag, Info, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, Switch, Button } from "@/components/ui";

export function OnlineOrderSettings({
  enabled,
  adminIds: initialIds,
  botConnected,
  hasCard,
}: {
  enabled: boolean;
  adminIds: string[];
  botConnected: boolean;
  hasCard: boolean;
}) {
  const [on, setOn] = useState(enabled);
  const [ids, setIds] = useState<string[]>(initialIds);
  const [newId, setNewId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  async function patch(payload: Record<string, unknown>) {
    setSaving(true);
    setErr("");
    const res = await fetch("/api/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setErr(j?.error || "Xatolik");
      return false;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    return true;
  }

  async function toggle(v: boolean) {
    setOn(v);
    await patch({ onlineOrderEnabled: v });
  }

  function addId() {
    const v = newId.trim();
    if (!/^-?\d{4,20}$/.test(v)) {
      setErr("ID faqat raqamlardan iborat bo'lishi kerak (botga /me yozing)");
      return;
    }
    if (ids.includes(v)) {
      setNewId("");
      return;
    }
    setIds((p) => [...p, v]);
    setNewId("");
    setErr("");
  }

  async function saveIds(next: string[]) {
    setIds(next);
    await patch({ orderAdminIds: JSON.stringify(next) });
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Onlayn to'lov bilan dastavka</h3>
            <p className="mt-0.5 text-sm text-muted">
              Mijoz dastavka buyurtmasida kartaga to'lab, chek (skrinshot) yuboradi.
              Chek tasdiqlovchi adminlarga boradi — tasdiqlangach buyurtma paydo bo'ladi.
            </p>
          </div>
        </div>
        <Switch checked={on} onChange={toggle} />
      </div>

      {on && (
        <div className="mt-5 space-y-4 border-t border-border pt-4">
          {/* Talablar */}
          <div className="space-y-1.5 text-sm">
            <Req ok={botConnected} text="Telegram bot ulangan (Telegram bo'limi)" />
            <Req ok={hasCard} text="To'lov kartasi kiritilgan (To'lov bo'limi)" />
            <Req ok={ids.length > 0} text="Kamida bitta tasdiqlovchi admin qo'shilgan" />
          </div>

          {/* Adminlar */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              To'lovni tasdiqlovchilar (Telegram ID)
            </label>
            <div className="mb-2 flex items-start gap-2 rounded-lg bg-accent-soft/60 px-3 py-2 text-xs text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <span>
                Botingizga <b className="text-foreground">/me</b> deb yozing — u sizga ID
                beradi. O'sha ID ni bu yerga qo'shing. Xohlagancha admin qo'shishingiz
                mumkin — chek hammasiga boradi.
              </span>
            </div>

            {ids.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {ids.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1 font-mono text-sm text-foreground"
                  >
                    {id}
                    <button
                      onClick={() => saveIds(ids.filter((x) => x !== id))}
                      className="text-muted hover:text-error"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addId()}
                placeholder="Masalan: 123456789"
                inputMode="numeric"
                className="h-10 w-full min-w-0 rounded-lg border border-border bg-card px-3 font-mono text-sm text-foreground outline-none focus:border-accent sm:flex-1"
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={addId} className="flex-1 sm:flex-none">
                  <Plus className="h-4 w-4" /> Qo'shish
                </Button>
                <Button onClick={() => saveIds(ids)} disabled={saving} className="flex-1 sm:flex-none">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Saqlash"}
                </Button>
              </div>
            </div>
          </div>

          {err && <p className="text-sm text-error">{err}</p>}
          {saved && (
            <p className="flex items-center gap-1 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" /> Saqlandi
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function Req({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-2 ${ok ? "text-success" : "text-warning"}`}>
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      <span className={ok ? "text-foreground" : "text-muted"}>{text}</span>
    </div>
  );
}
