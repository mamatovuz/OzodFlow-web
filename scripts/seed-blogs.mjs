// 3 ta sifatli blog maqolasini qo'shadi (o'zbek tilida). Bir martalik skript.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const posts = [
  {
    slug: "qr-menyu-restoran-kelajagi",
    title: "QR menyu — restoran biznesining raqamli kelajagi",
    version: "v1.0",
    description:
      "Qog'oz menyudan QR menyuga o'tish nega shunchaki moda emas, balki restoran daromadini oshiradigan jiddiy qadam ekanini tushuntiramiz.",
    coverImage:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=70",
    body: `Bugungi kunda mijoz stolga o'tiriboq telefonini qo'liga oladi. Restoranlar uchun bu — imkoniyat. QR menyu aynan shu daqiqada mijoz bilan gaplashadigan eng qulay vositaga aylandi.

Qog'oz menyuning muammolari

Qog'oz menyu chiroyli, lekin qimmat va sekin. Narx o'zgarsa — qaytadan chop etasiz. Yangi taom qo'shsangiz — yana bosmaxona. Menyu kir bo'ladi, yirtiladi, yo'qoladi. Bir menyuni o'nlab mijoz ushlaydi — bu gigiyena masalasi hamdir.

QR menyu nima beradi?

QR menyu — bu stolga yopishtirilgan kichik kvadrat. Mijoz uni skaner qiladi va bir soniyada to'liq menyu telefonida ochiladi: rangli rasmlar, tavsiflar, narxlar, hatto taom tarkibi va kaloriyasi bilan.

Eng muhimi — menyuni istagan payt o'zgartirasiz. Narxni yangiladingizmi? Bir tugma. Taom tugadimi? "Mavjud emas" deb belgilaysiz. Yangi taklif? Bir daqiqada qo'shasiz. Mijoz doim eng yangi menyuni ko'radi.

Raqamlar til biladi

QR menyu shunchaki qulaylik emas — u ma'lumot to'playdi. Qaysi taom ko'p ko'rilgan, qaysi biri ko'p sotilgan, qaysi vaqtda tashrif ko'p — bularning hammasi sizning qo'lingizda. Bu ma'lumot bilan menyuni to'g'ri tuzasiz, ortiqcha xarajatni kamaytirasiz va daromadni oshirasiz.

Xulosa

QR menyu — kelajak emas, u allaqachon bugungi kun. OzodFlow bilan restoraningizni bir kunda raqamli menyuga o'tkazasiz: rasm yuklaysiz, narx qo'yasiz, QR kodni chop etasiz va stolga qo'yasiz. Mijoz esa buni sevadi.`,
  },
  {
    slug: "menyu-dizayni-psixologiyasi",
    title: "Menyu dizayni psixologiyasi: mijoz nima uchun ko'proq buyurtma beradi",
    version: "v1.0",
    description:
      "Chiroyli rasm, to'g'ri joylashuv va aqlli narx — menyu dizaynining kichik detallari sotuvni qanday oshirishini ko'rib chiqamiz.",
    coverImage:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=70",
    body: `Mijoz taomni birinchi ko'zi bilan "yeydi". Menyudagi har bir rasm, so'z va narx uning qaroriga ta'sir qiladi. Yaxshi menyu — bu sotuvchi. Keling, uning sirlarini ochamiz.

1. Rasm hamma narsani hal qiladi

Ochiq, yorug' va ishtaha ochadigan rasm — eng kuchli vosita. Tadqiqotlar shuni ko'rsatadiki, rasmli taom rasmsiziga qaraganda sezilarli darajada ko'p buyurtma qilinadi. Har bir taomga bitta sifatli rasm qo'ying — telefon kamerasi ham yetarli, faqat yorug'lik yaxshi bo'lsin.

2. "Xit" va "Yangi" belgilari

Mijoz tanlashda qiynaladi. Unga yordam bering. "Xit taom", "Yangi", "Tavsiya etamiz" belgilari mijozning e'tiborini kerakli taomga qaratadi va tanlovni osonlashtiradi. Bu — restoranning eng foydali taomlarini oldinga chiqarish imkoni.

3. Narxni to'g'ri ko'rsatish

Narx yonidagi "so'm" so'zini kichikroq qilib, sonni yirikroq ko'rsatish — mijoz e'tiborini narxdan taomga qaratadi. Eski narxni chizib, yangi narxni yozish esa chegirmani ko'zga tashlaydi va "yutaman" hissini uyg'otadi.

4. Kategoriya tartibi

Odam menyuni yuqoridan pastga o'qiydi. Eng foydali va mashhur kategoriyalarni yuqoriroqqa qo'ying. Sho'rva, salat, asosiy taom, shirinlik — mantiqiy oqim mijozni to'liq taomga yetaklaydi.

5. Kam — ko'p demakdir

50 ta taomni bir sahifaga tiqishtirmang. Ko'p tanlov mijozni charchatadi. Aniq kategoriyalar, toza dizayn va nafas oladigan bo'shliq — bu professionallik belgisi.

Xulosa

Menyu dizayni — bu san'at va hisob-kitobning uyg'unligi. OzodFlow'da bularning barchasi tayyor: rasm yuklaysiz, belgi qo'yasiz, kategoriyani tartiblaysiz — qolganini chiroyli dizayn shablonlari o'zi bajaradi.`,
  },
  {
    slug: "qr-menyu-bilan-sotuvni-oshirish",
    title: "QR menyu bilan sotuvni oshirishning 5 amaliy usuli",
    version: "v1.0",
    description:
      "QR menyu shunchaki taomlar ro'yxati emas — u to'g'ri ishlatilsa, o'rtacha chekni oshiradigan sotuv vositasi. Mana 5 ta ishlaydigan usul.",
    coverImage:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=70",
    body: `Ko'p restoranlar QR menyuni faqat "raqamli qog'oz" deb o'ylaydi. Aslida u — kuchli sotuv quroli. Mana uni ishlatishning 5 amaliy usuli.

1. Tavsiya taomlarni oldinga chiqaring

Har bir mijoz menyuni ochganda birinchi ko'rgan narsasiga e'tibor beradi. "Tavsiya etamiz" bo'limiga eng foydali va yuqori marjali taomlarni joylang. Bu — ongsiz ravishda mijoz tanlovini yo'naltirish.

2. Kombo va to'plamlar taklif qiling

"Osh + salat + choy" bitta narxda — mijoz uchun qulay, siz uchun foydali. Kombo o'rtacha chekni oshiradigan eng oson usul. QR menyuda kombolarni alohida chiroyli ko'rsatish mumkin.

3. Rasm sifatiga sarmoya kiriting

Bitta yomon rasm butun taassurotni buzadi. Aksincha, ishtaha ochadigan rasm mijozni "shuni buyuraman" degan qarorga olib keladi. Eng ko'p sotiladigan 10 ta taomingizga professional rasm — eng yaxshi sarmoya.

4. Statistikaga qarab menyuni yangilang

QR menyu qaysi taom ko'p ko'rilgani va sotilganini ko'rsatadi. Ko'rilgan, lekin sotilmagan taom bormi? Demak, narx yoki rasm muammosi bor. Umuman ko'rilmayotgan taomni menyudan olib tashlang — u faqat joy egallaydi.

5. Aksiya va bannerlardan foydalaning

"Bugun kaboblarga 20% chegirma" — bunday banner menyuning tepasida tursa, mijoz albatta e'tibor beradi. Vaqtli aksiyalar mijozni "hozir buyuraman" degan qarorga undaydi.

Xulosa

QR menyu — bu tirik, o'zgaruvchan va aqlli vosita. Uni to'g'ri ishlatsangiz, har bir mijozdan biroz ko'proq daromad olasiz — bu esa oy oxirida katta farq qiladi. OzodFlow sizga buning barcha vositalarini beradi: tavsiya, kombo, banner va batafsil statistika.`,
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
      isFeatured: true,
      publishDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
    },
  });
  console.log("qo'shildi:", p.slug);
}

await prisma.$disconnect();
