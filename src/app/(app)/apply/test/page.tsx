import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { TestRunner } from "@/app/(app)/apply/test/test-runner";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyApplication, getTestQuestions } from "@/lib/application";
import { requireUser } from "@/lib/auth/current-user";
import { UserRole } from "@/lib/enums";

export const metadata: Metadata = {
  title: "Texnik test",
  robots: { index: false, follow: false },
};

export default async function ApplyTestPage() {
  const user = await requireUser("/apply/test");

  if (user.role !== UserRole.DEVELOPER) {
    redirect("/dashboard");
  }

  const t = await getTranslations("apply");
  const application = await getMyApplication(user.id);

  if (!application) {
    redirect("/apply");
  }

  /**
   * Test ochiq emasmi — holat sahifasiga qaytaramiz.
   *
   * Bu SERVERDA tekshiriladi: manzilni qo'lda yozib testga kirib
   * bo'lmasligi kerak.
   */
  if (!application.testOpen) {
    redirect("/apply/status");
  }

  const questions = await getTestQuestions();

  // Savol yo'q — bu sozlama muammosi, foydalanuvchi aybdor emas.
  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <Alert variant="warning">{t("testNoQuestions")}</Alert>
      </div>
    );
  }

  const totalPoints = questions.reduce(
    (sum, question) => sum + question.points,
    0
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {t("testTitle")}
        </h1>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground text-pretty">
          {t("testIntro")}
        </p>
      </header>

      {/* ── Qoidalar ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("testRulesTitle")}</CardTitle>
        </CardHeader>

        <CardContent>
          <ul className="flex flex-col gap-2">
            {[t("testRule1"), t("testRule2"), t("testRule3")].map((rule) => (
              <li
                key={rule}
                className="flex gap-2 text-[15px] leading-relaxed text-muted-foreground text-pretty"
              >
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-border"
                  aria-hidden
                />
                {rule}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <TestRunner
        /**
         * Matnlar SERVERDA tayyorlanadi.
         *
         * Funksiya (`(n) => t(...)`) klient komponentga UZATILMAYDI —
         * faqat server action'lar serializatsiya qilinadi. Shu sababli
         * har savolning yorliqlari oldindan yasaladi.
         */
        questions={questions.map((question, index) => ({
          ...question,
          numberLabel: t("testQuestion", { number: index + 1 }),
          pointsLabel: t("testPoints", { points: question.points }),
          kindLabel: t(`kind${question.kind}` as "kindCODING"),
        }))}
        totalPoints={totalPoints}
        // Taymer allaqachon boshlangan bo'lsa muddat uzatiladi —
        // sahifani yangilash vaqtni qaytarmaydi.
        endsAtIso={application.testEndsAt?.toISOString() ?? null}
        labels={{
          start: t("testStart"),
          timeLeft: t("testTimeLeft"),
          expired: t("testExpired"),
          submit: t("testSubmit"),
          submitConfirm: t("testSubmitConfirm"),
          answerPlaceholder: t("testAnswerPlaceholder"),
          codePlaceholder: t("testCodePlaceholder"),
        }}
      />
    </div>
  );
}
