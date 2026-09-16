"use client";

import { useState } from "react";
import { Loader2, Sparkles, CheckCircle2, XCircle, Trash2, ShieldCheck } from "lucide-react";
import { Card, Switch, Button } from "@/components/ui";

const STYLES: { key: string; label: string; hint: string }[] = [
  { key: "bubble", label: "Dumaloq", hint: "Pastki o'ng dumaloq tugma" },
  { key: "minimal", label: "Minimal", hint: "Nozik pill tugma" },
  { key: "bar", label: "Panel", hint: "Pastda keng chaqiruv" },
];

export function MenuAiSettings({
  enabled: initEnabled,
  hasKey: initHasKey,
  provider: initProvider,
  model: initModel,
  style: initStyle,
}: {
  enabled: boolean;
  hasKey: boolean;
  provider: string | null;
  model: string | null;
  style: string;
}) {
  const [enabled, setEnabled] = useState(initEnabled);
  const [hasKey, setHasKey] = useState(initHasKey);
  const [provider, setProvider] = useState(initProvider);
  const [model, setModel] = useState(initModel);
  const [style, setStyle] = useState(initStyle || "bubble");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  async function save(payload: Record<string, unknown>) {
    setBusy(true);
    setErr("");
    setOk(false);
    const res = await fetch("/api/restaurant/menu-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok || !json.success) {
      setErr(json.error || "Xatolik");
      return null;
    }
    setOk(true);
    setTimeout(() => setOk(false), 1500);
    return json.data as { enabled: boolean; provider: string | null; model: string | null; style: string; hasKey: boolean };
  }

  async function connectKey() {
    if (apiKey.trim().length < 10) {
      setErr("To'g'ri API kalit kiriting");
      return;
    }
    const d = await save({ apiKey: apiKey.trim() });
    if (d) {
      setHasKey(d.hasKey);
      setProvider(d.provider);
      setModel(d.model);
      setApiKey("");
    }
  }

  async function removeKey() {
    if (!confirm("AI kalitini o'chirasizmi? Menyu yordamchisi o'chadi.")) return;
    const d = await save({ removeKey: true });
    if (d) {
      setHasKey(false);
      setProvider(null);
      setModel(null);
      setEnabled(false);
    }
  }

  async function toggle(v: boolean) {
    if (v && !hasKey) {
      setErr("Avval AI kalitini ulang");
      return;
    }
    setEnabled(v);
    await save({ enabled: v });
  }

  async function pickStyle(s: string) {
    setStyle(s);
    await save({ style: s });
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Menyu AI yordamchisi (mijozlar uchun)</h3>
            <p className="mt-0.5 text-sm text-muted">
              Mijoz &quot;shuncha pulga nima yeyish mumkin?&quot; deb so'raydi — AI menyudan
              mos taom tavsiya qiladi. Kalitni <b>o'zingiz</b> qo'yasiz.
            </p>
          </div>
        </div>
        <Switch checked={enabled} onChange={toggle} />
      </div>

      {/* Holat: menyuда ko'rinadimi */}
      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className={`h-2 w-2 rounded-full ${enabled ? "bg-success" : "bg-muted/50"}`} />
        <span className={enabled ? "font-medium text-foreground" : "text-muted"}>
          {enabled ? "Menyuда ko'rinadi" : "Menyuда yashirilgan (mijozlar ko'rmaydi)"}
        </span>
      </div>

      {/* Maxfiylik eslatmasi */}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-success/5 px-3 py-2.5 text-xs text-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <span>
          Maxfiy: yordamchi faqat menyu (taom, narx) bo'yicha javob beradi. Sotuv,
          daromad va boshqa ichki ma'lumotlar mijozga <b>hech qachon</b> ko'rsatilmaydi.
        </span>
      </div>

      <div className="mt-4 space-y-4 border-t border-border pt-4">
        {/* Kalit */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">AI kaliti</label>
          {hasKey ? (
            <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/5 px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                {provider === "openai" ? "OpenAI" : "Gemini"} ulangan
                {model && <span className="font-mono text-xs text-muted">· {model}</span>}
              </span>
              <button onClick={removeKey} disabled={busy} className="text-muted hover:text-error" title="O'chirish">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza...  yoki  sk-..."
                className="h-10 w-full min-w-0 rounded-lg border border-border bg-card px-3 font-mono text-sm text-foreground outline-none focus:border-accent sm:flex-1"
              />
              <Button onClick={connectKey} disabled={busy} className="sm:w-auto">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Ulash
              </Button>
            </div>
          )}
          <p className="mt-1 text-xs text-muted">
            Gemini (aistudio.google.com — bepul) yoki OpenAI. Provayder va model
            avtomatik aniqlanadi. Xarajat o'z kalitingizga ketadi.
          </p>
        </div>

        {/* Uslub */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Ko'rinish uslubi</label>
          <div className="grid grid-cols-3 gap-2">
            {STYLES.map((s) => (
              <button
                key={s.key}
                onClick={() => pickStyle(s.key)}
                className={`rounded-lg border px-2 py-2 text-left transition ${
                  style === s.key ? "border-accent bg-accent-soft/50 ring-1 ring-accent" : "border-border hover:border-accent/50"
                }`}
              >
                <span className="block text-xs font-semibold text-foreground">{s.label}</span>
                <span className="mt-0.5 block text-[11px] leading-tight text-muted">{s.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {err && (
          <p className="flex items-center gap-1 text-sm text-error">
            <XCircle className="h-4 w-4" /> {err}
          </p>
        )}
        {ok && (
          <p className="flex items-center gap-1 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> Saqlandi
          </p>
        )}
      </div>
    </Card>
  );
}
