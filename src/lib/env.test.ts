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
 *  jimgina buziladigan xato: `CHECKOUT_SHOP_ID=0` bo'lsa webhook har bir
 *  HAQIQIY to'lovni "boshqa kassa" deb rad etadi va mijozlarning puli
 *  hamyonga tushmaydi. Xato hech qayerda ko'rinmaydi — faqat to'lov
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
  it("CHECKOUT_SHOP_ID bo'sh bo'lsa undefined bo'ladi, 0 emas", () => {
    const parsed = envSchemaForTests.parse({ ...BASE, CHECKOUT_SHOP_ID: "" });

    assert.equal(
      parsed.CHECKOUT_SHOP_ID,
      undefined,
      "Bo'sh CHECKOUT_SHOP_ID 0 ga aylandi — webhook barcha to'lovlarni rad etadi"
    );
  });

  it("CHECKOUT_SHOP_ID butunlay yo'q bo'lsa ham undefined", () => {
    const parsed = envSchemaForTests.parse(BASE);
    assert.equal(parsed.CHECKOUT_SHOP_ID, undefined);
  });

  it("CHECKOUT_SHOP_ID berilgan bo'lsa songa aylanadi", () => {
    const parsed = envSchemaForTests.parse({ ...BASE, CHECKOUT_SHOP_ID: "102" });
    assert.equal(parsed.CHECKOUT_SHOP_ID, 102);
  });

  it("bo'shliq bilan yozilgan qiymat ham tozalanadi", () => {
    const parsed = envSchemaForTests.parse({
      ...BASE,
      CHECKOUT_SHOP_ID: "  102  ",
      CHECKOUT_API_KEY: "  kalit  ",
    });

    assert.equal(parsed.CHECKOUT_SHOP_ID, 102);
    assert.equal(parsed.CHECKOUT_API_KEY, "kalit");
  });

  it("son bo'lmagan CHECKOUT_SHOP_ID rad etiladi", () => {
    // Panelga tasodifan matn yozilsa, ishga tushishda xato chiqishi kerak —
    // to'lov o'rtasida emas.
    assert.throws(() =>
      envSchemaForTests.parse({ ...BASE, CHECKOUT_SHOP_ID: "kassa-102" })
    );
  });

  it("bo'sh matnli maxfiy kalitlar undefined bo'ladi", () => {
    const parsed = envSchemaForTests.parse({
      ...BASE,
      CHECKOUT_API_KEY: "",
      TELEGRAM_BOT_TOKEN: "",
      SMTP_HOST: "",
      S3_ENDPOINT: "",
      ANTHROPIC_API_KEY: "",
      REDIS_URL: "",
    });

    // Hammasi `undefined` bo'lishi kerak — `features` bayroqlari shunga
    // qarab xizmatni o'chiradi.
    for (const [key, value] of Object.entries({
      CHECKOUT_API_KEY: parsed.CHECKOUT_API_KEY,
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
