"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Plus, Download, Trash2, Loader2, Armchair, Check, X,
  Pencil, LayoutGrid, Rows3,
} from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { formatPrice } from "@/lib/utils";

type Table = { id: string; name: string; code: string; status?: string; orders?: number; total?: number };

export function TableQrManager({ baseUrl, currency = "UZS" }: { baseUrl: string; currency?: string }) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"one" | "bulk">("one");
  const [name, setName] = useState("");
  const [bulkPrefix, setBulkPrefix] = useState("Stol");
  const [bulkFrom, setBulkFrom] = useState("1");
  const [bulkTo, setBulkTo] = useState("10");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  // Jonli holat bilan (/api/staff/tables egasiga ham ishlaydi)
  const load = useCallback(async () => {
    const res = await fetch("/api/staff/tables");
    const json = await res.json();
    if (json.success) setTables(json.data.tables);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 8000); // jonli holat
    return () => clearInterval(iv);
  }, [load]);

  async function createOne(nm: string): Promise<boolean> {
    const res = await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nm }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error || "Xatolik");
      return false;
    }
    return true;
  }

  async function addSingle(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true); setError("");
    const okd = await createOne(name.trim());
    setAdding(false);
    if (okd) { setName(""); load(); }
  }

  async function addBulk() {
    const from = parseInt(bulkFrom, 10);
    const to = parseInt(bulkTo, 10);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) {
      setError("Oraliq noto'g'ri");
      return;
    }
    if (to - from > 100) { setError("Bir marta 100 tagacha"); return; }
    setAdding(true); setError("");
    for (let i = from; i <= to; i++) {
      const okd = await createOne(`${bulkPrefix.trim()} ${i}`.trim());
      if (!okd) break; // limit yoki xato
    }
    setAdding(false);
    load();
  }

  async function removeTable(id: string) {
    if (!confirm("Ushbu stolni o'chirasizmi?")) return;
    setTables((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tables/${id}`, { method: "DELETE" });
    load();
  }

  async function rename(id: string, newName: string) {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, name: newName } : t)));
    await fetch(`/api/tables/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
  }

  const busyCount = tables.filter((t) => t.status && t.status !== "FREE").length;

  return (
    <div className="space-y-4">
      {/* Qo'shish paneli */}
      <Card className="p-5">
        <div className="mb-3 inline-flex rounded-xl bg-surface-2 p-1">
          <button
            onClick={() => setMode("one")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${mode === "one" ? "bg-card text-foreground shadow-soft" : "text-muted"}`}
          >
            <Plus className="mr-1 inline h-3.5 w-3.5" /> Bitta
          </button>
          <button
            onClick={() => setMode("bulk")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${mode === "bulk" ? "bg-card text-foreground shadow-soft" : "text-muted"}`}
          >
            <Rows3 className="mr-1 inline h-3.5 w-3.5" /> Ko'p (oraliq)
          </button>
        </div>

        {mode === "one" ? (
          <form onSubmit={addSingle} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-foreground">Stol nomi yoki raqami</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Stol 1, VIP, Terassa 3" />
            </div>
            <Button type="submit" disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Qo'shish
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-foreground">Nomi (prefiks)</label>
              <Input value={bulkPrefix} onChange={(e) => setBulkPrefix(e.target.value)} placeholder="Stol" />
            </div>
            <div className="w-20">
              <label className="mb-1 block text-sm font-medium text-foreground">Dan</label>
              <Input value={bulkFrom} onChange={(e) => setBulkFrom(e.target.value)} inputMode="numeric" />
            </div>
            <div className="w-20">
              <label className="mb-1 block text-sm font-medium text-foreground">Gacha</label>
              <Input value={bulkTo} onChange={(e) => setBulkTo(e.target.value)} inputMode="numeric" />
            </div>
            <Button onClick={addBulk} disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Qo'shish
            </Button>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
        {mode === "bulk" && (
          <p className="mt-2 text-xs text-muted">
            Masalan &quot;Stol&quot; 1–10 → Stol 1, Stol 2, ... Stol 10 avtomatik yaratiladi (har biriga QR).
          </p>
        )}
      </Card>

      {/* Holat xulosasi */}
      {tables.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 font-medium text-foreground">
            <LayoutGrid className="h-4 w-4 text-muted" /> Jami {tables.length}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-1.5 font-medium text-success">
            <span className="h-2 w-2 rounded-full bg-success" /> {tables.length - busyCount} bo'sh
          </span>
          {busyCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-error/10 px-3 py-1.5 font-medium text-error">
              <span className="h-2 w-2 rounded-full bg-error" /> {busyCount} band
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : tables.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-12 text-center">
          <Armchair className="h-8 w-8 text-muted/40" />
          <p className="mt-3 text-sm text-muted">Hali stol qo'shilmagan. Yuqoridan stol qo'shing — ofitsant panelida darhol ko'rinadi.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((t) => (
            <TableQrCard
              key={t.id}
              table={t}
              currency={currency}
              url={`${baseUrl}?t=${t.code}`}
              onDelete={() => removeTable(t.id)}
              onRename={(nm) => rename(t.id, nm)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  FREE: { label: "Bo'sh", cls: "bg-success/10 text-success", dot: "bg-success" },
  ACTIVE: { label: "Band", cls: "bg-error/10 text-error", dot: "bg-error" },
  BILL: { label: "To'lov kutilmoqda", cls: "bg-warning/10 text-warning", dot: "bg-warning" },
};

function TableQrCard({
  table, url, currency, onDelete, onRename,
}: {
  table: Table;
  url: string;
  currency: string;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(table.name);
  const st = STATUS[table.status || "FREE"] || STATUS.FREE;

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 240, margin: 2, color: { dark: "#1F2937", light: "#FFFFFF" }, errorCorrectionLevel: "H",
    });
  }, [url]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    const safe = table.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    link.download = `qr-${safe || table.code}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function saveName() {
    if (draft.trim() && draft.trim() !== table.name) onRename(draft.trim());
    setEditing(false);
  }

  return (
    <Card className="flex flex-col p-4">
      <div className="flex w-full items-start justify-between gap-2">
        {editing ? (
          <div className="flex flex-1 items-center gap-1.5">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} className="h-8" autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditing(false); }} />
            <button onClick={saveName} className="text-success"><Check className="h-4 w-4" /></button>
            <button onClick={() => setEditing(false)} className="text-muted"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-semibold text-foreground">{table.name}</span>
            <button onClick={() => { setDraft(table.name); setEditing(true); }} title="Tahrirlash" className="text-muted hover:text-accent">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <button onClick={onDelete} title="O'chirish" className="shrink-0 text-muted hover:text-error"><Trash2 className="h-4 w-4" /></button>
      </div>

      {/* Jonli holat */}
      <div className="mt-2 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${st.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
        </span>
        {table.status && table.status !== "FREE" && table.total ? (
          <span className="text-xs font-semibold text-foreground">{formatPrice(table.total, currency)}</span>
        ) : null}
      </div>

      <div className="mx-auto mt-3 w-full max-w-[180px] rounded-xl bg-white p-3 shadow-soft">
        <canvas ref={canvasRef} className="!h-auto !w-full" />
      </div>
      <Button variant="outline" className="mt-3 w-full" onClick={download}>
        <Download className="h-4 w-4" /> QR yuklab olish
      </Button>
    </Card>
  );
}
