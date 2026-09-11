"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Ban, Check, Utensils, AlertTriangle } from "lucide-react";
import { parseJson, formatPrice } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  price: number;
  images: string | null;
  isAvailable: boolean;
  categoryId: string;
  category: { name: string } | null;
};

function firstImg(images: string | null): string | null {
  const arr = parseJson<string[]>(images || "[]", []);
  return arr[0] || null;
}

// Stop-list (86 list) — tugagan taomlarni bir bosishда menyuдан vaqtincha yashirish.
// "Mavjud emas" qilingan taom mijoz menyusida "tugadi" ko'rinadi va buyurtma qilib bo'lmaydi.
export function StopList({ currency }: { currency: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [onlyStopped, setOnlyStopped] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setProducts(j.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function toggle(p: Product) {
    const next = !p.isAvailable;
    setBusy(p.id);
    // Optimistik
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, isAvailable: next } : x)));
    const res = await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: next }),
    }).catch(() => null);
    setBusy(null);
    if (!res || !res.ok) {
      // Qaytarib qo'yamiz
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, isAvailable: !next } : x)));
    }
  }

  const stoppedCount = products.filter((p) => !p.isAvailable).length;

  const filtered = useMemo(() => {
    let list = products;
    if (onlyStopped) list = list.filter((p) => !p.isAvailable);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(s));
    }
    return list;
  }, [products, onlyStopped, q]);

  // Kategoriya bo'yicha guruhlash
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; items: Product[] }>();
    for (const p of filtered) {
      const key = p.categoryId;
      const name = p.category?.name || "Boshqa";
      const g = map.get(key) || { name, items: [] };
      g.items.push(p);
      map.set(key, g);
    }
    return [...map.values()];
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Xulosa */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 ${
            stoppedCount > 0 ? "border-error/40 bg-error/5" : "border-border bg-card"
          }`}
        >
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              stoppedCount > 0 ? "bg-error/10 text-error" : "bg-success/10 text-success"
            }`}
          >
            {stoppedCount > 0 ? <AlertTriangle className="h-5 w-5" /> : <Check className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-lg font-bold text-foreground">{stoppedCount}</p>
            <p className="text-xs text-muted">Hozir stop-listда</p>
          </div>
        </div>
        <p className="max-w-md text-sm text-muted">
          Taom tugaganda uni o'chiring — mijoz menyusida darhol &quot;mavjud emas&quot; bo'ladi va
          buyurtma qilib bo'lmaydi. Qaytib kelganda yoqib qo'ying.
        </p>
      </div>

      {/* Qidiruv + filtr */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Taom qidirish..."
            className="h-11 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={() => setOnlyStopped((v) => !v)}
          className={`flex h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition ${
            onlyStopped ? "border-error/40 bg-error/5 text-error" : "border-border text-muted hover:text-foreground"
          }`}
        >
          <Ban className="h-4 w-4" /> Faqat tugaganlar
        </button>
      </div>

      {/* Ro'yxat */}
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted">
          {onlyStopped ? "Stop-listда taom yo'q — hammasi mavjud 🎉" : "Taom topilmadi"}
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.name}>
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted">
                {g.name}
              </p>
              <div className="space-y-2">
                {g.items.map((p) => {
                  const img = firstImg(p.images);
                  const off = !p.isAvailable;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 rounded-xl border p-2.5 transition ${
                        off ? "border-error/30 bg-error/5" : "border-border bg-card"
                      }`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt={p.name}
                            className={`h-full w-full object-cover ${off ? "grayscale" : ""}`}
                          />
                        ) : (
                          <Utensils className="h-5 w-5 text-muted/40" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium ${off ? "text-muted line-through" : "text-foreground"}`}>
                          {p.name}
                        </p>
                        <p className="text-xs text-muted">{formatPrice(p.price, currency)}</p>
                      </div>
                      {off && (
                        <span className="rounded-md bg-error/10 px-2 py-0.5 text-[11px] font-semibold text-error">
                          Tugadi
                        </span>
                      )}
                      {/* Yoqish/o'chirish tugmasi */}
                      <button
                        onClick={() => toggle(p)}
                        disabled={busy === p.id}
                        title={off ? "Menyuга qaytarish" : "Stop-listга qo'shish"}
                        className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition ${
                          off ? "bg-surface-2" : "bg-success"
                        } disabled:opacity-50`}
                      >
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition ${
                            off ? "translate-x-0" : "translate-x-6"
                          }`}
                        >
                          {busy === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
                          ) : off ? (
                            <Ban className="h-3.5 w-3.5 text-error" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-success" />
                          )}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
