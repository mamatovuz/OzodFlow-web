"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Check,
  Globe,
  Upload,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Wrench,
  Hand,
  BookOpen,
} from "lucide-react";
import { Button, Input, Card, Label, Textarea } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import { DOMAIN_SERVICE_PRICE } from "@/lib/plans";

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
}: {
  current: string | null;
  slug: string;
}) {
  const [mode, setMode] = useState<"self" | "service">("service");

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
type CheckStatus = "connected" | "not_registered" | "no_ssl" | "dns" | "unknown";

function SelfConnect({ current }: { current: string | null }) {
  const [domain, setDomain] = useState(current || "");
  const [savedDomain, setSavedDomain] = useState(current || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<CheckStatus | null>(null);

  async function save(remove = false) {
    setSaving(true);
    setSaved(false);
    setError("");
    setStatus(null);
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
    if (remove) {
      setDomain("");
      setSavedDomain("");
    } else {
      setSavedDomain(domain.trim().toLowerCase());
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function check() {
    setChecking(true);
    setStatus(null);
    setError("");
    try {
      const res = await fetch(
        `/api/domain/check?domain=${encodeURIComponent(savedDomain || domain.trim())}`
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Tekshirib bo'lmadi");
      } else {
        setStatus(json.data.status as CheckStatus);
      }
    } catch {
      setError("Tekshirib bo'lmadi");
    }
    setChecking(false);
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

      {/* Ulanish holatini tekshirish — domen saqlanganda ko'rinadi */}
      {(savedDomain || current) && (
        <div className="mt-3">
          <Button variant="outline" onClick={check} disabled={checking}>
            {checking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Globe className="h-4 w-4" />
            )}
            Ulanishni tekshirish
          </Button>
          {status && <StatusResult status={status} domain={savedDomain || current || ""} />}
        </div>
      )}

      <DnsGuide />
    </div>
  );
}

// Tekshirish natijasi — foydalanuvchiga aniq keyingi qadamni aytadi
function StatusResult({ status, domain }: { status: CheckStatus; domain: string }) {
  if (status === "connected")
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-success/30 bg-success/5 p-3 text-sm">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <div>
          <p className="font-medium text-success">Ulangan! 🎉</p>
          <p className="text-muted">
            <b>{domain}</b> menyungizni ko'rsatyapti. Hammasi joyida.
          </p>
        </div>
      </div>
    );
  if (status === "not_registered")
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <p className="font-medium text-warning">Domen serverga ulanmagan</p>
          <p className="text-muted">
            DNS to'g'ri, lekin domen hali serverimizga qo'shilmagan (SSL
            berilmagan). Bu qadamni <b>faqat biz bajaramiz</b> — “Admin o'rnatib
            bersin” variantini tanlab so'rov yuboring, tez orada ulaymiz.
          </p>
        </div>
      </div>
    );
  if (status === "no_ssl")
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <p className="font-medium text-warning">SSL (https) sozlanmoqda</p>
          <p className="text-muted">
            Menyu ko'rinyapti, lekin https hali tayyor emas. Bir necha daqiqa
            kuting yoki “Admin o'rnatib bersin”ni tanlang.
          </p>
        </div>
      </div>
    );
  if (status === "dns")
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-surface-2 p-3 text-sm">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
        <div>
          <p className="font-medium text-foreground">DNS hali topilmadi</p>
          <p className="text-muted">
            Domen hali ko'rinmayapti. DNS yozuvini qo'shganingizni tekshiring —
            tarqalishi 5 daqiqadan bir necha soatgacha vaqt olishi mumkin.
          </p>
        </div>
      </div>
    );
  return (
    <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3 text-sm text-muted">
      Holatni aniqlab bo'lmadi. Keyinroq qayta urinib ko'ring.
    </div>
  );
}

const SERVER_IP = process.env.NEXT_PUBLIC_SERVER_IP || "185.203.238.42";
// Ba'zi xostinglar (Railway kabi) A yozuv (IP) o'rniga CNAME talab qiladi.
// Agar bu env berilgan bo'lsa — CNAME yo'riqnomasi ko'rsatiladi.
const DOMAIN_CNAME = process.env.NEXT_PUBLIC_DOMAIN_CNAME || "";

