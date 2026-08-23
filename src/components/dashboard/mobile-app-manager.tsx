"use client";

import { useEffect, useRef, useState } from "react";
import {
  Smartphone,
  Loader2,
  Hammer,
  Download,
  Link2,
  Check,
  RefreshCw,
  Copy,
  Wifi,
  BatteryFull,
  Signal,
} from "lucide-react";
import { Card, Button, Input, Label } from "@/components/ui";

type App = {
  appName: string;
  packageName: string;
  themeColor: string;
  splashText: string | null;
  status: "NONE" | "BUILDING" | "READY" | "FAILED";
  version: number;
  apkUrl: string | null;
  apkSize: string | null;
  downloads: number;
  lastBuiltAt: string | null;
};

type Restaurant = { slug: string; name: string; logo: string | null; primaryColor: string };

export function MobileAppManager() {
  const [app, setApp] = useState<App | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [building, setBuilding] = useState(false);
  const [copied, setCopied] = useState<"share" | "menu" | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    const res = await fetch("/api/mobile-app", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (json?.success) {
      setApp(json.data.app);
      setRestaurant(json.data.restaurant);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Debounce bilan avtomatik saqlash
  function patch(next: Partial<App>) {
    setApp((a) => (a ? { ...a, ...next } : a));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await fetch("/api/mobile-app", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      setSaving(false);
    }, 600);
  }

  async function build() {
    setBuilding(true);
    // BUILDING holatini ko'rsatamiz (backend deyarli darhol qaytaradi, lekin his qilinsin)
    setApp((a) => (a ? { ...a, status: "BUILDING" } : a));
    const res = await fetch("/api/mobile-app/build", { method: "POST" });
    const json = await res.json().catch(() => null);
    // Build hissi uchun kichik kechikish
    await new Promise((r) => setTimeout(r, 1400));
    if (json?.success) setApp(json.data.app);
    setBuilding(false);
  }

  function copy(kind: "share" | "menu", text: string) {
    navigator.clipboard?.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1600);
  }

  if (loading || !app || !restaurant) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda…
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://ozodflow.uz";
  const menuUrl = `${origin}/m/${restaurant.slug}`;
  const shareUrl = `${origin}/app/${restaurant.slug}`;
  const iconSrc = restaurant.logo || `/m/${restaurant.slug}/app-icon?s=192`;
  const isReady = app.status === "READY";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* ── Chap: sozlamalar ── */}
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="mb-1 font-semibold text-foreground">Ilova sozlamalari</h2>
          <p className="mb-5 text-sm text-muted">
            Bu ma'lumotlar mijoz telefonidagi ilova ikonkasi va splash ekranida ko'rinadi.
          </p>

          <div className="space-y-4">
            <div>
              <Label>Ilova nomi</Label>
              <Input
                value={app.appName}
                maxLength={30}
                onChange={(e) => patch({ appName: e.target.value })}
                placeholder={restaurant.name}
              />
              <p className="mt-1 text-xs text-muted">Telefon bosh ekranida ikonka ostida chiqadi.</p>
            </div>

            <div>
              <Label>Splash matni (ixtiyoriy)</Label>
              <Input
                value={app.splashText || ""}
                maxLength={60}
                onChange={(e) => patch({ splashText: e.target.value || null })}
                placeholder="Masalan: Mazali taomlar bir bosishda"
              />
            </div>

            <div>
              <Label>Asosiy rang</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={app.themeColor}
                  onChange={(e) => patch({ themeColor: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-card"
                />
                <span className="font-mono text-sm text-muted">{app.themeColor}</span>
              </div>
              <p className="mt-1 text-xs text-muted">Splash ekran va status bar rangi.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ReadonlyField label="Paket nomi" value={app.packageName} />
              <ReadonlyField label="Versiya" value={`v${app.version}`} />
            </div>

            <div>
              <Label>Menyu manzili (ilova ichida ochiladi)</Label>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground">
                  {menuUrl}
                </code>
                <button
                  onClick={() => copy("menu", menuUrl)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition hover:bg-surface-2"
                  title="Nusxa olish"
                >
                  {copied === "menu" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {saving && (
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
              <Loader2 className="h-3 w-3 animate-spin" /> Saqlanmoqda…
            </p>
          )}
        </Card>

        {/* Build / natija */}
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-foreground">
                {isReady ? "Ilova tayyor" : "Ilovani yaratish"}
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                {isReady
                  ? "Nom, ikonka yoki rangni o'zgartirsangiz — qaytadan yarating."
                  : "Bir marta bosing — mijozlaringiz uchun ilova tayyorlanadi."}
              </p>
            </div>
            {isReady && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                <Check className="h-3.5 w-3.5" /> v{app.version}
              </span>
            )}
          </div>

          <Button onClick={build} disabled={building} className="mt-4" size="lg">
            {building ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Yaratilmoqda…
              </>
            ) : isReady ? (
              <>
                <RefreshCw className="h-4 w-4" /> Qaytadan yaratish
              </>
            ) : (
              <>
                <Hammer className="h-4 w-4" /> Ilova yaratish
              </>
            )}
          </Button>

          {isReady && (
            <div className="mt-5 space-y-4 border-t border-border pt-5">
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={app.apkUrl || shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover"
                >
                  <Download className="h-4 w-4" />
                  {app.apkUrl ? `Ilovani yuklab olish · ${app.apkSize}` : "Ilova sahifasi"}
                </a>
                <button
                  onClick={() => copy("share", shareUrl)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface-2"
                >
                  {copied === "share" ? (
                    <>
                      <Check className="h-4 w-4 text-success" /> Nusxalandi
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4" /> Ilovani ulashish
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-xl border border-border bg-surface-2/50 p-4">
                <p className="text-sm font-medium text-foreground">Doimiy ulashish havolasi</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-card px-3 py-2 text-sm text-accent">
                    {shareUrl}
                  </code>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Shu havolani Telegram, Instagram yoki QR orqali mijozlarga tarqating. Ular ochib
                  ilovani telefoniga o'rnatadi — menyu ilova ichida ochiladi.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Qanday ishlaydi */}
        <Card className="p-6">
          <h3 className="mb-3 font-semibold text-foreground">Qanday ishlaydi?</h3>
          <ol className="space-y-3 text-sm text-muted">
            <Step n={1}>Ilova nomi va rangini sozlang, «Ilova yaratish»ni bosing.</Step>
            <Step n={2}>Havolani (yoki APK'ni) mijozlarga bir marta tarqating.</Step>
            <Step n={3}>Mijoz o'rnatadi — ilova ichida to'g'ridan-to'g'ri menyungiz ochiladi.</Step>
            <Step n={4}>
              Menyu, narx yoki dizaynni o'zgartirsangiz — hamma ilovada avtomatik yangilanadi, qayta
              tarqatish shart emas.
            </Step>
          </ol>
        </Card>
      </div>

      {/* ── O'ng: jonli telefon preview ── */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-3 text-center text-sm font-medium text-muted">Jonli ko'rinish</p>
        <PhonePreview
          appName={app.appName || restaurant.name}
          splashText={app.splashText}
          themeColor={app.themeColor}
          iconSrc={iconSrc}
          building={building}
        />
        <div className="mt-4 flex items-center justify-center gap-4 text-center text-xs text-muted">
          <span>
            <b className="text-foreground">{app.downloads}</b> yuklab olish
          </span>
          {app.lastBuiltAt && (
            <span>
              Oxirgi: {new Date(app.lastBuiltAt).toLocaleDateString("uz")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="truncate rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-muted">
        {value}
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

// Splash ekranli telefon mockup — sozlamalar o'zgarsa jonli yangilanadi.
function PhonePreview({
  appName,
  splashText,
  themeColor,
  iconSrc,
  building,
}: {
  appName: string;
  splashText: string | null;
  themeColor: string;
  iconSrc: string;
  building: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-[280px]">
      <div
        className="relative aspect-[9/19] w-full overflow-hidden rounded-[2.5rem] border-[10px] border-slate-900 shadow-2xl"
        style={{ backgroundColor: themeColor }}
      >
        {/* Notch */}
        <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-slate-900" />

        {/* Status bar */}
        <div className="absolute inset-x-0 top-0 z-0 flex items-center justify-between px-6 pt-3 text-[10px] font-medium text-white/90">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <Signal className="h-3 w-3" />
            <Wifi className="h-3 w-3" />
            <BatteryFull className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Splash markazi */}
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={iconSrc}
            alt={appName}
            className="h-24 w-24 rounded-[1.4rem] bg-white/95 object-contain p-2 shadow-lg"
          />
          <p className="mt-5 text-lg font-bold text-white drop-shadow">{appName}</p>
          {splashText && (
            <p className="mt-1.5 text-xs text-white/80">{splashText}</p>
          )}

          {building && (
            <div className="mt-6 flex items-center gap-2 text-xs text-white/90">
              <Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda…
            </div>
          )}
        </div>

        {/* Powered by */}
        <p className="absolute inset-x-0 bottom-5 text-center text-[10px] text-white/60">
          OzodFlow bilan yaratilgan
        </p>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted">
        <Smartphone className="h-3.5 w-3.5" /> Android ilova ko'rinishi
      </div>
    </div>
  );
}
