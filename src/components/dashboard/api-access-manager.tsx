"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KeyRound,
  Webhook,
  Trash2,
  Copy,
  Check,
  Plus,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Card, Button, Input, Label, Badge } from "@/components/ui";

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, data: json.data, error: json.error as string | undefined };
}

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  scopes: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};
type WebhookRow = {
  id: string;
  url: string;
  events: string;
  isActive: boolean;
  lastStatus: number | null;
  lastError: string | null;
  lastDeliveryAt: string | null;
};

const ALL_EVENTS = ["order.created", "order.status"];
const SITE = typeof window !== "undefined" ? window.location.origin : "";

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard yo'q */
        }
      }}
      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
    >
      {done ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "Nusxalandi" : "Nusxa"}
    </button>
  );
}

export function ApiAccessManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [hooks, setHooks] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);

  // yaratish formalari
  const [keyName, setKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null); // faqat bir marta ko'rinadi

  const [hookUrl, setHookUrl] = useState("");
  const [hookEvents, setHookEvents] = useState<string[]>(["order.created"]);
  const [creatingHook, setCreatingHook] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const [k, w] = await Promise.all([api("/api/apikeys"), api("/api/webhooks")]);
    if (k.ok) setKeys(k.data || []);
    if (w.ok) setHooks(w.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createKey = async () => {
    if (!keyName.trim()) return;
    setCreatingKey(true);
    setMsg(null);
    const { ok, data, error } = await api("/api/apikeys", {
      method: "POST",
      body: JSON.stringify({ name: keyName.trim() }),
    });
    setCreatingKey(false);
    if (!ok) return setMsg({ ok: false, text: error || "Kalit yaratilmadi" });
    setNewKey(data.key);
    setKeyName("");
    await load();
  };

  const deleteKey = async (id: string) => {
    await api(`/api/apikeys/${id}`, { method: "DELETE" });
    setConfirmDel(null);
    await load();
  };

  const createHook = async () => {
    if (!hookUrl.trim() || hookEvents.length === 0) return;
    setCreatingHook(true);
    setMsg(null);
    const { ok, data, error } = await api("/api/webhooks", {
      method: "POST",
      body: JSON.stringify({ url: hookUrl.trim(), events: hookEvents }),
    });
    setCreatingHook(false);
    if (!ok) return setMsg({ ok: false, text: error || "Webhook qo'shilmadi" });
    setNewSecret(data.secret);
    setHookUrl("");
    await load();
  };

  const deleteHook = async (id: string) => {
    await api(`/api/webhooks/${id}`, { method: "DELETE" });
    setConfirmDel(null);
    await load();
  };

  const toggleHook = async (h: WebhookRow) => {
    await api(`/api/webhooks/${h.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !h.isActive }),
    });
    await load();
  };

  if (loading) {
    return (
      <Card className="flex items-center gap-2 p-6 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda...
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            msg.ok
              ? "border-success/30 bg-success/10 text-success"
              : "border-error/30 bg-error/10 text-error"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* ─── API kalitlar ─── */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">API kalitlar</h3>
            <p className="text-sm text-muted">
              Tashqi tizimlar menyuni o'qishi uchun (<code>GET {SITE}/api/v1/menu</code>)
            </p>
          </div>
        </div>

        {/* Yangi kalit bir marta ko'rsatiladi */}
        {newKey && (
          <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-warning">
              <AlertTriangle className="h-4 w-4" /> Kalitni hozir saqlang — u boshqa ko'rsatilmaydi!
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <code className="break-all rounded bg-card px-2 py-1 text-sm text-foreground">
                {newKey}
              </code>
              <CopyButton text={newKey} />
              <Button size="sm" variant="ghost" onClick={() => setNewKey(null)}>
                Yopish
              </Button>
            </div>
          </div>
        )}

        {/* Ro'yxat */}
        {keys.length > 0 ? (
          <div className="mb-4 divide-y divide-border rounded-lg border border-border">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="font-medium text-foreground">{k.name}</div>
                  <div className="text-xs text-muted">
                    <code>{k.prefix}••••</code> ·{" "}
                    {k.lastUsedAt
                      ? `oxirgi: ${new Date(k.lastUsedAt).toLocaleDateString("uz")}`
                      : "ishlatilmagan"}
                  </div>
                </div>
                {confirmDel === k.id ? (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="danger" onClick={() => deleteKey(k.id)}>
                      O'chirish
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDel(null)}>
                      Bekor
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDel(k.id)}
                    className="text-muted hover:text-error"
                    aria-label="O'chirish"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-muted">Hali API kalit yo'q.</p>
        )}

        {/* Yaratish */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label>Yangi kalit nomi</Label>
            <Input
              id="keyName"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="masalan: Telegram bot"
            />
          </div>
          <Button onClick={createKey} disabled={creatingKey || !keyName.trim()}>
            {creatingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Yaratish
          </Button>
        </div>
      </Card>

      {/* ─── Webhooklar ─── */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Webhook className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Webhooklar</h3>
            <p className="text-sm text-muted">
              Buyurtma hodisalarini o'z serveringizga oling (HMAC imzo bilan)
            </p>
          </div>
        </div>

        {newSecret && (
          <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-warning">
              <AlertTriangle className="h-4 w-4" /> Imzo maxfiy kaliti (secret) — saqlab qo'ying:
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <code className="break-all rounded bg-card px-2 py-1 text-sm text-foreground">
                {newSecret}
              </code>
              <CopyButton text={newSecret} />
              <Button size="sm" variant="ghost" onClick={() => setNewSecret(null)}>
                Yopish
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Har so'rovda <code>X-OzodFlow-Signature: sha256=...</code> shu kalit bilan
              tekshiriladi.
            </p>
          </div>
        )}

        {hooks.length > 0 ? (
          <div className="mb-4 divide-y divide-border rounded-lg border border-border">
            {hooks.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{h.url}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {(safeEvents(h.events)).map((ev) => (
                      <Badge key={ev} variant="accent">
                        {ev}
                      </Badge>
                    ))}
                    {h.lastStatus != null && (
                      <span
                        className={`text-xs ${
                          h.lastStatus >= 200 && h.lastStatus < 300
                            ? "text-success"
                            : "text-error"
                        }`}
                      >
                        oxirgi: HTTP {h.lastStatus}
                      </span>
                    )}
                    {h.lastError && !h.lastStatus && (
                      <span className="text-xs text-error">xato: {h.lastError}</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleHook(h)}
                    className={`rounded-md border px-2 py-1 text-xs ${
                      h.isActive
                        ? "border-success/30 text-success"
                        : "border-border text-muted"
                    }`}
                  >
                    {h.isActive ? "Faol" : "O'chiq"}
                  </button>
                  {confirmDel === h.id ? (
                    <>
                      <Button size="sm" variant="danger" onClick={() => deleteHook(h.id)}>
                        O'chirish
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDel(null)}>
                        Bekor
                      </Button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDel(h.id)}
                      className="text-muted hover:text-error"
                      aria-label="O'chirish"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-muted">Hali webhook yo'q.</p>
        )}

        {/* Yaratish */}
        <div className="space-y-3">
          <div>
            <Label>Webhook URL (HTTPS)</Label>
            <Input
              id="hookUrl"
              value={hookUrl}
              onChange={(e) => setHookUrl(e.target.value)}
              placeholder="https://sizning-server.uz/webhook"
            />
          </div>
          <div>
            <Label>Hodisalar</Label>
            <div className="mt-1 flex flex-wrap gap-3">
              {ALL_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={hookEvents.includes(ev)}
                    onChange={(e) =>
                      setHookEvents((prev) =>
                        e.target.checked ? [...prev, ev] : prev.filter((x) => x !== ev)
                      )
                    }
                  />
                  <code>{ev}</code>
                </label>
              ))}
            </div>
          </div>
          <Button
            onClick={createHook}
            disabled={creatingHook || !hookUrl.trim() || hookEvents.length === 0}
          >
            {creatingHook ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Webhook qo'shish
          </Button>
        </div>
      </Card>
    </div>
  );
}

function safeEvents(json: string): string[] {
  try {
    const a = JSON.parse(json);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}
