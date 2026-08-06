"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Check, Webhook, ShieldCheck, Info, BookOpen } from "lucide-react";
import { Skeleton, Badge } from "@/components/ui";
import { IgAccountCard, type IgAccount } from "./ig-account-card";
import { igGet } from "./client";

type Overview = { configured: boolean; account: IgAccount | null };

export function IgSettings() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await igGet<Overview>(""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
  }, [load]);

  if (loading) return <Skeleton className="h-96 w-full" />;

  const webhookUrl = `${origin}/api/instagram/webhook`;

  return (
    <div className="space-y-6">
      <IgAccountCard account={data!.account} configured={data!.configured} onChange={load} />

      {/* Webhook sozlamasi */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <Webhook className="h-4 w-4 text-accent" />
          <h3 className="font-semibold text-foreground">Webhook (real-time)</h3>
        </div>
        <p className="mb-3 text-sm text-muted">
          Instagram comment va DM'larni <b>real vaqtda</b> yuboradi (polling ishlatilmaydi). Meta App
          sozlamalarida quyidagi Callback URL va Verify Token'ni kiriting.
        </p>
        <CopyRow label="Callback URL" value={webhookUrl} />
        <div className="mt-2">
          <p className="mb-1 text-xs font-medium text-muted">Obuna maydonlari (fields)</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="accent">comments</Badge>
            <Badge variant="accent">messages</Badge>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          Verify Token server <code>IG_WEBHOOK_VERIFY_TOKEN</code> muhit o'zgaruvchisidan olinadi.
        </p>
      </div>

      {/* Konfiguratsiya holati */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent" />
          <h3 className="font-semibold text-foreground">Server konfiguratsiyasi</h3>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Meta App (IG_APP_ID / IG_APP_SECRET)</span>
          {data!.configured ? (
            <Badge variant="success">Sozlangan</Badge>
          ) : (
            <Badge variant="warning">Sozlanmagan</Badge>
          )}
        </div>
        {!data!.configured && (
          <div className="mt-3 rounded-lg bg-warning/10 p-3 text-xs text-warning">
            Administrator serverda quyidagilarni sozlashi kerak: <code>IG_APP_ID</code>,{" "}
            <code>IG_APP_SECRET</code>, <code>IG_WEBHOOK_VERIFY_TOKEN</code>. Batafsil{" "}
            <code>.env.example</code> faylida.
          </div>
        )}
      </div>

      {/* Instagram API cheklovlari */}
      <div className="rounded-2xl border border-accent/20 bg-accent-soft/40 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-accent" />
          <h3 className="font-semibold text-foreground">Instagram API cheklovlari</h3>
        </div>
        <ul className="space-y-2 text-sm text-muted">
          <li className="flex gap-2">
            <span className="text-accent">•</span> Faqat <b>Business</b> yoki <b>Creator</b> akkaunt
            ulanadi (oddiy shaxsiy akkaunt ulanmaydi).
          </li>
          <li className="flex gap-2">
            <span className="text-accent">•</span> DM faqat foydalanuvchi oxirgi <b>24 soat</b>{" "}
            ichida yozgan bo'lsa yuboriladi (Instagram xabar oynasi qoidasi).
          </li>
          <li className="flex gap-2">
            <span className="text-accent">•</span> Bir xabarda eng ko'pi <b>3 ta tugma</b> — faqat
            havola (URL) yoki flow'ning keyingi bosqichi.
          </li>
          <li className="flex gap-2">
            <span className="text-accent">•</span> Boshqa akkauntning obunasini tekshirish yoki
            Telegram uslubidagi ixtiyoriy inline tugmalar Instagram API'da mavjud emas — ular
            qo'shilmagan.
          </li>
          <li className="flex gap-2">
            <span className="text-accent">•</span> Comment muallifiga shaxsiy javob (private reply)
            har comment uchun faqat <b>1 marta</b> yuboriladi.
          </li>
        </ul>
        <a
          href="https://developers.facebook.com/docs/instagram-platform"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          <BookOpen className="h-4 w-4" />
          Instagram Platform hujjatlari
        </a>
      </div>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted">{label}</p>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 p-2">
        <code className="min-w-0 flex-1 truncate text-xs text-foreground">{value}</code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-card hover:text-foreground"
          title="Nusxa olish"
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
