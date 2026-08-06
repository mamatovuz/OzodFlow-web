"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, GripVertical, Link2, MessageSquare, Clock, Filter } from "lucide-react";
import { Button, Input, Textarea, Select, Label, Switch, Badge } from "@/components/ui";
import { igGet, igSend } from "./client";

// ─── Tiplar ───
export type BtnDraft = {
  label: string;
  actionType: "URL" | "NEXT_STEP" | "POSTBACK";
  actionUrl: string | null;
  nextStep: number | null;
  payload?: string | null;
  sortOrder?: number;
};
export type MsgDraft = {
  step: number;
  kind: "TEXT" | "IMAGE" | "VIDEO";
  body: string | null;
  mediaUrl: string | null;
  delaySec: number;
  buttons: BtnDraft[];
};
export type Schedule = {
  mode: "ALWAYS" | "HOURS" | "WEEKEND" | "CUSTOM";
  from?: string;
  to?: string;
  days?: number[];
  tz?: string;
};
export type RuleDraft = {
  id?: string;
  name: string;
  trigger: "COMMENT" | "DM" | "COMMENT_DM";
  matchType: "CONTAINS" | "EQUALS" | "STARTS_WITH" | "ENDS_WITH";
  caseSensitive: boolean;
  enabled: boolean;
  priority: number;
  scope: "GLOBAL" | "POST";
  postId: string | null;
  postCaption: string | null;
  commentReply: string | null;
  delaySec: number;
  randomDelay: boolean;
  cooldownHours: number;
  schedule: Schedule | null;
  keywords: { word: string; isIgnore: boolean }[];
  messages: MsgDraft[];
};

export function emptyDraft(): RuleDraft {
  return {
    name: "",
    trigger: "COMMENT_DM",
    matchType: "CONTAINS",
    caseSensitive: false,
    enabled: true,
    priority: 1,
    scope: "GLOBAL",
    postId: null,
    postCaption: null,
    commentReply: "Assalomu alaykum! Sizga DM orqali batafsil ma'lumot yubordik 📩",
    delaySec: 5,
    randomDelay: true,
    cooldownHours: 24,
    schedule: { mode: "ALWAYS", tz: "Asia/Tashkent" },
    keywords: [],
    messages: [{ step: 0, kind: "TEXT", body: "", mediaUrl: null, delaySec: 0, buttons: [] }],
  };
}

type PostOpt = { id: string; caption: string; thumbnail?: string; comments: number };

