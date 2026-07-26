/**
 * CHECKOUT.UZ ULANISHINI TEKSHIRISH
 *
 * Ishga tushirish:
 *   npm run checkout:check
 *
 * Nima qiladi: kassa balansi va statistikasini so'raydi. Bu ikki
 * endpoint FAQAT O'QIYDI — to'lov yaratmaydi, pul harakatlantirmaydi.
 *
 * Qachon kerak:
 *   • Railway'ga o'zgaruvchi kiritgandan keyin — kalit to'g'rimi
 *   • "to'lov ishlamayapti" degan xabardan keyin — muammo shlyuzdami
 *     yoki bizdami
 *
 * Bu skript `.env` ni o'qiydi, ya'ni kalit kodda emas.
 */

import {
  checkoutErrorMessage,
  getCheckoutBalance,
  getCheckoutStats,
  isCheckoutConfigured,
} from "@/lib/payments/checkout-uz";

async function main(): Promise<void> {
  if (!isCheckoutConfigured()) {
    console.error(
      "\n✖ CHECKOUT_API_KEY sozlanmagan.\n" +
        "  Karta orqali to'lov o'chirilgan holatda ishlaydi —\n" +
        "  hamyon faqat bank o'tkazmasi bilan to'ldiriladi.\n"
    );
    process.exitCode = 1;
    return;
  }

  const shopId = process.env.CHECKOUT_SHOP_ID;
  console.log(`\nKassa ID: ${shopId ?? "(kiritilmagan)"}`);

  if (!shopId) {
    // Bu xato emas, lekin webhook tekshiruvi kuchsizlanadi.
    console.warn(
      "⚠ CHECKOUT_SHOP_ID kiritilmagan — boshqa kassaning webhook'i\n" +
        "  tasodifan bizga tushsa, u filtrlanmaydi.\n"
    );
  }

  let failed = false;

  // ── Balans ────────────────────────────────────────────────────────────────
  try {
    const balance = await getCheckoutBalance();
    const entries = Object.entries(balance);

    console.log("✔ Balans olindi:");

    if (entries.length === 0) {
      console.log("    (bo'sh — hali to'lov qabul qilinmagan)");
    } else {
      for (const [currency, amount] of entries) {
        console.log(`    ${currency}: ${amount}`);
      }
    }
  } catch (error) {
    failed = true;
    console.error(`✖ Balans olinmadi: ${checkoutErrorMessage(error)}`);
    console.error(error);
  }

  // ── Statistika ────────────────────────────────────────────────────────────
  try {
    const stats = await getCheckoutStats();
    console.log("✔ Statistika olindi:", stats);
  } catch (error) {
    failed = true;
    console.error(`✖ Statistika olinmadi: ${checkoutErrorMessage(error)}`);
  }

  if (failed) {
    console.error(
      "\nKalit noto'g'ri yoki muddati o'tgan bo'lishi mumkin —\n" +
        "checkout.uz panelida kassa sozlamalarini tekshiring.\n"
    );
    process.exitCode = 1;
  } else {
    console.log("\nShlyuz bilan aloqa ishlaydi.\n");
  }
}

void main();
