"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Plus, Download, Trash2, Loader2, QrCode as QrIcon } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";

type Table = { id: string; name: string; code: string };

export function TableQrManager({ baseUrl }: { baseUrl: string }) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/tables");
    const json = await res.json();
    if (json.success) setTables(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addTable(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setError("");
    const res = await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const json = await res.json();
    setAdding(false);
    if (!res.ok) {
      setError(json.error || "Xatolik");
      return;
    }
    setName("");
    load();
  }

  async function removeTable(id: string) {
    if (!confirm("Ushbu stol QR kodini o'chirasizmi?")) return;
    setTables((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tables/${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <form onSubmit={addTable} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-foreground">
              Stol nomi yoki raqami
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masalan: Stol 1, VIP, Terassa 3"
            />
          </div>
          <Button type="submit" disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Stol qo'shish
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
      </Card>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : tables.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-12 text-center">
          <QrIcon className="h-8 w-8 text-muted/40" />
          <p className="mt-3 text-sm text-muted">
            Hali stol qo'shilmagan. Yuqoridan stol qo'shing va QR kodini yuklab oling.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((t) => (
            <TableQrCard
              key={t.id}
              table={t}
              url={`${baseUrl}?t=${t.code}`}
              onDelete={() => removeTable(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TableQrCard({
  table,
  url,
  onDelete,
}: {
  table: Table;
  url: string;
  onDelete: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 240,
      margin: 2,
      color: { dark: "#1F2937", light: "#FFFFFF" },
      errorCorrectionLevel: "H",
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

  return (
    <Card className="flex flex-col items-center p-4">
      <div className="flex w-full items-start justify-between">
        <span className="font-medium text-foreground">{table.name}</span>
        <button
          onClick={onDelete}
          title="O'chirish"
          className="text-muted hover:text-error"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 w-full max-w-[180px] rounded-xl bg-white p-3 shadow-soft">
        <canvas ref={canvasRef} className="!h-auto !w-full" />
      </div>
      <Button variant="outline" className="mt-3 w-full" onClick={download}>
        <Download className="h-4 w-4" /> Yuklab olish
      </Button>
    </Card>
  );
}
