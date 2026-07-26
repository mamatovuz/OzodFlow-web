/**
 * MUHIT SOZLAMALARI TESTLARI
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  NEGA BU TESTLAR KERAK
 *
 *  `.env` da `KEY=` (bo'sh) yozish — eng ko'p uchraydigan holat: Railway
 *  panelida o'zgaruvchi qo'shiladi, qiymat keyinroq to'ldiriladi.
 *
 *  Zod'ning `coerce.number()` bo'sh matnni **0** ga aylantiradi. Bu
 *  jimgina buziladigan xato: `INPAY_MERCHANT_ID=0` bo'lsa
 *  `isInpayConfigured()` "sozlangan" deb qaytaradi, UI karta orqali
 *  to'lovni ko'rsatadi, lekin har to'lov shlyuzda MERCHANT_NOT_FOUND
 *  bilan yiqiladi. Xato hech qayerda ko'rinmaydi — faqat to'lov
 *  ishlamaydi.
 *
 *  Shu sababli "bo'sh = sozlanmagan" qoidasi test bilan qulflanadi.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { envSchemaForTests } from "./env";

/** Sxema o'tishi uchun zarur minimal qiymatlar. */
const BASE = {
  NEXT_PUBLIC_APP_URL: "https://ozodflow.uz",
  DATABASE_URL: "file:./test.db",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
};

describe("env sxemasi — bo'sh qiymatlar", () => {
  it("INPAY_MERCHANT_ID bo'sh bo'lsa undefined bo'ladi, 0 emas", () => {
    const parsed = envSchemaForTests.parse({ ...BASE, INPAY_MERCHANT_ID: "" });

    assert.equal(
      parsed.INPAY_MERCHANT_ID,
      undefined,
      "Bo'sh INPAY_MERCHANT_ID 0 ga aylandi — shlyuz 'sozlangan' deb ko'rinadi"
    );

    // Muhim natija: bo'sh qiymat bilan shlyuz O'CHIQ hisoblanishi kerak.
    // `0 && ...` ham `false` beradi, lekin `0` haqiqiy merchant id
    // bo'lishi mumkin degan xato taxminni yopib qo'yadi.
    assert.equal(
      parsed.INPAY_MERCHANT_ID !== undefined,
      false,
      "Shlyuz sozlangan deb hisoblandi"
    );
  });

  it("INPAY_MERCHANT_ID butunlay yo'q bo'lsa ham undefined", () => {
    const parsed = envSchemaForTests.parse(BASE);
    assert.equal(parsed.INPAY_MERCHANT_ID, undefined);
  });

  it("INPAY_MERCHANT_ID berilgan bo'lsa songa aylanadi", () => {
    const parsed = envSchemaForTests.parse({
      ...BASE,
      INPAY_MERCHANT_ID: "1353",
    });
    assert.equal(parsed.INPAY_MERCHANT_ID, 1353);
  });

  it("bo'shliq bilan yozilgan qiymat ham tozalanadi", () => {
    // Railway panelida qiymatni nusxalashda bo'shliq qo'shilib ketadi.
    const parsed = envSchemaForTests.parse({
      ...BASE,
      INPAY_MERCHANT_ID: "  1353  ",
      INPAY_MERCHANT_TOKEN: "  namuna-token-emas-haqiqiy  ",
    });

    assert.equal(parsed.INPAY_MERCHANT_ID, 1353);
    assert.equal(parsed.INPAY_MERCHANT_TOKEN, "namuna-token-emas-haqiqiy");
  });

  it("son bo'lmagan INPAY_MERCHANT_ID rad etiladi", () => {
    // Panelga tasodifan token yoki matn yozilsa, xato ISHGA TUSHISHDA
    // chiqishi kerak — to'lov o'rtasida emas.
    for (const bad of ["merchant-1353", "1353abc", "1.5", "abc"]) {
      assert.throws(
        () => envSchemaForTests.parse({ ...BASE, INPAY_MERCHANT_ID: bad }),
        `"${bad}" qabul qilindi`
      );
    }
  });

  it("bo'sh matnli maxfiy kalitlar undefined bo'ladi", () => {
    const parsed = envSchemaForTests.parse({
      ...BASE,
      INPAY_MERCHANT_TOKEN: "",
      TELEGRAM_BOT_TOKEN: "",
      SMTP_HOST: "",
      S3_ENDPOINT: "",
      ANTHROPIC_API_KEY: "",
      REDIS_URL: "",
    });

    // Hammasi `undefined` bo'lishi kerak — `features` bayroqlari shunga
    // qarab xizmatni o'chiradi.
    for (const [key, value] of Object.entries({
      INPAY_MERCHANT_TOKEN: parsed.INPAY_MERCHANT_TOKEN,
      TELEGRAM_BOT_TOKEN: parsed.TELEGRAM_BOT_TOKEN,
      SMTP_HOST: parsed.SMTP_HOST,
      S3_ENDPOINT: parsed.S3_ENDPOINT,
      ANTHROPIC_API_KEY: parsed.ANTHROPIC_API_KEY,
      REDIS_URL: parsed.REDIS_URL,
    })) {
      assert.equal(value, undefined, `${key} bo'sh matn bo'lib qoldi`);
    }
  });
});

describe("env sxemasi — majburiy qiymatlar", () => {
  it("qisqa JWT kaliti rad etiladi", () => {
    // 32 belgidan qisqa kalit HS256 uchun xavfli.
    assert.throws(() =>
      envSchemaForTests.parse({ ...BASE, JWT_ACCESS_SECRET: "qisqa" })
    );
  });

  it("DATABASE_URL bo'sh bo'lsa rad etiladi", () => {
    assert.throws(() => envSchemaForTests.parse({ ...BASE, DATABASE_URL: "" }));
  });

  it("NEXT_PUBLIC_APP_URL to'liq URL bo'lishi kerak", () => {
    assert.throws(() =>
      envSchemaForTests.parse({ ...BASE, NEXT_PUBLIC_APP_URL: "ozodflow.uz" })
    );
  });

  it("komissiya 50% dan oshib ketmaydi", () => {
    assert.throws(() =>
      envSchemaForTests.parse({ ...BASE, PLATFORM_COMMISSION_PERCENT: "60" })
    );

    const parsed = envSchemaForTests.parse({
      ...BASE,
      PLATFORM_COMMISSION_PERCENT: "15",
    });
    assert.equal(parsed.PLATFORM_COMMISSION_PERCENT, 15);
  });

  it("standart qiymatlar o'rnatiladi", () => {
    const parsed = envSchemaForTests.parse(BASE);

    assert.equal(parsed.NODE_ENV, "development");
    assert.equal(parsed.ACCESS_TOKEN_TTL, "15m");
    assert.equal(parsed.REFRESH_TOKEN_TTL, "30d");
    assert.equal(parsed.PLATFORM_COMMISSION_PERCENT, 15);
    assert.equal(parsed.DEFAULT_CURRENCY, "UZS");
  });

  it("noto'g'ri muddat formati rad etiladi", () => {
    // "15 minut" yoki "900" emas — "15m" bo'lishi kerak.
    for (const bad of ["15 minut", "900", "15min", "m15"]) {
      assert.throws(
        () => envSchemaForTests.parse({ ...BASE, ACCESS_TOKEN_TTL: bad }),
        `"${bad}" qabul qilindi`
      );
    }
  });
});
