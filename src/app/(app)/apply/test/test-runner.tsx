"use client";

import { Play, Send } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import {
  startTestAction,
  submitTestAction,
  type TestStartResult,
} from "@/app/(app)/apply/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import type { TestQuestion } from "@/lib/application";
import { QuestionKind } from "@/lib/enums";
import { cn } from "@/lib/utils";
import { IDLE, type FormState } from "@/lib/validators/form";

/** Serverda yorliqlari tayyorlangan savol. */
export type TestQuestionView = TestQuestion & {
  numberLabel: string;
  pointsLabel: string;
  kindLabel: string;
};

export type TestLabels = {
  start: string;
  timeLeft: string;
  expired: string;
  submit: string;
  submitConfirm: string;
  answerPlaceholder: string;
  codePlaceholder: string;
};

/**
 * TEXNIK TEST
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  TAYMER — KO'RSATMA, HIMOYA EMAS
 *
 *  Bu yerdagi taymer faqat foydalanuvchiga qolgan vaqtni ko'rsatadi.
 *  HAQIQIY tekshiruv serverda (`gradeTest`): u `testEndsAt` ni
 *  databasedan o'qiydi.
 *
 *  Nega shunday: klientdagi taymerni to'xtatib qo'yish bir necha
 *  bosishlik ish. Agar himoya faqat shu yerda bo'lsa, test cheklovsiz
 *  bo'lardi.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function TestRunner({
  questions,
  totalPoints,
  endsAtIso,
  labels,
}: {
  questions: TestQuestionView[];
  totalPoints: number;
  endsAtIso: string | null;
  labels: TestLabels;
}) {
  const [startState, startAction, isStarting] = useActionState<
    FormState<TestStartResult>,
    FormData
  >(startTestAction, IDLE);

  const [submitState, submitAction, isSubmitting] = useActionState<
    FormState,
    FormData
  >(submitTestAction, IDLE);

  /**
   * Muddat: serverdan kelgan qiymat yoki "boshlash" natijasi.
   *
   * Ikkisi ham `null` bo'lsa test hali boshlanmagan.
   */
  const startedAt =
    startState.status === "success" ? startState.data?.endsAtIso : undefined;

  const endsAt = startedAt ?? endsAtIso;
  const started = endsAt !== null && endsAt !== undefined;

  return (
    <div className="flex flex-col gap-6">
      {startState.status === "error" && startState.message && (
        <Alert variant="danger">{startState.message}</Alert>
      )}

      {submitState.status === "error" && submitState.message && (
        <Alert variant="danger">{submitState.message}</Alert>
      )}

      {!started ? (
        /* ── Boshlash ────────────────────────────────────────────────── */
        <form action={startAction}>
          <Button type="submit" size="lg" loading={isStarting}>
            <Play className="size-4" strokeWidth={2.5} aria-hidden />
            {labels.start}
          </Button>
        </form>
      ) : (
        <>
          <Countdown
            endsAt={endsAt}
            timeLeftLabel={labels.timeLeft}
            expiredLabel={labels.expired}
          />

          <form action={submitAction} className="flex flex-col gap-4">
            {questions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                labels={labels}
              />
            ))}

            <Card>
              <CardContent className="flex flex-col gap-3">
                <p className="text-[13px] leading-relaxed text-muted-foreground text-pretty">
                  {labels.submitConfirm}
                </p>

                <div>
                  <Button type="submit" size="lg" loading={isSubmitting}>
                    <Send className="size-4" strokeWidth={2} aria-hidden />
                    {labels.submit}
                  </Button>
                </div>

                <p className="amount text-[13px] text-muted-foreground">
                  {totalPoints}
                </p>
              </CardContent>
            </Card>
          </form>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Taymer
// ─────────────────────────────────────────────────────────────────────────────

function Countdown({
  endsAt,
  timeLeftLabel,
  expiredLabel,
}: {
  endsAt: string;
  timeLeftLabel: string;
  expiredLabel: string;
}) {
  /**
   * `null` — hali hisoblanmagan.
   *
   * Boshlang'ich qiymat SERVERDA hisoblanmasligi kerak: server va
   * klient soati farq qilsa hidratsiya nomuvofiqligi chiqadi. Shu
   * sababli birinchi render'da bo'sh, keyin `useEffect` to'ldiradi.
   */
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(endsAt).getTime();

    const tick = () => {
      setRemaining(Math.max(0, target - Date.now()));
    };

    tick();
    const id = setInterval(tick, 1000);

    return () => clearInterval(id);
  }, [endsAt]);

  if (remaining === null) {
    // Joyni band qilamiz — taymer paydo bo'lganda sahifa siljimasligi
    // kerak.
    return <div className="h-11" aria-hidden />;
  }

  const expired = remaining === 0;
  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Oxirgi 5 daqiqada rangni o'zgartiramiz — diqqatni tortish uchun.
  const urgent = minutes < 5;

  return (
    <div
      className={cn(
        "sticky top-4 z-10 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 shadow-sm",
        expired
          ? "border-destructive/40 bg-destructive-soft text-destructive"
          : urgent
            ? "border-warning/40 bg-warning-soft text-warning-soft-foreground"
            : "border-border bg-card"
      )}
      // Har soniyada e'lon qilinmasligi kerak — faqat muhim
      // o'zgarishlarda.
      role="status"
      aria-live={expired || urgent ? "polite" : "off"}
    >
      <span className="text-[13px] font-medium">
        {expired ? expiredLabel : timeLeftLabel}
      </span>

      {!expired && (
        <span className="tabular font-display text-lg font-semibold">
          {minutes}:{String(seconds).padStart(2, "0")}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Savol
// ─────────────────────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  labels,
}: {
  question: TestQuestionView;
  labels: TestLabels;
}) {
  const name = `answer:${question.id}`;
  const isCode = question.kind === QuestionKind.CODING;
  const isChoice = question.kind === QuestionKind.MULTIPLE_CHOICE;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-muted-foreground">
            {question.numberLabel}
          </span>

          <Badge variant="neutral" size="sm">
            {question.kindLabel}
          </Badge>

          {question.language && (
            <Badge variant="neutral" size="sm">
              {question.language}
            </Badge>
          )}

          <span className="ml-auto text-[13px] text-muted-foreground">
            {question.pointsLabel}
          </span>
        </div>

        {/* Savol matni: `whitespace-pre-line` — kod savollarida qatorlar
            saqlanishi kerak. */}
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-pretty">
          {question.prompt}
        </p>

        {isChoice ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">{question.numberLabel}</legend>

            {question.options.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-surface-1 has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
              >
                <input
                  type="radio"
                  name={name}
                  value={option.id}
                  className="mt-0.5 size-4 shrink-0 accent-brand"
                />
                <span className="text-[15px] leading-snug">{option.text}</span>
              </label>
            ))}
          </fieldset>
        ) : (
          <Textarea
            name={name}
            rows={isCode ? 10 : 4}
            maxLength={20_000}
            placeholder={
              isCode ? labels.codePlaceholder : labels.answerPlaceholder
            }
            // Kod uchun monoshirift va avtomatik tuzatishlar o'chirilgan.
            className={cn(
              isCode && "font-mono text-[13px]",
              isCode && "whitespace-pre"
            )}
            spellCheck={!isCode}
            autoCapitalize={isCode ? "off" : undefined}
            autoCorrect={isCode ? "off" : undefined}
          />
        )}
      </CardContent>
    </Card>
  );
}
