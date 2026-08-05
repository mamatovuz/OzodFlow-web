"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, AlertTriangle, Check } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { Modal } from "@/components/ui-modal";

export function ResetStats() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function reset() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/restaurant/reset-stats", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Xatolik yuz berdi");
      return;
    }
    setDone(true);
    // Dashboard/statistika sahifalari yangilansin
    router.refresh();
    setTimeout(() => {
      setOpen(false);
      setDone(false);
    }, 1500);
  }

  return (
    <Card className="border-error/30 p-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-error" />
        <h2 className="font-semibold text-foreground">Statistikani o'chirish</h2>
      </div>
      <p className="mt-2 text-sm text-muted">
        Barcha statistikani nolga qaytaradi: QR skanerlar, buyurtmalar, daromad,
        faol buyurtmalar va mahsulot ko'rishlari. Bu amalni{" "}
        <b className="text-foreground">qaytarib bo'lmaydi</b>.
      </p>
      <Button
        variant="outline"
        className="mt-4 border-error/40 text-error hover:bg-error/10"
        onClick={() => {
          setError("");
          setDone(false);
          setOpen(true);
        }}
      >
        <Trash2 className="h-4 w-4" /> Statistikani nolga qaytarish
      </Button>

      <Modal open={open} onClose={() => !loading && setOpen(false)} title="Ishonchingiz komilmi?">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
              <Check className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Statistika nolga qaytarildi
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Quyidagilar butunlay o'chiriladi va <b className="text-foreground">tiklab
              bo'lmaydi</b>:
            </p>
            <ul className="space-y-1 rounded-lg bg-surface-2 p-3 text-sm text-foreground">
              <li>• Barcha QR skanerlar (bugun / hafta / oy)</li>
              <li>• Barcha buyurtmalar va daromad</li>
              <li>• Faol buyurtmalar</li>
              <li>• Mahsulot ko'rishlar soni</li>
            </ul>
            {error && (
              <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Bekor qilish
              </Button>
              <Button variant="danger" onClick={reset} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Ha, nolga qaytar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
