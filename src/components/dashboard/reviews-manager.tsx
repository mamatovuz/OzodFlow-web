"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Star,
  Download,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  MessageSquare,
  Send,
} from "lucide-react";
import { Button, Card, Label, Input, Switch } from "@/components/ui";
import { BASE_DOMAIN } from "@/lib/urls";

type Settings = {
  reviewEnabled: boolean;
  reviewGoogleUrl: string | null;
  reviewYandexUrl: string | null;
  reviewThreshold: number;
  hasReviewChannel: boolean;
};

type ReviewRow = {
  id: string;
  rating: number;
  name: string | null;
  phone: string | null;
  text: string | null;
  redirected: boolean;
  createdAt: string;
};

export function ReviewsManager({
  slug,
  settings: initial,
  hasOrderChannel,
}: {
  slug: string;
  settings: Settings;
  hasOrderChannel: boolean;
}) {
  const reviewUrl = `https://${BASE_DOMAIN}/r/${slug}`;

  const [enabled, setEnabled] = useState(initial.reviewEnabled);
  const [google, setGoogle] = useState(initial.reviewGoogleUrl || "");
  const [yandex, setYandex] = useState(initial.reviewYandexUrl || "");
  const [threshold, setThreshold] = useState(initial.reviewThreshold);
  const [hasReviewChannel, setHasReviewChannel] = useState(initial.hasReviewChannel);

  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [channelMsg, setChannelMsg] = useState<{ type: "err" | "ok"; text: string } | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [avg, setAvg] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, reviewUrl, { width: 320, margin: 2, errorCorrectionLevel: "H" });
    }
  }, [reviewUrl]);

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setReviews(j.data.reviews);
          setAvg(j.data.average);
          setTotal(j.data.total);
        }
      })
      .catch(() => {});
  }, []);

  // Sozlamalarni saqlash (debounce)
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaveState("saving");
    const t = setTimeout(async () => {
      await fetch("/api/reviews/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewEnabled: enabled,
          reviewGoogleUrl: google,
          reviewYandexUrl: yandex,
          reviewThreshold: threshold,
        }),
      }).catch(() => {});
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1500);
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, google, yandex, threshold]);

  async function connectChannel() {
    if (!botToken.trim() || !chatId.trim()) {
      setChannelMsg({ type: "err", text: "Token va kanal ID kiriting" });
      return;
    }
    setConnecting(true);
    setChannelMsg(null);
    try {
      const res = await fetch("/api/reviews/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewBotToken: botToken, reviewChatId: chatId }),
      });
      const json = await res.json();
      if (!json.success) {
        setChannelMsg({ type: "err", text: json.error || "Xatolik" });
        return;
      }
      setHasReviewChannel(true);
      setBotToken("");
      setChatId("");
      setChannelMsg({ type: "ok", text: "Kanal ulandi ✓ Test xabari yuborildi." });
    } finally {
      setConnecting(false);
    }
  }

  async function disconnectChannel() {
    await fetch("/api/reviews/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewBotToken: "", reviewChatId: "" }),
    });
    setHasReviewChannel(false);
    setChannelMsg(null);
  }

  function downloadQr() {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.download = `izoh-qr-${slug}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(reviewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      {/* Yuqori: QR + statistika */}
      <div className="grid gap-4 md:grid-cols-[300px_1fr]">
        <Card className="flex flex-col items-center p-6">
          <div className="w-full max-w-[200px] rounded-2xl bg-white p-4 shadow-soft">
            <canvas ref={canvasRef} className="!h-auto !w-full" />
          </div>
          <p className="mt-3 text-center text-sm text-muted">Stollarga qo'ying — mijoz skanerlab izoh qoldiradi</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={downloadQr}>
              <Download className="h-4 w-4" /> QR
            </Button>
            <Button size="sm" variant="outline" onClick={copyLink}>
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />} Havola
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="flex items-center justify-between p-5">
            <div>
              <p className="font-medium text-foreground">Izoh sahifasi</p>
              <p className="text-sm text-muted">O'chirilsa QR sahifasi ochilmaydi</p>
            </div>
            <Switch checked={enabled} onChange={setEnabled} />
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5 text-center">
              <div className="flex items-center justify-center gap-1 text-3xl font-bold text-foreground">
                {avg || "—"} <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
              </div>
              <p className="mt-1 text-sm text-muted">O'rtacha baho</p>
            </Card>
            <Card className="p-5 text-center">
              <div className="text-3xl font-bold text-foreground">{total}</div>
              <p className="mt-1 text-sm text-muted">Jami izoh</p>
            </Card>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            {saveState === "saving" && <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saqlanmoqda...</>}
            {saveState === "saved" && <><Check className="h-3.5 w-3.5 text-success" /> Saqlandi</>}
          </div>
        </div>
      </div>

      {/* Telegram kanal */}
      <Card className="p-5">
        <h3 className="mb-1 flex items-center gap-2 font-semibold text-foreground">
          <Send className="h-4 w-4 text-accent" /> Telegram kanal
        </h3>
        {hasOrderChannel && !hasReviewChannel ? (
          <div className="rounded-lg bg-success/10 p-3 text-sm text-foreground">
            ✅ Buyurtma kanali ulangan — izohlar ham <b>o'sha kanalga</b> tushadi. Alohida kanal shart emas.
            <div className="mt-2">
              <details>
                <summary className="cursor-pointer text-accent">Alohida kanal ulash</summary>
                <ChannelForm {...{ botToken, setBotToken, chatId, setChatId, connectChannel, connecting, channelMsg }} />
              </details>
            </div>
          </div>
        ) : hasReviewChannel ? (
          <div className="flex items-center justify-between rounded-lg bg-success/10 p-3 text-sm">
            <span>✅ Izoh kanali ulangan</span>
            <button onClick={disconnectChannel} className="text-error hover:underline">Uzish</button>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted">
              Izohlar tushishi uchun Telegram bot tokeni va kanal ID kiriting. (@BotFather'dan token oling, botni kanalga admin qiling.)
            </p>
            <ChannelForm {...{ botToken, setBotToken, chatId, setChatId, connectChannel, connecting, channelMsg }} />
          </>
        )}
      </Card>

      {/* Xarita baho havolalari */}
      <Card className="space-y-4 p-5">
        <div>
          <h3 className="font-semibold text-foreground">Xaritada baho qoldirish havolalari</h3>
          <p className="text-sm text-muted">Yuqori baho bergan mijoz avtomatik shu havolaga yo'naltiriladi (ommaviy reyting uchun).</p>
        </div>
        <div>
          <Label>Google Maps havolasi</Label>
          <Input value={google} onChange={(e) => setGoogle(e.target.value)} placeholder="https://g.page/r/...  yoki  https://maps.app.goo.gl/..." />
        </div>
        <div>
          <Label>Yandex Maps havolasi</Label>
          <Input value={yandex} onChange={(e) => setYandex(e.target.value)} placeholder="https://yandex.uz/maps/org/.../reviews/" />
        </div>
        <div>
          <Label>Qaysi bahodan yo'naltirilsin: {threshold}★ va yuqori</Label>
          <input
            type="range"
            min={1}
            max={5}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-[var(--accent,#2563EB)]"
          />
          <p className="text-xs text-muted">Pastroq baho bergan mijoz xaritaga yuborilmaydi — fikri faqat sizga (kanalga) tushadi.</p>
        </div>
      </Card>

      {/* Izohlar ro'yxati */}
      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
          <MessageSquare className="h-4 w-4" /> So'nggi izohlar
        </h3>
        {reviews.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Hali izoh yo'q.</p>
        ) : (
          <div className="divide-y divide-border">
            {reviews.map((r) => (
              <div key={r.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className="h-4 w-4" style={{ color: n <= r.rating ? "#F59E0B" : "#D1D5DB", fill: n <= r.rating ? "#F59E0B" : "none" }} />
                    ))}
                    {r.redirected && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent">
                        <ExternalLink className="h-3 w-3" /> Xaritaga
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString("uz")}</span>
                </div>
                {(r.name || r.phone) && (
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {r.name} {r.phone && <span className="font-normal text-muted">· {r.phone}</span>}
                  </p>
                )}
                {r.text && <p className="mt-1 text-sm text-muted">{r.text}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ChannelForm({
  botToken,
  setBotToken,
  chatId,
  setChatId,
  connectChannel,
  connecting,
  channelMsg,
}: {
  botToken: string;
  setBotToken: (v: string) => void;
  chatId: string;
  setChatId: (v: string) => void;
  connectChannel: () => void;
  connecting: boolean;
  channelMsg: { type: "err" | "ok"; text: string } | null;
}) {
  return (
    <div className="mt-3 space-y-3">
      <div>
        <Label>Bot tokeni</Label>
        <Input value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder="123456:ABC-DEF..." />
      </div>
      <div>
        <Label>Kanal / guruh ID</Label>
        <Input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="@kanal yoki -1001234567890" />
      </div>
      {channelMsg && <p className={"text-sm " + (channelMsg.type === "err" ? "text-error" : "text-success")}>{channelMsg.text}</p>}
      <Button onClick={connectChannel} disabled={connecting}>
        {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Ulash va tekshirish
      </Button>
    </div>
  );
}
