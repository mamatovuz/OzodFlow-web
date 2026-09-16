"use client";

import { useRef, useState } from "react";
import {
  Sparkles,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  Trash2,
  ImagePlus,
} from "lucide-react";
import { Button, Card, Switch } from "@/components/ui";

type AiProduct = { name: string; price: number; description?: string; imagePrompt?: string; _keep?: boolean };
type AiCategory = { name: string; nameRu?: string; products: AiProduct[] };

type Phase = "idle" | "uploading" | "analyzing" | "preview" | "creating" | "done";

export function AiImport({ onImported }: { onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [cats, setCats] = useState<AiCategory[]>([]);
  const [withImages, setWithImages] = useState(true);
  const [result, setResult] = useState<{ createdProducts: number; createdCategories: number; imagesMade: number } | null>(null);

  async function uploadPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPhase("uploading");
    setError("");
    const urls: string[] = [];
    for (const f of files.slice(0, 8)) {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok && json?.data?.url) urls.push(json.data.url);
    }
    if (fileRef.current) fileRef.current.value = "";
    if (urls.length === 0) {
      setError("Rasm yuklanmadi");
      setPhase("idle");
      return;
    }
    setImages((prev) => [...prev, ...urls].slice(0, 8));
    setPhase("idle");
  }

  async function analyze() {
    if (images.length === 0) {
      setError("Avval menyu rasmini yuklang");
      return;
    }
    setPhase("analyzing");
    setError("");
    const res = await fetch("/api/products/ai-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "analyze", images }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setError(json.error || "AI tahlil qila olmadi");
      setPhase("idle");
      return;
    }
    const parsed: AiCategory[] = json.data.categories.map((c: AiCategory) => ({
      ...c,
      products: c.products.map((p) => ({ ...p, _keep: true })),
    }));
    setCats(parsed);
    setPhase("preview");
  }

  async function create() {
    const payload = cats
      .map((c) => ({
        name: c.name,
        nameRu: c.nameRu,
        products: c.products.filter((p) => p._keep !== false),
      }))
      .filter((c) => c.products.length > 0);
    if (payload.length === 0) {
      setError("Kamida bitta mahsulot qoldiring");
      return;
    }
    setPhase("creating");
    setError("");
    const res = await fetch("/api/products/ai-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "create", categories: payload, withImages }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setError(json.error || "Yaratishda xatolik");
      setPhase("preview");
      return;
    }
    setResult(json.data);
    setPhase("done");
    onImported();
  }

  function reset() {
    setPhase("idle");
    setImages([]);
    setCats([]);
    setResult(null);
    setError("");
  }

  const totalPreview = cats.reduce((s, c) => s + c.products.filter((p) => p._keep !== false).length, 0);

  return (
    <Card className="mt-6 border-accent/30 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">AI bilan menyu qo'shish</h3>
          <p className="mt-0.5 text-sm text-muted">
            Menyu rasmini yuklang — AI o'zi kategoriya ochadi, taomlarni qo'shadi
            va har biriga rasm yasab beradi.
          </p>
        </div>
      </div>

      {/* Rasm yuklash */}
      {(phase === "idle" || phase === "uploading") && (
        <>
          {images.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {images.map((u) => (
                <div key={u} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="menyu" className="h-20 w-20 rounded-lg border border-border object-cover" />
                  <button
                    onClick={() => setImages((prev) => prev.filter((x) => x !== u))}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={uploadPhotos} className="hidden" />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={phase === "uploading"} className="w-full sm:w-auto">
              {phase === "uploading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              Menyu rasmini yuklash
            </Button>
            <Button onClick={analyze} disabled={images.length === 0} className="w-full sm:w-auto">
              <Sparkles className="h-4 w-4" /> AI bilan tahlil qilish
            </Button>
          </div>
        </>
      )}

      {phase === "analyzing" && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-3 text-sm text-accent">
          <Loader2 className="h-4 w-4 animate-spin" /> AI menyuni o'qimoqda... (10-30 soniya)
        </div>
      )}

      {/* Preview — tahrirlash */}
      {phase === "preview" && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-accent-soft px-3 py-2">
            <p className="text-sm font-medium text-accent">
              {cats.length} kategoriya · {totalPreview} taom topildi. Tekshiring va tasdiqlang.
            </p>
          </div>

          <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {cats.map((c, ci) => (
              <div key={ci} className="rounded-xl border border-border p-3">
                <input
                  value={c.name}
                  onChange={(e) => {
                    const next = [...cats];
                    next[ci] = { ...c, name: e.target.value };
                    setCats(next);
                  }}
                  className="mb-2 w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground outline-none focus:border-accent"
                />
                <div className="space-y-1.5">
                  {c.products.map((p, pi) => (
                    <div
                      key={pi}
                      className={`flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 ${
                        p._keep === false ? "opacity-40" : ""
                      }`}
                    >
                      <input
                        value={p.name}
                        onChange={(e) => {
                          const next = [...cats];
                          next[ci].products[pi] = { ...p, name: e.target.value };
                          setCats(next);
                        }}
                        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
                      />
                      <input
                        type="number"
                        value={p.price}
                        onChange={(e) => {
                          const next = [...cats];
                          next[ci].products[pi] = { ...p, price: Number(e.target.value) };
                          setCats(next);
                        }}
                        className="w-24 rounded border border-border bg-card px-2 py-1 text-right text-sm text-foreground outline-none focus:border-accent"
                      />
                      <button
                        onClick={() => {
                          const next = [...cats];
                          next[ci].products[pi] = { ...p, _keep: p._keep === false };
                          setCats(next);
                        }}
                        className="text-muted hover:text-error"
                        title="O'chirish/qaytarish"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <span className="text-sm text-foreground">
              Har bir taomga AI rasm yasab bersin
              <span className="block text-xs text-muted">Sekinroq, lekin rasmlar avtomatik qo'shiladi</span>
            </span>
            <Switch checked={withImages} onChange={setWithImages} />
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={reset}>Bekor qilish</Button>
            <Button onClick={create} disabled={totalPreview === 0}>
              <CheckCircle2 className="h-4 w-4" /> {totalPreview} taomni qo'shish
            </Button>
          </div>
        </div>
      )}

      {phase === "creating" && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-3 text-sm text-accent">
          <Loader2 className="h-4 w-4 animate-spin" />
          {withImages ? "Taomlar qo'shilmoqda va rasmlar yasalmoqda... (biroz vaqt oladi)" : "Taomlar qo'shilmoqda..."}
        </div>
      )}

      {phase === "done" && result && (
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-2 rounded-lg bg-success/10 px-3 py-3 text-sm text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <b>{result.createdProducts} ta</b> taom, <b>{result.createdCategories} ta</b> kategoriya qo'shildi
              {result.imagesMade > 0 && <> · {result.imagesMade} ta rasm yasaldi</>}.
            </span>
          </div>
          <Button variant="outline" onClick={reset}>Yana qo'shish</Button>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </Card>
  );
}
