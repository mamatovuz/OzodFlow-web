import type { Metadata } from "next";

import { LegalPlaceholder } from "@/components/marketing/legal-placeholder";

export const metadata: Metadata = {
  title: "Ommaviy oferta",
  description: "OzodFlow ommaviy oferta shartnomasi.",
  alternates: { canonical: "/offer" },
  robots: { index: false, follow: true },
};

export default function OfferPage() {
  return (
    <LegalPlaceholder
      title="Ommaviy oferta"
      summary="Platforma va foydalanuvchi o'rtasidagi shartnoma shartlari."
      points={[
        "Shartnoma predmeti va tomonlar",
        "Xizmat narxi, komissiya va hisob-kitob tartibi",
        "Escrow orqali to'lovni bloklash va chiqarish shartlari",
        "Pulni qaytarish asoslari va muddatlari",
        "Tomonlarning javobgarligi va uni cheklash",
        "Shartnomani bekor qilish tartibi",
        "Nizolarni hal qilish va qo'llaniladigan qonunchilik",
      ]}
    />
  );
}
