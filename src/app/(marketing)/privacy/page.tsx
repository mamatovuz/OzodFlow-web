import type { Metadata } from "next";

import { LegalPlaceholder } from "@/components/marketing/legal-placeholder";

export const metadata: Metadata = {
  title: "Maxfiylik siyosati",
  description: "OzodFlow shaxsiy ma'lumotlarni qanday to'playdi va saqlaydi.",
  alternates: { canonical: "/privacy" },
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPlaceholder
      title="Maxfiylik siyosati"
      summary="Qanday ma'lumot to'planadi, u nima uchun ishlatiladi va qanday himoyalanadi."
      points={[
        "To'planadigan ma'lumotlar ro'yxati va ularning maqsadi",
        "Shaxsni tasdiqlash hujjatlarini saqlash va o'chirish muddati",
        "Ma'lumotlarni uchinchi tomonlarga uzatish holatlari",
        "Cookie va kirish tarixidan foydalanish",
        "Foydalanuvchining o'z ma'lumotini ko'rish, tuzatish va o'chirish huquqi",
        "Ma'lumot xavfsizligi choralari va buzilish holatida xabar berish tartibi",
      ]}
    />
  );
}
