"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Loader2, Building2, Upload, X, Check, Copy, Crown } from "lucide-react";
import { Button, Label } from "@/components/ui";
import { Modal } from "@/components/ui-modal";
import { formatPrice } from "@/lib/utils";

type PayCard = { id: string; bankName: string; cardNumber: string; cardHolder: string };
type Step = "form" | "pay" | "done";

export function AddBranch({
  canBranches,
  canAddFree,
  allowance,
  addedBranches,
  price,
}: {
  canBranches: boolean;
  canAddFree: boolean;
  allowance: number;
  addedBranches: number;
  price: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(canAddFree ? "form" : "pay");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // To'lov (limit tugagach)
  const [cards, setCards] = useState<PayCard[]>([]);
  const [receipt, setReceipt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (open && step === "pay") {
      fetch("/api/payment/cards")
        .then((r) => r.json())
        .then((j) => j.success && setCards(j.data))
        .catch(() => {});
    }
  }, [open, step]);

  function reset() {
    setName("");
    setError("");
    setReceipt("");
    setStep(canAddFree ? "form" : "pay");
  }

  async function createBranch() {
    if (name.trim().length < 2) {
      setError("Filial nomini kiriting");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/branch/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      if (json.details?.needsPayment) {
        setStep("pay");
        return;
      }
      setError(json.error || "Xatolik");
      return;
    }
    setOpen(false);
    reset();
    router.refresh();
  }

  async function uploadReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(json.error || "Yuklashda xatolik");
      return;
    }
    setReceipt(json.data.url);
  }

  async function submitPayment() {
    if (!receipt) {
      setError("Iltimos, to'lov chekini yuklang");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/payment/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "BRANCH", receiptImage: receipt }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "So'rov yuborilmadi");
      return;
    }
    setStep("done");
  }

  function copyCard(num: string) {
    navigator.clipboard.writeText(num.replace(/\s/g, ""));
    setCopied(num);
    setTimeout(() => setCopied(""), 2000);
  }

  // Business bo'lmasa — tarifga yo'naltiramiz
  if (!canBranches) {
    return (
      <Link href="/dashboard/billing">
        <Button variant="outline">
          <Crown className="h-4 w-4" /> Filiallar — Business tarifida
        </Button>
      </Link>
    );
  }

  return (
    <>
      <Button
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <Plus className="h-4 w-4" /> Filial qo'shish
      </Button>

      {open && (
        <Modal
          open
          onClose={() => setOpen(false)}
          title={step === "pay" ? "Qo'shimcha filial — to'lov" : "Yangi filial"}
        >
          {step === "done" ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
                <Check className="h-9 w-9" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">So'rov yuborildi!</h3>
              <p className="mt-1 max-w-sm text-sm text-muted">
                To'lovingiz admin tomonidan tekshiriladi. Tasdiqlangach, yangi
                filial qo'shishingiz mumkin bo'ladi.
              </p>
              <Button className="mt-5" onClick={() => setOpen(false)}>
                Yopish
              </Button>
            </div>
          ) : step === "pay" ? (
            <div className="space-y-5">
              <div className="rounded-xl bg-accent-soft p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Building2 className="h-4 w-4 text-accent" /> Qo'shimcha filial
                  </span>
                  <span className="text-xl font-bold text-accent">
                    {formatPrice(price, "UZS")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Bepul {allowance} ta filial ishlatilgan ({addedBranches}). 6-filialdan
                  boshlab har biri bir martalik {formatPrice(price, "UZS")}.
                </p>
              </div>

              <div>
                <Label>1. Quyidagi kartaga o'tkazing</Label>
                {cards.length === 0 ? (
                  <p className="rounded-lg bg-surface-2 p-3 text-sm text-muted">
                    To'lov kartasi topilmadi. Admin bilan bog'laning.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {cards.map((c) => (
                      <div key={c.id} className="rounded-xl border border-border bg-card p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted">{c.bankName}</span>
                          <button
                            onClick={() => copyCard(c.cardNumber)}
                            className="flex items-center gap-1 text-xs text-accent"
                          >
                            {copied === c.cardNumber ? (
                              <>
                                <Check className="h-3 w-3" /> Nusxalandi
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Nusxalash
                              </>
                            )}
                          </button>
                        </div>
                        <p className="mt-1 font-mono text-lg tracking-wider text-foreground">
                          {c.cardNumber}
                        </p>
                        <p className="text-sm text-muted">{c.cardHolder}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label>2. To'lov chekini yuklang</Label>
                {receipt ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={receipt}
                      alt="chek"
                      className="h-32 rounded-lg border border-border object-cover"
                    />
                    <button
                      onClick={() => setReceipt("")}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-error text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border py-6 text-muted hover:border-accent hover:text-accent">
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6" />
                        <span className="mt-1 text-sm">Chek rasmini tanlang</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={uploadReceipt}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>

              {error && (
                <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Bekor qilish
                </Button>
                <Button onClick={submitPayment} disabled={busy || !receipt}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  So'rov yuborish
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Yangi filial — alohida menyu, QR, buyurtma va xodimlar bilan. Har
                filialning buyurtmalari o'ziga xos bo'ladi.
              </p>
              <div>
                <Label>Filial nomi</Label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createBranch()}
                  placeholder="Masalan: Chilonzor filiali"
                  className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-accent"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted">
                Bepul filiallar: {addedBranches} / {allowance} ishlatilgan.
              </p>

              {error && (
                <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Bekor qilish
                </Button>
                <Button onClick={createBranch} disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Yaratish
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
