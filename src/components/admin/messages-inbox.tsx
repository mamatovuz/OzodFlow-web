"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Lock, ChevronRight } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { MessageModal } from "@/components/admin/restaurants-manager";

type Thread = {
  restaurant: { id: string; name: string; slug: string; isBlocked: boolean };
  lastAt: string;
  lastBody: string;
  unread: number;
  total: number;
};

export function MessagesInbox() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<{ id: string; name: string } | null>(null);

  async function load() {
    const res = await fetch("/api/admin/support");
    const json = await res.json();
    if (json.success) setThreads(json.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return <p className="py-10 text-center text-sm text-muted">Yuklanmoqda...</p>;
  }

  if (threads.length === 0) {
    return (
      <Card className="p-10 text-center">
        <MessageSquare className="mx-auto h-8 w-8 text-muted" />
        <p className="mt-2 text-sm text-muted">Hali yozishmalar yo'q</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="divide-y divide-border p-0">
        {threads.map((t) => (
          <button
            key={t.restaurant.id}
            onClick={() => setOpen({ id: t.restaurant.id, name: t.restaurant.name })}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <MessageSquare className="h-5 w-5" />
              {t.unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
                  {t.unread}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium text-foreground">{t.restaurant.name}</p>
                {t.restaurant.isBlocked && (
                  <Badge variant="error">
                    <Lock className="h-3 w-3" /> Blok
                  </Badge>
                )}
              </div>
              <p className="truncate text-sm text-muted">{t.lastBody}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-muted">
                {new Date(t.lastAt).toLocaleDateString("uz-UZ")}
              </p>
              <ChevronRight className="ml-auto h-4 w-4 text-muted" />
            </div>
          </button>
        ))}
      </Card>

      {open && (
        <MessageModal
          row={open}
          onClose={() => {
            setOpen(null);
            load();
          }}
        />
      )}
    </>
  );
}
