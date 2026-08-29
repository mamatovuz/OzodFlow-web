"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  UserCog,
  ShieldCheck,
  KeyRound,
  Mail,
  Check,
} from "lucide-react";
import { Button, Input, Label, Card, Badge } from "@/components/ui";
import { Modal } from "@/components/ui-modal";
import { ADMIN_PERMS, type AdminPerm } from "@/lib/admin-perms";

type SubAdmin = {
  id: string;
  name: string;
  email: string | null;
  perms: AdminPerm[];
  sessionCount: number;
  createdAt: string;
};

const permLabel = (k: AdminPerm) => ADMIN_PERMS.find((p) => p.key === k)?.label || k;

export function AdminsManager() {
  const [admins, setAdmins] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SubAdmin | null>(null);

  async function load() {
    const res = await fetch("/api/admin/admins");
    const json = await res.json();
    if (json.success) setAdmins(json.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(a: SubAdmin) {
    if (!confirm(`"${a.name}" adminni o'chirasizmi? U endi kira olmaydi.`)) return;
    await fetch(`/api/admin/admins/${a.id}`, { method: "DELETE" });
    load();
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
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Admin qo'shish
        </Button>
      </div>

      {admins.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <UserCog className="h-10 w-10 text-muted/40" />
          <p className="mt-3 font-medium text-foreground">Qo'shimcha admin yo'q</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Yordamchi adminlar qo'shing va har biriga faqat kerakli bo'limlarni
            oching.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {admins.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{a.name}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted">
                      <Mail className="h-3 w-3" /> {a.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => remove(a)}
                  className="text-muted hover:text-error"
                  title="O'chirish"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.perms.length === 0 ? (
                  <span className="text-xs text-muted">Ruxsat yo'q</span>
                ) : (
                  a.perms.map((p) => (
                    <Badge key={p} variant="default" className="text-[11px]">
                      {permLabel(p)}
                    </Badge>
                  ))
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs text-muted">
                  {a.sessionCount > 0 ? `${a.sessionCount} ta faol seans` : "Kirmagan"}
                </span>
                <button
                  onClick={() => setEditing(a)}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Tahrirlash
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {createOpen && (
        <CreateModal
          onClose={() => setCreateOpen(false)}
          onDone={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}
      {editing && (
        <EditModal
          admin={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// ─── Ruxsatlar toggle grid ───
function PermGrid({
  selected,
  onToggle,
}: {
  selected: AdminPerm[];
  onToggle: (k: AdminPerm) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {ADMIN_PERMS.map((p) => {
        const on = selected.includes(p.key);
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onToggle(p.key)}
            className={`flex items-start gap-2 rounded-lg border p-2.5 text-left transition-colors ${
              on
                ? "border-accent bg-accent-soft"
                : "border-border bg-card hover:border-accent/50"
            }`}
          >
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                on ? "border-accent bg-accent text-white" : "border-border"
              }`}
            >
              {on && <Check className="h-3 w-3" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{p.label}</span>
              <span className="block text-xs text-muted">{p.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CreateModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [perms, setPerms] = useState<AdminPerm[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggle(k: AdminPerm) {
    setPerms((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.get("name"),
        email: f.get("email"),
        password: f.get("password"),
        perms,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error || "Xatolik");
      return;
    }
    onDone();
  }

  return (
    <Modal open onClose={onClose} title="Yangi admin qo'shish">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>}
        <div>
          <Label>Ism</Label>
          <Input name="name" placeholder="Yordamchi ismi" required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Login (email)</Label>
            <Input
              name="email"
              type="email"
              placeholder="yordamchi@email.com"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />
          </div>
          <div>
            <Label>Parol</Label>
            <Input name="password" type="text" placeholder="Kamida 6 belgi" minLength={6} required />
          </div>
        </div>
        <div>
          <Label>Ruxsatlar (qaysi bo'limlarni boshqaradi)</Label>
          <PermGrid selected={perms} onToggle={toggle} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Bekor
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Qo'shish
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditModal({
  admin,
  onClose,
  onDone,
}: {
  admin: SubAdmin;
  onClose: () => void;
  onDone: () => void;
}) {
  const [perms, setPerms] = useState<AdminPerm[]>(admin.perms);
  const [name, setName] = useState(admin.name);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggle(k: AdminPerm) {
    setPerms((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body: Record<string, unknown> = { name, perms };
    if (password.trim()) body.password = password.trim();
    const res = await fetch(`/api/admin/admins/${admin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error || "Xatolik");
      return;
    }
    onDone();
  }

  return (
    <Modal open onClose={onClose} title={`${admin.name} — tahrirlash`}>
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>}
        <div>
          <Label>Ism</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5" /> Yangi parol (bo'sh = o'zgarmaydi)
          </Label>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="text"
            placeholder="Yangi parol o'rnatish uchun kiriting"
            minLength={6}
          />
          <p className="mt-1 text-xs text-muted">
            Parol o'zgarsa, bu admin hamma qurilmalardan chiqariladi.
          </p>
        </div>
        <div>
          <Label>Ruxsatlar</Label>
          <PermGrid selected={perms} onToggle={toggle} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Bekor
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Saqlash
          </Button>
        </div>
      </form>
    </Modal>
  );
}
