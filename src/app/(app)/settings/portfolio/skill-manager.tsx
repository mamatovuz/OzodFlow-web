"use client";

import { Plus, X } from "lucide-react";
import { useActionState } from "react";

import {
  addSkillAction,
  removeSkillAction,
} from "@/app/(app)/settings/portfolio/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { IDLE, type FormState } from "@/lib/validators/form";

export type SkillView = {
  skillId: string;
  name: string;
  /** 1..5 */
  level: number;
  yearsLabel: string;
};

export type SkillOption = {
  id: string;
  name: string;
  kind: string;
};

export type SkillLabels = {
  empty: string;
  hint: string;
  select: string;
  selectPlaceholder: string;
  level: string;
  years: string;
  add: string;
  remove: string;
  levels: Record<number, string>;
};

/**
 * Ko'nikmalarni boshqarish.
 *
 * Ko'nikmalar RO'YXATDAN tanlanadi (erkin matn emas): mijozlar shu
 * bo'yicha qidiradi va "React", "react", "ReactJS" uch xil yozuv
 * qidiruvni buzardi.
 */
export function SkillManager({
  skills,
  options,
  labels,
}: {
  skills: SkillView[];
  options: SkillOption[];
  labels: SkillLabels;
}) {
  const [addState, addAction, isAdding] = useActionState<FormState, FormData>(
    addSkillAction,
    IDLE
  );

  const [removeState, removeAction, isRemoving] = useActionState<
    FormState,
    FormData
  >(removeSkillAction, IDLE);

  const errors = addState.status === "error" ? addState.fieldErrors : undefined;

  // Allaqachon qo'shilganlar tanlovda ko'rinmasligi kerak.
  const taken = new Set(skills.map((skill) => skill.skillId));
  const available = options.filter((option) => !taken.has(option.id));

  // Guruhlab ko'rsatamiz: 60+ ko'nikma bir ro'yxatda o'qilmaydi.
  const grouped = new Map<string, SkillOption[]>();
  for (const option of available) {
    const list = grouped.get(option.kind) ?? [];
    list.push(option);
    grouped.set(option.kind, list);
  }

  return (
    <div className="flex flex-col gap-5">
      {addState.status === "success" && addState.message && (
        <Alert variant="success">{addState.message}</Alert>
      )}
      {addState.status === "error" && addState.message && (
        <Alert variant="danger">{addState.message}</Alert>
      )}
      {removeState.status === "error" && removeState.message && (
        <Alert variant="danger">{removeState.message}</Alert>
      )}

      {/* ── Mavjud ko'nikmalar ────────────────────────────────────────── */}
      {skills.length === 0 ? (
        <p className="text-[15px] text-muted-foreground">{labels.empty}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <li key={skill.skillId}>
              {/* Har chip o'z formasi — bitta tugma bilan o'chirish. */}
              <form action={removeAction} className="contents">
                <input type="hidden" name="skillId" value={skill.skillId} />

                <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-1 py-1.5 pl-3 pr-1.5 text-[13px]">
                  <span className="font-medium">{skill.name}</span>

                  <span className="text-muted-foreground">
                    {/* Daraja nuqtalar bilan: son emas — u tezroq
                        o'qiladi va joy kam egallaydi. */}
                    <span aria-hidden>{"●".repeat(skill.level)}</span>
                    <span className="sr-only">
                      {labels.level}: {skill.level}
                    </span>
                    {" · "}
                    {skill.yearsLabel}
                  </span>

                  <button
                    type="submit"
                    disabled={isRemoving}
                    aria-label={`${labels.remove}: ${skill.name}`}
                    className="grid size-5 place-items-center rounded text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-50"
                  >
                    <X className="size-3.5" strokeWidth={2.5} aria-hidden />
                  </button>
                </span>
              </form>
            </li>
          ))}
        </ul>
      )}

      {/* ── Qo'shish ──────────────────────────────────────────────────── */}
      {available.length > 0 && (
        <form
          action={addAction}
          // Muvaffaqiyatdan keyin forma tozalanadi.
          key={addState.status === "success" ? "added" : "adding"}
          className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface-1 p-4"
        >
          <p className="text-[13px] leading-relaxed text-muted-foreground text-pretty">
            {labels.hint}
          </p>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)]">
            <Field name="skillId" label={labels.select} errors={errors?.skillId}>
              {(field) => (
                <Select {...field} defaultValue="">
                  <option value="" disabled>
                    {labels.selectPlaceholder}
                  </option>

                  {[...grouped.entries()].map(([kind, items]) => (
                    <optgroup key={kind} label={kind}>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              )}
            </Field>

            <Field name="level" label={labels.level} errors={errors?.level}>
              {(field) => (
                <Select {...field} defaultValue="3">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <option key={level} value={level}>
                      {labels.levels[level]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field
              name="yearsExperience"
              label={labels.years}
              errors={errors?.yearsExperience}
            >
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={60}
                  defaultValue={0}
                />
              )}
            </Field>
          </div>

          <div>
            <Button type="submit" variant="secondary" size="sm" loading={isAdding}>
              <Plus className="size-4" strokeWidth={2.5} aria-hidden />
              {labels.add}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
