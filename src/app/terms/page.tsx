import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Foydalanish shartlari",
  description: "OzodFlow platformasidan foydalanish shartlari va qoidalari.",
};

const UPDATED = "6-avgust, 2026";

export default function TermsPage() {
  return (
    <LegalShell title="Foydalanish shartlari" updated={UPDATED}>
      <p className="text-[15px] leading-relaxed text-muted">
        OzodFlow platformasidan foydalanish orqali siz quyidagi shartlarga rozilik bildirasiz. Iltimos,
        ulardan foydalanishdan oldin diqqat bilan o'qib chiqing.
      </p>

      <LegalSection title="1. Xizmat tavsifi">
        <p>
          OzodFlow — restoran, kafe va fast food'lar uchun elektron menyu, QR kod, buyurtma
          boshqaruvi, statistika va Instagram marketing avtomatlashtirish xizmatlarini taqdim etuvchi
          SaaS platformasi.
        </p>
      </LegalSection>

      <LegalSection title="2. Hisob va javobgarlik">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Hisob ma'lumotlaringiz maxfiyligini saqlash sizning zimmangizda.</li>
          <li>Platformadan qonuniy maqsadlarda foydalanishingiz shart.</li>
          <li>Boshqa shaxslarning huquqlarini buzadigan kontent joylashtirmaslik.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Instagram Automation'dan foydalanish">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Instagram integratsiyasidan foydalanishda Meta Platform Terms va Instagram Community
            Guidelines qoidalariga rioya qilishingiz shart.
          </li>
          <li>
            Avtomatik javoblar spam yoki noqonuniy maqsadlarda ishlatilmasligi kerak. Aks holda
            hisobingiz cheklanishi mumkin.
          </li>
          <li>
            Instagram API cheklovlari (masalan, 24 soatlik xabar oynasi) OzodFlow tomonidan hurmat
            qilinadi.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. To'lovlar">
        <p>
          Pullik tariflar oldindan to'lov asosida taqdim etiladi. To'lov shartlari va narxlar
          platformada e'lon qilinadi. To'lov muddati o'tsa, xizmat vaqtincha cheklanishi mumkin.
        </p>
      </LegalSection>

      <LegalSection title="5. Javobgarlik cheklovi">
        <p>
          OzodFlow xizmatlari «boricha» taqdim etiladi. Uchinchi tomon xizmatlari (Meta/Instagram,
          xosting va h.k.) uzilishi natijasida yuzaga keladigan zararlar uchun biz javobgar emasmiz.
        </p>
      </LegalSection>

      <LegalSection title="6. Shartlarga o'zgartirishlar">
        <p>
          Biz ushbu shartlarni yangilashimiz mumkin. O'zgartirishlar ushbu sahifada e'lon qilinadi.
          Batafsil ma'lumot uchun{" "}
          <a href="/privacy" className="text-accent hover:underline">
            Maxfiylik siyosati
          </a>
          ni o'qing.
        </p>
      </LegalSection>

      <LegalSection title="7. Bog'lanish">
        <p>
          Savollar uchun:{" "}
          <a href="mailto:info@ozodflow.uz" className="text-accent hover:underline">
            info@ozodflow.uz
          </a>
        </p>
      </LegalSection>
    </LegalShell>
  );
}
