"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { Plus, Trash2, Pencil, Loader2, QrCode, Download, X, Table2 } from "lucide-react";
import { Button, Input, Card } from "@/components/ui";
import { Modal } from "@/components/ui-modal";

type TableRow = {
  id: string;
  name: string;
  code: string;
  scans: number;
};

export function TablesManager({ slug, baseUrl }: { slug: string; baseUrl: string }) {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ open: boolean; row?: TableRow }>({ open: false });
  const [qrTable, setQrTable] = useState<TableRow | null>(null);

  async function load() {
    const res = await fetch("/api/tables");
    const json = await res.json();
    if (json.success) setTables(json.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    if (!confirm("Stol o'chirilsinmi?")) return;
    await fetch(`/api/tables/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing({ open: true })}>
          <Plus className="h-4 w-4" /> Stol qo'shish
        </Button>
      </div>

      {tables.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <Table2 className="h-10 w-10 text-muted/40" />
          <p className="mt-3 font-medium text-foreground">Stol yo'q</p>
          <p className="mt-1 text-sm text-muted">
            Har bir stol uchun alohida QR kod yarating
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted">{t.scans} skan</p>
                </div>
                <div className="flex gap-0.5">
                  <button
                    onClick={() => setEditing({ open: true, row: t })}
                    className="rounded p-1 text-muted hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(t.id)}
                    className="rounded p-1 text-muted hover:text-error"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => setQrTable(t)}
              >
                <QrCode className="h-4 w-4" /> QR kod
              </Button>
            </Card>
          ))}
        </div>
      )}

      <TableModal
        state={editing}
        onClose={() => setEditing({ open: false })}
        onSaved={() => {
          setEditing({ open: false });
          load();
        }}
      />

      {qrTable && (
        <TableQrModal
          table={qrTable}
          url={`${baseUrl}/m/${slug}?t=${qrTable.code}`}
          onClose={() => setQrTable(null)}
        />
      )}
    </div>
  );
}

function TableModal({
  state,
  onClose,
  onSaved,
}: {
  state: { open: boolean; row?: TableRow };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const edit = state.row;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch(edit ? `/api/tables/${edit.id}` : "/api/tables", {
      method: edit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: f.get("name") }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error || "Xatolik");
      return;
    }
    onSaved();
  }

  return (
    <Modal
      open={state.open}
      onClose={onClose}
      title={edit ? "Stolni tahrirlash" : "Yangi stol"}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Stol nomi
          </label>
          <Input
            name="name"
            defaultValue={edit?.name}
            placeholder="Stol 1 / VIP 2 / Terassa 1"
            required
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Bekor
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Saqlash
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function TableQrModal({
  table,
  url,
  onClose,
}: {
  table: TableRow;
  url: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 280,
        margin: 2,
        errorCorrectionLevel: "H",
      });
    }
  }, [url]);

  function download() {
    const c = canvasRef.current;
    if (!c) return;
    const link = document.createElement("a");
    link.download = `qr-${table.name.replace(/\s+/g, "-")}.png`;
    link.href = c.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xs rounded-2xl bg-card p-6 text-center shadow-card animate-fade-up">
        <button onClick={onClose} className="absolute right-3 top-3 text-muted">
          <X className="h-5 w-5" />
        </button>
        <h3 className="font-semibold text-foreground">{table.name}</h3>
        <p className="mb-4 text-xs text-muted">Skaner qilinganda avtomatik biriktiriladi</p>
        <div className="mx-auto w-full max-w-[220px] rounded-xl bg-white p-3">
          <canvas ref={canvasRef} className="!h-auto !w-full" />
        </div>
        <Button className="mt-4 w-full" onClick={download}>
          <Download className="h-4 w-4" /> PNG yuklab olish
        </Button>
      </div>
    </div>
  );
}
