import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { RegisterForm } from "@/app/(auth)/register/register-form";
import { Alert } from "@/components/ui/alert";
import { UserRole } from "@/lib/enums";
import { isRegistrationOpen } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Ro'yxatdan o'tish",
  description: "OzodFlow'da hisob yarating.",
  robots: { index: false, follow: false },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; ref?: string; role?: string }>;
}) {
  const t = await getTranslations("auth.register");
  const params = await searchParams;

  const registrationOpen = await isRegistrationOpen();

  /**
   * `?role=developer` — "Mutaxassis bo'lish" tugmasidan kelgan foydalanuvchi
   * uchun rol oldindan tanlangan bo'ladi. Qiymat tekshiriladi: URL'dan
   * kelgan matnga ishonib bo'lmaydi.
   */
  const defaultRole =
    params.role?.toUpperCase() === UserRole.DEVELOPER
      ? UserRole.DEVELOPER
      : UserRole.CUSTOMER;

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

      {!registrationOpen ? (
        <Alert variant="warning" title="Ro'yxatdan o'tish yopilgan">
          Yangi hisob yaratish vaqtincha to&apos;xtatilgan. Keyinroq qayta
          urinib ko&apos;ring yoki yordam xizmatiga murojaat qiling.
        </Alert>
      ) : (
        <div className="surface-highlight rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
          <RegisterForm
            next={params.next}
            referralCode={params.ref}
            defaultRole={defaultRole}
          />
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link
          href={params.next ? `/login?next=${encodeURIComponent(params.next)}` : "/login"}
          className="font-medium text-brand transition-colors hover:text-brand-hover"
        >
          {t("loginLink")}
        </Link>
      </p>
    </div>
  );
}
