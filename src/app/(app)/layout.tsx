import { AppShell } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth/current-user";
import { getNavBadges } from "@/lib/queries/nav-badges";

/**
 * Kabinet qobig'i — mijoz va developer sahifalari uchun.
 *
 * Bu yerda `requireUser()` chaqiriladi, ya'ni HAR BIR ichki sahifa
 * himoyalangan. Middleware ham tekshiradi, lekin bu takrorlash EMAS:
 *
 *   • middleware faqat tokenning imzosini ko'radi (Edge'da DB yo'q)
 *   • bu yer hisob holatini va rolni databasedan qayta o'qiydi
 *
 * Ikkinchisi ustun: admin roli tortib olingan yoki hisob bloklangan bo'lsa,
 * eski token bilan kirib qolish imkoniyati yo'q.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const badges = await getNavBadges(user);

  return (
    <AppShell
      // Faqat kerakli maydonlar uzatiladi. Butun `user` obyektini berish
      // ortiqcha ma'lumotni (email tasdiqlash sanasi, 2FA holati) klient
      // bundle'iga chiqarardi.
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        username: user.username,
        role: user.role,
      }}
      badges={badges}
    >
      {children}
    </AppShell>
  );
}
