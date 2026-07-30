"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, Copy, Check, ExternalLink } from "lucide-react";
import { Button, Card, Label, Input } from "@/components/ui";

export function QrGenerator({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fg, setFg] = useState("#1F2937");
  const [bg, setBg] = useState("#FFFFFF");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 320,
      margin: 2,
      color: { dark: fg, light: bg },
      errorCorrectionLevel: "H",
    });
  }, [url, fg, bg]);

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "ozodflow-qr.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function downloadSvg() {
    const svg = await QRCode.toString(url, {
      type: "svg",
      margin: 2,
      color: { dark: fg, light: bg },
      errorCorrectionLevel: "H",
    });
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.download = "ozodflow-qr.svg";
    link.href = URL.createObjectURL(blob);
    link.click();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* QR preview */}
      <Card className="flex flex-col items-center justify-center p-8">
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <canvas ref={canvasRef} />
        </div>
        <p className="mt-4 text-sm text-muted">
          Skanerlang va menyuni oching
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button onClick={downloadPng}>
            <Download className="h-4 w-4" /> PNG
          </Button>
          <Button variant="outline" onClick={downloadSvg}>
            <Download className="h-4 w-4" /> SVG
          </Button>
        </div>
      </Card>

      {/* Sozlamalar */}
      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="mb-4 font-semibold text-foreground">Ranglar</h3>
          <div className="space-y-4">
            <div>
              <Label>QR rangi</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fg}
                  onChange={(e) => setFg(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-border"
                />
                <Input value={fg} onChange={(e) => setFg(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Fon rangi</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-border"
                />
                <Input value={bg} onChange={(e) => setBg(e.target.value)} />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 font-semibold text-foreground">Menyu havolasi</h3>
          <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
            <span className="flex-1 truncate text-sm text-foreground">{url}</span>
            <button onClick={copyLink} className="text-muted hover:text-accent">
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
          <a href={url} target="_blank" rel="noreferrer" className="mt-3 block">
            <Button variant="outline" className="w-full">
              <ExternalLink className="h-4 w-4" /> Menyuni ochish
            </Button>
          </a>
        </Card>
      </div>
    </div>
  );
}
