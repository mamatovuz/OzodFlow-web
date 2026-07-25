"use client";

import { LayoutDashboard, LogOut, Settings, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { logoutAction } from "@/app/(auth)/actions";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserRole, isAdminRole } from "@/lib/enums";

export type UserMenuUser = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  username: string | null;
  role: string;
};

/**
 * Foydalanuvchi menyusi.
 *
 * "Chiqish" oddiy `<button>` emas, FORMA ichida: server action'ni forma
 * orqali chaqirish JavaScript yuklanmagan holatda ham ishlaydi. Bundan
 * tashqari `POST` so'rovi bo'ladi — chiqish `GET` bilan bajarilmasligi
 * kerak, aks holda boshqa saytdagi `<img src="/logout">` foydalanuvchini
 * tizimdan chiqarib yuborishi mumkin edi (CSRF).
 */
export function UserMenu({ user }: { user: UserMenuUser }) {
  const t = useTranslations("app");

  const roleLabel =
    user.role === UserRole.SUPER_ADMIN ? t("roleSuperAdmin")
    : user.role === UserRole.ADMIN ? t("roleAdmin")
    : user.role === UserRole.DEVELOPER ? t("roleDeveloper")
    : t("roleCustomer");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("userMenu")}
        className="inline-flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <Avatar name={user.name} src={user.avatarUrl} size="sm" />
        {/* Ism faqat kengroq ekranda — mobilda avatar yetarli */}
        <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:block">
          {user.name}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {/* Sarlavha: kim ekanligi va roli */}
        <div className="flex items-center gap-3 px-2.5 py-2">
          <Avatar name={user.name} src={user.avatarUrl} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            {user.email && (
              <p className="truncate text-[13px] text-muted-foreground">{user.email}</p>
            )}
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-brand">
              {roleLabel}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard aria-hidden />
            <span>{t("dashboard")}</span>
          </Link>
        </DropdownMenuItem>

        {/* Ommaviy profil — faqat username bor developerlarda */}
        {user.username && (
          <DropdownMenuItem asChild>
            <Link href={`/dev/${user.username}`}>
              <User aria-hidden />
              <span>{t("myProfile")}</span>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings aria-hidden />
            <span>{t("accountSettings")}</span>
          </Link>
        </DropdownMenuItem>

        {isAdminRole(user.role) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <ShieldCheck aria-hidden />
                <span>{t("adminPanel")}</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        {/*
          `asChild` bilan forma: Radix menyu elementi bosilganda forma
          yuboriladi. Bu klaviatura (Enter/Space) bilan ham ishlaydi.
        */}
        <DropdownMenuItem variant="danger" asChild>
          <form action={logoutAction}>
            <button type="submit" className="flex w-full items-center gap-2.5 text-left">
              <LogOut aria-hidden />
              <span>{t("logout")}</span>
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
