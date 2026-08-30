"use client";

import { useEffect, useState } from "react";
import {
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  HelpCircle,
  ShieldOff,
  LogOut,
  RotateCcw,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Card, Badge } from "@/components/ui";

type Session = {
  id: string;
  current: boolean;
  count?: number; // shu qurilmadagi seanslar soni (dedup)
  type: "phone" | "tablet" | "laptop" | "desktop" | "unknown";
  os: string;
  browser: string;
  label: string;
  ip: string | null;
  lastSeenAt: string;
  createdAt: string;
};

type Blocked = {
  fingerprint: string;
  label: string;
  ip: string | null;
  createdAt: string;
};

const ICONS = {
  phone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  desktop: Monitor,
  unknown: HelpCircle,
} as const;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hozir faol";
  if (m < 60) return `${m} daqiqa oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} kun oldin`;
  return new Date(iso).toLocaleDateString("uz");
}

export function SessionsManager() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [blocked, setBlocked] = useState<Blocked[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null); // ish ketayotgan id/fingerprint
  const [confirmBlock, setConfirmBlock] = useState<Session | null>(null);
  const [showAll, setShowAll] = useState(false); // boshida faqat 4 ta, keyin hammasi

  const VISIBLE = 4;

  async function load() {
    const res = await fetch("/api/sessions", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (json?.success) {
      setSessions(json.data.sessions);
      setBlocked(json.data.blocked);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function revoke(id: string) {
    setBusy(id);
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    await load();
    setBusy(null);
  }

  async function block(s: Session) {
    setBusy(s.id);
    setConfirmBlock(null);
    await fetch(`/api/sessions/${s.id}/block`, { method: "POST" });
    await load();
    setBusy(null);
  }

  async function unblock(fingerprint: string) {
    setBusy(fingerprint);
    await fetch("/api/sessions/unblock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprint }),
    });
    await load();
    setBusy(null);
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Faol seanslar</h2>
          <p className="mt-0.5 text-sm text-muted">
            Hisobingizga kirgan qurilmalar. Shubhali qurilmani chiqaring yoki bloklang.
          </p>
        </div>
        <button
          onClick={() => load()}
          className="text-muted transition hover:text-foreground"
          title="Yangilash"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda…
        </div>
      ) : (
        <div className="space-y-3">
          {(showAll ? sessions : sessions.slice(0, VISIBLE)).map((s) => {
            const Icon = ICONS[s.type] || HelpCircle;
            return (
              <div
                key={s.id}
                className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                  s.current ? "border-accent bg-accent-soft/40" : "border-border"
                }`}
              >
                <div className="flex min-w-0 gap-3">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      s.current ? "bg-accent text-white" : "bg-surface-2 text-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{s.label}</p>
                      {s.current && <Badge variant="accent">Joriy qurilma</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {s.os} · {s.browser}
                      {s.ip ? ` · ${s.ip}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{timeAgo(s.lastSeenAt)}</p>
                  </div>
                </div>

                {!s.current && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => revoke(s.id)}
                      disabled={busy === s.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-2 disabled:opacity-50"
                    >
                      {busy === s.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <LogOut className="h-3.5 w-3.5" />
                      )}
                      Chiqarish
                    </button>
                    <button
                      onClick={() => setConfirmBlock(s)}
                      disabled={busy === s.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-error/30 px-3 py-1.5 text-sm font-medium text-error transition hover:bg-error/10 disabled:opacity-50"
                    >
                      <ShieldOff className="h-3.5 w-3.5" />
                      Bloklash
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Ko'proq ko'rish — boshida faqat 4 ta qurilma ko'rinadi */}
          {sessions.length > VISIBLE && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-accent transition hover:bg-surface-2"
            >
              {showAll
                ? "Kamroq ko'rsatish"
                : `Ko'proq ko'rish (yana ${sessions.length - VISIBLE} ta)`}
            </button>
          )}
        </div>
      )}

      {/* Bloklangan qurilmalar */}
      {blocked.length > 0 && (
        <div className="mt-6 border-t border-border pt-5">
          <div className="mb-3 flex items-center gap-2">
            <ShieldOff className="h-4 w-4 text-error" />
            <h3 className="text-sm font-semibold text-foreground">Bloklangan qurilmalar</h3>
          </div>
          <div className="space-y-2">
            {blocked.map((b) => (
              <div
                key={b.fingerprint}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{b.label}</p>
                  <p className="text-xs text-muted">
                    {b.ip ? `${b.ip} · ` : ""}
                    {new Date(b.createdAt).toLocaleDateString("uz")} da bloklangan
                  </p>
                </div>
                <button
                  onClick={() => unblock(b.fingerprint)}
                  disabled={busy === b.fingerprint}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-2 disabled:opacity-50"
                >
                  {busy === b.fingerprint ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  Blokdan chiqarish
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bloklashni tasdiqlash modali */}
      {confirmBlock && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 sm:items-center"
          onClick={() => setConfirmBlock(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-error/10 text-error">
              <ShieldOff className="h-5 w-5" />
            </div>
            <p className="text-base font-semibold text-foreground">
              «{confirmBlock.label}» qurilmasini bloklaysizmi?
            </p>
            <p className="mt-2 text-sm text-muted">
              Bu qurilma tizimdan chiqariladi va shu qurilmadan siz bilan bir xil hisobga
              qayta kira olmaydi. Keyinroq blokdan chiqarishingiz mumkin.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmBlock(null)}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition hover:bg-surface-2"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => block(confirmBlock)}
                className="flex-1 rounded-lg bg-error py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                Bloklash
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
