"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  MessageSquareText,
  Info,
  ArrowLeft,
} from "lucide-react";
import {
  Button,
  Input,
  Textarea,
  Select,
  Label,
  Switch,
  Badge,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import { igGet, igSend } from "./client";
import { RuleEditor, type RuleDraft, emptyDraft } from "./ig-rule-editor";

export type RuleDto = RuleDraft & {
  id: string;
  hitCount: number;
  logCount: number;
};

export function IgRulesManager() {
  const [rules, setRules] = useState<RuleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<RuleDraft | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await igGet<{ rules: RuleDto[] }>("/rules");
      setRules(data.rules);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yuklashda xato");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(rule: RuleDto) {
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)));
    try {
      await igSend("PATCH", `/rules/${rule.id}`, { enabled: !rule.enabled });
    } catch {
      load();
    }
  }

  async function remove(rule: RuleDto) {
    if (!confirm(`"${rule.name}" qoidasini o'chirishni tasdiqlaysizmi?`)) return;
    setRules((prev) => prev.filter((r) => r.id !== rule.id));
    try {
      await igSend("DELETE", `/rules/${rule.id}`);
    } catch {
      load();
    }
  }

  // ── Tahrirlagich ochiq ──
  if (editing) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setEditing(null)}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Qoidalar ro'yxati
        </button>
        <RuleEditor
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-error/30 bg-error/5 p-6 text-center">
        <p className="text-sm text-error">{error}</p>
        <button onClick={load} className="mt-3 text-sm font-medium text-accent underline">
          Qayta urinish
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Keyword'ga qarab avtomatik comment reply va DM yuboriladi.
        </p>
        <Button onClick={() => setEditing(emptyDraft())}>
          <Plus className="h-4 w-4" />
          Yangi qoida
        </Button>
      </div>

      {/* Instagram cheklovi izohi */}
      <div className="flex items-start gap-2 rounded-xl border border-accent/20 bg-accent-soft/50 p-3 text-xs text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <span>
          Instagram cheklovlari: bir DM'da eng ko'pi <b>3 ta tugma</b>; foydalanuvchi oxirgi{" "}
          <b>24 soat</b> ichida yozgan bo'lsagina DM yuborish mumkin; tugmalar faqat havola (URL)
          yoki flow'ning keyingi bosqichini ochadi (Telegram uslubidagi ixtiyoriy tugmalar
          qo'llab-quvvatlanmaydi).
        </span>
      </div>

      {rules.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="Hali qoida yo'q"
          description="Birinchi avtomatlashtirish qoidangizni yarating — masalan «narx» so'ziga javob."
          action={
            <Button onClick={() => setEditing(emptyDraft())}>
              <Plus className="h-4 w-4" />
              Yangi qoida
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-accent/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{rule.name}</h3>
                    <Badge variant={rule.enabled ? "success" : "default"}>
                      {rule.enabled ? "Faol" : "O'chiq"}
                    </Badge>
                    <Badge variant="accent">{triggerLabel(rule.trigger)}</Badge>
                    {rule.scope === "POST" && <Badge>Bitta post</Badge>}
                    <span className="text-xs text-muted">#{rule.priority}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {rule.keywords
                      .filter((k) => !k.isIgnore)
                      .slice(0, 8)
                      .map((k, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-foreground"
                        >
                          {k.word}
                        </span>
                      ))}
                    {rule.keywords.filter((k) => !k.isIgnore).length > 8 && (
                      <span className="text-xs text-muted">
                        +{rule.keywords.filter((k) => !k.isIgnore).length - 8}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {rule.messages.length} bosqichli flow · {rule.hitCount} marta ishladi
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Switch checked={rule.enabled} onChange={() => toggle(rule)} />
                  <button
                    onClick={() => setEditing(toDraft(rule))}
                    className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
                    title="Tahrirlash"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(rule)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-error/10 hover:text-error"
                    title="O'chirish"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function triggerLabel(t: string): string {
  return t === "COMMENT" ? "Comment" : t === "DM" ? "DM" : "Comment + DM";
}

function toDraft(rule: RuleDto): RuleDraft {
  return { ...rule };
}
