"use client";

// Vizitka (business card) dizayneri — old/orqa tomon + PNG yuklab olish.
// Old: logo (tepada) + restoran nomi (pastida) + tagline + handle.
// Orqa: chapda kontaktlar (telefon/telegram/instagram... egasi tanlaydi),
//       o'ngda QR kod. Shablon va ranglar tanlanadi.

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, Check } from "lucide-react";
import { Button, Card, Label } from "@/components/ui";
import { LinkIcon } from "./link-icon";
import {
  CARD_TEMPLATES,
  LINK_TYPES,
  type TaplinkCard,
  type CardContactKey,
} from "@/lib/taplink";

type ResolvedContact = { type: CardContactKey; value: string; label: string };

const CARD_W = 1050;
const CARD_H = 600;
const SCALE = 2;

// ─── Canvas yordamchilari ───
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Kontakt ikonkasini canvasga chizadi (24x24 koordinata tizimida).
function drawIcon(ctx: CanvasRenderingContext2D, type: CardContactKey, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  switch (type) {
    case "phone": {
      const p = new Path2D(
        "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"
      );
      ctx.stroke(p);
      break;
    }
    case "telegram": {
      ctx.stroke(new Path2D("M22 2 11 13"));
      ctx.stroke(new Path2D("M22 2 15 22 11 13 2 9 22 2Z"));
      break;
    }
    case "instagram": {
      roundRect(ctx, 2, 2, 20, 20, 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(12, 12, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(17.5, 6.5, 1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "whatsapp": {
      ctx.beginPath();
      ctx.moveTo(21, 11.5);
      ctx.arc(12, 11.5, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(3, 21);
      ctx.lineTo(4.5, 16.5);
      ctx.stroke();
      break;
    }
    case "website": {
      ctx.beginPath();
      ctx.arc(12, 12, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(2, 12);
      ctx.lineTo(22, 12);
      ctx.moveTo(12, 2);
      ctx.bezierCurveTo(14.5, 5, 15.5, 8.5, 15.5, 12);
      ctx.bezierCurveTo(15.5, 15.5, 14.5, 19, 12, 22);
      ctx.bezierCurveTo(9.5, 19, 8.5, 15.5, 8.5, 12);
      ctx.bezierCurveTo(8.5, 8.5, 9.5, 5, 12, 2);
      ctx.stroke();
      break;
    }
    case "location": {
      const p = new Path2D("M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z");
      ctx.stroke(p);
      ctx.beginPath();
      ctx.arc(12, 10, 3, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "email": {
      roundRect(ctx, 2, 4, 20, 16, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(2, 6);
      ctx.lineTo(12, 13);
      ctx.lineTo(22, 6);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

async function drawCardSide(
  side: "front" | "back",
  data: {
    card: TaplinkCard;
    displayName: string;
    tagline: string;
    logo: string | null;
    handle: string;
    qrUrl: string;
    contacts: ResolvedContact[];
  }
): Promise<HTMLCanvasElement> {
  const { card } = data;
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W * SCALE;
  canvas.height = CARD_H * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);

  // Fon
  ctx.fillStyle = card.bgColor;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  if (side === "front") {
    // Yuqori accent chizig'i
    ctx.fillStyle = card.accentColor;
    ctx.fillRect(0, 0, CARD_W, 12);
    ctx.fillRect(0, CARD_H - 12, CARD_W, 12);

    // Logo
    let cy = 170;
    if (data.logo) {
      const img = await loadImage(data.logo);
      if (img) {
        const s = 190;
        const lx = (CARD_W - s) / 2;
        const ly = 90;
        ctx.save();
        roundRect(ctx, lx, ly, s, s, 24);
        ctx.clip();
        ctx.drawImage(img, lx, ly, s, s);
        ctx.restore();
        cy = ly + s + 60;
      }
    }

    // Nom
    ctx.textAlign = "center";
    ctx.fillStyle = card.textColor;
    ctx.font = "bold 54px Inter, system-ui, sans-serif";
    ctx.fillText(data.displayName, CARD_W / 2, cy);

    // Tagline
    if (data.tagline) {
      ctx.fillStyle = card.accentColor;
      ctx.font = "500 30px Inter, system-ui, sans-serif";
      ctx.fillText(data.tagline, CARD_W / 2, cy + 48);
    }

    // Handle (pastda)
    ctx.fillStyle = card.textColor;
    ctx.globalAlpha = 0.6;
    ctx.font = "500 26px Inter, system-ui, sans-serif";
    ctx.fillText(`ozodflow.uz/${data.handle}`, CARD_W / 2, CARD_H - 45);
    ctx.globalAlpha = 1;
  } else {
    // Orqa: chap kontaktlar, o'ng QR
    // Nom (tepada chapda)
    ctx.textAlign = "left";
    ctx.fillStyle = card.textColor;
    ctx.font = "bold 40px Inter, system-ui, sans-serif";
    ctx.fillText(data.displayName, 70, 90);
    ctx.fillStyle = card.accentColor;
    ctx.fillRect(70, 110, 90, 5);

    // Kontaktlar
    const contacts = data.contacts.filter((c) => c.value).slice(0, 6);
    const startY = 175;
    const gap = Math.min(72, (CARD_H - startY - 60) / Math.max(1, contacts.length));
    contacts.forEach((c, i) => {
      const y = startY + i * gap;
      // ikonka doirasi
      ctx.fillStyle = card.accentColor;
      ctx.beginPath();
      ctx.arc(70 + 22, y, 26, 0, Math.PI * 2);
      ctx.fill();
      drawIcon(ctx, c.type, 70 + 22 - 13, y - 13, 26, card.bgColor);
      // matn
      ctx.fillStyle = card.textColor;
      ctx.textAlign = "left";
      ctx.font = "500 30px Inter, system-ui, sans-serif";
      ctx.fillText(c.value, 70 + 62, y + 10);
    });

    // QR (o'ngda, oq fonli)
    const qrSize = 340;
    const qx = CARD_W - qrSize - 70;
    const qy = (CARD_H - qrSize) / 2;
    const pad = 22;
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, qx - pad, qy - pad, qrSize + pad * 2, qrSize + pad * 2, 20);
    ctx.fill();
    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, data.qrUrl, {
      width: qrSize,
      margin: 0,
      color: { dark: "#111111", light: "#FFFFFF" },
      errorCorrectionLevel: "H",
    });
    ctx.drawImage(qrCanvas, qx, qy, qrSize, qrSize);
    // QR ostidagi yozuv
    ctx.fillStyle = card.textColor;
    ctx.globalAlpha = 0.7;
    ctx.textAlign = "center";
    ctx.font = "500 22px Inter, system-ui, sans-serif";
    ctx.fillText("Menyuni oching", qx + qrSize / 2, qy + qrSize + pad + 30);
    ctx.globalAlpha = 1;
  }

  return canvas;
}

export function BusinessCard({
  card,
  onChange,
  displayName,
  logo,
  handle,
  qrUrl,
  availableContacts,
}: {
  card: TaplinkCard;
  onChange: (c: TaplinkCard) => void;
  displayName: string;
  logo: string | null;
  handle: string;
  qrUrl: string;
  availableContacts: ResolvedContact[];
}) {
  const [side, setSide] = useState<"front" | "back">("front");
  const [downloaded, setDownloaded] = useState(false);
  const frontRef = useRef<HTMLCanvasElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);

  const contacts = availableContacts.filter((c) => card.contacts.includes(c.type));

  // Preview canvaslarini chizamiz
  useEffect(() => {
    let alive = true;
    (async () => {
      const data = { card, displayName, tagline: card.tagline, logo, handle, qrUrl, contacts };
      const f = await drawCardSide("front", data);
      const b = await drawCardSide("back", data);
      if (!alive) return;
      for (const [ref, src] of [[frontRef, f], [backRef, b]] as const) {
        const el = ref.current;
        if (!el) continue;
        el.width = src.width;
        el.height = src.height;
        el.getContext("2d")!.drawImage(src, 0, 0);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(card), displayName, logo, handle, qrUrl, JSON.stringify(contacts)]);

  async function download(which: "front" | "back") {
    const data = { card, displayName, tagline: card.tagline, logo, handle, qrUrl, contacts };
    const cv = await drawCardSide(which, data);
    const link = document.createElement("a");
    link.download = `vizitka-${handle}-${which === "front" ? "old" : "orqa"}.png`;
    link.href = cv.toDataURL("image/png");
    link.click();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  }

  function pickTemplate(key: string) {
    const t = CARD_TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    onChange({ ...card, template: t.key, bgColor: t.bgColor, accentColor: t.accentColor, textColor: t.textColor });
  }

  function toggleContact(type: CardContactKey) {
    const has = card.contacts.includes(type);
    onChange({
      ...card,
      contacts: has ? card.contacts.filter((c) => c !== type) : [...card.contacts, type],
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="inline-flex gap-1 rounded-xl bg-surface-2 p-1">
            {(["front", "back"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={
                  "rounded-lg px-4 py-1.5 text-sm font-medium transition " +
                  (side === s ? "bg-card text-foreground shadow-soft" : "text-muted hover:text-foreground")
                }
              >
                {s === "front" ? "Old tomon" : "Orqa tomon"}
              </button>
            ))}
          </div>
        </div>

        <Card className="flex items-center justify-center bg-surface-2 p-4 sm:p-8">
          <div className="w-full max-w-[520px] overflow-hidden rounded-2xl shadow-card" style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}>
            <canvas ref={frontRef} className={"!h-full !w-full " + (side === "front" ? "" : "hidden")} />
            <canvas ref={backRef} className={"!h-full !w-full " + (side === "back" ? "" : "hidden")} />
          </div>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => download("front")}>
            {downloaded ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />} Old tomon (PNG)
          </Button>
          <Button variant="outline" onClick={() => download("back")}>
            <Download className="h-4 w-4" /> Orqa tomon (PNG)
          </Button>
        </div>
      </div>

      {/* Sozlamalar */}
      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold text-foreground">Shablon</h3>
          <div className="grid grid-cols-2 gap-2">
            {CARD_TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => pickTemplate(t.key)}
                className={
                  "flex items-center gap-2 rounded-lg border p-2 text-sm transition " +
                  (card.template === t.key ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-accent/50")
                }
              >
                <span className="h-6 w-6 shrink-0 rounded-md border border-black/10" style={{ background: t.bgColor }}>
                  <span className="block h-full w-1.5 rounded-l-md" style={{ background: t.accentColor }} />
                </span>
                {t.name}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 font-semibold text-foreground">Ranglar</h3>
          <div className="space-y-3">
            <ColorRow label="Fon" value={card.bgColor} onChange={(v) => onChange({ ...card, bgColor: v })} />
            <ColorRow label="Accent" value={card.accentColor} onChange={(v) => onChange({ ...card, accentColor: v })} />
            <ColorRow label="Matn" value={card.textColor} onChange={(v) => onChange({ ...card, textColor: v })} />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 font-semibold text-foreground">Tagline</h3>
          <input
            value={card.tagline}
            onChange={(e) => onChange({ ...card, tagline: e.target.value.slice(0, 40) })}
            placeholder="Masalan: Milliy taomlar"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 font-semibold text-foreground">Orqa tomon kontaktlari</h3>
          {availableContacts.length === 0 ? (
            <p className="text-sm text-muted">Avval "Tugmalar" bo'limida telefon/telegram/instagram qo'shing.</p>
          ) : (
            <div className="space-y-2">
              {availableContacts.map((c) => (
                <label key={c.type} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={card.contacts.includes(c.type)}
                    onChange={() => toggleContact(c.type)}
                    className="h-4 w-4 accent-[var(--accent,#2563EB)]"
                  />
                  <LinkIcon type={c.type} className="h-4 w-4 text-muted" />
                  <span className="flex-1 truncate">{LINK_TYPES[c.type]?.label}</span>
                  <span className="truncate text-xs text-muted">{c.value}</span>
                </label>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-border"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