export function RuleEditor({
  initial,
  onCancel,
  onSaved,
}: {
  initial: RuleDraft;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [d, setD] = useState<RuleDraft>(initial);
  const [kwText, setKwText] = useState(
    initial.keywords.filter((k) => !k.isIgnore).map((k) => k.word).join("\n")
  );
  const [ignoreText, setIgnoreText] = useState(
    initial.keywords.filter((k) => k.isIgnore).map((k) => k.word).join("\n")
  );
  const [posts, setPosts] = useState<PostOpt[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof RuleDraft>(k: K, v: RuleDraft[K]) => setD((p) => ({ ...p, [k]: v }));

  // Post qamrovi tanlanganda postlarni yuklaymiz
  useEffect(() => {
    if (d.scope === "POST" && posts.length === 0) {
      igGet<{ posts: PostOpt[] }>("/posts")
        .then((r) => setPosts(r.posts))
        .catch(() => setPosts([]));
    }
  }, [d.scope, posts.length]);

  function updateMsg(idx: number, patch: Partial<MsgDraft>) {
    setD((p) => ({
      ...p,
      messages: p.messages.map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    }));
  }
  function addMsg() {
    setD((p) => ({
      ...p,
      messages: [
        ...p.messages,
        { step: p.messages.length, kind: "TEXT", body: "", mediaUrl: null, delaySec: 0, buttons: [] },
      ],
    }));
  }
  function removeMsg(idx: number) {
    setD((p) => ({
      ...p,
      messages: p.messages.filter((_, i) => i !== idx).map((m, i) => ({ ...m, step: i })),
    }));
  }
  function addBtn(mi: number) {
    updateMsg(mi, {
      buttons: [
        ...d.messages[mi].buttons,
        { label: "", actionType: "URL", actionUrl: "", nextStep: null },
      ],
    });
  }
  function updateBtn(mi: number, bi: number, patch: Partial<BtnDraft>) {
    updateMsg(mi, {
      buttons: d.messages[mi].buttons.map((b, i) => (i === bi ? { ...b, ...patch } : b)),
    });
  }
  function removeBtn(mi: number, bi: number) {
    updateMsg(mi, { buttons: d.messages[mi].buttons.filter((_, i) => i !== bi) });
  }

  async function save() {
    setError(null);
    if (!d.name.trim()) {
      setError("Qoida nomini kiriting");
      return;
    }
    const keywords = [
      ...linesToWords(kwText).map((w) => ({ word: w, isIgnore: false })),
      ...linesToWords(ignoreText).map((w) => ({ word: w, isIgnore: true })),
    ];
    // Instagram tugma cheklovi (3 ta)
    const messages = d.messages.map((m, i) => ({
      step: i,
      kind: m.kind,
      body: m.body || null,
      mediaUrl: m.mediaUrl || null,
      delaySec: m.delaySec,
      buttons: m.buttons
        .filter((b) => b.label.trim())
        .slice(0, 3)
        .map((b, bi) => ({
          label: b.label.trim(),
          actionType: b.actionType,
          actionUrl: b.actionType === "URL" ? b.actionUrl || null : null,
          nextStep: b.actionType === "NEXT_STEP" ? Number(b.nextStep) || 0 : null,
          payload: b.actionType === "POSTBACK" ? b.payload || null : null,
          sortOrder: bi,
        })),
    }));

    const payload = {
      name: d.name.trim(),
      trigger: d.trigger,
      matchType: d.matchType,
      caseSensitive: d.caseSensitive,
      enabled: d.enabled,
      priority: d.priority,
      scope: d.scope,
      postId: d.scope === "POST" ? d.postId : null,
      postCaption: d.scope === "POST" ? d.postCaption : null,
      commentReply: d.commentReply || null,
      delaySec: d.delaySec,
      randomDelay: d.randomDelay,
      cooldownHours: d.cooldownHours,
      schedule: d.schedule?.mode === "ALWAYS" ? { mode: "ALWAYS" } : d.schedule,
      keywords,
      messages,
    };

    setSaving(true);
    try {
      if (d.id) await igSend("PUT", `/rules/${d.id}`, payload);
      else await igSend("POST", "/rules", payload);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saqlashda xato");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* 1. Asosiy */}
      <Section title="Asosiy" icon={MessageSquare}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Qoida nomi</Label>
            <Input
              value={d.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Masalan: Narx so'rovi"
            />
          </div>
          <div>
            <Label>Ishga tushirish (trigger)</Label>
            <Select value={d.trigger} onChange={(e) => set("trigger", e.target.value as RuleDraft["trigger"])}>
              <option value="COMMENT_DM">Comment + DM</option>
              <option value="COMMENT">Faqat Comment</option>
              <option value="DM">Faqat DM</option>
            </Select>
          </div>
          <div>
            <Label>Ustuvorlik (priority)</Label>
            <Input
              type="number"
              min={1}
              max={99}
              value={d.priority}
              onChange={(e) => set("priority", Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-muted">Kichik raqam = yuqori ustuvorlik</p>
          </div>
          <div className="flex items-end pb-2">
            <Switch checked={d.enabled} onChange={(v) => set("enabled", v)} label="Qoida faol" />
          </div>
        </div>
      </Section>

      {/* 2. Keyword'lar */}
      <Section title="Keyword'lar" icon={Filter}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Moslik turi (Match Type)</Label>
            <Select
              value={d.matchType}
              onChange={(e) => set("matchType", e.target.value as RuleDraft["matchType"])}
            >
              <option value="CONTAINS">Ichida bo'lsa (Contains)</option>
              <option value="EQUALS">Aynan teng (Equals)</option>
              <option value="STARTS_WITH">Shu bilan boshlansa (Starts with)</option>
              <option value="ENDS_WITH">Shu bilan tugasa (Ends with)</option>
            </Select>
          </div>
          <div className="flex items-end pb-2">
            <Switch
              checked={d.caseSensitive}
              onChange={(v) => set("caseSensitive", v)}
              label="Katta-kichik harfga sezgir"
            />
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Keyword'lar (har biri yangi qatorda)</Label>
            <Textarea
              rows={6}
              value={kwText}
              onChange={(e) => setKwText(e.target.value)}
              placeholder={"narx\nprice\nmenu\nbuyurtma\nzakaz"}
            />
          </div>
          <div>
            <Label>Ignore ro'yxati (bu so'zlar bo'lsa javob bermaydi)</Label>
            <Textarea
              rows={6}
              value={ignoreText}
              onChange={(e) => setIgnoreText(e.target.value)}
              placeholder={"test\nhello\nspam"}
            />
          </div>
        </div>
      </Section>

      {/* 3. Qamrov */}
      <Section title="Qamrov" icon={Link2}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Qayerda ishlasin</Label>
            <Select value={d.scope} onChange={(e) => set("scope", e.target.value as RuleDraft["scope"])}>
              <option value="GLOBAL">Barcha postlarda (Global)</option>
              <option value="POST">Faqat bitta postda</option>
            </Select>
          </div>
          {d.scope === "POST" && (
            <div>
              <Label>Post tanlang</Label>
              <Select
                value={d.postId || ""}
                onChange={(e) => {
                  const p = posts.find((x) => x.id === e.target.value);
                  set("postId", e.target.value || null);
                  set("postCaption", p?.caption || null);
                }}
              >
                <option value="">— tanlang —</option>
                {posts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.caption ? p.caption.slice(0, 50) : `Post ${p.id.slice(-6)}`} ({p.comments} comment)
                  </option>
                ))}
              </Select>
              {posts.length === 0 && (
                <p className="mt-1 text-xs text-muted">
                  Postlar yuklanmadi — Instagram ulanganini tekshiring.
                </p>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* 4. Comment reply */}
      {d.trigger !== "DM" && (
        <Section title="Comment'ga ochiq javob" icon={MessageSquare}>
          <Textarea
            rows={2}
            value={d.commentReply || ""}
            onChange={(e) => set("commentReply", e.target.value)}
            placeholder="Assalomu alaykum! Sizga DM yubordik 📩"
          />
          <p className="mt-1 text-xs text-muted">
            Bo'sh qoldirilsa, comment ostiga ochiq javob yozilmaydi (faqat DM yuboriladi).
          </p>
        </Section>
      )}

      {/* 5. DM flow */}
      <Section title="DM flow (ko'p bosqichli)" icon={MessageSquare}>
        <div className="space-y-4">
          {d.messages.map((m, mi) => (
            <div key={mi} className="rounded-xl border border-border bg-surface-2/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted" />
                  <Badge variant="accent">Bosqich {mi}</Badge>
                </div>
                {d.messages.length > 1 && (
                  <button
                    onClick={() => removeMsg(mi)}
                    className="text-muted hover:text-error"
                    title="Bosqichni o'chirish"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Tur</Label>
                  <Select value={m.kind} onChange={(e) => updateMsg(mi, { kind: e.target.value as MsgDraft["kind"] })}>
                    <option value="TEXT">Matn</option>
                    <option value="IMAGE">Rasm</option>
                    <option value="VIDEO">Video</option>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Kechikish (soniya)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={m.delaySec}
                    onChange={(e) => updateMsg(mi, { delaySec: Number(e.target.value) })}
                  />
                </div>
              </div>

              {(m.kind === "IMAGE" || m.kind === "VIDEO") && (
                <div className="mt-3">
                  <Label>Media URL ({m.kind === "IMAGE" ? "rasm" : "video"})</Label>
                  <Input
                    value={m.mediaUrl || ""}
                    onChange={(e) => updateMsg(mi, { mediaUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              )}

              <div className="mt-3">
                <Label>Matn</Label>
                <Textarea
                  rows={3}
                  value={m.body || ""}
                  onChange={(e) => updateMsg(mi, { body: e.target.value })}
                  placeholder="Xabar matni... emoji ishlatishingiz mumkin 🍕"
                />
              </div>

              {/* Tugmalar */}
              <div className="mt-3">
                <div className="mb-2 flex items-center justify-between">
                  <Label className="mb-0">Tugmalar (max 3)</Label>
                  {m.buttons.length < 3 && (
                    <button
                      onClick={() => addBtn(mi)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                    >
                      <Plus className="h-3 w-3" /> Tugma
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {m.buttons.map((b, bi) => (
                    <div key={bi} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
                      <Input
                        className="h-9 min-w-[120px] flex-1"
                        value={b.label}
                        maxLength={20}
                        onChange={(e) => updateBtn(mi, bi, { label: e.target.value })}
                        placeholder="Tugma matni"
                      />
                      <Select
                        className="h-9 w-auto"
                        value={b.actionType}
                        onChange={(e) => updateBtn(mi, bi, { actionType: e.target.value as BtnDraft["actionType"] })}
                      >
                        <option value="URL">Havola (URL)</option>
                        <option value="NEXT_STEP">Keyingi bosqich</option>
                      </Select>
                      {b.actionType === "URL" ? (
                        <Input
                          className="h-9 min-w-[140px] flex-1"
                          value={b.actionUrl || ""}
                          onChange={(e) => updateBtn(mi, bi, { actionUrl: e.target.value })}
                          placeholder="https://..."
                        />
                      ) : (
                        <Input
                          className="h-9 w-24"
                          type="number"
                          min={0}
                          value={b.nextStep ?? ""}
                          onChange={(e) => updateBtn(mi, bi, { nextStep: Number(e.target.value) })}
                          placeholder="Bosqich"
                        />
                      )}
                      <button
                        onClick={() => removeBtn(mi, bi)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-error/10 hover:text-error"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addMsg} className="w-full">
            <Plus className="h-4 w-4" />
            Bosqich qo'shish
          </Button>
        </div>
      </Section>

      {/* 6. Kechikish & Smart filter */}
      <Section title="Kechikish va Smart filter" icon={Clock}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Javob kechikishi (soniya)</Label>
            <Select value={String(d.delaySec)} onChange={(e) => set("delaySec", Number(e.target.value))}>
              <option value="0">Darhol</option>
              <option value="5">5 soniya</option>
              <option value="10">10 soniya</option>
              <option value="30">30 soniya</option>
              <option value="60">1 daqiqa</option>
            </Select>
          </div>
          <div className="flex items-end pb-2">
            <Switch checked={d.randomDelay} onChange={(v) => set("randomDelay", v)} label="Tasodifiy kechikish" />
          </div>
          <div>
            <Label>Cooldown (soat)</Label>
            <Input
              type="number"
              min={0}
              max={720}
              value={d.cooldownHours}
              onChange={(e) => set("cooldownHours", Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-muted">Bir userga N soatda 1 marta (spam oldini olish)</p>
          </div>
        </div>
      </Section>

      {/* 7. Jadval */}
      <Section title="Ishlash jadvali" icon={Clock}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Rejim</Label>
            <Select
              value={d.schedule?.mode || "ALWAYS"}
              onChange={(e) =>
                set("schedule", {
                  ...(d.schedule || { tz: "Asia/Tashkent" }),
                  mode: e.target.value as Schedule["mode"],
                })
              }
            >
              <option value="ALWAYS">Har doim</option>
              <option value="HOURS">Belgilangan soatlarda</option>
              <option value="WEEKEND">Faqat dam olish kunlari</option>
              <option value="CUSTOM">Maxsus (kun + soat)</option>
            </Select>
          </div>
          {(d.schedule?.mode === "HOURS" || d.schedule?.mode === "CUSTOM") && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Dan</Label>
                <Input
                  type="time"
                  value={d.schedule?.from || "09:00"}
                  onChange={(e) => set("schedule", { ...d.schedule!, from: e.target.value })}
                />
              </div>
              <div>
                <Label>Gacha</Label>
                <Input
                  type="time"
                  value={d.schedule?.to || "18:00"}
                  onChange={(e) => set("schedule", { ...d.schedule!, to: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
        {d.schedule?.mode === "CUSTOM" && (
          <div className="mt-3">
            <Label>Kunlar</Label>
            <div className="flex flex-wrap gap-2">
              {["Yak", "Du", "Se", "Cho", "Pay", "Ju", "Sha"].map((day, i) => {
                const active = d.schedule?.days?.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      const days = new Set(d.schedule?.days || []);
                      if (days.has(i)) days.delete(i);
                      else days.add(i);
                      set("schedule", { ...d.schedule!, days: [...days].sort() });
                    }}
                    className={`h-9 w-12 rounded-lg text-sm font-medium transition-colors ${
                      active ? "bg-accent text-white" : "border border-border bg-card text-muted hover:bg-surface-2"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-b-2xl">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Bekor qilish
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saqlanmoqda..." : d.id ? "Saqlash" : "Yaratish"}
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function linesToWords(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
