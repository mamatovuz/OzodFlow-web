import { CalendarDays, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { ProjectStatusBadge } from "@/components/app/project-status-badge";
import { Avatar } from "@/components/ui/avatar";
import type { RecentProject } from "@/lib/queries/dashboard";
import { formatMoney, formatMoneyRange } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Loyiha qatori — kabinet ro'yxatlarida ishlatiladi.
 *
 * Muddat holati alohida hisoblanadi: kechikkan loyiha QIZIL, bugun
 * tugaydigan SARIQ. Bu shunchaki bezak emas — kechikish escrow va
 * reyting bilan bog'liq, foydalanuvchi uni birinchi qarashda ko'rishi kerak.
 */
export function ProjectListItem({ project }: { project: RecentProject }) {
  const t = useTranslations("dashboard.project");

  const deadline = describeDeadline(project.deadlineAt, project.status);

  return (
    <Link
      href={`/my-projects/${project.publicId}`}
      className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface-1 sm:px-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {/* Loyiha kodi mono shriftda — u identifikator, matn emas */}
            <span className="amount text-[11px] uppercase tracking-wider text-muted-foreground">
              {project.publicId}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {project.categoryName}
            </span>
          </div>

          <h3 className="mt-1 truncate font-display text-[15px] font-semibold leading-snug transition-colors group-hover:text-brand">
            {project.title}
          </h3>
        </div>

        <ProjectStatusBadge status={project.status} size="sm" />
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
        {/* Summa: kelishilgan bo'lsa aniq, aks holda byudjet oralig'i */}
        <span className="text-muted-foreground">
          {project.agreedAmount !== null ? (
            <>
              {t("agreed")}:{" "}
              <span className="amount font-medium text-foreground">
                {formatMoney(project.agreedAmount)}
              </span>
            </>
          ) : (
            <>
              {t("budget")}:{" "}
              <span className="amount font-medium text-foreground">
                {formatMoneyRange(project.budgetMin, project.budgetMax)}
              </span>
            </>
          )}
        </span>

        {/* Muddat */}
        <span
          className={cn(
            "inline-flex items-center gap-1.5",
            deadline.tone === "danger" ? "text-destructive font-medium"
            : deadline.tone === "warning" ? "text-warning-soft-foreground font-medium"
            : "text-muted-foreground"
          )}
        >
          <CalendarDays className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          {deadline.kind === "none"
            ? t("noDeadline")
            : deadline.kind === "overdue"
              ? t("overdue", { days: deadline.days })
              : t("daysLeft", { days: deadline.days })}
        </span>

        {/* Takliflar soni — faqat ochiq loyihada ma'noli */}
        {project.status === "OPEN" && (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <MessageSquare className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            {t("proposals", { count: project.proposalCount })}
          </span>
        )}

        {/* Ikkinchi tomon (developer yoki mijoz) */}
        {project.developer && (
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <Avatar
              name={project.developer.name}
              src={project.developer.avatarUrl}
              size="xs"
            />
            <span className="truncate">{project.developer.name}</span>
          </span>
        )}
      </div>
    </Link>
  );
}

type DeadlineInfo =
  | { kind: "none"; tone: "muted" }
  | { kind: "overdue" | "left"; days: number; tone: "muted" | "warning" | "danger" };

/**
 * Muddatgacha qolgan kunlarni hisoblaydi.
 *
 * Yakunlangan va bekor qilingan loyihalarda muddat rangi NEYTRAL bo'ladi:
 * tugagan ishning "3 kun kechikdi" deb qizil turishi foydasiz shovqin.
 */
function describeDeadline(deadlineAt: Date | null, status: string): DeadlineInfo {
  if (!deadlineAt) return { kind: "none", tone: "muted" };

  const isClosed = status === "COMPLETED" || status === "CANCELLED";

  // Kunlar sanoq — SANA bo'yicha, soat bo'yicha emas. Aks holda "bugun
  // 23:00 da tugaydi" holati "0 kun qoldi" emas, "1 kun qoldi" bo'lib
  // ko'rinardi.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfDeadline = new Date(deadlineAt);
  startOfDeadline.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (startOfDeadline.getTime() - startOfToday.getTime()) / 86_400_000
  );

  if (diffDays < 0) {
    return {
      kind: "overdue",
      days: Math.abs(diffDays),
      tone: isClosed ? "muted" : "danger",
    };
  }

  return {
    kind: "left",
    days: diffDays,
    tone: isClosed ? "muted" : diffDays <= 2 ? "warning" : "muted",
  };
}
