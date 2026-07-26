import { Bell, ShieldCheck, User } from "lucide-react";
import type { Metadata } from "next";

import { SettingsNav, type SettingsTab } from "@/app/(app)/settings/settings-nav";

export const metadata: Metadata = {
  title: "Sozlamalar",
  robots: { index: false, follow: false },
};

/**
 * SOZLAMALAR QOBIG'I
 *
 * Bo'limlar ALOHIDA MARSHRUT (tab emas): shunda har bo'limga to'g'ridan
 * havola berish mumkin ("xavfsizlik sozlamalariga o'ting" degan
 * xabarnoma ishlaydi), brauzer orqaga tugmasi kutilgandek ishlaydi va
 * har bo'lim faqat o'ziga kerakli ma'lumotni o'qiydi.
 */
const TABS: SettingsTab[] = [
  { href: "/settings/profile", label: "Profil", icon: User },
  { href: "/settings/security", label: "Xavfsizlik", icon: ShieldCheck },
  { href: "/settings/notifications", label: "Xabarnomalar", icon: Bell },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          Sozlamalar
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Hisobingiz, xavfsizlik va xabarnomalar.
        </p>
      </header>

      <SettingsNav tabs={TABS} />

      {children}
    </div>
  );
}
