"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Package, Minus } from "lucide-react";
import { Button, Input, Label, Card, Switch } from "@/components/ui";
import { Modal } from "@/components/ui-modal";
import { ImageUpload } from "@/components/dashboard/image-upload";
import { formatPrice, parseJson } from "@/lib/utils";

type Combo = {
  id: string;
  name: string;
  price: number;
  oldPrice: number | null;
  image: string | null;
  items: string;
  isActive: boolean;
};
type Product = { id: string; name: string; price: number };

export function ComboBuilder({ currency }: { currency: string }) {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [image, setImage] = useState("");
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [c, p] = await Promise.all([
      fetch("/api/combos").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]);
    if (c.success) setCombos(c.data);
    if (p.success) setProducts(p.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function toggleProduct(id: string) {
    setPicked((p) => {
      const n = { ...p };
      if (n[id]) delete n[id];
      else n[id] = 1;
      return n;
    });
  }
  function setQty(id: string, q: number) {
    setPicked((p) => ({ ...p, [id]: Math.max(1, q) }));
  }

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const items = Object.entries(picked).map(([productId, qty]) => {
      const p = products.find((x) => x.id === productId);
      return { productId, name: p?.name || "", qty };
    });
    if (items.length === 0) {
      setError("Kamida bitta mahsulot tanlang");
      return;
    }
    setSaving(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/combos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.get("name"),
        price: Number(f.get("price")),
        oldPrice: f.get("oldPrice") ? Number(f.get("oldPrice")) : null,
        image,
        items,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json()).error || "Xatolik");
      return;
    }
    setModal(false);
    setImage("");
    setPicked({});
    load();
  }

  async function toggleActive(c: Combo) {
    await fetch(`/api/combos/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Combo o'chirilsinmi?")) return;
    await fetch(`/api/combos/${id}`, { method: "DELETE" });
    load();
  }

  const sum = Object.entries(picked).reduce((s, [id, q]) => {
    const p = products.find((x) => x.id === id);
    return s + (p?.price || 0) * q;
  }, 0);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModal(true)} disabled={products.length === 0}>
          <Plus className="h-4 w-4" /> Combo yaratish
        </Button>
      </div>

      {combos.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <Package className="h-10 w-10 text-muted/40" />
          <p className="mt-3 font-medium text-foreground">Combo yo'q</p>
          <p className="mt-1 text-sm text-muted">Bir nechta taomni to'plamga birlashtiring</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {combos.map((c) => {
            const items = parseJson<{ name: string; qty: number }[]>(c.items, []);
            return (
              <Card key={c.id} className="overflow-hidden">
                <div className="h-28 bg-surface-2">
                  {c.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <button onClick={() => remove(c.id)} className="text-muted hover:text-error">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                    {items.map((it) => `${it.qty}× ${it.name}`).join(", ")}
                  </p>
                  <p className="mt-1 font-bold text-foreground">{formatPrice(c.price, currency)}</p>
                  <div className="mt-2 border-t border-border pt-2">
                    <Switch checked={c.isActive} onChange={() => toggleActive(c)} label={c.isActive ? "Faol" : "Nofaol"} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Yangi combo" wide>
        <form onSubmit={create} className="space-y-4">
          {error && <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>}
          <div>
            <Label>Combo rasmi</Label>
            <ImageUpload value={image} onChange={setImage} aspect="wide" label="combo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nomi</Label>
              <Input name="name" placeholder="Combo №1" required />
            </div>
            <div>
              <Label>Narxi</Label>
              <Input name="price" type="number" required />
            </div>
          </div>
          <div>
            <Label>Eski narx (ixtiyoriy)</Label>
            <Input name="oldPrice" type="number" placeholder={sum ? String(sum) : ""} />
          </div>

          <div>
            <Label>Mahsulotlar ({Object.keys(picked).length} tanlangan · to'liq: {formatPrice(sum, currency)})</Label>
            <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-border p-2">
              {products.map((p) => {
                const on = !!picked[p.id];
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${on ? "bg-accent-soft" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleProduct(p.id)}
                      className="flex items-center gap-2 text-left text-sm text-foreground"
                    >
                      <span className={`flex h-4 w-4 items-center justify-center rounded border ${on ? "border-accent bg-accent text-white" : "border-border"}`}>
                        {on && "✓"}
                      </span>
                      {p.name}
                    </button>
                    {on && (
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setQty(p.id, picked[p.id] - 1)} className="rounded border border-border p-0.5">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center text-sm">{picked[p.id]}</span>
                        <button type="button" onClick={() => setQty(p.id, picked[p.id] + 1)} className="rounded border border-border p-0.5">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Bekor</Button>
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
