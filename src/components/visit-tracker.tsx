"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VID_KEY = "ozf_vid";
const SEEN_PREFIX = "ozf_seen:"; // path bo'yicha oxirgi yuborilgan vaqt
const THROTTLE_MS = 30 * 60 * 1000; // bir sahifa bir mehmon uchun 30 daqiqada 1 marta

// Ichki (autentifikatsiyalangan) sahifalarni kuzatmaymiz
const SKIP = /^\/(dashboard|admins|api|staff)(\/|$)/;

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VID_KEY);
    if (!id) {
      id =
        (crypto?.randomUUID?.() as string) ||
        Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(VID_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/**
 * Sayt tashrifini jimgina yozadi (admin analitikasi uchun). Root layout'da turadi;
 * dashboard/admin ichki sahifalarini o'tkazib yuboradi, har mehmon uchun bitta
 * sahifani 30 daqiqada bir marta yuboradi (spam bo'lmasin).
 */
export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || SKIP.test(pathname)) return;

    try {
      const key = SEEN_PREFIX + pathname;
      const last = Number(sessionStorage.getItem(key) || "0");
      if (Date.now() - last < THROTTLE_MS) return;
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      /* storage o'chirilgan bo'lsa baribir yuboramiz */
    }

    const visitorId = getVisitorId();
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        path: pathname,
        visitorId,
        referrer: document.referrer || null,
      }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
