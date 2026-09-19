"use client";

import { useEffect, useState } from "react";
import { Eye, Heart, FileText, MessageSquare, Mail, Users, Loader2, TrendingUp, Hash, Compass } from "lucide-react";

type Stats = {
  totals: {
    posts: number;
    published: number;
    drafts: number;
    views: number;
    reactions: number;
    pendingComments: number;
    unreadMessages: number;
    subscribers: number;
  };
  topPosts: { id: string; title: string; slug: string; views: number; reactions: number }[];
  topTags: { tag: string; count: number }[];
  sources: { source: string; count: number }[];
  days: { day: string; views: number }[];
  activity: {
    monthName: string;
    year: number;
    totalActive: number;
    cells: ({ date: number; day: string; count: number; level: number; isToday: boolean } | null)[];
  };
};

const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const ACT_BG = [
  "bg-surface-2",
  "bg-emerald-500/35",
  "bg-emerald-500/55",
  "bg-emerald-500/75",
  "bg-emerald-500",
];

type Tab = "dashboard" | "posts" | "comments" | "messages" | "projects" | "settings";

export function AdminStats({ onGoto }: { onGoto: (t: Tab) => void }) {
  const [data, setData] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/site/stats")
      .then((r) => r.json())
      .then((j) => setData(j.data))
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="flex justify-center py-20 text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const t = data.totals;
  const maxViews = Math.max(1, ...data.days.map((d) => d.views));

  const cards = [
    { icon: <Eye className="h-4 w-4" />, label: "Jami ko'rish", value: t.views },
    { icon: <FileText className="h-4 w-4" />, label: "Yozuvlar", value: t.posts, sub: `${t.drafts} qoralama` },
    { icon: <Heart className="h-4 w-4" />, label: "Reaksiyalar", value: t.reactions },
    { icon: <Users className="h-4 w-4" />, label: "Obunachilar", value: t.subscribers },
  ];

  return (
    <div className="space-y-6">
      {/* Asosiy ko'rsatkichlar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted">{c.icon}<span className="text-xs">{c.label}</span></div>
            <p className="mt-2 text-2xl font-bold">{c.value}</p>
            {c.sub && <p className="text-xs text-muted">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Diqqat talab (izoh/xabar) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button onClick={() => onGoto("comments")} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-foreground">
          <span className="flex items-center gap-2 text-sm"><MessageSquare className="h-4 w-4 text-muted" /> Tasdiq kutayotgan izoh</span>
          <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${t.pendingComments ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "text-muted"}`}>{t.pendingComments}</span>
        </button>
        <button onClick={() => onGoto("messages")} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-foreground">
          <span className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted" /> O'qilmagan xabar</span>
          <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${t.unreadMessages ? "bg-accent/15 text-accent" : "text-muted"}`}>{t.unreadMessages}</span>
        </button>
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <span className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-muted" /> Obunachilar</span>
          <span className="text-sm font-semibold">{t.subscribers}</span>
        </div>
      </div>

      {/* Oxirgi 7 kun grafigi */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4 text-muted" /> Oxirgi 7 kun — ko'rishlar</h3>
        <div className="mt-5 flex items-end justify-between gap-2" style={{ height: 120 }}>
          {data.days.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-accent/80 transition-all"
                  style={{ height: `${(d.views / maxViews) * 100}%`, minHeight: d.views ? 4 : 0 }}
                  title={`${d.views} ko'rish`}
                />
              </div>
              <span className="text-[10px] text-muted">{d.day.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Faollik — joriy oy (bosh sahifadagi yashil katakchalar) */}
      {data.activity && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" /> Faollik
              <span className="font-normal text-muted">· {data.activity.monthName} {data.activity.year}</span>
            </h3>
            <span className="text-xs text-muted">{data.activity.totalActive} kun faol</span>
          </div>
          <div className="mx-auto mt-4 max-w-xs">
            <div className="mb-1.5 grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-center text-[10px] font-medium text-muted">{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {data.activity.cells.map((c, i) =>
                c === null ? (
                  <div key={`e${i}`} />
                ) : (
                  <div
                    key={c.day}
                    title={`${c.day} — ${c.count} harakat`}
                    className={`flex aspect-square items-center justify-center rounded-md text-[9px] font-medium transition-transform hover:scale-110 ${ACT_BG[c.level]} ${
                      c.isToday ? "ring-2 ring-emerald-400 ring-offset-1 ring-offset-card" : ""
                    } ${c.level >= 3 ? "text-white" : "text-muted"}`}
                  >
                    {c.date}
                  </div>
                )
              )}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted">Panelga kirsangiz yoki maqola yozsangiz — kun yashil bo'ladi.</p>
        </div>
      )}

      {/* Top maqolalar */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Eng ko'p o'qilgan</h3>
        {data.topPosts.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Hali ma'lumot yo'q.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {data.topPosts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="w-5 text-sm font-semibold text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{p.title}</span>
                <span className="flex items-center gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{p.views}</span>
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{p.reactions}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trafik manbai + top teglar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Qayerdan kelishmoqda */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Compass className="h-4 w-4 text-muted" /> Qayerdan kelishmoqda</h3>
          {data.sources.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Hali tashrif ma'lumoti yo'q.</p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {(() => {
                const max = Math.max(1, ...data.sources.map((x) => x.count));
                return data.sources.map((x) => (
                  <div key={x.source} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 truncate text-xs text-muted" title={x.source}>{x.source}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-accent/80" style={{ width: `${(x.count / max) * 100}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-medium">{x.count}</span>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Top teglar */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Hash className="h-4 w-4 text-muted" /> Ommabop teglar</h3>
          {data.topTags.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Hali teg yo'q.</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {data.topTags.map((x) => (
                <span key={x.tag} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-sm">
                  {x.tag}
                  <span className="text-xs text-muted">{x.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
