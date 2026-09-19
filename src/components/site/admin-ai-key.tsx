"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, Plus, KeyRound, Check } from "lucide-react";

type AiKey = { id: string; provider: string; hint: string; model: string; isActive: boolean };

function provLabel(p: string): string {
  return p === "openai" ? "OpenAI" : p === "anthropic" ? "Claude" : "Gemini";
}
function provColor(p: string): string {
  return p === "openai"
    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
    : p === "anthropic"
      ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
      : "bg-accent/15 text-accent";
}

export function AdminAiKey() {
  const [keys, setKeys] = useState<AiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  async function load() {
    const r = await fetch("/api/site/ai-key").then((x) => x.json()).catch(() => ({}));
    setKeys(Array.isArray(r?.data) ? r.data : []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (value.trim().length < 10) return setErr("Kalit juda qisqa.");
    setBusy(true);
    setErr("");
    setOkMsg("");
    const r = await fetch("/api/site/ai-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: value.trim() }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j?.error || "Qo'shilmadi");
    setValue("");
    setOkMsg(`${provLabel(j.data.provider)} kaliti qo'shildi ✓`);
    load();
  }

  async function del(id: string) {
    if (!confirm("Bu kalitni o'chirasizmi?")) return;
    await fetch(`/api/site/ai-key?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-accent" />
        <h2 className="font-semibold">AI kalit (ovozli o'qish uchun)</h2>
      </div>
      <p className="mt-0.5 text-sm text-muted">
        <b>Gemini</b>, <b>OpenAI</b> yoki <b>Claude</b> kalitini qo'ying. Ovozli o'qish uchun Gemini/OpenAI
        kerak (Claude ovoz chiqarmaydi, lekin AI matn — tarjima, savol-javob — uchun ishlaydi). Kalit
        qo'shilsa maqola yaratilganда ovoz avtomatik tayyorlanadi.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="sk-... yoki AIza..."
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        <button
          onClick={add}
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Qo'shish
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
      {okMsg && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" /> {okMsg}
        </p>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda…</p>
        ) : keys.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted">
            Hali kalit yo'q. Kalit qo'ymasangiz ovoz brauzer orqali (sifatsizroq) o'qiladi.
          </p>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${provColor(k.provider)}`}>
                  {provLabel(k.provider)}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted">···{k.hint}</span>
                <span className="hidden shrink-0 text-xs text-muted sm:block">{k.model}</span>
                <button onClick={() => del(k.id)} className="shrink-0 rounded-md p-1.5 text-muted hover:text-red-500" title="O'chirish">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
