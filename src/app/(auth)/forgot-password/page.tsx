import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ForgotPasswordForm } from "@/app/(auth)/forgot-password/forgot-form";
import { PASSWORD_RESET_TTL_MINUTES } from "@/lib/auth/verification";
import { features } from "@/lib/env";

export const metadata: Metadata = {
  title: "Parolni tiklash",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth.forgot");

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] sm:text-[28px]">
          {t("title")}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground text-pretty">
          {t("subtitle")}
        </p>
      </div>

      <div className="surface-highlight rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
        <ForgotPasswordForm
          ttlMinutes={PASSWORD_RESET_TTL_MINUTES}
          emailConfigured={features.email}
        />
      </div>
    </div>
  );
}
