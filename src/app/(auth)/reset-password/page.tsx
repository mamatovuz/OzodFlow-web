import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ResetPasswordForm } from "@/app/(auth)/reset-password/reset-form";
import { Button } from "@/components/ui/button";
import { TOKEN_PURPOSE, inspectToken } from "@/lib/auth/verification";

export const metadata: Metadata = {
  title: "Yangi parol o'rnatish",
  robots: { index: false, follow: false },
};

/**
 * Parolni tiklash sahifasi.
 *
 * Token SAHIFA OCHILGANDA tekshiriladi, lekin ISHLATILMAYDI
 * (`inspectToken`, `consumeToken` emas). Sababi: agar shu yerda
 * ishlatib yuborsak, foydalanuvchi formani to'ldirib bo'lgach token
 * yaroqsiz bo'lib qolardi. Ishlatish faqat forma yuborilganda bo'ladi.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getTranslations("auth.reset");
  const params = await searchParams;
  const token = params.token?.trim();

  const check = token
    ? await inspectToken(token, TOKEN_PURPOSE.RESET_PASSWORD)
    : ({ ok: false, reason: "not_found" } as const);

  if (!check.ok) {
    const reasonMessage =
      check.reason === "expired" ? t("invalidExpired")
      : check.reason === "used" ? t("invalidUsed")
      : t("invalidNotFound");

    return (
      <div className="surface-highlight flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <span className="grid size-12 place-items-center rounded-xl bg-warning-soft text-warning-soft-foreground">
          <TriangleAlert className="size-6" strokeWidth={1.75} aria-hidden />
        </span>

        <div>
          <h1 className="font-display text-xl font-bold">{t("invalidTitle")}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            {reasonMessage}
          </p>
        </div>

        <Button asChild variant="brand" block>
          <Link href="/forgot-password">{t("requestNew")}</Link>
        </Button>
      </div>
    );
  }

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
        {/* `token!` emas: `check.ok` true bo'lsa token albatta bor,
            lekin TypeScript buni bilmaydi — shuning uchun aniq tekshiruv. */}
        <ResetPasswordForm token={token ?? ""} />
      </div>
    </div>
  );
}