// ─── DNS ko'rsatma (A record) + Batafsil modal ───
function DnsGuide() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState("");
  function copy(t: string) {
    navigator.clipboard.writeText(t);
    setCopied(t);
    setTimeout(() => setCopied(""), 2000);
  }
  return (
    <>
      <div className="mt-4 rounded-xl bg-surface-2 p-4 text-sm text-muted">
        <div className="flex items-center justify-between">
          <p className="font-medium text-foreground">Qisqa ko'rsatma (A record)</p>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            <BookOpen className="h-3.5 w-3.5" /> Batafsil
          </button>
        </div>
        {DOMAIN_CNAME ? (
          <ol className="mt-2 space-y-1">
            <li>1. Domeningiz DNS'ida <b>CNAME</b> yozuv qo'shing.</li>
            <li>
              2. Qiymat (target):{" "}
              <button onClick={() => copy(DOMAIN_CNAME)} className="font-mono text-foreground underline">
                {DOMAIN_CNAME} {copied === DOMAIN_CNAME ? "✓" : "📋"}
              </button>
            </li>
            <li>3. Yuqorida domeningizni yozib saqlang.</li>
          </ol>
        ) : (
          <ol className="mt-2 space-y-1">
            <li>1. Domeningiz DNS'ida <b>A</b> yozuv qo'shing.</li>
            <li>
              2. Qiymat (IP):{" "}
              <button onClick={() => copy(SERVER_IP)} className="font-mono text-foreground underline">
                {SERVER_IP} {copied === SERVER_IP ? "✓" : "📋"}
              </button>
            </li>
            <li>3. Yuqorida domeningizni yozib saqlang.</li>
          </ol>
        )}
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-2.5 text-xs text-foreground">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <span>
            <b>Muhim:</b> faqat DNS yetarli emas — domen serverimizga ham
            qo'shilib, SSL (https) berilishi kerak (bu qadamni biz bajaramiz).
            Shuning uchun eng oson yo'l — <b>“Admin o'rnatib bersin”</b>. DNS
            qo'shgach, yuqoridagi <b>“Ulanishni tekshirish”</b> tugmasi holatni
            aniq ko'rsatadi.
          </span>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-6 shadow-card animate-fade-up sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Domenni ulash — batafsil</h3>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-foreground">
              <Step n={1} title="Domen provayderingizga kiring">
                Domenni sotib olgan sayt (masalan ahost.uz, ps.uz, GoDaddy,
                Namecheap) — shaxsiy kabinetingizga kiring va <b>DNS boshqaruvi</b>{" "}
                (DNS Management / DNS Zone) bo'limini oching.
              </Step>
              <Step n={2} title="A yozuv (A record) qo'shing">
                <div className="mt-2 overflow-hidden rounded-lg border border-border">
                  <Row label="Type (turi)" value="A" onCopy={copy} copied={copied} />
                  <Row label="Name (nom)" value="@ yoki menu" onCopy={copy} copied={copied} />
                  <Row label="Value (IP manzil)" value={SERVER_IP} onCopy={copy} copied={copied} />
                  <Row label="TTL" value="3600 (yoki Auto)" onCopy={copy} copied={copied} last />
                </div>
                <p className="mt-2 text-xs text-muted">
                  Butun domen uchun <b>@</b>, subdomen (menu.restoran.uz) uchun{" "}
                  <b>menu</b> yozing.
                </p>
              </Step>
              <Step n={3} title="Bu yerga domeningizni kiriting">
                Yuqoridagi maydonga domeningizni to'liq yozing (masalan{" "}
                <span className="font-mono">menu.restoran.uz</span>) va{" "}
                <b>Saqlash</b> tugmasini bosing.
              </Step>
              <Step n={4} title="Kuting (DNS tarqalishi)">
                DNS o'zgarishi 5 daqiqadan bir necha soatgacha tarqaladi. Keyin
                domeningizni brauzerda ochib menyu chiqishini tekshiring. SSL
                (https) avtomatik ulanadi.
              </Step>
            </div>

            <div className="mt-5 rounded-lg bg-accent-soft p-3 text-xs text-muted">
              Qiyin bo'lsa — <b>“Admin o'rnatib bersin”</b> variantini tanlang,
              biz sozlab beramiz.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
        {n}
      </span>
      <div className="flex-1">
        <p className="font-medium text-foreground">{title}</p>
        <div className="mt-1 text-muted">{children}</div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  onCopy,
  copied,
  last,
}: {
  label: string;
  value: string;
  onCopy: (t: string) => void;
  copied: string;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 ${last ? "" : "border-b border-border"}`}>
      <span className="text-xs text-muted">{label}</span>
      <button onClick={() => onCopy(value)} className="flex items-center gap-1 font-mono text-sm text-foreground">
        {value} {copied === value ? "✓" : "📋"}
      </button>
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
