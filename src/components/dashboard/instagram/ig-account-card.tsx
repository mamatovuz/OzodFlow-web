"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Instagram,
  RefreshCw,
  Unplug,
  CheckCircle2,
  AlertTriangle,
  Users,
  Grid3x3,
  ExternalLink,
} from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { igSend } from "./client";

export type IgAccount = {
  username: string;
  name: string | null;
  profilePicture: string | null;
  followers: number;
  following: number;
  mediaCount: number;
  status: string;
  lastError: string | null;
  lastSyncAt: string | null;
  connectedAt: string | null;
};

export function IgAccountCard({
  account,
  configured,
  onChange,
}: {
  account: IgAccount | null;
  configured: boolean;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<"reconnect" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reconnect() {
    setBusy("reconnect");
    setError(null);
    try {
      await igSend("POST", "/reconnect");
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(null);
    }
  }

  async function disconnect() {
    if (!confirm("Instagram akkauntini uzishni tasdiqlaysizmi? Qoidalar saqlanadi.")) return;
    setBusy("disconnect");
    setError(null);
    try {
      await igSend("POST", "/disconnect");
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(null);
    }
  }

  // ── Ulanmagan holat ──
  if (!account) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white">
            <Instagram className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Instagram ulanmagan</h3>
            <p className="mt-1 text-sm text-muted">
              Business yoki Creator akkauntingizni ulang — comment va DM'lar avtomatik javob oladi.
            </p>
          </div>
          {configured ? (
            <a href="/api/instagram/connect">
              <Button>
                <Instagram className="h-4 w-4" />
                Instagram ulash
              </Button>
            </a>
          ) : (
            <Badge variant="warning" className="px-3 py-2">
              <AlertTriangle className="h-4 w-4" />
              App sozlanmagan
            </Badge>
          )}
        </div>
        {!configured && (
          <p className="mt-4 rounded-lg bg-warning/10 p-3 text-xs text-warning">
            Ulash uchun administrator serverda <code>IG_APP_ID</code> va{" "}
            <code>IG_APP_SECRET</code> ni sozlashi kerak (Meta App). Batafsil — Sozlamalar bo'limida.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-error">{error}</p>}
      </div>
    );
  }

  // ── Ulangan holat ──
  const isError = account.status === "ERROR";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-accent-soft">
          {account.profilePicture ? (
            <Image
              src={account.profilePicture}
              alt={account.username}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-xl font-bold text-white">
              {account.username[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`https://instagram.com/${account.username}`}
              target="_blank"
              rel="noreferrer"
              className="truncate font-semibold text-foreground hover:text-accent"
            >
              @{account.username}
            </a>
            {isError ? (
              <Badge variant="error">
                <AlertTriangle className="h-3 w-3" /> Xato
              </Badge>
            ) : (
              <Badge variant="success">
                <CheckCircle2 className="h-3 w-3" /> Ulangan
              </Badge>
            )}
          </div>
          {account.name && <p className="truncate text-sm text-muted">{account.name}</p>}
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-1 text-foreground">
              <Users className="h-4 w-4 text-muted" />
              <b>{formatNum(account.followers)}</b> <span className="text-muted">followers</span>
            </span>
            <span className="inline-flex items-center gap-1 text-foreground">
              <b>{formatNum(account.following)}</b> <span className="text-muted">following</span>
            </span>
            <span className="inline-flex items-center gap-1 text-foreground">
              <Grid3x3 className="h-4 w-4 text-muted" />
              <b>{formatNum(account.mediaCount)}</b> <span className="text-muted">post</span>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={reconnect} disabled={busy !== null}>
            <RefreshCw className={`h-4 w-4 ${busy === "reconnect" ? "animate-spin" : ""}`} />
            Yangilash
          </Button>
          <Button variant="danger" size="sm" onClick={disconnect} disabled={busy !== null}>
            <Unplug className="h-4 w-4" />
            Uzish
          </Button>
        </div>
      </div>

      {isError && account.lastError && (
        <p className="mt-4 rounded-lg bg-error/10 p-3 text-xs text-error">
          {account.lastError} — «Yangilash» tugmasini bosing yoki qayta ulang.
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted">
        <span>Oxirgi sinxron: {account.lastSyncAt ? formatDate(account.lastSyncAt) : "—"}</span>
        <a
          href={`https://instagram.com/${account.username}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-accent"
        >
          Profilni ochish <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
