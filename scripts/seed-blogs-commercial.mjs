// Commercial-intent (Google qidiruvidan mijoz keltiradigan) SEO maqolalar.
// Idempotent: mavjud slug o'tkazib yuboriladi. Ishga tushirish: node scripts/seed-blogs-commercial.mjs
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const posts = [
  {
    slug: "restoran-uchun-qr-menyu-narxi",
    title: "Restoran uchun QR menyu narxi — 2026 yil to'liq qo'llanma",
    version: "v1.0",
    description:
      "QR menyu qancha turadi? Narxga nima ta'sir qiladi, bepul va pullik variantlar farqi hamda O'zbekistondagi real narxlarni tushuntiramiz.",
    coverImage:
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=70",
    body: `"QR menyu qancha turadi?" — restoran egalari eng ko'p beradigan savol. Qisqa javob: bepuldan boshlanadi va imkoniyatlaringizga qarab oshadi. Batafsil ko'rib chiqamiz.

Narxga nima ta'sir qiladi?

QR menyu narxi uch narsaga bog'liq: menyu funksiyalari (faqat ko'rish yoki buyurtma ham), filiallar soni va qo'shimcha imkoniyatlar (Telegram bot, oshxona ekrani, statistika, o'z domeni). Oddiy "raqamli qog'oz" arzon, to'liq buyurtma platformasi esa biroz qimmatroq — lekin u har oyda pul ishlab beradi.

Bepul variant nimaga yetadi?

Ko'p platformalar (jumladan OzodFlow) bepul tarif beradi: menyu, QR kod, asosiy dizayn va cheklangan mahsulot soni. Kichik kafe yoki coffee shop uchun boshlash uchun yetarli. Karta ham talab qilinmaydi.

Pullik tarif nima qo'shadi?

Pullik tarifda mahsulotlar cheksiz bo'ladi, premium dizayn shablonlari, online buyurtma, Telegram bot, batafsil statistika va filiallar ochiladi. O'rtacha restoran uchun bu — bir kunlik daromaddan kam oylik to'lov, lekin evaziga qog'oz menyu chop etish xarajati butunlay yo'qoladi.

Yashirin xarajatlar bormi?

Yaxshi platformada yo'q. Yangilash bepul, texnik xizmat platformada. Faqat o'z domeningizni ulash yoki professional taom rasmlari uchun qo'shimcha sarmoya kiritishingiz mumkin — lekin bular ixtiyoriy.

Xulosa

QR menyu — restoran uchun eng arzon raqamlashtirish qadami. Bepul boshlab, biznesingiz o'sishi bilan kengaytirasiz. OzodFlow'da tariflarni ochiq ko'rasiz va karta talab qilinmasdan bir daqiqada boshlaysiz.`,
  },
  {
    slug: "ozbekistonda-elektron-menyu",
    title: "O'zbekistonda elektron menyuga qanday o'tish kerak",
    version: "v1.0",
    description:
      "So'm, o'zbek tili va mahalliy to'lov — O'zbekiston restoranlari uchun elektron menyuga o'tishning amaliy, bosqichma-bosqich yo'l xaritasi.",
    coverImage:
      "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=70",
    body: `Elektron menyu endi faqat yirik shaharlarning modaviy restoranlarida emas — Toshkentdan Namangongacha oddiy kafelar ham unga o'tmoqda. Chunki u arzon, tez va mijozga qulay. Mana amaliy yo'l xaritasi.

1-qadam: Menyuni yig'ib oling

Taomlar, narxlar va (imkoni bo'lsa) rasmlarni tayyorlang. Rasmni professional fotograf shart emas — yaxshi yorug'likdagi telefon kamerasi ham yetarli. Har bir taom bitta aniq rasm bilan yaxshi ko'rinadi.

2-qadam: Platformani tanlang

O'zbekistonga moslashgan platforma tanlang: so'mda narx, o'zbek/rus/ingliz tillari va mahalliy to'lov usullari bo'lishi kerak. OzodFlow aynan shu bozor uchun qurilgan — hech qanday xorijiy karta yoki murakkab sozlash talab qilinmaydi.

3-qadam: Menyuni kiriting

Kategoriyalar (sho'rva, asosiy taom, ichimlik), mahsulotlar va narxlarni kiriting. Bu jarayon odatda bir soatdan oshmaydi. Telefondan ham qilsa bo'ladi.

4-qadam: Dizaynni brendingizga moslang

Logo, rang va shablonni tanlang. Menyu restoraningizning o'z sayti kabi ko'rinishi kerak, umumiy shablon emas.

5-qadam: QR kodni chop etib, stolga qo'ying

Har bir stol uchun alohida QR kod chop etasiz. Mijoz skaner qiladi — menyu ochiladi va buyurtma qaysi stoldan kelayotgani avtomatik aniqlanadi.

Xulosa

Elektron menyuga o'tish bir kunlik ish. Qiyin qismi — qaror qabul qilish. OzodFlow bilan bepul boshlab, restoraningizni bugunoq raqamli menyuga o'tkazasiz.`,
  },
  {
    slug: "restoran-menyusini-telefondan-boshqarish",
    title: "Restoran menyusini telefondan boshqarish: to'liq qo'llanma",
    version: "v1.0",
    description:
      "Kompyuter shart emas. Narx, taom va aksiyalarni to'g'ridan-to'g'ri telefondan qanday boshqarishni va bu qanday vaqt tejashini ko'rsatamiz.",
    coverImage:
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=70",
    body: `Restoran egasi doim harakatda. Ofisda o'tirib kompyuterda menyu tahrirlashga vaqt yo'q. Yaxshi yangilik: zamonaviy elektron menyuni to'liq telefondan boshqarasiz.

Narxni bir daqiqada yangilash

Go'sht narxi oshdimi? Telefonni oching, taomni toping, yangi narxni yozing — tayyor. Barcha mijozlar darhol yangi narxni ko'radi. Qaytadan menyu chop etish yo'q, bosmaxonaga borish yo'q.

Taom mavjudligini boshqarish

Osh tugadimi? Bir tugma bilan "Mavjud emas" qilib qo'yasiz. Mijoz yo'q taomni buyurtma qilib, keyin xafa bo'lmaydi. Kechqurun yana yoqib qo'yasiz.

Yangi taom qo'shish

Yangi taklif tayyormi? Telefonda rasm oling, nom va narx yozing, kategoriyaga qo'shing. Bir necha daqiqada menyuda paydo bo'ladi.

Aksiya va bannerlar

"Bugun lag'monga 15% chegirma" — bannerni telefondan yoqasiz, kechqurun o'chirasiz. Vaqtli aksiyalar mijozni "hozir buyuraman" deydi.

Buyurtmalarni kuzatish

Online buyurtmalar to'g'ridan-to'g'ri telefoningizga keladi. Qayerda bo'lsangiz ham, restoran nima bilan bandligini ko'rasiz.

Xulosa

Telefondan boshqarish — bu erkinlik. OzodFlow to'liq mobil uchun qurilgan: menyu, narx, buyurtma va statistika — hammasi cho'ntagingizda. Kompyuter umuman shart emas.`,
  },
  {
    slug: "qr-menyu-restoran-uchun-foydalimi",
    title: "QR menyu restoran uchun foydalimi? 7 ta aniq dalil",
    version: "v1.0",
    description:
      "Shubhangiz bormi? QR menyu restoran daromadi, xarajati va mijoz tajribasiga qanday real ta'sir qilishini 7 ta dalil bilan ko'rsatamiz.",
    coverImage:
      "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?auto=format&fit=crop&w=1200&q=70",
    body: `"QR menyu haqiqatan foydalimi yoki shunchaki moda?" — bu o'rinli savol. Keling, hissiyotsiz, 7 ta aniq dalil bilan ko'rib chiqamiz.

1. Chop etish xarajati nolga tushadi

Har safar menyu o'zgarganda qayta chop etish — yiliga katta pul. QR menyuda yangilash bepul va cheksiz.

2. O'rtacha chek oshadi

Chiroyli rasm, tavsiya taomlar va kombolar mijozni ko'proq buyurtmaga undaydi. Ko'p restoranlar QR menyudan keyin o'rtacha chek o'sganini kuzatadi.

3. Doim yangi va aniq menyu

Qog'oz menyu eskiradi, kir bo'ladi. QR menyu doim toza, yangi va professional ko'rinadi.

4. Statistika — qaror uchun asos

Qaysi taom ko'p ko'rilgan, qaysi vaqt gavjum, qaysi stol faol — bularni bilib, menyuni ma'lumotga asoslanib yaxshilaysiz.

5. Ofitsantga yordam

Buyurtma qaysi stoldan kelayotgani avtomatik aniqlanadi. Ofitsant qidirib yurmaydi, xatolik kamayadi.

6. Gigiyena

Bir qog'oz menyuni o'nlab qo'l ushlaydi. QR kodni esa hech kim ushlamaydi — mijoz o'z telefonidan ko'radi.

7. Zamonaviy imidj

Raqamli menyu restoraningizni zamonaviy va e'tiborli ko'rsatadi. Bu — yosh mijozlar qadrlaydigan detal.

Xulosa

Dalillar aniq: QR menyu xarajatni kamaytiradi, daromadni oshiradi va mijoz tajribasini yaxshilaydi. OzodFlow bilan buni bepul sinab ko'rasiz — hech qanday xavf yo'q.`,
  },
  {
    slug: "restoran-uchun-online-buyurtma-tizimi",
    title: "Restoran uchun online buyurtma tizimi qanday ishlaydi",
    version: "v1.0",
    description:
      "QR menyu — bu boshlanishi. Online buyurtma tizimi mijozdan oshxonagacha bo'lgan yo'lni qanday avtomatlashtirishini va nega bu muhimligini ko'ramiz.",
    coverImage:
      "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=70",
    body: `Ko'p restoranlar QR menyuda to'xtaydi. Aslida asosiy qiymat keyingi qadamda — online buyurtma tizimida. U mijoz, ofitsant va oshxona o'rtasidagi butun yo'lni avtomatlashtiradi.

Buyurtma yo'li: mijozdan oshxonagacha

Mijoz menyuni ochadi, taom tanlaydi, savatga qo'shadi va buyurtma beradi. Buyurtma darhol panelga tushadi. Oshxona ekranida ko'rinadi, ofitsant xabardor bo'ladi. Taom tayyor bo'lgach, ofitsant stolga yetkazadi va to'lovni qabul qiladi. Hammasi bitta oqimda.

Nega bu muhim?

Qo'lda buyurtma olishda xatolik bo'ladi: noto'g'ri stol, unutilgan taom, chalkash hisob. Online tizim buni bartaraf qiladi — har bir buyurtma yozib olinadi, stolga bog'lanadi va kuzatiladi.

Oshxona ekrani (KDS)

Buyurtmalar oshxona monitorida Kanban ko'rinishida turadi: Yangi → Tayyorlanmoqda → Tayyor. Har biri qancha vaqt turgani ko'rinadi, kechikkani qizil bo'ladi. Oshpaz nima qilish kerakligini bir qarashda ko'radi.

Ofitsant paneli

Ofitsant o'z telefonidan stollarni, tayyor taomlarni va to'lovni boshqaradi. Chegirma, xizmat haqi va aralash to'lov — hammasi bir joyda.

Yetkazib berish

Mijoz yetkazib berishni tanlasa, xaritada joyini belgilaydi — buyurtma manzil bilan keladi.

Xulosa

Online buyurtma tizimi restoranni "raqamli menyu"dan "raqamli boshqaruv"ga o'tkazadi. OzodFlow bularning barchasini bitta platformada beradi — QR menyudan oshxona ekranigacha.`,
  },
];

for (const [i, p] of posts.entries()) {
  const existing = await prisma.blogPost.findUnique({ where: { slug: p.slug } });
  if (existing) {
    console.log("skip (mavjud):", p.slug);
    continue;
  }
  await prisma.blogPost.create({
    data: {
      ...p,
      images: "[]",
      isPublished: true,
      isFeatured: false, // commercial maqolalar — blog ro'yxatida (bosh sahifani band qilmaydi)
      publishDate: new Date(Date.now() - (i + 3) * 24 * 60 * 60 * 1000),
    },
  });
  console.log("qo'shildi:", p.slug);
}

await prisma.$disconnect();
