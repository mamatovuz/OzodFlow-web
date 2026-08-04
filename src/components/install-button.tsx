"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";

// beforeinstallprompt event tipi (standart TS'da yo'q)
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "ozodflow-install-dismissed";

/**
 * "Ilovani o'rnatish" banneri.
 * - Android/Chrome/Edge/Windows: beforeinstallprompt orqali bitta bosishda o'rnatadi
 * - iPhone/Safari: qo'lda qo'shish yo'riqnomasini ko'rsatadi
 * - Ilova allaqachon o'rnatilgan (standalone) bo'lsa yoki foydalanuvchi yopgan bo'lsa — chiqmaydi
 */
export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Allaqachon ilova sifatida ochilganmi?
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    // Foydalanuvchi oldin yopganmi?
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    // iOS aniqlash (beforeinstallprompt bermaydi)
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua) && !("MSStream" in window);
    if (ios) {
      setIsIos(true);
      setVisible(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (isIos) {
      setShowIosHelp(true);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setVisible(false);
  };

  const dismiss = () => {
    setVisible(false);
    setShowIosHelp(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* localStorage o'chirilgan bo'lishi mumkin */
    }
  };

  if (!visible) return null;

  return (
    <>
      <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-blue-100 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              OzodFlow ilovasini o'rnating
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Tez ishlaydi, telefoningizda alohida ikonka bo'ladi
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={install}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                O'rnatish
              </button>
              <button
                onClick={dismiss}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Keyinroq
              </button>
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Yopish"
            className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* iPhone uchun yo'riqnoma */}
      {showIosHelp && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 sm:items-center"
          onClick={dismiss}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-semibold text-slate-900 dark:text-white">
              iPhone'ga o'rnatish
            </p>
            <ol className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <Share className="h-5 w-5 shrink-0 text-blue-600" />
                Pastdagi <b>Ulashish</b> tugmasini bosing
              </li>
              <li className="flex items-center gap-2">
                <Plus className="h-5 w-5 shrink-0 text-blue-600" />
                <span>
                  <b>&quot;Bosh ekranga qo'shish&quot;</b> ni tanlang
                </span>
              </li>
            </ol>
            <button
              onClick={dismiss}
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
