"use client";

import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useActionState, useCallback, useEffect, useState } from "react";

import {
  addPortfolioAction,
  deletePortfolioAction,
  movePortfolioAction,
  togglePortfolioVisibilityAction,
  updatePortfolioAction,
} from "@/app/(app)/settings/portfolio/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import type { PortfolioEntry } from "@/lib/portfolio";
import { cn } from "@/lib/utils";
import { IDLE, type FormState } from "@/lib/validators/form";

export type PortfolioLabels = {
  empty: string;
  addTitle: string;
  title: string;
  titlePlaceholder: string;
  description: string;
  descriptionHint: string;
  url: string;
  urlHint: string;
  tech: string;
  techHint: string;
  year: string;
  add: string;
  save: string;
  edit: string;
  cancel: string;
  remove: string;
  hide: string;
  show: string;
  hidden: string;
  fromProject: string;
  fromProjectHint: string;
  moveUp: string;
  moveDown: string;
};

/**
 * Portfolio ishlarini boshqarish.
 *
 * TARTIB tugmalar bilan o'zgaradi, drag-and-drop emas: sudrash
 * telefonda noqulay, klaviatura bilan ishlamaydi va JS o'chirilganda
 * butunlay yo'qoladi. Tugma esa hamma joyda ishlaydi.
 */
