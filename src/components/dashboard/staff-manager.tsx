"use client";

import { useState } from "react";
import {
  Loader2, Plus, Trash2, X, UserPlus, ChefHat, ConciergeBell,
  ShieldCheck, Wallet, ClipboardList, Lock, Eye, EyeOff,
} from "lucide-react";
import { Card, Button, Input, Label, Select, Badge, EmptyState } from "@/components/ui";
import { STAFF_ROLES, type StaffRole } from "@/lib/staff";

type Staff = { id: string; role: string; user: { name: string; email: string | null } };

const ROLE_ICON: Record<string, typeof ChefHat> = {
  MANAGER: ShieldCheck,
  OPERATOR: ClipboardList,
  CASHIER: Wallet,
  KITCHEN: ChefHat,
  WAITER: ConciergeBell,
};

export function StaffManager({
  initial,
  canStaff,
}: {
  initial: Staff[];
  canStaff: boolean;
}) {
  const [list, setList] = useState<Staff[]>(initial);
  const [open, setOpen] = useState(false);

  async function reload() {
    const res = await fetch("/api/staff");
    const json = await res.json();
    if (json.success) setList(json.data);
  }

  async function remove(id: string, name: string) {
    if (!confirm(`"${name}" xodimi o'chirilsinmi? U endi tizimga kira olmaydi.`)) return;
    await fetch(`/api/staff/${id}`, { method: "DELETE" });
    setList((p) => p.filter((s) => s.id !== id));
  }

  if (!canStaff) {
    return (
      <EmptyState
        icon={Lock}
        title="Xodimlar tizimi — Business tarifda"
        description="Oshxona va ofitsant panellari, alohida xodim akkauntlari Business tarifida ochiladi. Tarifni yangilang."
        action={
          <a href="/dashboard/settings">
            <Button>Tarifni yangilash</Button>
          </a>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Rollar tushuntirishi */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STAFF_ROLES.filter((r) => r.key !== "MANAGER").map((r) => {
          const Icon = ROLE_ICON[r.key] || UserPlus;
          return (
            <div key={r.key} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium text-foreground">{r.label}</p>
                <p className="text-xs text-muted">{r.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ro'yxat */}
      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Xodimlar ({list.length})</h2>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Xodim qo'shish
          </Button>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="Hali xodim yo'q"
            description="Oshxona yoki ofitsant uchun akkaunt yarating — ular alohida login bilan o'z panellariga kiradi."
            action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Xodim qo'shish</Button>}
          />
        ) : (
          <div className="divide-y divide-border">
            {list.map((s) => {
              const meta = STAFF_ROLES.find((r) => r.key === s.role);
              const Icon = ROLE_ICON[s.role] || UserPlus;
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-accent">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{s.user.name}</p>
                      <p className="truncate text-xs text-muted">{s.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="accent">{meta?.label || s.role}</Badge>
                    <button
                      onClick={() => remove(s.id, s.user.name)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-error/10 hover:text-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {open && <StaffModal onClose={() => setOpen(false)} onCreated={reload} />}
    </div>
  );
}

function StaffModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("KITCHEN");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (name.trim().length < 2) return setError("Ism kamida 2 belgi");
    if (!/.+@.+\..+/.test(email)) return setError("Email noto'g'ri");
    if (password.length < 6) return setError("Parol kamida 6 belgi");
    setBusy(true);
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error || "Xatolik");
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-card p-5 animate-fade-up sm:rounded-3xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Yangi xodim</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Ism</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kamron Aliyev" />
          </div>
          <div>
            <Label>Login (email)</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kamron@restoran.uz" type="email" />
          </div>
          <div>
            <Label>Parol</Label>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kamida 6 belgi"
                type={showPw ? "text" : "password"}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>Rol</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
              {STAFF_ROLES.filter((r) => r.key !== "MANAGER").map((r) => (
                <option key={r.key} value={r.key}>{r.label} — {r.desc}</option>
              ))}
            </Select>
          </div>

          {error && <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>}

          <div className="rounded-lg bg-surface-2 p-3 text-xs text-muted">
            Xodim shu <b className="text-foreground">login va parol</b> bilan{" "}
            <b className="text-foreground">/login</b> orqali kiradi va o'z paneliga
            (oshxona yoki ofitsant) yo'naltiriladi.
          </div>

          <Button onClick={submit} disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Qo'shish
          </Button>
        </div>
      </div>
    </div>
  );
}
