"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Trash2,
  Lock,
  LockOpen,
  MessageSquare,
  Send,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";
import { Card, Badge, Button } from "@/components/ui";
import { Modal } from "@/components/ui-modal";

export type AdminRestaurantRow = {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerContact: string;
  ownerPassword: string | null;
  plan: string;
  planName: string;
  isBlocked: boolean;
  productCount: number;
  createdAt: string;
  pay: {
    isPaid: boolean;
    locked: boolean;
    overdue: boolean;
    warning: boolean;
    daysLeft: number | null;
  };
  unread: number;
};

type Message = {
  id: string;
  topic: string;
  sender: string;
  body: string;
  contact: string | null;
  createdAt: string;
};

export function RestaurantsManager({ rows }: { rows: AdminRestaurantRow[] }) {
  const router = useRouter();
  const [deleteRow, setDeleteRow] = useState<AdminRestaurantRow | null>(null);
  const [msgRow, setMsgRow] = useState<AdminRestaurantRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggleBlock(row: AdminRestaurantRow) {
    setBusy(row.id);
    await fetch(`/api/admin/restaurants/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isBlocked: !row.isBlocked,
        reason: !row.isBlocked ? "Administrator tomonidan bloklandi" : undefined,
      }),
    });
    setBusy(null);
    router.refresh();
  }

  async function doDelete() {
    if (!deleteRow) return;
    setBusy(deleteRow.id);
    await fetch(`/api/admin/restaurants/${deleteRow.id}`, { method: "DELETE" });
    setBusy(null);
    setDeleteRow(null);
    router.refresh();
  }

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-3 font-medium">Restoran</th>
                <th className="px-4 py-3 font-medium">Egasi</th>
                <th className="px-4 py-3 font-medium">Tarif</th>
                <th className="px-4 py-3 font-medium">To'lov</th>
                <th className="px-4 py-3 font-medium">Holat</th>
                <th className="px-4 py-3 font-medium">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{r.name}</p>
                    <a
                      href={`/m/${r.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent"
                    >
                      /m/{r.slug} <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{r.ownerName}</p>
                    <p className="text-xs text-muted">{r.ownerContact}</p>
                    <PasswordCell password={r.ownerPassword} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={r.plan === "FREE" ? "default" : "accent"}>
                      {r.planName}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <PayBadge pay={r.pay} />
                  </td>
                  <td className="px-4 py-3">
                    {r.isBlocked ? (
                      <Badge variant="error">
                        <Lock className="h-3 w-3" /> Bloklangan
                      </Badge>
                    ) : (
                      <Badge variant="success">Faol</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setMsgRow(r)}
                        title="Xabarlar"
                        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:text-accent"
                      >
                        <MessageSquare className="h-4 w-4" />
                        {r.unread > 0 && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
                            {r.unread}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => toggleBlock(r)}
                        disabled={busy === r.id}
                        title={r.isBlocked ? "Blokdan chiqarish" : "Bloklash"}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border ${
                          r.isBlocked ? "text-success hover:bg-success/10" : "text-warning hover:bg-warning/10"
                        }`}
                      >
                        {r.isBlocked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setDeleteRow(r)}
                        disabled={busy === r.id}
                        title="O'chirish"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-error hover:bg-error/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* O'chirishni tasdiqlash */}
      {deleteRow && (
        <Modal open onClose={() => setDeleteRow(null)} title="Restoranni o'chirish">
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-error/10 p-4 text-error">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm">
                <b>{deleteRow.name}</b> butunlay o'chiriladi — menyu, buyurtmalar,
                stollar va barcha ma'lumotlar qaytarib bo'lmaydigan tarzda
                yo'qoladi.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteRow(null)}>
                Bekor qilish
              </Button>
              <Button variant="danger" onClick={doDelete} disabled={busy === deleteRow.id}>
                {busy === deleteRow.id && <Loader2 className="h-4 w-4 animate-spin" />}
                Ha, o'chirish
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Yozishmalar */}
      {msgRow && (
        <MessageModal
          row={msgRow}
          onClose={() => {
            setMsgRow(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

// Parol katakchasi: standart holatda blur (yopiq). Ko'z iconiga birinchi bosilsa
// — parol ochiladi (blur ketadi). Ikkinchi bosilsa — buferga nusxalanadi.
function PasswordCell({ password }: { password: string | null }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!password) {
    return (
      <p className="mt-0.5 text-[11px] italic text-muted/60">
        Parol hali saqlanmagan
      </p>
    );
  }

  async function onEye() {
    if (!shown) {
      // 1-bosish: parolni ochish
      setShown(true);
      return;
    }
    // 2-bosish: nusxalash
    try {
      await navigator.clipboard.writeText(password!);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard yopiq bo'lsa — jim */
    }
  }

  return (
    <div className="mt-1 flex items-center gap-1.5">
      <span
        onClick={onEye}
        title={shown ? "Nusxalash uchun bosing" : "Ko'rish uchun bosing"}
        className={`cursor-pointer select-none font-mono text-xs text-foreground transition-all ${
          shown ? "" : "blur-[4px]"
        }`}
      >
        {password}
      </span>
      <button
        type="button"
        onClick={onEye}
        title={shown ? "Nusxalash" : "Ko'rsatish"}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border text-muted hover:text-accent"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-success" />
        ) : shown ? (
          <Copy className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
      </button>
      {shown && (
        <button
          type="button"
          onClick={() => setShown(false)}
          title="Yashirish"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border text-muted hover:text-accent"
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      )}
      {copied && <span className="text-[11px] text-success">Nusxalandi</span>}
    </div>
  );
}

function PayBadge({ pay }: { pay: AdminRestaurantRow["pay"] }) {
  if (!pay.isPaid) return <span className="text-xs text-muted">—</span>;
  if (pay.locked) return <Badge variant="error">Muddati o'tgan</Badge>;
  if (pay.overdue) return <Badge variant="error">To'lamagan</Badge>;
  if (pay.warning)
    return <Badge variant="warning">{pay.daysLeft} kun qoldi</Badge>;
  return <Badge variant="success">{pay.daysLeft ?? "∞"} kun</Badge>;
}

export function MessageModal({
  row,
  onClose,
}: {
  row: { id: string; name: string };
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [topic, setTopic] = useState<"GENERAL" | "PAYMENT" | "BLOCK">("GENERAL");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/admin/support?restaurantId=${row.id}`);
    const json = await res.json();
    if (json.success) setMessages(json.data);
  }

  useEffect(() => {
    load();
    // O'qilgan deb belgilaymiz
    fetch("/api/admin/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: row.id }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    const res = await fetch("/api/admin/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: row.id, topic, body: text }),
    });
    setSending(false);
    if (res.ok) {
      setText("");
      load();
    }
  }

  return (
    <Modal open onClose={onClose} title={`${row.name} — yozishmalar`}>
      <div className="space-y-3">
        <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl bg-surface-2 p-3">
          {messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Hali xabar yo'q</p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === "ADMIN" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.sender === "ADMIN"
                      ? "bg-accent text-white"
                      : "bg-card text-foreground border border-border"
                  }`}
                >
                  <p className="mb-0.5 text-[10px] font-semibold opacity-70">
                    {m.sender === "ADMIN"
                      ? "Siz (admin)"
                      : m.sender === "VISITOR"
                      ? "Tashrifchi"
                      : "Restoran egasi"}
                    {" · "}
                    {topicLabel(m.topic)}
                  </p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  {m.contact && (
                    <p className="mt-1 text-[11px] opacity-80">Aloqa: {m.contact}</p>
                  )}
                  <p className="mt-1 text-[10px] opacity-60">
                    {new Date(m.createdAt).toLocaleString("uz-UZ")}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        <div className="flex gap-2">
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value as typeof topic)}
            className="h-10 rounded-lg border border-border bg-card px-2 text-sm text-foreground"
          >
            <option value="GENERAL">Umumiy</option>
            <option value="PAYMENT">To'lov</option>
            <option value="BLOCK">Blok</option>
          </select>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Javob yozing..."
            className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-accent"
          />
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="flex h-10 items-center rounded-lg bg-accent px-4 text-white disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted">
          "To'lov" mavzusida yozsangiz — restoran egasiga to'lov bo'yicha
          savolingiz yetkaziladi.
        </p>
      </div>
    </Modal>
  );
}

function topicLabel(t: string) {
  return t === "BLOCK"
    ? "Blok"
    : t === "PAYMENT"
    ? "To'lov"
    : t === "CONTACT"
    ? "Aloqa"
    : "Umumiy";
}
