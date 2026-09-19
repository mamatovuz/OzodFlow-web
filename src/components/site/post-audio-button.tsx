"use client";

import { useState } from "react";
import { Loader2, Volume2, Check, Trash2 } from "lucide-react";

// Editorda: maqola uchun ovozni qo'lda yaratish/yangilash. Odatda saqlashda
// avtomatik yaratiladi; bu tugma kalit keyin qo'shilganda foydali.
export function PostAudioButton({ postId, hasAudio }: { postId: string; hasAudio: boolean }) {
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");
  const [has, setHas] = useState(hasAudio);
  const [msg, setMsg] = useState("");

  async function gen() {
    setBusy(true);
    setState("idle");
    const r = await fetch(`/api/site/posts/${postId}/audio`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) {
      setHas(true);
      setState("ok");
    } else {
      setState("err");
      setMsg(j?.error || "Yaratilmadi");
    }
  }
  async function clear() {
    if (!confirm("Ovozni o'chirasizmi?")) return;
    await fetch(`/api/site/posts/${postId}/audio`, { method: "DELETE" });
    setHas(false);
    setState("idle");
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        onClick={gen}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
        {has ? "Ovozni yangilash" : "Ovoz yaratish"}
      </button>
      {has && (
        <button onClick={clear} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted hover:text-red-500" title="Ovozni o'chirish">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      {state === "ok" && (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
          <Check className="h-3.5 w-3.5" /> Tayyor
        </span>
      )}
      {state === "err" && <span className="text-xs text-red-500">{msg}</span>}
      {has && state !== "ok" && <span className="text-xs text-muted">Ovoz saqlangan ✓</span>}
    </div>
  );
}