export function PortfolioManager({
  works,
  labels,
}: {
  works: PortfolioEntry[];
  labels: PortfolioLabels;
}) {
  // Qaysi ish tahrirlanayotgani. `null` — hech biri.
  const [editingId, setEditingId] = useState<string | null>(null);

  // `useCallback` — `EditWorkForm` ichidagi `useEffect` bog'liqligi
  // barqaror bo'lishi uchun.
  const stopEditing = useCallback(() => setEditingId(null), []);

  const [addState, addAction, isAdding] = useActionState<FormState, FormData>(
    addPortfolioAction,
    IDLE
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ── Ro'yxat ───────────────────────────────────────────────────── */}
      {works.length === 0 ? (
        <p className="text-[15px] text-muted-foreground">{labels.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {works.map((work, index) => (
            <li key={work.id}>
              {editingId === work.id ? (
                <EditWorkForm
                  work={work}
                  labels={labels}
                  onDone={stopEditing}
                />
              ) : (
                <WorkRow
                  work={work}
                  labels={labels}
                  isFirst={index === 0}
                  isLast={index === works.length - 1}
                  onEdit={() => setEditingId(work.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {/* ── Yangi ish ─────────────────────────────────────────────────── */}
      <form
        action={addAction}
        key={addState.status === "success" ? "added" : "adding"}
        className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface-1 p-4"
      >
        <p className="font-display text-[15px] font-semibold">
          {labels.addTitle}
        </p>

        {addState.status === "success" && addState.message && (
          <Alert variant="success">{addState.message}</Alert>
        )}
        {addState.status === "error" && addState.message && (
          <Alert variant="danger">{addState.message}</Alert>
        )}

        <WorkFields
          labels={labels}
          errors={addState.status === "error" ? addState.fieldErrors : undefined}
        />

        <div>
          <Button type="submit" loading={isAdding}>
            <Plus className="size-4" strokeWidth={2.5} aria-hidden />
            {labels.add}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bitta qator
// ─────────────────────────────────────────────────────────────────────────────

function WorkRow({
  work,
  labels,
  isFirst,
  isLast,
  onEdit,
}: {
  work: PortfolioEntry;
  labels: PortfolioLabels;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
}) {
  const [moveState, moveAction, isMoving] = useActionState<FormState, FormData>(
    movePortfolioAction,
    IDLE
  );

  const [visState, visAction, isToggling] = useActionState<FormState, FormData>(
    togglePortfolioVisibilityAction,
    IDLE
  );

  const [delState, delAction, isDeleting] = useActionState<FormState, FormData>(
    deletePortfolioAction,
    IDLE
  );

  const error =
    (moveState.status === "error" && moveState.message) ||
    (visState.status === "error" && visState.message) ||
    (delState.status === "error" && delState.message) ||
    null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4",
        // Yashirilgan ish susaytiriladi — ro'yxatda darhol ajralib
        // turishi kerak.
        !work.isVisible && "opacity-60"
      )}
    >
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            {work.title}

            {work.year && (
              <span className="text-[13px] font-normal text-muted-foreground">
                {work.year}
              </span>
            )}

            {!work.isVisible && (
              <Badge variant="neutral" size="sm">
                {labels.hidden}
              </Badge>
            )}

            {work.fromProject && (
              <Badge variant="brand" size="sm" title={labels.fromProjectHint}>
                {labels.fromProject}
              </Badge>
            )}
          </p>

          {work.description && (
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground text-pretty">
              {work.description}
            </p>
          )}

          {work.tech.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-1.5">
              {work.tech.map((tech) => (
                <span
                  key={tech}
                  className="rounded border border-border-subtle bg-surface-1 px-1.5 py-0.5 text-[11px] text-muted-foreground"
                >
                  {tech}
                </span>
              ))}
            </p>
          )}

          {work.url && (
            <a
              href={work.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block max-w-full truncate text-[13px] text-muted-foreground underline decoration-border underline-offset-2 transition-colors hover:text-foreground"
            >
              {work.url}
            </a>
          )}
        </div>

        {/* ── Amallar ───────────────────────────────────────────────── */}
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {/* Tartib */}
          <form action={moveAction} className="contents">
            <input type="hidden" name="itemId" value={work.id} />
            <input type="hidden" name="direction" value="up" />
            <IconButton
              label={labels.moveUp}
              disabled={isFirst || isMoving}
              icon={ArrowUp}
            />
          </form>

          <form action={moveAction} className="contents">
            <input type="hidden" name="itemId" value={work.id} />
            <input type="hidden" name="direction" value="down" />
            <IconButton
              label={labels.moveDown}
              disabled={isLast || isMoving}
              icon={ArrowDown}
            />
          </form>

          {/* Ko'rinish */}
          <form action={visAction} className="contents">
            <input type="hidden" name="itemId" value={work.id} />
            <input
              type="hidden"
              name="visible"
              value={work.isVisible ? "hide" : "show"}
            />
            <IconButton
              label={work.isVisible ? labels.hide : labels.show}
              disabled={isToggling}
              icon={work.isVisible ? Eye : EyeOff}
            />
          </form>

          {/* Tahrirlash */}
          <button
            type="button"
            onClick={onEdit}
            aria-label={`${labels.edit}: ${work.title}`}
            className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          >
            <Pencil className="size-4" strokeWidth={2} aria-hidden />
          </button>

          {/* O'chirish — platformadagi loyihada yo'q */}
          {!work.fromProject && (
            <form action={delAction} className="contents">
              <input type="hidden" name="itemId" value={work.id} />
              <IconButton
                label={`${labels.remove}: ${work.title}`}
                disabled={isDeleting}
                icon={Trash2}
                danger
              />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/** Kichik ikonali tugma — amallar qatori uchun. */
function IconButton({
  label,
  disabled,
  icon: Icon,
  danger,
}: {
  label: string;
  disabled?: boolean;
  icon: typeof ArrowUp;
  danger?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-8 place-items-center rounded-md transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-40",
        danger
          ? "text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
          : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
      )}
    >
      <Icon className="size-4" strokeWidth={2} aria-hidden />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tahrirlash formasi
// ─────────────────────────────────────────────────────────────────────────────

function EditWorkForm({
  work,
  labels,
  onDone,
}: {
  work: PortfolioEntry;
  labels: PortfolioLabels;
  onDone: () => void;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    updatePortfolioAction,
    IDLE
  );

  /**
   * Saqlangach tahrirlash rejimi yopiladi.
   *
   * `useEffect` SHART: render ichida `onDone()` chaqirish ota
   * komponentning holatini render vaqtida o'zgartiradi va React buni
   * xato deb hisoblaydi ("Cannot update a component while rendering").
   */
  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state.status, onDone]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border border-brand/40 bg-surface-1 p-4"
    >
      <input type="hidden" name="itemId" value={work.id} />

      {state.status === "error" && state.message && (
        <Alert variant="danger">{state.message}</Alert>
      )}

      <WorkFields
        labels={labels}
        errors={state.status === "error" ? state.fieldErrors : undefined}
        defaults={work}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" loading={isPending}>
          {labels.save}
        </Button>

        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          {labels.cancel}
        </Button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Umumiy maydonlar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Qo'shish va tahrirlash formalarida BIR XIL maydonlar.
 *
 * Ikki nusxa yozilsa ular ertami-kechmi bir-biridan uzoqlashadi:
 * bittasiga maydon qo'shilib, ikkinchisi esdan chiqadi.
 */
function WorkFields({
  labels,
  errors,
  defaults,
}: {
  labels: PortfolioLabels;
  errors?: Record<string, string[]> | undefined;
  defaults?: PortfolioEntry;
}) {
  return (
    <>
      <Field name="title" label={labels.title} errors={errors?.title} required>
        {(field) => (
          <Input
            {...field}
            defaultValue={defaults?.title ?? ""}
            placeholder={labels.titlePlaceholder}
            maxLength={120}
          />
        )}
      </Field>

      <Field
        name="description"
        label={labels.description}
        hint={labels.descriptionHint}
        errors={errors?.description}
      >
        {(field) => (
          <Textarea
            {...field}
            defaultValue={defaults?.description ?? ""}
            rows={3}
            maxLength={1000}
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Field
          name="url"
          label={labels.url}
          hint={labels.urlHint}
          errors={errors?.url}
        >
          {(field) => (
            <Input
              {...field}
              type="url"
              inputMode="url"
              defaultValue={defaults?.url ?? ""}
              placeholder="https://loyiha.uz"
              spellCheck={false}
            />
          )}
        </Field>

        <Field name="year" label={labels.year} errors={errors?.year}>
          {(field) => (
            <Input
              {...field}
              type="number"
              inputMode="numeric"
              min={2000}
              defaultValue={defaults?.year ?? ""}
            />
          )}
        </Field>
      </div>

      <Field
        name="tech"
        label={labels.tech}
        hint={labels.techHint}
        errors={errors?.tech}
      >
        {(field) => (
          <Input
            {...field}
            defaultValue={defaults?.tech.join(", ") ?? ""}
            placeholder="Next.js, PostgreSQL"
          />
        )}
      </Field>
    </>
  );
}
