"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Check,
  Globe,
  Lock,
  ExternalLink,
  Upload,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Wrench,
  Hand,
} from "lucide-react";
import { Button, Input, Card, Badge, Label, Textarea } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import { DOMAIN_SERVICE_PRICE } from "@/lib/plans";
import Link from "next/link";

type DomainReq = {
  id: string;
  domain: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
};

export function DomainForm({
  current,
  slug,
  canCustomDomain,
}: {
  current: string | null;
  slug: string;
  canCustomDomain: boolean;
}) {
  const [mode, setMode] = useState<"self" | "service">("service");

  if (!canCustomDomain) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted" />
          <h2 className="font-semibold text-foreground">O'z domeningiz</h2>
          <Badge variant="warning">Pro</Badge>
        </div>
        <p className="mt-2 text-sm text-muted">
          O'z domeningizni (masalan <b>menu.restoran.uz</b>) ulash Pro yoki Pro
          Max tarifida mavjud.
        </p>
        <Link href="/dashboard/settings" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            <Lock className="h-4 w-4" /> Tarifni yangilash
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-accent" />
        <h2 className="font-semibold text-foreground">O'z domeningiz</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        Hozirgi manzil: <span className="text-foreground">/m/{slug}</span>
        {current && (
          <>
            {" · "}Ulangan:{" "}
            <a
              href={`http://${current}`}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              {current}
            </a>
          </>
        )}
      </p>

      {/* Rejim tanlash */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          onClick={() => setMode("service")}
          className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
            mode === "service"
              ? "border-accent bg-accent-soft"
              : "border-border hover:bg-surface-2"
          }`}
        >
          <Wrench className="mt-0.5 h-5 w-5 text-accent" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Admin o'rnatib bersin
            </p>
            <p className="text-xs text-muted">
              {formatPrice(DOMAIN_SERVICE_PRICE, "UZS")} / yil — biz sozlaymiz
            </p>
          </div>
        </button>
        <button
          onClick={() => setMode("self")}
          className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
            mode === "self"
              ? "border-accent bg-accent-soft"
              : "border-border hover:bg-surface-2"
          }`}
        >
          <Hand className="mt-0.5 h-5 w-5 text-accent" />
          <div>
            <p className="text-sm font-medium text-foreground">O'zim ulayman</p>
            <p className="text-xs text-muted">DNS'ni o'zim sozlayman (tekin)</p>
          </div>
        </button>
      </div>

      <div className="mt-5">
        {mode === "self" ? (
          <SelfConnect current={current} />
        ) : (
          <ServiceRequest />
        )}
      </div>
    </Card>
  );
}

// ─── O'zim ulash (DNS) ───
function SelfConnect({ current }: { current: string | null }) {
  const [domain, setDomain] = useState(current || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save(remove = false) {
    setSaving(true);
    setSaved(false);
    setError("");
    const res = await fetch("/api/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customDomain: remove ? "" : domain.trim() }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Xatolik");
      return;
    }
    if (remove) setDomain("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <Label>Domeningiz</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="menu.restoran.uz"
        />
        <Button onClick={() => save(false)} disabled={saving || !domain.trim()}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Saqlash
        </Button>
        {current && (
          <Button variant="outline" onClick={() => save(true)} disabled={saving}>
            O'chirish
          </Button>
        )}
      </div>
      {saved && (
        <p className="mt-2 flex items-center gap-1 text-sm text-success">
          <Check className="h-4 w-4" /> Saqlandi
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}
      <div className="mt-4 rounded-xl bg-surface-2 p-4 text-sm text-muted">
        <p className="font-medium text-foreground">DNS ko'rsatma</p>
        <ol className="mt-2 space-y-1">
          <li>1. Domeningiz DNS'ida <b>CNAME</b> yozuv qo'shing.</li>
          <li>
            2. Qiymat:{" "}
            <span className="font-mono text-foreground">cname.ozodflow.uz</span>
          </li>
          <li>3. Bu yerga domeningizni yozib saqlang.</li>
        </ol>
      </div>
    </div>
  );
}

// ─── Admin xizmati orqali ───
function ServiceRequest() {
  const [requests, setRequests] = useState<DomainReq[]>([]);
  const [domain, setDomain] = useState("");
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/domain/request");
    const json = await res.json();
    if (json.success) setRequests(json.data);
  }
  useEffect(() => {
    load();
  }, []);

  const pending = requests.find((r) => r.status === "PENDING");

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    setUploading(false);
    if (!res.ok) return setError(json.error || "Yuklashda xatolik");
    setReceipt(json.data.url);
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/domain/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: domain.trim(), note, receiptImage: receipt }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error || "Xatolik");
      return;
    }
    setDomain("");
    setNote("");
    setReceipt("");
    load();
  }

  return (
    <div>
      <div className="rounded-xl bg-accent-soft p-4">
        <p className="text-sm text-foreground">
          Qanday domen xohlaysiz — yozib qoldiring, biz sozlab beramiz.
        </p>
        <p className="mt-1 text-lg font-bold text-accent">
          {formatPrice(DOMAIN_SERVICE_PRICE, "UZS")}{" "}
          <span className="text-sm font-normal text-muted">/ yil</span>
        </p>
      </div>

      {pending ? (
        <div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-center gap-2 text-warning">
            <Clock className="h-4 w-4" />
            <p className="text-sm font-medium">
              So'rovingiz ko'rib chiqilmoqda: {pending.domain}
            </p>
          </div>
          <p className="mt-1 text-sm text-muted">
            Admin domeningizni sozlaydi va tez orada ulaydi.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div>
            <Label>Kerakli domen</Label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="menu.restoran.uz"
            />
          </div>
          <div>
            <Label>Izoh (ixtiyoriy)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Qo'shimcha ma'lumot..."
            />
          </div>
          <div>
            <Label>To'lov cheki (ixtiyoriy)</Label>
            {receipt ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receipt}
                  alt="chek"
                  className="h-24 rounded-lg border border-border object-cover"
                />
                <button
                  onClick={() => setReceipt("")}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-error text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border py-4 text-sm text-muted hover:border-accent hover:text-accent">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-5 w-5" /> Chek rasmini yuklash
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={upload}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
          {error && (
            <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}
          <Button onClick={submit} disabled={submitting || !domain.trim()}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            So'rov yuborish
          </Button>
        </div>
      )}

      {/* Tarix */}
      {requests.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-foreground">
            So'rovlar tarixi
          </p>
          <div className="space-y-2">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <span className="text-sm text-foreground">{r.domain}</span>
                <DomainStatus status={r.status} note={r.adminNote} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DomainStatus({ status, note }: { status: string; note: string | null }) {
  if (status === "DONE")
    return (
      <span className="flex items-center gap-1 text-sm text-success">
        <CheckCircle2 className="h-4 w-4" /> Ulandi
      </span>
    );
  if (status === "REJECTED")
    return (
      <span
        className="flex items-center gap-1 text-sm text-error"
        title={note || ""}
      >
        <XCircle className="h-4 w-4" /> Rad etildi
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-sm text-warning">
      <Clock className="h-4 w-4" /> Kutilmoqda
    </span>
  );
}
