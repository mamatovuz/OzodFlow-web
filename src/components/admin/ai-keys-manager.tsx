"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
  Power,
} from "lucide-react";
import { Card, Button, Badge } from "@/components/ui";
import { Modal } from "@/components/ui-modal";

type AiKeyRow = {
  id: string;
  provider: string;
  name: string;
  hint: string;
  model: string;
  imageModel: string;
  isActive: boolean;
  sortOrder: number;
  lastUsedAt: string | null;
  failCount: number;
  lastError: string | null;
  cooldownUntil: string | null;
  createdAt: string;
};

export function AiKeysManager() {
  const [keys, setKeys] = useState<AiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/ai-keys");
    const json = await res.json();
    if (json.success) setKeys(json.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function toggle(k: AiKeyRow) {
    setBusy(k.id);
    await fetch(`/api/admin/ai-keys/${k.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !k.isActive }),
    });
    setBusy(null);
    load();
  }

  async function reset(k: AiKeyRow) {
    setBusy(k.id);
    await fetch(`/api/admin/ai-keys/${k.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetCooldown: true }),
    });
    setBusy(null);
    load();
  }

  async function remove(k: AiKeyRow) {
    if (!confirm(`"${k.name}" kalitini o'chirasizmi?`)) return;
    setBusy(k.id);
    await fetch(`/api/admin/ai-keys/${k.id}`, { method: "DELETE" });
    setBusy(null);
    load();
  }

  async function move(k: AiKeyRow, dir: -1 | 1) {
    const idx = keys.findIndex((x) => x.id === k.id);
    const other = keys[idx + dir];
    if (!other) return;
    setBusy(k.id);
    await Promise.all([
      fetch(`/api/admin/ai-keys/${k.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: other.sortOrder }),
      }),
      fetch(`/api/admin/ai-keys/${other.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: k.sortOrder }),
      }),
    ]);
    setBusy(null);
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Jami {keys.length} ta kalit · {keys.filter((k) => k.isActive).length} faol
        </p>
        <Button onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Kalit qo'shish
        </Button>
      </div>

      {keys.length === 0 ? (
        <Card className="p-10 text-center">
          <KeyRound className="mx-auto h-10 w-10 text-muted/40" />
          <p className="mt-3 text-sm text-muted">
            Hali AI kalit yo'q. Google AI Studio'dan (aistudio.google.com) bepul
            Gemini kaliti oling va shu yerga qo'shing.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {keys.map((k, i) => {
            const cooling = k.cooldownUntil && new Date(k.cooldownUntil) > new Date();
            return (
              <Card key={k.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {i + 1}. {k.name}
                    </span>
                    <span className="font-mono text-xs text-muted">{k.hint}</span>
                    {k.isActive ? (
                      cooling ? (
                        <Badge variant="warning">Limit — kutmoqda</Badge>
                      ) : (
                        <Badge variant="success">Faol</Badge>
                      )
                    ) : (
                      <Badge variant="default">O'chirilgan</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {k.model} · rasm: {k.imageModel.replace("gemini-", "")}
                    {k.lastUsedAt && ` · oxirgi: ${new Date(k.lastUsedAt).toLocaleString("uz-UZ")}`}
                    {k.failCount > 0 && ` · ${k.failCount} xato`}
                  </p>
                  {k.lastError && cooling && (
                    <p className="mt-0.5 truncate text-xs text-error">{k.lastError}</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => move(k, -1)}
                    disabled={i === 0 || busy === k.id}
                    title="Yuqoriga"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:text-accent disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => move(k, 1)}
                    disabled={i === keys.length - 1 || busy === k.id}
                    title="Pastga"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:text-accent disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  {cooling && (
                    <button
                      onClick={() => reset(k)}
                      disabled={busy === k.id}
                      title="Limitni tiklash"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:text-accent"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => toggle(k)}
                    disabled={busy === k.id}
                    title={k.isActive ? "O'chirish" : "Yoqish"}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border ${
                      k.isActive ? "text-success" : "text-muted"
                    } hover:bg-surface-2`}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(k)}
                    disabled={busy === k.id}
                    title="O'chirish"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-error hover:bg-error/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {adding && (
        <AddKeyModal
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function AddKeyModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-2.0-flash");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tested, setTested] = useState<null | boolean>(null);

  async function save(withTest: boolean) {
    if (!name.trim() || apiKey.trim().length < 10) {
      setError("Nom va to'g'ri API kalit kiriting");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/ai-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, apiKey, model, test: withTest }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Xatolik");
      setTested(false);
      return;
    }
    onDone();
  }

  return (
    <Modal open onClose={onClose} title="AI kalit qo'shish">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Nom</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masalan: Asosiy kalit"
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Gemini API kaliti
          </label>
          <input
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setTested(null);
            }}
            placeholder="AIza..."
            className="h-10 w-full rounded-lg border border-border bg-card px-3 font-mono text-sm text-foreground outline-none focus:border-accent"
          />
          <p className="mt-1 text-xs text-muted">
            aistudio.google.com → &quot;Get API key&quot; (bepul).
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-accent"
          >
            <option value="gemini-2.0-flash">gemini-2.0-flash (tavsiya)</option>
            <option value="gemini-2.5-flash">gemini-2.5-flash</option>
            <option value="gemini-1.5-flash">gemini-1.5-flash</option>
          </select>
        </div>

        {error && <p className="text-sm text-error">{error}</p>}
        {tested === false && !error && (
          <p className="flex items-center gap-1 text-sm text-error">
            <XCircle className="h-4 w-4" /> Kalit ishlamadi
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button variant="outline" onClick={() => save(true)} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <CheckCircle2 className="h-4 w-4" /> Tekshirib qo'shish
          </Button>
          <Button onClick={() => save(false)} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Qo'shish
          </Button>
        </div>
      </div>
    </Modal>
  );
}
