"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, CreditCard } from "lucide-react";
import { Button, Card, Input, Label, Switch } from "@/components/ui";
import { Modal } from "@/components/ui-modal";

type PayCard = {
  id: string;
  bankName: string;
  cardNumber: string;
  cardHolder: string;
  isActive: boolean;
};

export function CardsManager() {
  const [cards, setCards] = useState<PayCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/cards");
    const json = await res.json();
    if (json.success) setCards(json.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bankName: f.get("bankName"),
        cardNumber: f.get("cardNumber"),
        cardHolder: f.get("cardHolder"),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error || "Xatolik");
      return;
    }
    setModal(false);
    load();
  }

  async function toggle(c: PayCard) {
    await fetch(`/api/admin/cards/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Karta o'chirilsinmi?")) return;
    await fetch(`/api/admin/cards/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModal(true)}>
          <Plus className="h-4 w-4" /> Karta qo'shish
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : cards.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <CreditCard className="h-10 w-10 text-muted/40" />
          <p className="mt-3 font-medium text-foreground">Karta yo'q</p>
          <p className="mt-1 text-sm text-muted">
            Foydalanuvchilar to'lashi uchun karta qo'shing
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium text-muted">
                  {c.bankName}
                </span>
                <button
                  onClick={() => remove(c.id)}
                  className="text-muted hover:text-error"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 font-mono text-lg tracking-wider text-foreground">
                {c.cardNumber}
              </p>
              <p className="text-sm text-muted">{c.cardHolder}</p>
              <div className="mt-3 border-t border-border pt-3">
                <Switch
                  checked={c.isActive}
                  onChange={() => toggle(c)}
                  label={c.isActive ? "Faol" : "Nofaol"}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Yangi karta">
        <form onSubmit={create} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </div>
          )}
          <div>
            <Label>Bank nomi</Label>
            <Input name="bankName" placeholder="Uzcard / Humo" required />
          </div>
          <div>
            <Label>Karta raqami</Label>
            <Input name="cardNumber" placeholder="8600 1234 5678 9012" required />
          </div>
          <div>
            <Label>Karta egasi</Label>
            <Input name="cardHolder" placeholder="ISM FAMILIYA" required />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>
              Bekor
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
