"use client";

import { useState } from "react";
import { Loader2, Bot, Check, X, ExternalLink, Sparkles } from "lucide-react";
import { Card, Button, Input, Label } from "@/components/ui";

// Restoran o'z Telegram botini ulaydi. Mijozlar bot ichida menyuni (Mini App)
// ochib buyurtma beradi, holat o'zgarganda bot ularga xabar yozadi.
export function TelegramBotManager({
  connected,
  username,
}: {
  connected: boolean;
  username: string | null;
}) {
  const [isConnected, setIsConnected] = useState(connected);
  const [botUser, setBotUser] = useState(username || "");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function connect() {
    setError("");
    if (token.trim().length < 20) {
      setError("Bot tokenini to'liq kiriting");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/telegram-bot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim() }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Ulanmadi");
      return;
    }
    setBotUser(json.data.username);
    setIsConnected(true);
    setToken("");
  }

  async function disconnect() {
    if (!confirm("Bot uzilsinmi? Mijozlar endi bot orqali buyurtma bera olmaydi.")) return;
    setBusy(true);
    await fetch("/api/telegram-bot", { method: "DELETE" });
    setBusy(false);
    setIsConnected(false);
    setBotUser("");
  }

  return (
    <Card className="p-6">
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Bot className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold text-foreground">Telegram bot + Mini App</h2>
          <p className="text-xs text-muted">Mijozlar bot ichida menyuni ko'rib buyurtma beradi</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Feature icon={Sparkles} text="Menyu Telegram ichida ochiladi (ilova kabi)" />
        <Feature icon={Check} text="Buyurtma to'g'ridan-to'g'ri panelingizga tushadi" />
        <Feature icon={Bot} text="Holat o'zgarsa — mijozga bepul xabar boradi" />
      </div>

      {isConnected ? (
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-success/30 bg-success/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">Bot ulangan va ishlayapti</p>
              {botUser && (
                <a
                  href={`https://t.me/${botUser}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  @{botUser} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={disconnect} disabled={busy} className="text-error">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Uzish
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <div>
            <Label>Bot token (BotFather)</Label>
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456789:AAH..."
              className="font-mono text-xs"
            />
          </div>

          <div className="rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-muted">
            <b className="text-foreground">Qanday ulash (1 daqiqa):</b>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4">
              <li>Telegramda <b>@BotFather</b> ga kiring va <b>/newbot</b> yozing.</li>
              <li>Botga nom va username bering.</li>
              <li>BotFather bergan <b>tokenni</b> nusxalab, yuqoriga qo'ying.</li>
              <li>"Ulash" tugmasini bosing — qolganini biz avtomatik sozlaymiz.</li>
            </ol>
          </div>

          {error && <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>}

          <Button onClick={connect} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            Ulash va sozlash
          </Button>
        </div>
      )}
    </Card>
  );
}

function Feature({ icon: Icon, text }: { icon: typeof Bot; text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-surface-2 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      <span className="text-xs text-foreground">{text}</span>
    </div>
  );
}
