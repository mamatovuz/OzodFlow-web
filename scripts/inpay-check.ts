/**
 * inPAY ULANISHINI TEKSHIRISH
 *
 * Ishga tushirish:
 *   npm run inpay:check
 *
 * Nima qiladi:
 *   1. Bearer token oladi (`/authorization/`)
 *   2. Merchant ma'lumotlarini so'raydi (`/merchant/`)
 *
 * Ikkalasi ham FAQAT O'QIYDI — to'lov yaratmaydi, pul harakatlantirmaydi.
 *
 * Qachon kerak:
 *   • Railway'ga o'zgaruvchi kiritgandan keyin — kalitlar to'g'rimi
 *   • "to'lov ishlamayapti" degan xabardan keyin — muammo shlyuzdami
 *     yoki bizdami
 *
 * DIQQAT: shlyuzda har IP uchun soatiga 100 so'rov limiti bor. Bu
 * skriptni ketma-ket ko'p marta ishga tushirmang.
 */

import {
  getInpayMerchant,
  inpayErrorMessage,
  isInpayConfigured,
  InpayError,
} from "@/lib/payments/inpay";

async function main(): Promise<void> {
  if (!isInpayConfigured()) {
    console.error(
      "\n✖ INPAY_MERCHANT_ID yoki INPAY_MERCHANT_TOKEN sozlanmagan.\n" +
        "  Karta orqali to'lov o'chirilgan holatda ishlaydi —\n" +
        "  hamyon faqat bank o'tkazmasi bilan to'ldiriladi.\n"
    );
    process.exitCode = 1;
    return;
  }

  console.log(`\nMerchant ID: ${process.env.INPAY_MERCHANT_ID}`);

  try {
    // `getInpayMerchant` ichida token olinadi — ya'ni bu bitta chaqiruv
    // ikkala qadamni ham tekshiradi.
    const merchant = await getInpayMerchant();

    console.log("✔ Token olindi va merchant ma'lumoti qaytdi:\n");
    console.dir(merchant, { depth: 4 });

    console.log("\nShlyuz bilan aloqa ishlaydi.\n");
  } catch (error) {
    console.error(`\n✖ ${inpayErrorMessage(error)}`);

    if (error instanceof InpayError) {
      console.error(`  Kod: ${error.code}`);

      switch (error.code) {
        case "UNAUTHORIZED":
          console.error(
            "\n  Merchant ID yoki token noto'g'ri.\n" +
              "  inpay.uz kabinetida Merchant bo'limini tekshiring.\n"
          );
          break;
        case "RATE_LIMITED":
          console.error(
            "\n  Soatiga 100 so'rov limiti tugadi. Bir soat kuting.\n"
          );
          break;
        case "NETWORK":
          console.error("\n  inpay.uz ga ulanib bo'lmadi. Tarmoqni tekshiring.\n");
          break;
        default:
          console.error("");
          console.error(error.details);
      }
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  }
}

void main();
