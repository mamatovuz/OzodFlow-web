"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Card, Button, Input } from "@/components/ui";
import { formatPrice } from "@/lib/utils";

type Found = {
  name: string;
  status: string;
  orderCount: number;
  total: number;
  lastOrderAt: string | null;
};

// URL yoki matndan stol kodini ajratib oladi (?t=CODE)
function parseCode(text: string): string | null {
  try {
    const url = new URL(text);
    return url.searchParams.get("t");
  } catch {
    // to'g'ridan-to'g'ri kod bo'lishi mumkin
    const m = text.match(/[?&]t=([A-Za-z0-9]+)/);
    if (m) return m[1];
    if (/^[A-Za-z0-9]{4,10}$/.test(text.trim())) return text.trim();
    return null;
  }
}

export function QrScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [supported, setSupported] = useState(true);
  const [result, setResult] = useState<Found | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [manual, setManual] = useState("");
  const [loading, setLoading] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setSupported("BarcodeDetector" in window);
    return () => stop();
  }, []);

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  async function start() {
    setResult(null);
    setNotFound(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Detector = (window as any).BarcodeDetector;
      const detector = new Detector({ formats: ["qr_code"] });
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            const code = parseCode(codes[0].rawValue);
            stop();
            if (code) await lookup(code);
            else setNotFound(true);
            return;
          }
        } catch { /* ignore frame */ }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {
      setSupported(false);
    }
  }

  async function lookup(code: string) {
    setLoading(true);
    setNotFound(false);
    const res = await fetch("/api/tablemap");
    const json = await res.json();
    setLoading(false);
    if (json.success) {
      const cell = json.data.find((c: { code: string }) => c.code === code);
      if (cell) {
        setResult(cell);
        return;
      }
    }
    setNotFound(true);
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="relative aspect-square w-full bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
              <Camera className="h-12 w-12 opacity-60" />
              <Button onClick={start} disabled={!supported}>
                <Camera className="h-4 w-4" /> Skanerni yoqish
              </Button>
              {!supported && (
                <p className="px-6 text-center text-xs text-white/70">
                  Brauzeringiz kamera skanerini qo'llab-quvvatlamaydi. Kodni qo'lda kiriting.
                </p>
              )}
            </div>
          )}
          {scanning && (
            <>
              <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/70" />
              <button
                onClick={stop}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </Card>

      {/* Qo'lda kod */}
      <div className="flex gap-2">
        <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Yoki kodni qo'lda kiriting" />
        <Button variant="outline" onClick={() => manual && lookup(manual.trim())} disabled={!manual}>
          Tekshirish
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        </div>
      )}

      {notFound && (
        <Card className="flex items-center gap-3 border-error/30 bg-error/5 p-4">
          <AlertCircle className="h-5 w-5 text-error" />
          <p className="text-sm font-medium text-error">QR topilmadi</p>
        </Card>
      )}

      {result && (
        <Card className="p-5">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-semibold text-foreground">{result.name}</p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-muted">Holat</p>
              <p className="text-sm font-medium text-foreground">{result.status}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Buyurtma</p>
              <p className="text-sm font-medium text-foreground">{result.orderCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Summa</p>
              <p className="text-sm font-medium text-foreground">{formatPrice(result.total, "UZS")}</p>
            </div>
          </div>
          {result.lastOrderAt && (
            <p className="mt-3 text-xs text-muted">
              Oxirgi buyurtma: {new Date(result.lastOrderAt).toLocaleString("uz-UZ")}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
