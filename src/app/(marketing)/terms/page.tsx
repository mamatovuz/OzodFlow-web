import type { Metadata } from "next";

import { LegalPlaceholder } from "@/components/marketing/legal-placeholder";

export const metadata: Metadata = {
  title: "Foydalanish shartlari",
  description: "OzodFlow platformasidan foydalanish shartlari.",
  alternates: { canonical: "/terms" },
  // Hujjat tayyor bo'lgunicha indekslanmasin — tugallanmagan huquqiy
  // sahifa qidiruvda chiqishi noto'g'ri taassurot qoldiradi.
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPlaceholder
      title="Foydalanish shartlari"
      summary="Platformadan foydalanish qoidalari, tomonlarning huquq va majburiyatlari."
      points={[
        "Hisob yaratish va undan foydalanish qoidalari",
        "Mijoz va mutaxassisning huquq va majburiyatlari",
        "Loyiha joylashtirish va qabul qilish tartibi",
        "Escrow orqali to'lov, komissiya va qaytarish shartlari",
        "Nizolarni ko'rib chiqish tartibi",
        "Taqiqlangan xatti-harakatlar va hisobni bloklash asoslari",
        "Intellektual mulk va bajarilgan ishga egalik masalalari",
      ]}
    />
  );
}
