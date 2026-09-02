"use client";

import { useEffect } from "react";

// Telegram Mini App qatlami. Menyu Telegram bot ichida ochilganda (?tg=1)
// uni ilova kabi ko'rsatadi: to'liq ekran, orqaga qaytish tugmasi yashirin,
// yopishда tasdiq so'raydi va Telegram temasiga moslashadi.
// Telegram tashqarisida (oddiy brauzer) hech narsa qilmaydi — zararsiz.

type TgWebApp = {
  ready: () => void;
  expand: () => void;
  initData: string;
  colorScheme?: "light" | "dark";
  themeParams?: { bg_color?: string; secondary_bg_color?: string };
  setHeaderColor?: (c: string) => void;
  setBackgroundColor?: (c: string) => void;
  enableClosingConfirmation?: () => void;
  disableVerticalSwipes?: () => void;
  expand_?: never;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export function TelegramWebApp() {
  useEffect(() => {
    let done = false;
    function init() {
      const wa = window.Telegram?.WebApp;
      if (!wa || done) return;
      done = true;
      try {
        wa.ready();
        wa.expand();
        wa.disableVerticalSwipes?.();
        wa.enableClosingConfirmation?.();
        // Header + fonni menyu foniga moslaymiz
        const bg = wa.themeParams?.bg_color;
        if (bg) {
          wa.setHeaderColor?.(bg);
          wa.setBackgroundColor?.(bg);
        }
        // Telegram ichida ekanini belgilaymiz (CSS/ilova xatti-harakati uchun)
        document.documentElement.setAttribute("data-tg", "1");
      } catch {
        /* ignore */
      }
    }

    if (window.Telegram?.WebApp) {
      init();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-web-app.js";
    s.async = true;
    s.onload = init;
    document.head.appendChild(s);
  }, []);

  return null;
}

// order-cart shu orqali initData'ni oladi (Telegram tashqarisida bo'sh string).
export function getTelegramInitData(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const d = window.Telegram?.WebApp?.initData;
  return d && d.length > 0 ? d : undefined;
}
