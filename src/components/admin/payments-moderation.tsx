"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";
import { Modal } from "@/components/ui-modal";
import { formatPrice } from "@/lib/utils";

type Req = {
  id: string;
  plan: string;
  amount: number;
  status: string;
  adminNote: string | null;
  receiptImage: string;
  createdAt: string;
  restaurant: { name: string; slug: string };
  user: { name: string; email: string | null; phone: string | null };
};

const tabs = [
  { key: "PENDING", label: "Kutilayotgan" },
  { key: "APPROVED", label: "Tasdiqlangan" },
  { key: "REJECTED", label: "Rad etilgan" },
];

export function PaymentsModeration() {
  const [status, setStatus] = useState("PENDING");
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/payments?status=${status}`);
    const json = await res.json();
    if (json.success) setItems(json.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function act(id: string, action: "approve" | "reject") {
    if (action === "reject" && !confirm("To'lovni rad etishni tasdiqlaysizmi?"))
      return;
    setActing(id);
    const res = await fetch(`/api/admin/payments/${id}`, {
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
      {/* Tabs */}
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
        <Card className="py-16 text-center text-sm text-muted">
          So'rovlar yo'q
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">
                    {r.restaurant.name}
                  </p>
                  <p className="text-xs text-muted">
                    {r.user.name} · {r.user.email || r.user.phone}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>

              <div className="mt-3 flex items-center gap-3 rounded-lg bg-surface-2 p-3">
                <button
                  onClick={() => setPreview(r.receiptImage)}
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.receiptImage}
                    alt="chek"
                    className="h-full w-full object-cover"
                  />
                </button>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {r.plan} tarif
                  </p>
                  <p className="text-lg font-bold text-accent">
                    {formatPrice(r.amount, "UZS")}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(r.createdAt).toLocaleString("uz-UZ")}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <a
                  href={`/m/${r.restaurant.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mr-auto flex items-center gap-1 text-xs text-muted hover:text-accent"
                >
                  <ExternalLink className="h-3 w-3" /> Menyu
                </a>
                {r.status === "PENDING" && (
                  <>
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
                      onClick={() => act(r.id, "approve")}
                    >
                      {acting === r.id && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Tasdiqlash
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Chek preview */}
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
  if (status === "APPROVED")
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3 w-3" /> Tasdiq
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
