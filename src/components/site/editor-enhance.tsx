"use client";

import { useState } from "react";
import { Sparkles, Loader2, Plus, Trash2, Languages, History, RotateCcw, HelpCircle, Wand2 } from "lucide-react";

type Faq = { q: string; a: string };
type Tr = Record<string, { title: string; html: string }>;
type Draft = {
  id: string;
  title: string;
  contentHtml: string;
  metaTitle: string | null;
  metaDescription: string | null;
  tags: string[];
  summary?: string | null;
  faq?: Faq[];
  translations?: Tr;
};
type Patch = Partial<Draft>;
type Revision = { id: string; title: string; excerpt: string; contentHtml: string; createdAt: string };

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  return { ok: res.ok, data: j?.data, error: j?.error as string | undefined };
}

export function EditorEnhance({ draft, onPatch }: { draft: Draft; onPatch: (p: Patch) => void }) {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [revs, setRevs] = useState<Revision[] | null>(null);

  const faq = draft.faq || [];
  const translations = draft.translations || {};

  function flash(t: string) {
    setMsg(t);
    setTimeout(() => setMsg(""), 2500);
  }

  async function genSummary() {
    setBusy("summary");
    const r = await postJson("/api/site/ai-summary", { title: draft.title, contentHtml: draft.contentHtml });
    setBusy("");
    if (r.ok && r.data?.summary) onPatch({ summary: r.data.summary });
    else flash(r.error || "Xato");
  }

  async function genSeo() {
    setBusy("seo");
    const r = await postJson("/api/site/ai-seo", { title: draft.title, contentHtml: draft.contentHtml });
    setBusy("");
    if (!r.ok) return flash(r.error || "Xato");
    const patch: Patch = {};
    if (r.data.metaTitle) patch.metaTitle = r.data.metaTitle;
    if (r.data.metaDescription) patch.metaDescription = r.data.metaDescription;
    if (Array.isArray(r.data.tags) && r.data.tags.length) {
      const merged = Array.from(new Set([...draft.tags, ...r.data.tags])).slice(0, 12);
      patch.tags = merged;
    }
    if (Array.isArray(r.data.faq) && r.data.faq.length) patch.faq = r.data.faq;
    onPatch(patch);
    flash("SEO ma'lumotlari to'ldirildi ✓");
  }

  async function genFaqOnly() {
    setBusy("faq");
    const r = await postJson("/api/site/ai-seo", { title: draft.title, contentHtml: draft.contentHtml });
    setBusy("");
    if (r.ok && Array.isArray(r.data.faq) && r.data.faq.length) onPatch({ faq: r.data.faq });
    else flash(r.error || "FAQ chiqmadi");
  }

  async function translate(lang: "ru" | "en") {
    if (!draft.id) return flash("Avval maqolani saqlang");
    setBusy(`tr-${lang}`);
    const r = await postJson("/api/site/ai-translate", { postId: draft.id, lang, force: true });
    setBusy("");
    if (r.ok && r.data?.html) {
      onPatch({ translations: { ...translations, [lang]: { title: r.data.title || "", html: r.data.html } } });
      flash(`${lang.toUpperCase()} tarjima tayyor ✓`);
    } else flash(r.error || "Tarjima xato");
  }

  async function loadRevs() {
    if (!draft.id) return;
    setBusy("revs");
    const res = await fetch(`/api/site/posts/${draft.id}/revisions`);
    const j = await res.json().catch(() => ({}));
    setBusy("");
    setRevs(j?.data?.revisions || []);
  }

  async function restore(revId: string) {
    if (!confirm("Bu versiyani tiklaysizmi? Joriy matn tarixga saqlanadi.")) return;
    setBusy(`rest-${revId}`);
    const r = await postJson(`/api/site/posts/${draft.id}/revisions`, { revisionId: revId });
    setBusy("");
    if (r.ok && r.data?.post) {
      onPatch({ title: r.data.post.title, contentHtml: r.data.post.contentHtml });
      flash("Tiklandi — 'Saqlash' bosishni unutmang");
      setRevs(null);
    } else flash(r.error || "Xato");
  }

  const canAi = draft.contentHtml.trim().length > 20;

  return (
    <div className="mt-5 rounded-xl border border-accent/25 bg-accent/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-accent">
          <Sparkles className="h-4 w-4" /> AI boyitish va SEO
        </span>
        {msg && <span className="text-xs text-muted">{msg}</span>}
      </div>

      {/* Tezkor AI amallar */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={genSeo}
          disabled={!canAi || !!busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {busy === "seo" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} AI SEO to'ldirish
        </button>
        <button
          type="button"
          onClick={genSummary}
          disabled={!canAi || !!busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:border-foreground disabled:opacity-50"
        >
          {busy === "summary" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} TL;DR yaratish
        </button>
      </div>

      {/* TL;DR */}
      <div className="mt-4">
        <label className="text-xs text-muted">Qisqacha (TL;DR) — maqola boshida ko'rinadi</label>
        <textarea
          value={draft.summary || ""}
          onChange={(e) => onPatch({ summary: e.target.value })}
          rows={2}
          placeholder="AI yaratadi yoki o'zingiz yozing..."
          className="mt-1 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
      </div>

      {/* FAQ muharriri */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <HelpCircle className="h-3.5 w-3.5" /> Ko'p so'raladigan savollar (Google boy natija)
          </label>
          <button
            type="button"
            onClick={genFaqOnly}
            disabled={!canAi || !!busy}
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline disabled:opacity-50"
          >
            {busy === "faq" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI yaratish
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {faq.map((f, i) => (
            <div key={i} className="rounded-lg border border-border p-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-1.5">
                  <input
                    value={f.q}
                    onChange={(e) => onPatch({ faq: faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) })}
                    placeholder="Savol"
                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm font-medium outline-none focus:border-foreground"
                  />
                  <textarea
                    value={f.a}
                    onChange={(e) => onPatch({ faq: faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) })}
                    rows={2}
                    placeholder="Javob"
                    className="w-full resize-y rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-foreground"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onPatch({ faq: faq.filter((_, j) => j !== i) })}
                  className="shrink-0 text-muted hover:text-red-500"
                  aria-label="O'chirish"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onPatch({ faq: [...faq, { q: "", a: "" }] })}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Savol qo'shish
          </button>
        </div>
      </div>

      {/* Tarjima */}
      <div className="mt-4">
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <Languages className="h-3.5 w-3.5" /> Maqola matnini tarjima qilish (o'quvchi tanlaydi)
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {(["ru", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => translate(l)}
              disabled={!!busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs uppercase hover:border-foreground disabled:opacity-50"
            >
              {busy === `tr-${l}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
              {l}
              {translations[l] && <span className="rounded-full bg-emerald-500/15 px-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">tayyor</span>}
            </button>
          ))}
          {!draft.id && <span className="text-xs text-muted">(avval saqlang)</span>}
        </div>
      </div>

      {/* Reviziya tarixi */}
      {draft.id && (
        <div className="mt-4 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => (revs ? setRevs(null) : loadRevs())}
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
          >
            {busy === "revs" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <History className="h-3.5 w-3.5" />}
            {revs ? "Tarixni yashirish" : "Versiyalar tarixi"}
          </button>
          {revs && (
            <div className="mt-2 space-y-1.5">
              {revs.length === 0 ? (
                <p className="text-xs text-muted">Hali versiya yo'q (tahrirlaganda saqlanadi).</p>
              ) : (
                revs.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{r.title}</p>
                      <p className="text-[11px] text-muted">{new Date(r.createdAt).toLocaleString("uz")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => restore(r.id)}
                      disabled={!!busy}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-foreground disabled:opacity-50"
                    >
                      {busy === `rest-${r.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />} Tiklash
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
