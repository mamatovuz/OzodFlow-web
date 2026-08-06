import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Maxfiylik siyosati",
  description:
    "OzodFlow maxfiylik siyosati — foydalanuvchi ma'lumotlari, Instagram integratsiyasi va ma'lumotlarni himoya qilish qoidalari.",
};

const UPDATED = "6-avgust, 2026";

export default function PrivacyPage() {
  return (
    <LegalShell title="Maxfiylik siyosati" updated={UPDATED}>
      <p className="text-[15px] leading-relaxed text-muted">
        Ushbu Maxfiylik siyosati OzodFlow platformasi (keyingi o'rinlarda «OzodFlow», «biz»)
        foydalanuvchilarning shaxsiy ma'lumotlarini qanday to'plashi, ishlatishi, saqlashi va himoya
        qilishini tushuntiradi. Platformadan foydalanish orqali siz ushbu siyosatga rozilik
        bildirasiz.
      </p>

      <LegalSection title="1. Biz to'playdigan ma'lumotlar">
        <p>OzodFlow quyidagi ma'lumotlarni to'playdi:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>Hisob ma'lumotlari:</b> ism, elektron pochta, telefon raqami va parol (shifrlangan
            holda).
          </li>
          <li>
            <b>Restoran ma'lumotlari:</b> restoran nomi, manzili, menyu, rasmlar va sozlamalar.
          </li>
          <li>
            <b>Foydalanish ma'lumotlari:</b> menyu skanerlar soni, buyurtmalar va statistik
            ko'rsatkichlar.
          </li>
          <li>
            <b>Instagram ma'lumotlari (agar Instagram integratsiyasini yoqsangiz):</b> Instagram
            Business/Creator akkaunt nomi (username), profil rasmi, obunachilar soni, postlar,
            hamda foydalanuvchilar tomonidan yozilgan comment va Direct (DM) xabarlari — faqat
            avtomatik javob berish uchun.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Ma'lumotlardan foydalanish maqsadi">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Platforma xizmatlarini taqdim etish va hisob boshqaruvi uchun.</li>
          <li>Elektron menyu, QR kod va statistikani ishlatish uchun.</li>
          <li>
            Instagram Automation moduli orqali comment va DM'larga avtomatik javob berish, keyword
            asosida marketing avtomatlashtirishni amalga oshirish uchun.
          </li>
          <li>Xizmat sifatini yaxshilash, xavfsizlikni ta'minlash va qo'llab-quvvatlash uchun.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Instagram / Meta integratsiyasi">
        <p>
          OzodFlow Instagram Graph API (Meta Platforms, Inc.) dan foydalanadi. Instagram
          akkauntingizni ulaganingizda:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Biz sizdan olingan ruxsatlar doirasida (<code>instagram_business_basic</code>,{" "}
            <code>instagram_business_manage_comments</code>,{" "}
            <code>instagram_business_manage_messages</code>) faqat kerakli ma'lumotlarga kiramiz.
          </li>
          <li>
            Kirish tokenlari (access token) serverimizda <b>AES-256 shifrlash</b> bilan saqlanadi va
            hech qachon ochiq ko'rinishda saqlanmaydi yoki uchinchi shaxslarga berilmaydi.
          </li>
          <li>
            Biz Instagram ma'lumotlaringizni sotmaymiz, ijaraga bermaymiz va reklama maqsadida
            uchinchi tomonlarga uzatmaymiz.
          </li>
          <li>
            Instagram'dan olingan ma'lumotlardan foydalanish Meta Platform Terms va Developer
            Policies talablariga muvofiq amalga oshiriladi.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Ma'lumotlarni saqlash va himoya qilish">
        <p>
          Ma'lumotlaringiz xavfsiz serverlarda saqlanadi. Parollar bir tomonlama xesh (bcrypt),
          maxfiy kalitlar va tokenlar AES-256-GCM bilan shifrlanadi. Ma'lumotlar uzatilishi
          HTTPS orqali himoyalangan. Instagram webhook so'rovlari raqamli imzo (HMAC-SHA256) bilan
          tekshiriladi.
        </p>
      </LegalSection>

      <LegalSection title="5. Ma'lumotlarni saqlash muddati">
        <p>
          Ma'lumotlaringiz hisobingiz faol bo'lgan davrda saqlanadi. Hisobni yoki Instagram
          ulanishini o'chirsangiz, tegishli ma'lumotlar (jumladan kirish tokenlari) o'chiriladi.
          Ma'lumotlarni butunlay o'chirish uchun{" "}
          <a href="/data-deletion" className="text-accent hover:underline">
            Ma'lumotlarni o'chirish
          </a>{" "}
          sahifasiga qarang.
        </p>
      </LegalSection>

      <LegalSection title="6. Foydalanuvchi huquqlari">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>O'z ma'lumotlaringizga kirish, ularni tahrirlash yoki o'chirishni so'rash.</li>
          <li>Istalgan vaqtda Instagram integratsiyasini uzish (Sozlamalar → Uzish).</li>
          <li>Hisobingizni butunlay o'chirishni so'rash.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Uchinchi tomon xizmatlari">
        <p>
          OzodFlow ishlashi uchun ba'zi uchinchi tomon xizmatlaridan foydalanishi mumkin (masalan,
          Meta/Instagram API, xosting provayderi). Bu xizmatlar o'z maxfiylik siyosatlariga ega.
        </p>
      </LegalSection>

      <LegalSection title="8. Siyosatga o'zgartirishlar">
        <p>
          Biz ushbu siyosatni vaqti-vaqti bilan yangilashimiz mumkin. O'zgartirishlar ushbu
          sahifada e'lon qilinadi va «Oxirgi yangilangan» sanasi yangilanadi.
        </p>
      </LegalSection>

      <LegalSection title="9. Biz bilan bog'lanish">
        <p>
          Maxfiylik bo'yicha savollar uchun biz bilan bog'laning:
        </p>
        <ul className="list-none space-y-1.5">
          <li>
            Email:{" "}
            <a href="mailto:info@ozodflow.uz" className="text-accent hover:underline">
              info@ozodflow.uz
            </a>
          </li>
          <li>Veb-sayt: ozodflow.uz</li>
        </ul>
      </LegalSection>
    </LegalShell>
  );
}
