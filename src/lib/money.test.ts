/**
 * money.ts testlari.
 *
 * Ishga tushirish:  npm test
 *
 * Bu modul platformadagi eng nozik kod — har bir escrow bo'linishi shu
 * funksiyalar orqali o'tadi. Shuning uchun oddiy misollardan tashqari
 * QOLDIQ YO'QOLMASLIGI xususiyati minglab tasodifiy qiymatlarda tekshiriladi.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BPS_BASE,
  MAX_AMOUNT_TIYIN,
  applyBps,
  bpsToPercent,
  formatBps,
  formatMoney,
  formatMoneyCompact,
  formatMoneyRange,
  parseMoneyInput,
  percentToBps,
  serializeAmount,
  splitByShare,
  splitCommission,
  splitEvenly,
  sumAmounts,
  sumToTiyin,
  tiyinToSum,
  validateAmount,
} from "./money";

const NBSP = "\u00A0";

describe("sumToTiyin", () => {
  it("butun so'mni tiyinga aylantiradi", () => {
    assert.equal(sumToTiyin(1500), 150_000n);
    assert.equal(sumToTiyin(0), 0n);
    assert.equal(sumToTiyin(1), 100n);
  });

  it("kasr qismini 2 xonaga keltiradi", () => {
    assert.equal(sumToTiyin("1500.5"), 150_050n);
    assert.equal(sumToTiyin("1500.50"), 150_050n);
    assert.equal(sumToTiyin("0.01"), 1n);
  });

  it("2 xonadan ortiq kasrni yaxlitlamasdan kesadi", () => {
    // 1500.999 → 1500.99, ya'ni mijoz foydasiga pastga
    assert.equal(sumToTiyin("1500.999"), 150_099n);
  });

  it("manfiy qiymatni saqlaydi", () => {
    assert.equal(sumToTiyin("-1500.50"), -150_050n);
  });

  it("noto'g'ri formatda xato tashlaydi", () => {
    assert.throws(() => sumToTiyin("1 500"));
    assert.throws(() => sumToTiyin("abc"));
    assert.throws(() => sumToTiyin(""));
  });
});

describe("tiyinToSum", () => {
  it("ko'rsatish uchun so'mga qaytaradi", () => {
    assert.equal(tiyinToSum(150_050n), 1500.5);
    assert.equal(tiyinToSum(0n), 0);
  });
});

describe("parseMoneyInput", () => {
  it("probel bilan ajratilgan raqamni tushunadi", () => {
    assert.equal(parseMoneyInput("1 500 000"), 150_000_000n);
    assert.equal(parseMoneyInput(`1${NBSP}500${NBSP}000`), 150_000_000n);
  });

  it("vergulni kasr ajratgichi sifatida tushunadi", () => {
    assert.equal(parseMoneyInput("1500,50"), 150_050n);
    assert.equal(parseMoneyInput("1500,5"), 150_050n);
  });

  it("vergulni guruh ajratgichi sifatida ham tushunadi", () => {
    // 3 xonadan ko'p bo'lsa — bu guruh ajratgichi
    assert.equal(parseMoneyInput("1,500,000"), 150_000_000n);
  });

  it("nuqtali kasrni tushunadi", () => {
    assert.equal(parseMoneyInput("1500.50"), 150_050n);
  });

  it("noto'g'ri kiritishda null qaytaradi (xato tashlamaydi)", () => {
    assert.equal(parseMoneyInput(""), null);
    assert.equal(parseMoneyInput("abc"), null);
    assert.equal(parseMoneyInput("12abc34"), null);
    assert.equal(parseMoneyInput("1.2.3"), null);
  });

  it("chegaradan oshgan summani rad etadi", () => {
    assert.equal(parseMoneyInput("99999999999999"), null);
  });
});

describe("formatMoney", () => {
  it("uch xonalab guruhlaydi va valyuta qo'shadi", () => {
    assert.equal(formatMoney(150_000_000n), `1${NBSP}500${NBSP}000${NBSP}so'm`);
    assert.equal(formatMoney(100n), `1${NBSP}so'm`);
  });

  it("tiyin bo'lsa ko'rsatadi, bo'lmasa yo'q", () => {
    assert.equal(formatMoney(150_050n), `1${NBSP}500,50${NBSP}so'm`);
    assert.equal(formatMoney(150_000n), `1${NBSP}500${NBSP}so'm`);
  });

  it("valyutani o'chirish mumkin", () => {
    assert.equal(formatMoney(150_000n, { currency: false }), `1${NBSP}500`);
  });

  it("signed rejimida musbat summaga + qo'yadi", () => {
    assert.equal(formatMoney(150_000n, { signed: true }), `+1${NBSP}500${NBSP}so'm`);
    // Manfiy summa har doim minus bilan
    assert.equal(formatMoney(-150_000n), `−1${NBSP}500${NBSP}so'm`);
  });

  it("natijada oddiy probel ishlatmaydi (qatorga bo'linmasligi uchun)", () => {
    const output = formatMoney(150_000_000n);
    assert.equal(output.includes(" "), false, "oddiy probel topildi");
  });
});

describe("formatMoneyCompact", () => {
  it("million va milliardni qisqartiradi", () => {
    assert.equal(formatMoneyCompact(150_000_000n), `1,5${NBSP}mln${NBSP}so'm`);
    assert.equal(formatMoneyCompact(45_000_000_000n), `450${NBSP}mln${NBSP}so'm`);
    assert.equal(formatMoneyCompact(120_000_000_000_000n), `1,2${NBSP}trln${NBSP}so'm`);
  });

  it("mingni qisqartiradi", () => {
    assert.equal(formatMoneyCompact(5_000_000n), `50${NBSP}ming${NBSP}so'm`);
  });

  it("kichik summani qisqartirmaydi", () => {
    assert.equal(formatMoneyCompact(50_000n), `500${NBSP}so'm`);
  });
});

describe("formatMoneyRange", () => {
  it("oraliqni ko'rsatadi", () => {
    const output = formatMoneyRange(100_000_00n, 300_000_00n);
    assert.ok(output.includes("–"), "chiziqcha yo'q");
    assert.ok(output.endsWith("so'm"));
  });

  it("min va max teng bo'lsa bitta summa qaytaradi", () => {
    assert.equal(formatMoneyRange(150_000n, 150_000n), formatMoney(150_000n));
  });
});

describe("bps aylantirish", () => {
  it("foizni bps ga va teskarisiga o'giradi", () => {
    assert.equal(percentToBps(15), 1500);
    assert.equal(percentToBps(12.5), 1250);
    assert.equal(bpsToPercent(1500), 15);
  });

  it("foizni matn sifatida yozadi", () => {
    assert.equal(formatBps(1500), "15%");
    assert.equal(formatBps(1250), "12,5%");
  });
});

describe("applyBps", () => {
  it("ulushni pastga yaxlitlab oladi", () => {
    assert.equal(applyBps(1_000_000n, 1500), 150_000n);
    // 333 * 15% = 49.95 → 49
    assert.equal(applyBps(333n, 1500), 49n);
  });

  it("chegaradan tashqari bps ni rad etadi", () => {
    assert.throws(() => applyBps(1000n, -1));
    assert.throws(() => applyBps(1000n, BPS_BASE + 1));
    assert.throws(() => applyBps(1000n, 15.5));
  });

  it("manfiy summani rad etadi", () => {
    assert.throws(() => applyBps(-1000n, 1500));
  });
});

describe("splitCommission", () => {
  it("komissiya va developer ulushini ajratadi", () => {
    const split = splitCommission(10_000_000n, 1500);
    assert.equal(split.commission, 1_500_000n);
    assert.equal(split.net, 8_500_000n);
    assert.equal(split.total, 10_000_000n);
  });

  it("0% komissiyada hammasi developerga o'tadi", () => {
    const split = splitCommission(10_000_000n, 0);
    assert.equal(split.commission, 0n);
    assert.equal(split.net, 10_000_000n);
  });

  it("100% komissiyada developerga hech narsa qolmaydi", () => {
    const split = splitCommission(10_000_000n, BPS_BASE);
    assert.equal(split.commission, 10_000_000n);
    assert.equal(split.net, 0n);
  });

  it("KAFOLAT: yig'indi har doim aniq teng (5000 tasodifiy holat)", () => {
    for (let i = 0; i < 5000; i += 1) {
      // 1 tiyindan 10 mlrd so'mgacha tasodifiy summa
      const total = BigInt(Math.floor(Math.random() * 1_000_000_000_000) + 1);
      const bps = Math.floor(Math.random() * (BPS_BASE + 1));

      const split = splitCommission(total, bps);

      assert.equal(
        split.commission + split.net,
        total,
        `Qoldiq yo'qoldi: total=${total} bps=${bps} → ` +
          `${split.commission} + ${split.net}`
      );
      assert.ok(split.commission >= 0n && split.net >= 0n, "manfiy ulush");
    }
  });
});

describe("splitByShare", () => {
  it("nizoda summani ikkiga bo'ladi", () => {
    const split = splitByShare(10_000_000n, 5000);
    assert.equal(split.customerAmount, 5_000_000n);
    assert.equal(split.developerAmount, 5_000_000n);
  });

  it("KAFOLAT: yig'indi aniq teng (toq qiymatlarda ham)", () => {
    for (let i = 0; i < 2000; i += 1) {
      const total = BigInt(Math.floor(Math.random() * 1_000_000_000) + 1);
      const bps = Math.floor(Math.random() * (BPS_BASE + 1));
      const split = splitByShare(total, bps);
      assert.equal(split.customerAmount + split.developerAmount, total);
    }
  });
});

describe("splitEvenly", () => {
  it("qoldiqni birinchi bo'laklarga taqsimlaydi", () => {
    assert.deepEqual(splitEvenly(1000n, 3), [334n, 333n, 333n]);
    assert.deepEqual(splitEvenly(10n, 1), [10n]);
    assert.deepEqual(splitEvenly(0n, 3), [0n, 0n, 0n]);
  });

  it("KAFOLAT: bo'laklar yig'indisi butunga teng", () => {
    for (let i = 0; i < 1000; i += 1) {
      const total = BigInt(Math.floor(Math.random() * 100_000_000));
      const parts = Math.floor(Math.random() * 12) + 1;
      const pieces = splitEvenly(total, parts);
      assert.equal(pieces.length, parts);
      assert.equal(sumAmounts(pieces), total);
    }
  });

  it("noto'g'ri bo'lak sonini rad etadi", () => {
    assert.throws(() => splitEvenly(100n, 0));
    assert.throws(() => splitEvenly(100n, -1));
    assert.throws(() => splitEvenly(100n, 1.5));
  });
});

describe("validateAmount", () => {
  it("nol va manfiy summani rad etadi", () => {
    assert.equal(validateAmount(0n).ok, false);
    assert.equal(validateAmount(-100n).ok, false);
  });

  it("allowZero bilan nolni qabul qiladi", () => {
    assert.equal(validateAmount(0n, { allowZero: true }).ok, true);
  });

  it("minimal chegarani tekshiradi", () => {
    const result = validateAmount(50_000n, { min: 100_000n });
    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.reason.includes("Minimal"));
  });

  it("chegaradan oshgan summani rad etadi", () => {
    assert.equal(validateAmount(MAX_AMOUNT_TIYIN + 1n).ok, false);
  });

  it("to'g'ri summani qabul qiladi", () => {
    assert.equal(validateAmount(150_000n).ok, true);
  });
});

describe("serializeAmount", () => {
  it("bigint ni aniqlik yo'qotmasdan matnga o'giradi", () => {
    // Number.MAX_SAFE_INTEGER dan katta qiymat
    const huge = 9_007_199_254_740_993n;
    assert.equal(serializeAmount(huge), "9007199254740993");
  });
});
