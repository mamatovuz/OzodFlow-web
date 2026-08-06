"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, MessageCircle, Send, CheckCircle2, XCircle, MinusCircle, ScrollText } from "lucide-react";
import { Input, Select, Badge, Skeleton, EmptyState } from "@/components/ui";
import { igGet } from "./client";

type LogItem = {
  id: string;
  trigger: string;
  igUsername: string | null;
  mediaId: string | null;
  commentText: string | null;
  replyText: string | null;
  status: string;
  reason: string | null;
  ruleName: string | null;
  createdAt: string;
};

export function IgLogs() {
  const [items, setItems] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [trigger, setTrigger] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (cursor?: string | null) => {
      try {
        setError(null);
        const sp = new URLSearchParams();
        if (q) sp.set("q", q);
        if (status) sp.set("status", status);
        if (trigger) sp.set("trigger", trigger);
        if (cursor) sp.set("cursor", cursor);
        const data = await igGet<{ items: LogItem[]; nextCursor: string | null }>(
          `/logs?${sp.toString()}`
        );
        setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
        setNextCursor(data.nextCursor);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Yuklashda xato");
      } finally {
        setLoading(false);
      }
    },
    [q, status, trigger]
  );

  // Debounce'li qidiruv + filtrlar
  useEffect(() => {
    setLoading(true);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(null), 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [load]);

  return (
    <div className="space-y-4">
      {/* Filtrlar */}
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Username yoki matn bo'yicha qidirish..."
            className="pl-9"
          />
        </div>
        <Select value={trigger} onChange={(e) => setTrigger(e.target.value)} className="w-auto">
          <option value="">Barcha turi</option>
          <option value="COMMENT">Comment</option>
          <option value="DM">DM</option>
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
          <option value="">Barcha holat</option>
          <option value="SENT">Yuborilgan</option>
          <option value="SKIPPED">O'tkazib yuborilgan</option>
          <option value="FAILED">Xato</option>
        </Select>
      </div>

      {loading && items.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-error/30 bg-error/5 p-6 text-center text-sm text-error">
          {error}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Log yo'q"
          description="Automatlashtirish ishga tushganda bu yerda yozuvlar paydo bo'ladi."
        />
      ) : (
        <div className="space-y-2">
          {items.map((log) => (
            <div key={log.id} className="rounded-xl border border-border bg-card p-3 shadow-soft">
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    log.trigger === "COMMENT" ? "bg-[#DD2A7B]/10 text-[#DD2A7B]" : "bg-accent-soft text-accent"
                  }`}
                >
                  {log.trigger === "COMMENT" ? <MessageCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {log.igUsername ? `@${log.igUsername}` : "Foydalanuvchi"}
                    </span>
                    <StatusBadge status={log.status} />
                    {log.ruleName && <span className="text-xs text-muted">· {log.ruleName}</span>}
                  </div>
                  {log.commentText && (
                    <p className="mt-1 truncate text-sm text-muted">💬 {log.commentText}</p>
                  )}
                  {log.replyText && (
                    <p className="mt-0.5 truncate text-sm text-foreground">↳ {log.replyText}</p>
                  )}
                  {log.reason && <p className="mt-0.5 text-xs text-warning">{log.reason}</p>}
                </div>
                <time className="shrink-0 text-xs text-muted">{formatDate(log.createdAt)}</time>
              </div>
            </div>
          ))}
          {nextCursor && (
            <button
              onClick={() => load(nextCursor)}
              className="mx-auto block rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
            >
              Ko'proq yuklash
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "SENT")
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3 w-3" /> Yuborildi
      </Badge>
    );
  if (status === "FAILED")
    return (
      <Badge variant="error">
        <XCircle className="h-3 w-3" /> Xato
      </Badge>
    );
  return (
    <Badge variant="warning">
      <MinusCircle className="h-3 w-3" /> O'tkazildi
    </Badge>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
