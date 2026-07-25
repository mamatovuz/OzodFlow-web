import { useTranslations } from "next-intl";

import { Badge, StatusDot, type BadgeProps } from "@/components/ui/badge";
import { ProjectStatus } from "@/lib/enums";

/**
 * Loyiha holati nishoni.
 *
 * Rang MA'NOGA qarab tanlangan, tasodifiy emas:
 *
 *   • kulrang  — hali harakat talab qilmaydi (qoralama, tekshiruvda)
 *   • ko'k     — jarayonda, hammasi normal
 *   • sariq    — E'TIBOR kerak (topshirildi — tekshirish kerak, tuzatishda)
 *   • yashil   — muvaffaqiyatli yakunlandi
 *   • qizil    — muammo (bekor qilindi, nizo)
 *
 * "Topshirildi" ataylab SARIQ, yashil emas: bu holat mijozdan harakat
 * talab qiladi (ishni tekshirish), ya'ni hali tugagan emas. Yashil qilsak
 * mijoz "bo'ldi" deb o'ylab, tasdiqlashni kechiktiradi.
 */
const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  [ProjectStatus.DRAFT]: "neutral",
  [ProjectStatus.PENDING_REVIEW]: "neutral",
  [ProjectStatus.OPEN]: "info",
  [ProjectStatus.IN_PROGRESS]: "brand",
  [ProjectStatus.DELIVERED]: "warning",
  [ProjectStatus.IN_REVISION]: "warning",
  [ProjectStatus.COMPLETED]: "success",
  [ProjectStatus.CANCELLED]: "neutral",
  [ProjectStatus.DISPUTED]: "danger",
};

/** Jonli nuqta — ish hozir ketayotgan holatlarda. */
const LIVE_STATUSES = new Set<string>([
  ProjectStatus.IN_PROGRESS,
  ProjectStatus.DELIVERED,
  ProjectStatus.IN_REVISION,
]);

const DOT_COLOR: Record<string, string> = {
  [ProjectStatus.IN_PROGRESS]: "bg-brand",
  [ProjectStatus.DELIVERED]: "bg-warning",
  [ProjectStatus.IN_REVISION]: "bg-warning",
};

export function ProjectStatusBadge({
  status,
  size = "md",
}: {
  status: string;
  size?: BadgeProps["size"];
}) {
  const t = useTranslations("projectStatus");

  const variant = STATUS_VARIANT[status] ?? "neutral";
  const isLive = LIVE_STATUSES.has(status);

  // Tarjima topilmasa xom qiymatni ko'rsatamiz — databaseda eski yoki
  // tarjima qilinmagan holat qolib ketsa sahifa yiqilmasligi kerak.
  // `t.has()` — next-intl'ning shu maqsad uchun berilgan API'si.
  const label = t.has(status) ? t(status) : status;

  return (
    <Badge variant={variant} size={size} className={isLive ? "gap-1.5" : undefined}>
      {isLive && <StatusDot className={DOT_COLOR[status] ?? "bg-brand"} animate />}
      {label}
    </Badge>
  );
}
