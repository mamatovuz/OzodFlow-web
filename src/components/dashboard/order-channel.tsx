"use client";

import { useState } from "react";
import { Loader2, Send, Check, X, Plug } from "lucide-react";
import { Card, Button, Input, Label } from "@/components/ui";

export function OrderChannel({
  connected,
  chatId,
}: {
  connected: boolean;
  chatId: string | null;
}) {
  const [isConnected, setIsConnected] = useState(connected);
  const [token, setToken] = useState("");
  const [channel, setChannel] = useState(chatId || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  async function connect() {
    setError("");
    setOk(false);
    if (!token.trim() || !channel.trim()) {
      setError("Bot token va kanal ID ni kiriting");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/telegram/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim(), chatId: channel.trim() }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Ulanmadi");
      return;
    }
    setIsConnected(true);
    setOk(true);
    setToken("");
  }

  async function disconnect() {
    if (!confirm("Kanal uzilsinmi? Buyurtmalar endi kanalga tushmaydi.")) return;
    setBusy(true);
    await fetch("/api/telegram/connect", { method: "DELETE" });
    setBusy(false);
    setIsConnected(false);
    setChannel("");
    setOk(false);
  }

  return (
    <Card className="p-6">
      <div className="mb-1 flex items-center gap-2">
        <Send className="h-5 w-5 text-accent" />
        <h2 className="font-semibold text-foreground">Buyurtmalarni Telegram kanaliga yuborish</h2>
      </div>
      <p className="mb-4 text-sm text-muted">
        Yangi buyurtmalar (taomlar, summa, stol yoki yetkazib berish manzili/joylashuvi
        bilan) to'g'ridan-to'g'ri Telegram kanalingizga yoki guruhingizga tushadi.
      </p>

      {isConnected ? (
        <div className="flex flex-col gap-3 rounded-xl border border-success/30 bg-success/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-4 w-4" />
            </span>
            <span>
              Ulangan{channel ? <span className="text-muted"> · {channel}</span> : null}
            </span>
          </div>
          <Button variant="outline" onClick={disconnect} disabled={busy} className="text-error">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Uzish
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label>1. Bot token (BotFather)</Label>
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456789:AA..."
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label>2. Kanal / guruh ID</Label>
            <Input
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="@mening_kanalim  yoki  -1001234567890"
            />
          </div>

          <div className="rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-muted">
            <b className="text-foreground">Qanday sozlash:</b>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4">
              <li>Telegramda <b>@BotFather</b> orqali bot yarating va tokenni oling.</li>
              <li>Kanal/guruh yarating va botni <b>admin</b> qilib qo'shing.</li>
              <li>Ommaviy kanal uchun <b>@username</b>, yopiq kanal/guruh uchun <b>-100...</b> ID kiriting.</li>
            </ol>
          </div>

          {error && (
            <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>
          )}
          {ok && (
            <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
              Ulandi! Kanalingizga test xabari yuborildi.
            </div>
          )}

          <Button onClick={connect} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Ulash va tekshirish
          </Button>
        </div>
      )}
    </Card>
  );
}
