"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, Share, Plus, Check, ExternalLink } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * /app/<slug> sahifasidagi o'rnatish tugmasi.
 * - Haqiqiy APK bo'lsa (build xizmati ulangan): to'g'ridan-to'g'ri yuklab olish.
 * - Aks holda: PWA sifatida o'rnatish (Android: bir bosishda / iPhone: qo'llanma).
 *   PWA — browsersiz, standalone, bosh ekranда alohida ikonka bilan ochiladigan ilova.
 */
export function AppInstall({
  slug,
  menuUrl,
  apkUrl,
  apkSize,
  themeColor,
}: {
  slug: string;
  menuUrl: string;
  apkUrl: string | null;
  apkSize: string | null;
  themeColor: string;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform("ios");
    else if (/android/.test(ua)) setPlatform("android");
    else setPlatform("desktop");

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function countDownload() {
    fetch("/api/mobile-app/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    }).catch(() => {});
  }

  async function install() {
    countDownload();

    // 1) Haqiqiy APK bor — yuklab olamiz
    if (apkUrl) {
      window.location.href = apkUrl;
      return;
    }

    // 2) Android/desktop — PWA o'rnatish so'rovi
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      setDeferred(null);
      if (outcome === "accepted") setInstalled(true);
      return;
    }

    // 3) iPhone — qo'llanma
    if (platform === "ios") {
      setShowIosHelp(true);
      return;
    }

    // 4) Prompt hali tayyor emas — menyuni ochamiz (u yerda o'rnatish taklifi chiqadi)
    window.location.href = `${menuUrl}?source=app`;
  }

  if (installed) {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-6 py-4 text-white backdrop-blur">
        <Check className="h-5 w-5" /> Ilova o'rnatildi — bosh ekraningizni tekshiring
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={install}
          className="inline-flex items-center gap-2.5 rounded-2xl bg-white px-8 py-4 text-base font-semibold shadow-xl transition active:scale-95"
          style={{ color: themeColor }}
        >
          <Download className="h-5 w-5" />
          {apkUrl ? `APK yuklab olish · ${apkSize || ""}` : "Ilovani o'rnatish"}
        </button>

        <a
          href={`${menuUrl}?source=app`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition hover:text-white"
        >
          <ExternalLink className="h-4 w-4" /> Avval menyuni ko'rish
        </a>

        <p className="mt-1 flex items-center gap-1.5 text-xs text-white/70">
          <Smartphone className="h-3.5 w-3.5" />
          {platform === "ios"
            ? "iPhone uchun: Ulashish → Bosh ekranga qo'shish"
            : "Android · bir bosishda o'rnatiladi"}
        </p>
      </div>

      {showIosHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center"
          onClick={() => setShowIosHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-semibold text-slate-900">iPhone'ga o'rnatish</p>
            <ol className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <Share className="h-5 w-5 shrink-0 text-blue-600" />
                Pastdagi <b>Ulashish</b> tugmasini bosing
              </li>
              <li className="flex items-center gap-2">
                <Plus className="h-5 w-5 shrink-0 text-blue-600" />
                <span>
                  <b>«Bosh ekranga qo'shish»</b> ni tanlang
                </span>
              </li>
            </ol>
            <button
              onClick={() => setShowIosHelp(false)}
              className="mt-5 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Tushunarli
            </button>
          </div>
        </div>
      )}
    </>
  );
}
