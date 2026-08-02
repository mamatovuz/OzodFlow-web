"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, BarChart3, Save } from "lucide-react";
import { Button, Card, Input, Label, Switch } from "@/components/ui";
import { Modal } from "@/components/ui-modal";

type Stat = {
  id: string;
  value: string;
  label: string;
  isActive: boolean;
};

export function StatsManager() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");

  async function load() {
    const res = await fetch("/api/admin/stats");
    const json = await res.json();
    if (json.success) setStats(json.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openModal() {
    setValue("");
    setLabel("");
    setError("");
    setModal(true);
  }

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value, label }),
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

  async function save(s: Stat) {
    await fetch(`/api/admin/stats/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: s.value, label: s.label }),
    });
    load();
  }

  async function toggle(s: Stat) {
    await fetch(`/api/admin/stats/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Ko'rsatkich o'chirilsinmi?")) return;
    await fetch(`/api/admin/stats/${id}`, { method: "DELETE" });
    load();
  }

  function edit(id: string, field: "value" | "label", v: string) {
    setStats((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: v } : s)));
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openModal}>
          <Plus className="h-4 w-4" /> Ko'rsatkich qo'shish
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : stats.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <BarChart3 className="h-10 w-10 text-muted/40" />
          <p className="mt-3 font-medium text-foreground">Ko'rsatkich yo'q</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Masalan: qiymat “500+”, izoh “Restoran”. Qo'shsangiz bosh sahifada
            chiqadi.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium text-muted">Ko'rsatkich</span>
                <button
                  onClick={() => remove(s.id)}
                  className="text-muted hover:text-error"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 space-y-2">
                <div>
                  <Label className="text-xs">Qiymat</Label>
                  <Input
                    value={s.value}
                    onChange={(e) => edit(s.id, "value", e.target.value)}
                    placeholder="500+"
                  />
                </div>
                <div>
                  <Label className="text-xs">Izoh</Label>
                  <Input
                    value={s.label}
                    onChange={(e) => edit(s.id, "label", e.target.value)}
                    placeholder="Restoran"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <Switch
                  checked={s.isActive}
                  onChange={() => toggle(s)}
                  label={s.isActive ? "Ko'rinadi" : "Yashirin"}
                />
                <Button size="sm" variant="outline" onClick={() => save(s)}>
                  <Save className="h-3.5 w-3.5" /> Saqlash
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Yangi ko'rsatkich">
        <form onSubmit={create} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </div>
          )}
          <div>
            <Label>Qiymat</Label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="500+"
              required
            />
          </div>
          <div>
            <Label>Izoh</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Restoran"
              required
            />
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
