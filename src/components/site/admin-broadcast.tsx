"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send, Users, Check, Mail } from "lucide-react";

type Subscriber = { id: string; email: string; createdAt: string };

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function AdminBroadcast() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"all" | "select">("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/site/subscribers")
      .then((r) => r.json())
      .then((j) => setSubs(Array.isArray(j?.data) ? j.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const targetEmails = useMemo(() => {
    if (mode === "all") return undefined; // barchaga
    return subs.filter((s) => picked.has(s.id)).map((s) => s.email);
  }, [mode, picked, subs]);

  const targetCount = mode === "all" ? subs.length : picked.size;

  function toggle(id: string) {
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function send() {
    if (!body.trim()) return setErr("Xabar matnini yozing.");
    if (targetCount === 0) return setErr("Kamida bitta obunachi tanlang.");
    if (!confirm(`${targetCount} ta obunachiga yuborilsinmi?`)) return;
    setSending(true);
    setErr("");
    setResult(null);
    const bodyHtml = esc(body.trim()).replace(/\n/g, "<br>");
    const res = await fetch("/api/site/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: subject.trim(), bodyHtml, emails: targetEmails }),
    });
    const j = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) return setErr(j?.error || "Yuborilmadi");
    setResult(j.data);
    setSubject("");
    setBody("");
  }

  return (
    <div className="space-y-6">
      {/* Yuborish formasi */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-accent" />
          <h2 className="font-semibold">Obunachilarga xabar</h2>
        </div>
        <p className="mt-0.5 text-sm text-muted">
          Sarlavha (ixtiyoriy) va matn yozing — barcha yoki tanlangan obunachilarning emailiga yuboriladi.
        </p>

        <div className="mt-4">
          <label className="text-xs text-muted">Sarlavha (ixtiyoriy)</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Masalan: Yangi maqola chiqdi!"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>
        <div className="mt-4">
          <label className="text-xs text-muted">Xabar matni</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder="Salom! Bugun sizlar bilan..."
            className="mt-1 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>

        {/* Kimga */}
        <div className="mt-4">
          <div className="mb-2 text-xs text-muted">Kimga yuboriladi</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("all")}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${mode === "all" ? "border-foreground bg-surface-2" : "border-border text-muted hover:border-foreground/50"}`}
            >
              Barchaga ({subs.length})
            </button>
            <button
              type="button"
              onClick={() => setMode("select")}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${mode === "select" ? "border-foreground bg-surface-2" : "border-border text-muted hover:border-foreground/50"}`}
            >
              Tanlab ({picked.size})
            </button>
          </div>
        </div>

        {err && <p className="mt-3 text-sm text-red-500">{err}</p>}
        {result && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" /> {result.sent}/{result.total} ta yuborildi
          </p>
        )}

        <button
          onClick={send}
          disabled={sending}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {targetCount} ta obunachiga yuborish
        </button>
      </section>

      {/* Obunachilar ro'yxati */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted" />
          <h2 className="font-semibold">Obunachilar</h2>
          <span className="text-sm text-muted">{subs.length} ta</span>
        </div>

        {loading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda…</p>
        ) : subs.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted">
            Hali obunachi yo'q.
          </p>
        ) : (
          <div className="mt-4 max-h-80 space-y-1 overflow-y-auto">
            {subs.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                {mode === "select" && (
                  <input
                    type="checkbox"
                    checked={picked.has(s.id)}
                    onChange={() => toggle(s.id)}
                    className="h-4 w-4 accent-current"
                  />
                )}
                <span className="min-w-0 flex-1 truncate">{s.email}</span>
                <span className="shrink-0 text-xs text-muted">
                  {new Date(s.createdAt).toLocaleDateString("uz", { day: "numeric", month: "short" })}
                </span>
              </label>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
