"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  HelpCircle,
  LogOut,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import { Card, Badge } from "@/components/ui";

type AdminSession = {
  id: string;
  current: boolean;
  userId: string;
  userName: string;
  userEmail: string | null;
  isSuperAdmin: boolean;
  type: "phone" | "tablet" | "laptop" | "desktop" | "unknown";
  os: string;
  browser: string;
  label: string;
  ip: string | null;
  lastSeenAt: string;
  createdAt: string;
};

const deviceIcon = {
  phone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  desktop: Monitor,
  unknown: HelpCircle,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hozir";
  if (m < 60) return `${m} daqiqa oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  const d = Math.floor(h / 24);
  return `${d} kun oldin`;
}

export function AdminSessions() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/sessions");
    const json = await res.json();
    if (json.success) setSessions(json.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function kick(s: AdminSession) {
    const who = s.current ? "shu qurilmani (o'zingiz)" : `${s.userName} — ${s.label}`;
    if (!confirm(`${who} chiqarib tashlansinmi?`)) return;
    setBusy(s.id);
    await fetch(`/api/admin/sessions/${s.id}`, { method: "DELETE" });
    setBusy(null);
    if (s.current) {
      window.location.href = "/admins/login";
      return;
    }
    load();
  }

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return <p className="text-sm text-muted">Faol seans yo'q.</p>;
  }

  return (
    <div className="space-y-2">
      {sessions.map((s) => {
        const Icon = deviceIcon[s.type] || HelpCircle;
        return (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-foreground">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-foreground">{s.userName}</span>
                {s.isSuperAdmin && (
                  <Badge variant="warning" className="flex items-center gap-0.5 px-1.5 py-0 text-[10px]">
                    <ShieldCheck className="h-2.5 w-2.5" /> Bosh admin
                  </Badge>
                )}
                {s.current && (
                  <Badge variant="success" className="px-1.5 py-0 text-[10px]">
                    Shu qurilma
                  </Badge>
                )}
              </div>
              <p className="truncate text-xs text-muted">
                {s.label} · {s.browser} · {s.os}
              </p>
              <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                <span>{timeAgo(s.lastSeenAt)}</span>
                {s.ip && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-2.5 w-2.5" /> {s.ip}
                  </span>
                )}
                {s.userEmail && <span className="truncate">{s.userEmail}</span>}
              </p>
            </div>
            <button
              onClick={() => kick(s)}
              disabled={busy === s.id}
              className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error/10 disabled:opacity-50"
              title="Chiqarib tashlash"
            >
              {busy === s.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              Chiqarish
            </button>
          </div>
        );
      })}
    </div>
  );
}
