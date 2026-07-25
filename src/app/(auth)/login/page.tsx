import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LoginForm } from "@/app/(auth)/login/login-form";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "Kirish",
  description: "OzodFlow hisobingizga kiring.",
  // Auth sahifalari qidiruvda chiqmasligi kerak.
  robots: { index: false, follow: false },
};

/**
 * Kirish sahifasi.
 *
 * `reason` parametri sessiya nima uchun tugaganini tushuntiradi. Bu MUHIM:
 * sababsiz kirish sahifasiga tushgan foydalanuvchi tizim buzilgan deb
 * o'ylaydi. "Xavfsizlik sababli chiqarildingiz" degan xabar esa nima
 * bo'lganini aytadi va parolni o'zgartirishga undaydi.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const t = await getTranslations("auth.login");
  const params = await searchParams;

  const reasonMessage =
    params.reason === "security" ? t("reasonSecurity")
    : params.reason === "blocked" ? t("reasonBlocked")
    : params.reason === "expired" ? t("reasonExpired")
    : null;

  const reasonVariant = params.reason === "blocked" ? "danger" : "warning";

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

      {reasonMessage && <Alert variant={reasonVariant}>{reasonMessage}</Alert>}

      <div className="surface-highlight rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
        <LoginForm next={params.next} />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href={
            params.next
              ? `/register?next=${encodeURIComponent(params.next)}`
              : "/register"
          }
          className="font-medium text-brand transition-colors hover:text-brand-hover"
        >
          {t("registerLink")}
        </Link>
      </p>
    </div>
  );
}
