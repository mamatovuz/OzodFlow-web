import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Ma'lumotlarni o'chirish",
  description:
    "OzodFlow — foydalanuvchi ma'lumotlarini va Instagram ma'lumotlarini o'chirish bo'yicha ko'rsatmalar.",
};

const UPDATED = "6-avgust, 2026";

export default function DataDeletionPage() {
  return (
    <LegalShell title="Ma'lumotlarni o'chirish" updated={UPDATED}>
      <p className="text-[15px] leading-relaxed text-muted">
        OzodFlow foydalanuvchilari o'z shaxsiy ma'lumotlarini va Instagram integratsiyasi orqali
        saqlangan ma'lumotlarni istalgan vaqtda o'chirish huquqiga ega. Quyida buni qanday amalga
        oshirish tushuntirilgan.
      </p>

      <LegalSection title="1. Instagram ulanishini o'chirish">
        <p>
          Instagram akkauntingiz bilan bog'liq ma'lumotlarni (kirish tokeni, profil ma'lumotlari,
          comment va DM tarixi) o'chirish uchun:
        </p>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Hisobingizga kiring va «Instagram» bo'limiga o'ting.</li>
          <li>«Sozlamalar» yorlig'ini oching.</li>
          <li>
            «Uzish» tugmasini bosing — bu Instagram kirish tokeni va bog'liq ma'lumotlarni darhol
            o'chiradi.
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="2. Butun hisobni o'chirish">
        <p>
          Hisobingizni va u bilan bog'liq barcha ma'lumotlarni (restoran, menyu, statistika,
          Instagram ma'lumotlari) butunlay o'chirishni xohlasangiz, bizga so'rov yuboring. So'rov
          qabul qilinganidan so'ng ma'lumotlaringiz <b>30 kun ichida</b> butunlay o'chiriladi.
        </p>
      </LegalSection>

      <LegalSection title="3. O'chirish so'rovini yuborish">
        <p>Ma'lumotlarni o'chirish uchun quyidagi manzilga murojaat qiling:</p>
        <ul className="list-none space-y-1.5">
          <li>
            Email:{" "}
            <a href="mailto:info@ozodflow.uz" className="text-accent hover:underline">
              info@ozodflow.uz
            </a>
          </li>
        </ul>
        <p>
          Xabar mavzusiga «Ma'lumotlarni o'chirish» deb yozing va hisobingizga bog'langan email yoki
          telefon raqamini ko'rsating. So'rovni tasdiqlaganimizdan so'ng ma'lumotlar o'chiriladi va
          sizga tasdiq yuboriladi.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
