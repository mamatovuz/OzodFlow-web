"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  ImagePlus,
  Check,
  CheckCircle2,
} from "lucide-react";

// ─────────────────────────────────────────────
// Dashboard AI yordamchisi — pastki o'ng burchakdagi suzuvchi tugma.
// Tabiiy tilda: sotuvni ko'rsatadi, taom qo'shadi (rasm bilan), menyu rasm(lar)ini
// import qiladi (avval preview). Responsive: mobil'da pastki varaq, desktop'da karta.
// ─────────────────────────────────────────────

type Msg =
  | { id: string; role: "user"; kind: "text"; text: string }
  | { id: string; role: "assistant"; kind: "text"; text: string }
  | { id: string; role: "assistant"; kind: "product"; text: string; image: string | null; name: string }
  | {
      id: string;
      role: "assistant";
      kind: "confirm";
      text: string;
      productId: string;
      name: string;
      state: "pending" | "done" | "cancelled";
    }
  | {
      id: string;
      role: "assistant";
      kind: "menu";
      text: string;
      categories: MenuCat[];
      total: number;
      state: "preview" | "creating" | "done";
      progress: { done: number; total: number };
    }
  | {
      id: string;
      role: "assistant";
      kind: "fillimg";
      text: string;
      items: { id: string; prompt: string }[];
      state: "preview" | "creating" | "done";
      progress: { done: number; total: number };
    };

type MenuProduct = { name: string; price: number; imagePrompt?: string };
type MenuCat = { name: string; nameRu?: string; products: MenuProduct[] };

const uid = () => Math.random().toString(36).slice(2);

const QUICK = [
  "Bugungi sotuv",
  "Eng ko'p sotilgan",
  "Bu hafta daromad",
  "Lavash qo'sh, Fastfud, 25000",
];

