"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Globe,
} from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";
import { Modal } from "@/components/ui-modal";

type Req = {
  id: string;
  domain: string;
  note: string | null;
  receiptImage: string | null;
  status: string;
  createdAt: string;
  restaurant: { name: string; slug: string; plan: string };
  user: { name: string; email: string | null; phone: string | null };
};

const tabs = [
  { key: "PENDING", label: "Kutilayotgan" },
  { key: "DONE", label: "Ulangan" },
  { key: "REJECTED", label: "Rad etilgan" },
];

export function DomainsModeration() {
  const [status, setStatus] = useState("PENDING");
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/domains?status=${status}`);
    const json = await res.json();
    if (json.success) setItems(json.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function act(id: string, action: "complete" | "reject") {
    if (action === "complete" && !confirm("Domen restoranga ulansinmi?")) return;
    if (action === "reject" && !confirm("So'rov rad etilsinmi?")) return;
    setActing(id);
    const res = await fetch(`/api/admin/domains/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setActing(null);
    if (res.ok) load();
    else {
      const j = await res.json();
      alert(j.error || "Xatolik");
    }
  }

  return (
    <div>
      <div className="mb-5 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatus(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              status === t.key
                ? "bg-accent text-white"
                : "bg-card text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : items.length === 0 ? (
        <Card className="py-16 text-center text-sm text-muted">So'rovlar yo'q</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-accent" />
                    <span className="font-mono font-medium text-foreground">
                      {r.domain}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {r.restaurant.name} · {r.user.name} ·{" "}
                    {r.user.email || r.user.phone}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>

              {r.note && (
                <p className="mt-2 rounded-lg bg-surface-2 p-2 text-sm text-muted">
                  {r.note}
                </p>
              )}

              <div className="mt-3 flex items-center gap-3">
                {r.receiptImage && (
                  <button
                    onClick={() => setPreview(r.receiptImage)}
                    className="flex items-center gap-1 text-xs text-accent"
                  >
                    <ExternalLink className="h-3 w-3" /> Chek
                  </button>
                )}
                <a
                  href={`/m/${r.restaurant.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-muted hover:text-accent"
                >
                  <ExternalLink className="h-3 w-3" /> Menyu
                </a>
                <span className="ml-auto text-xs text-muted">
                  {new Date(r.createdAt).toLocaleDateString("uz-UZ")}
                </span>
              </div>

              {r.status === "PENDING" && (
                <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={acting === r.id}
                    onClick={() => act(r.id, "reject")}
                  >
                    Rad etish
                  </Button>
                  <Button
                    size="sm"
                    disabled={acting === r.id}
                    onClick={() => act(r.id, "complete")}
                  >
                    {acting === r.id && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Ulash
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {preview && (
        <Modal open onClose={() => setPreview(null)} title="To'lov cheki">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="chek" className="w-full rounded-lg" />
        </Modal>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "DONE")
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3 w-3" /> Ulangan
      </Badge>
    );
  if (status === "REJECTED")
    return (
      <Badge variant="error">
        <XCircle className="h-3 w-3" /> Rad
      </Badge>
    );
  return (
    <Badge variant="warning">
      <Clock className="h-3 w-3" /> Kutilmoqda
    </Badge>
  );
}
