"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle, X } from "lucide-react";
import { Modal } from "@/components/ui-modal";

// Filialni o'chirish tugmasi — faqat qo'shimcha filiallar (asosiy emas) uchun.
// Tasdiqlash uchun filial nomini qayta yozdiradi (xato o'chirishni oldini oladi).
export function BranchDeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/branch/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "O'chirilmadi");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => {
          setConfirm("");
          setError("");
          setOpen(true);
        }}
        title="Filialni o'chirish"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition hover:border-error/40 hover:bg-error/5 hover:text-error"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {open && (
        <Modal open onClose={() => setOpen(false)} title="Filialni o'chirish">
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-error/10 p-3.5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
              <p className="text-sm text-error">
                <b>{name}</b> filiali butunlay o'chiriladi — menyu, buyurtmalar, stollar,
                statistika va xodimlar. Bu amalni <b>ortga qaytarib bo'lmaydi</b>.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-muted">
                Tasdiqlash uchun filial nomini yozing:
              </label>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={name}
                className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-error"
                autoFocus
              />
            </div>

            {error && (
              <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground"
              >
                <X className="h-4 w-4" /> Bekor qilish
              </button>
              <button
                onClick={remove}
                disabled={busy || confirm.trim() !== name.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                O'chirish
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
