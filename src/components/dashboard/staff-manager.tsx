"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Users, Lock } from "lucide-react";
import Link from "next/link";
import { Button, Input, Label, Card, Select, Badge } from "@/components/ui";
import { Modal } from "@/components/ui-modal";
import { STAFF_ROLES, staffRoleLabel } from "@/lib/staff";

type Staff = {
  id: string;
  role: string;
  user: { name: string; email: string | null };
};

export function StaffManager({ isPaid }: { isPaid: boolean }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/staff");
    const json = await res.json();
    if (json.success) setStaff(json.data);
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
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.get("name"),
        email: f.get("email"),
        password: f.get("password"),
        role: f.get("role"),
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

  async function remove(id: string) {
    if (!confirm("Xodim o'chirilsinmi?")) return;
    await fetch(`/api/staff/${id}`, { method: "DELETE" });
    load();
  }

  if (!isPaid) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted" />
          <h2 className="font-semibold text-foreground">Xodimlar</h2>
          <Badge variant="warning">Pro</Badge>
        </div>
        <p className="mt-2 text-sm text-muted">
          Xodimlar va rollar (oshxona, ofitsiant, operator) tizimi Pro yoki Pro
          Max tarifida mavjud.
        </p>
        <Link href="/dashboard/settings" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            <Lock className="h-4 w-4" /> Tarifni yangilash
          </Button>
        </Link>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModal(true)}>
          <Plus className="h-4 w-4" /> Xodim qo'shish
        </Button>
      </div>

      {staff.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <Users className="h-10 w-10 text-muted/40" />
          <p className="mt-3 font-medium text-foreground">Xodim yo'q</p>
          <p className="mt-1 text-sm text-muted">
            Oshxona, ofitsiant va operatorlar uchun hisob yarating
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {staff.map((s) => (
            <Card key={s.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                  {s.user.name[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-foreground">{s.user.name}</p>
                  <p className="text-xs text-muted">{s.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="accent">{staffRoleLabel(s.role)}</Badge>
                <button onClick={() => remove(s.id)} className="text-muted hover:text-error">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Yangi xodim">
        <form onSubmit={create} className="space-y-4">
          {error && <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>}
          <div>
            <Label>Ism</Label>
            <Input name="name" placeholder="Ism Familiya" required />
          </div>
          <div>
            <Label>Rol</Label>
            <Select name="role" defaultValue="KITCHEN">
              {STAFF_ROLES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label} — {r.desc}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Email (login)</Label>
            <Input name="email" type="email" placeholder="xodim@email.com" autoCapitalize="none" required />
          </div>
          <div>
            <Label>Parol</Label>
            <Input name="password" type="password" placeholder="Kamida 6 belgi" minLength={6} required />
          </div>
          <p className="text-xs text-muted">
            Xodim shu email/parol bilan kiradi va o'z paneliga tushadi.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Bekor</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Yaratish
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
