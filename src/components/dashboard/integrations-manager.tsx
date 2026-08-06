"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plug,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
  Trash2,
  Clock,
} from "lucide-react";
import { Card, Button, Input, Label, Select, Badge } from "@/components/ui";

type CredField = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "password";
  required?: boolean;
  help?: string;
};
type ProviderMeta = {
  id: string;
  label: string;
  available: boolean;
  credentialFields: CredField[];
  docsUrl?: string;
};
type Integration = {
  id: string;
  provider: string;
  status: string;
  isActive: boolean;
  autoSync: boolean;
  syncIntervalMin: number;
  lastSyncAt: string | null;
  lastError: string | null;
};
type SyncLog = {
  id: string;
  type: string;
  status: string;
  itemsSynced: number;
  itemsFailed: number;
  message: string | null;
  durationMs: number | null;
  createdAt: string;
};
type PosState = {
  locked: boolean;
  providers: ProviderMeta[];
  integration: Integration | null;
  logs: SyncLog[];
};

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, data: json.data, error: json.error as string | undefined };
}

export function IntegrationsManager() {
  const [state, setState] = useState<PosState | null>(null);
  const [selected, setSelected] = useState<string>("CLOPOS");
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await api("/api/pos");
    if (data) setState(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const provider = state?.providers.find((p) => p.id === selected);

  const testConnection = async () => {
    setTesting(true);
    setMsg(null);
    const { ok, data, error } = await api("/api/pos/test", {
      method: "POST",
      body: JSON.stringify({ provider: selected, credentials: creds }),
    });
    setTesting(false);
    if (!ok) return setMsg({ ok: false, text: error || "Xatolik" });
    setMsg({ ok: !!data?.ok, text: data?.message || (data?.ok ? "Ulanish muvaffaqiyatli" : "Ulanmadi") });
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const { ok, error } = await api("/api/pos/connect", {
      method: "POST",
      body: JSON.stringify({ provider: selected, credentials: creds }),
    });
    setSaving(false);
    if (!ok) return setMsg({ ok: false, text: error || "Saqlashda xatolik" });
    setCreds({});
    await load();
  };

  const syncNow = async () => {
    setSyncing(true);
    setMsg(null);
    const { ok, data, error } = await api("/api/pos/sync", { method: "POST" });
    setSyncing(false);
    if (!ok) return setMsg({ ok: false, text: error || "Sinxronlashda xatolik" });
    setMsg({
      ok: data?.ok,
      text: data?.ok
        ? `${data.itemsSynced} ta mahsulot sinxronlandi${data.itemsFailed ? `, ${data.itemsFailed} ta o'tkazildi` : ""}${data.itemsHidden ? `, ${data.itemsHidden} ta POS'da o'chirilgani yashirildi` : ""}`
        : data?.message || "Sinxronlanmadi",
    });
    await load();
  };

  const disconnect = async () => {
    if (!confirm("Integratsiyani uzasizmi? Mahsulotlar saqlanadi.")) return;
    await api("/api/pos", { method: "DELETE" });
    setMsg(null);
    await load();
  };

  if (!state) {
    return (
      <div className="flex items-center justify-center py-16 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  // ─── Tarif qulfi ───
  if (state.locked) {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
          <Lock className="h-6 w-6 text-accent" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">POS integratsiyasi PRO tarifda</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Clopos, iiko, Poster va boshqa kassa tizimlarini ulash uchun PRO yoki undan yuqori tarif kerak.
          Mahsulotlaringiz avtomatik sinxronlanadi — ikki marta kiritmaysiz.
        </p>
        <a href="/dashboard/settings">
          <Button className="mt-5">Tarifni yangilash</Button>
        </a>
      </Card>
    );
  }

  const integ = state.integration;

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            msg.ok
              ? "border-success/30 bg-success/10 text-success"
              : "border-error/30 bg-error/10 text-error"
          }`}
        >
          {msg.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {msg.text}
        </div>
      )}

      {/* ─── Ulangan holat ─── */}
      {integ ? (
        <>
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft">
                  <Plug className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-foreground">
                      {state.providers.find((p) => p.id === integ.provider)?.label || integ.provider}
                    </h2>
                    {integ.status === "CONNECTED" ? (
                      <Badge variant="success">Ulangan</Badge>
                    ) : (
                      <Badge variant="error">Xato</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {integ.lastSyncAt
                      ? `Oxirgi sinxron: ${new Date(integ.lastSyncAt).toLocaleString("uz")}`
                      : "Hali sinxronlanmagan"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={syncNow} disabled={syncing}>
                  {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Sinxronlash
                </Button>
                <Button variant="outline" onClick={disconnect}>
                  <Trash2 className="h-4 w-4" />
                  Uzish
                </Button>
              </div>
            </div>

            {integ.lastError && (
              <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-xs text-error">{integ.lastError}</p>
            )}

            <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
              <Clock className="h-4 w-4 text-muted" />
              <span className="text-sm text-muted">
                Avtomatik sinxron har <b className="text-foreground">{integ.syncIntervalMin}</b> daqiqada
                {integ.autoSync ? " yoqilgan" : " o'chirilgan"}
              </span>
            </div>
          </Card>

          {/* ─── Sinxron tarixi ─── */}
          <Card className="overflow-hidden">
            <div className="border-b border-border px-5 py-3">
              <h3 className="text-sm font-semibold text-foreground">Sinxron tarixi</h3>
            </div>
            {state.logs.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted">Hali yozuv yo'q</p>
            ) : (
              <div className="divide-y divide-border">
                {state.logs.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      {l.status === "SUCCESS" ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : l.status === "PARTIAL" ? (
                        <CheckCircle2 className="h-4 w-4 text-warning" />
                      ) : (
                        <XCircle className="h-4 w-4 text-error" />
                      )}
                      <span className="text-foreground">
                        {l.itemsSynced} sinxron
                        {l.itemsFailed > 0 && <span className="text-muted"> · {l.itemsFailed} o'tkazildi</span>}
                      </span>
                    </div>
                    <span className="text-xs text-muted">
                      {new Date(l.createdAt).toLocaleString("uz")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : (
        /* ─── Ulash formasi ─── */
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">POS tizimini ulash</h2>
          <p className="mt-1 text-sm text-muted">
            Kassa tizimingizni tanlang — mahsulotlar avtomatik keladi.
          </p>

          <div className="mt-5 max-w-md space-y-4">
            <div>
              <Label>Provayder</Label>
              <Select value={selected} onChange={(e) => { setSelected(e.target.value); setCreds({}); setMsg(null); }}>
                {state.providers.map((p) => (
                  <option key={p.id} value={p.id} disabled={!p.available}>
                    {p.label}
                    {!p.available ? " — tez orada" : ""}
                  </option>
                ))}
              </Select>
            </div>

            {provider?.available ? (
              <>
                {provider.credentialFields.map((f) => (
                  <div key={f.key}>
                    <Label>
                      {f.label}
                      {f.required && <span className="text-error"> *</span>}
                    </Label>
                    <Input
                      type={f.type === "password" ? "password" : "text"}
                      placeholder={f.placeholder}
                      value={creds[f.key] || ""}
                      onChange={(e) => setCreds((c) => ({ ...c, [f.key]: e.target.value }))}
                    />
                    {f.help && <p className="mt-1 text-xs text-muted">{f.help}</p>}
                  </div>
                ))}

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={testConnection} disabled={testing}>
                    {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                    Tekshirish
                  </Button>
                  <Button onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Ulash va saqlash
                  </Button>
                </div>
              </>
            ) : (
              <p className="rounded-lg bg-surface-2 px-4 py-3 text-sm text-muted">
                Bu provayder tez orada qo'shiladi.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