export function AssistantWidget() {
  const router = useRouter();
  const onChanged = () => router.refresh();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  function push(m: Msg) {
    setMsgs((prev) => [...prev, m]);
  }

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    push({ id: uid(), role: "user", kind: "text", text: q });
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        push({ id: uid(), role: "assistant", kind: "text", text: json.error || "Xatolik yuz berdi" });
      } else if (json.data.type === "product_added") {
        push({
          id: uid(),
          role: "assistant",
          kind: "product",
          text: json.data.reply,
          image: json.data.product?.image || null,
          name: json.data.product?.name || "",
        });
        onChanged?.();
      } else if (json.data.type === "fill_images") {
        push({
          id: uid(),
          role: "assistant",
          kind: "fillimg",
          text: json.data.reply,
          items: json.data.items || [],
          state: "preview",
          progress: { done: 0, total: 0 },
        });
      } else if (json.data.type === "confirm") {
        push({
          id: uid(),
          role: "assistant",
          kind: "confirm",
          text: json.data.reply,
          productId: json.data.productId,
          name: json.data.name || "",
          state: "pending",
        });
      } else {
        push({ id: uid(), role: "assistant", kind: "text", text: json.data.reply || "..." });
      }
    } catch {
      push({ id: uid(), role: "assistant", kind: "text", text: "Ulanishда xatolik. Qayta urinib ko'ring." });
    }
    setBusy(false);
  }

  // Menyu rasm(lar)ini yuklab, tahlil qilib, preview qaytaradi
  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (fileRef.current) fileRef.current.value = "";
    if (files.length === 0 || busy) return;
    push({ id: uid(), role: "user", kind: "text", text: `📷 ${files.length} ta menyu rasmi` });
    setBusy(true);
    const thinking = uid();
    push({ id: thinking, role: "assistant", kind: "text", text: "Menyuni o'qiyapman..." });
    try {
      const urls: string[] = [];
      for (const f of files.slice(0, 24)) {
        const fd = new FormData();
        fd.append("file", f);
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        const j = await r.json();
        if (r.ok && j?.data?.url) urls.push(j.data.url);
      }
      if (urls.length === 0) throw new Error("upload");

      const res = await fetch("/api/products/ai-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "analyze", images: urls }),
      });
      const json = await res.json();
      setMsgs((prev) => prev.filter((m) => m.id !== thinking));
      if (!res.ok || !json.success) {
        push({ id: uid(), role: "assistant", kind: "text", text: json.error || "Menyu o'qilmadi" });
      } else {
        push({
          id: uid(),
          role: "assistant",
          kind: "menu",
          text: `${json.data.categories.length} kategoriya · ${json.data.totalProducts} taom topildi.`,
          categories: json.data.categories,
          total: json.data.totalProducts,
          state: "preview",
          progress: { done: 0, total: 0 },
        });
      }
    } catch {
      setMsgs((prev) => prev.filter((m) => m.id !== thinking));
      push({ id: uid(), role: "assistant", kind: "text", text: "Menyuni o'qib bo'lmadi. Aniqroq rasm bilan urinib ko'ring." });
    }
    setBusy(false);
  }

  // Preview'dagi menyuni tasdiqlab qo'shish (rasmlar bilan)
  async function confirmMenu(id: string) {
    const m = msgs.find((x) => x.id === id);
    if (!m || m.kind !== "menu") return;
    const payload = m.categories
      .map((c) => ({ name: c.name, nameRu: c.nameRu, products: c.products }))
      .filter((c) => c.products.length > 0);

    setMsgs((prev) => prev.map((x) => (x.id === id && x.kind === "menu" ? { ...x, state: "creating" } : x)));
    try {
      const res = await fetch("/api/products/ai-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "create", categories: payload, withImages: true }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      onChanged?.();

      const pending: { id: string; prompt: string }[] = json.data.pendingImages || [];
      if (pending.length > 0) {
        setMsgs((prev) =>
          prev.map((x) => (x.id === id && x.kind === "menu" ? { ...x, progress: { done: 0, total: pending.length } } : x))
        );
        const BATCH = 4;
        for (let i = 0; i < pending.length; i += BATCH) {
          const items = pending.slice(i, i + BATCH);
          await fetch("/api/products/ai-import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ step: "images", items, mode: "mixed" }),
          }).catch(() => {});
          const done = Math.min(i + BATCH, pending.length);
          setMsgs((prev) =>
            prev.map((x) => (x.id === id && x.kind === "menu" ? { ...x, progress: { done, total: pending.length } } : x))
          );
          onChanged?.();
        }
      }
      setMsgs((prev) => prev.map((x) => (x.id === id && x.kind === "menu" ? { ...x, state: "done" } : x)));
      onChanged?.();
    } catch {
      setMsgs((prev) => prev.map((x) => (x.id === id && x.kind === "menu" ? { ...x, state: "preview" } : x)));
      push({ id: uid(), role: "assistant", kind: "text", text: "Qo'shishda xatolik. Qayta urinib ko'ring." });
    }
  }

  // Rasmsiz taomlarga rasm qo'shish (ai-import "images" step, progress bilan)
  async function runFillImages(id: string) {
    const m = msgs.find((x) => x.id === id);
    if (!m || m.kind !== "fillimg" || m.items.length === 0) return;
    const items = m.items;
    setMsgs((prev) =>
      prev.map((x) => (x.id === id && x.kind === "fillimg" ? { ...x, state: "creating", progress: { done: 0, total: items.length } } : x))
    );
    const BATCH = 4;
    for (let i = 0; i < items.length; i += BATCH) {
      const batch = items.slice(i, i + BATCH);
      await fetch("/api/products/ai-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "images", items: batch, mode: "mixed" }),
      }).catch(() => {});
      const done = Math.min(i + BATCH, items.length);
      setMsgs((prev) =>
        prev.map((x) => (x.id === id && x.kind === "fillimg" ? { ...x, progress: { done, total: items.length } } : x))
      );
      onChanged?.();
    }
    setMsgs((prev) => prev.map((x) => (x.id === id && x.kind === "fillimg" ? { ...x, state: "done" } : x)));
    onChanged?.();
  }

  // Xavfli amal (o'chirish) tasdig'i
  async function runDelete(id: string) {
    const m = msgs.find((x) => x.id === id);
    if (!m || m.kind !== "confirm") return;
    setMsgs((prev) => prev.map((x) => (x.id === id && x.kind === "confirm" ? { ...x, state: "done" } : x)));
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: { action: "del", productId: m.productId, name: m.name } }),
      });
      const json = await res.json();
      push({ id: uid(), role: "assistant", kind: "text", text: json?.data?.reply || "O'chirildi." });
      onChanged?.();
    } catch {
      push({ id: uid(), role: "assistant", kind: "text", text: "O'chirishда xatolik." });
    }
  }
  function cancelConfirm(id: string) {
    setMsgs((prev) => prev.map((x) => (x.id === id && x.kind === "confirm" ? { ...x, state: "cancelled" } : x)));
  }

  return (
    <>
      {/* Suzuvchi tugma */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="AI yordamchi"
          className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition hover:scale-105 active:scale-95"
          style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-card shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[380px] sm:rounded-2xl sm:border sm:border-border"
          style={{
            height: "min(82vh, 620px)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {/* Sarlavha */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">AI yordamchi</p>
                <p className="text-[11px] text-muted">Sotuv · taom qo'shish · menyu</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Xabarlar */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {msgs.length === 0 && (
              <div className="pt-2">
                <p className="text-sm text-muted">
                  Salom! Men OzodFlow yordamchisiman. So'rang:
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground hover:border-accent hover:text-accent"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted">
                  Men bilan qila olasiz: sotuv/statistika, taom qo'shish (rasm bilan),
                  narx o'zgartirish, stop-list, yashirish, o'chirish. Yoki 📷 menyu
                  rasmini yuklang — o'qib qo'shaman.
                </p>
              </div>
            )}

            {msgs.map((m) => (
              <MessageBubble
                key={m.id}
                m={m}
                onMenuConfirm={() => confirmMenu(m.id)}
                onFillImages={() => runFillImages(m.id)}
                onDelete={() => runDelete(m.id)}
                onCancel={() => cancelConfirm(m.id)}
              />
            ))}

            {busy && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> O'ylayapman...
              </div>
            )}
          </div>

          {/* Kiritish */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFiles} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                title="Menyu rasmini yuklash"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted hover:text-accent disabled:opacity-50"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="So'rang yoki taom qo'shing..."
                className="max-h-28 min-h-[40px] flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
              <button
                onClick={() => send()}
                disabled={busy || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-white disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MessageBubble({
  m,
  onMenuConfirm,
  onFillImages,
  onDelete,
  onCancel,
}: {
  m: Msg;
  onMenuConfirm: () => void;
  onFillImages: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-3 py-2 text-sm text-white">{m.text}</div>
      </div>
    );
  }

  if (m.kind === "product") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-border bg-surface px-3 py-2">
          <div className="flex items-center gap-2">
            {m.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.image} alt={m.name} className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Check className="h-5 w-5" />
              </span>
            )}
            <p className="text-sm text-foreground">{m.text}</p>
          </div>
        </div>
      </div>
    );
  }

  if (m.kind === "confirm") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-error/30 bg-error/5 px-3 py-2.5">
          <p className="text-sm text-foreground">{m.text}</p>
          {m.state === "pending" && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={onDelete}
                className="rounded-lg bg-error px-3 py-1.5 text-xs font-semibold text-white hover:bg-error/90"
              >
                Ha, o'chir
              </button>
              <button
                onClick={onCancel}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2"
              >
                Bekor
              </button>
            </div>
          )}
          {m.state === "done" && <p className="mt-1.5 text-xs text-muted">O'chirildi.</p>}
          {m.state === "cancelled" && <p className="mt-1.5 text-xs text-muted">Bekor qilindi.</p>}
        </div>
      </div>
    );
  }

  if (m.kind === "fillimg") {
    const pct = m.progress.total ? Math.round((m.progress.done / m.progress.total) * 100) : 0;
    return (
      <div className="flex justify-start">
        <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-border bg-surface px-3 py-2.5">
          <p className="text-sm text-foreground">{m.text}</p>
          {m.state === "preview" && (
            <button
              onClick={onFillImages}
              className="mt-2 flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/90"
            >
              <ImagePlus className="h-3.5 w-3.5" /> Rasm qo'shish
            </button>
          )}
          {m.state === "creating" && (
            <div className="mt-2">
              <div className="flex items-center gap-1.5 text-xs text-accent">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Rasmlar: {m.progress.done}/{m.progress.total}
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-accent/15">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
          {m.state === "done" && (
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Rasmlar qo'shildi
            </p>
          )}
        </div>
      </div>
    );
  }

  if (m.kind === "menu") {
    const pct = m.progress.total ? Math.round((m.progress.done / m.progress.total) * 100) : 0;
    return (
      <div className="flex justify-start">
        <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-border bg-surface px-3 py-2.5">
          <p className="text-sm text-foreground">{m.text}</p>
          {m.state === "preview" && (
            <button
              onClick={onMenuConfirm}
              className="mt-2 flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/90"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Menyuni qo'shish
            </button>
          )}
          {m.state === "creating" && (
            <div className="mt-2">
              <div className="flex items-center gap-1.5 text-xs text-accent">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {m.progress.total ? `Rasmlar: ${m.progress.done}/${m.progress.total}` : "Qo'shilmoqda..."}
              </div>
              {m.progress.total > 0 && (
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-accent/15">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          )}
          {m.state === "done" && (
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Menyu qo'shildi
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-border bg-surface px-3 py-2 text-sm text-foreground">
        {m.text}
      </div>
    </div>
  );
}
