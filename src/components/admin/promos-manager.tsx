"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Ticket, Users, TrendingDown, Copy, Check } from "lucide-react";
import { Button, Input, Label, Card, Badge, Select, Switch } from "@/components/ui";
import { Modal } from "@/components/ui-modal";
import { formatPrice } from "@/lib/utils";

type Promo = {
  id: string;
  code: string;
  discountPercent: number;
  scope: string;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  paidCount: number;
  totalDiscount: number;
  totalRevenue: number;
  createdAt: string;
};

export function PromosManager() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  async function load() {
    const res = await fetch("/api/admin/promos");
    const json = await res.json();
    if (json.success) setPromos(json.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/promos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: f.get("code"),
        discountPercent: Number(f.get("discountPercent")),
        scope: f.get("scope"),
        maxUses: f.get("maxUses") ? Number(f.get("maxUses")) : null,
      }),
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

  async function toggle(p: Promo) {
    await fetch(`/api/admin/promos/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Promo kod o'chirilsinmi?")) return;
    await fetch(`/api/admin/promos/${id}`, { method: "DELETE" });
    load();
  }
  function copy(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(""), 2000);
  }

  const totalZiyon = promos.reduce((s, p) => s + p.totalDiscount, 0);
  const totalPaid = promos.reduce((s, p) => s + p.paidCount, 0);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Ticket className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-foreground">{promos.length}</p>
          <p className="text-sm text-muted">Promo kodlar</p>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
            <Users className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalPaid}</p>
          <p className="text-sm text-muted">Kod bilan to'laganlar</p>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-error/10 text-error">
            <TrendingDown className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatPrice(totalZiyon, "UZS")}</p>
          <p className="text-sm text-muted">Jami ziyon (chegirma)</p>
        </Card>
      </div>

      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModal(true)}>
          <Plus className="h-4 w-4" /> Promo kod yaratish
        </Button>
      </div>

      {promos.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <Ticket className="h-10 w-10 text-muted/40" />
          <p className="mt-3 font-medium text-foreground">Promo kod yo'q</p>
          <p className="mt-1 text-sm text-muted">Yashirin promo kod yarating (saytda ko'rinmaydi)</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-3 font-medium">Kod</th>
                  <th className="px-4 py-3 font-medium">Chegirma</th>
                  <th className="px-4 py-3 font-medium">Tarif</th>
                  <th className="px-4 py-3 font-medium">To'laganlar</th>
                  <th className="px-4 py-3 font-medium">Ziyon</th>
                  <th className="px-4 py-3 font-medium">Holat</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {promos.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <button onClick={() => copy(p.code)} className="flex items-center gap-1.5 font-mono font-semibold text-foreground">
                        {p.code}
                        {copied === p.code ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted" />
                        )}
                      </button>
                      {p.maxUses && (
                        <p className="text-xs text-muted">
                          {p.usedCount}/{p.maxUses} ishlatilgan
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{p.discountPercent}%</td>
                    <td className="px-4 py-3">
                      <Badge variant="default">{p.scope}</Badge>
                    </td>
                    <td className="px-4 py-3 text-foreground">{p.paidCount}</td>
                    <td className="px-4 py-3 text-error">{formatPrice(p.totalDiscount, "UZS")}</td>
                    <td className="px-4 py-3">
                      <Switch checked={p.isActive} onChange={() => toggle(p)} />
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => remove(p.id)} className="text-muted hover:text-error">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Yangi promo kod">
        <form onSubmit={create} className="space-y-4">
          {error && <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>}
          <div>
            <Label>Kod</Label>
            <Input name="code" placeholder="RAMADAN2026" required className="font-mono uppercase" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Chegirma (%)</Label>
              <Input name="discountPercent" type="number" min={1} max={100} defaultValue={10} required />
            </div>
            <div>
              <Label>Tarif</Label>
              <Select name="scope" defaultValue="ALL">
                <option value="ALL">Barcha</option>
                <option value="PRO">Pro</option>
                <option value="PROMAX">Pro Max</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Maksimal ishlatish (bo'sh = cheksiz)</Label>
            <Input name="maxUses" type="number" min={1} placeholder="Cheksiz" />
          </div>
          <p className="text-xs text-muted">
            Bu kod saytda ko'rinmaydi — faqat kiritganlar ishlatadi.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>
              Bekor
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Yaratish
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
