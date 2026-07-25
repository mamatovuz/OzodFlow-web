/**
 * `safeRedirectPath` testlari.
 *
 * Bu funksiya OPEN REDIRECT zaifligiga qarshi yagona himoya. U buzilsa
 * hujumchi `/login?next=https://firibgar.uz` havolasini tarqatib,
 * foydalanuvchini bizning domendan qalbaki kirish formasiga olib borishi
 * mumkin. Shu sababli har bir chetlab o'tish usuli alohida test bilan
 * qulflangan.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_AFTER_LOGIN,
  defaultLandingForRole,
  safeRedirectPath,
} from "./redirects";

describe("safeRedirectPath — ruxsat etilgan yo'llar", () => {
  it("oddiy nisbiy yo'lni qabul qiladi", () => {
    assert.equal(safeRedirectPath("/dashboard"), "/dashboard");
    assert.equal(safeRedirectPath("/my-projects/OZF-4F2A91"), "/my-projects/OZF-4F2A91");
  });

  it("query va fragment bilan yo'lni qabul qiladi", () => {
    assert.equal(safeRedirectPath("/wallet?tab=history"), "/wallet?tab=history");
    assert.equal(safeRedirectPath("/settings#security"), "/settings#security");
  });
});

describe("safeRedirectPath — tashqi manzillarni rad etadi", () => {
  it("mutlaq URL", () => {
    assert.equal(safeRedirectPath("https://firibgar-sayt.uz"), DEFAULT_AFTER_LOGIN);
    assert.equal(safeRedirectPath("http://firibgar-sayt.uz"), DEFAULT_AFTER_LOGIN);
  });

  it("protokolga nisbiy URL — brauzer buni TASHQI manzil deb tushunadi", () => {
    assert.equal(safeRedirectPath("//firibgar-sayt.uz"), DEFAULT_AFTER_LOGIN);
    assert.equal(safeRedirectPath("//firibgar-sayt.uz/login"), DEFAULT_AFTER_LOGIN);
  });

  it("teskari slash — ba'zi brauzerlar uni `/` deb o'qiydi", () => {
    assert.equal(safeRedirectPath("/\\firibgar-sayt.uz"), DEFAULT_AFTER_LOGIN);
  });

  it("skript sxemasi", () => {
    assert.equal(safeRedirectPath("javascript:alert(1)"), DEFAULT_AFTER_LOGIN);
    assert.equal(safeRedirectPath("data:text/html,<script>"), DEFAULT_AFTER_LOGIN);
  });

  it("nisbiy yo'l `/` bilan boshlanmasa", () => {
    assert.equal(safeRedirectPath("dashboard"), DEFAULT_AFTER_LOGIN);
    assert.equal(safeRedirectPath("../admin"), DEFAULT_AFTER_LOGIN);
  });
});

describe("safeRedirectPath — sarlavha inyeksiyasi", () => {
  it("yangi qator belgilarini rad etadi", () => {
    assert.equal(
      safeRedirectPath("/dashboard\r\nSet-Cookie: evil=1"),
      DEFAULT_AFTER_LOGIN
    );
    assert.equal(safeRedirectPath("/dashboard\nLocation: /evil"), DEFAULT_AFTER_LOGIN);
  });

  it("boshqa nazorat belgilarini rad etadi", () => {
    // Escape ko'rinishida ATAYLAB: bu belgilar tahrirlagichda ko'rinmaydi,
    // literal qoldirilsa keyin hech kim nima tekshirilayotganini tushunmaydi.
    assert.equal(safeRedirectPath("/dash\u0000board"), DEFAULT_AFTER_LOGIN);
    assert.equal(safeRedirectPath("/dashboard\u0009"), DEFAULT_AFTER_LOGIN);
    assert.equal(safeRedirectPath("/dashboard\u007f"), DEFAULT_AFTER_LOGIN);
  });
});

describe("safeRedirectPath — tsiklni oldini oladi", () => {
  it("auth sahifalariga qaytarmaydi", () => {
    assert.equal(safeRedirectPath("/login"), DEFAULT_AFTER_LOGIN);
    assert.equal(safeRedirectPath("/register"), DEFAULT_AFTER_LOGIN);
    assert.equal(safeRedirectPath("/forgot-password"), DEFAULT_AFTER_LOGIN);
    assert.equal(safeRedirectPath("/reset-password?token=abc"), DEFAULT_AFTER_LOGIN);
  });

  it("nomi auth sahifasiga o'xshash, lekin boshqa yo'lni qabul qiladi", () => {
    // `/login-help` — auth sahifasi emas, bloklanmasligi kerak.
    assert.equal(safeRedirectPath("/login-help"), "/login-help");
  });
});

describe("safeRedirectPath — bo'sh qiymatlar", () => {
  it("null, undefined va bo'sh matnda zaxira qaytaradi", () => {
    assert.equal(safeRedirectPath(null), DEFAULT_AFTER_LOGIN);
    assert.equal(safeRedirectPath(undefined), DEFAULT_AFTER_LOGIN);
    assert.equal(safeRedirectPath(""), DEFAULT_AFTER_LOGIN);
    assert.equal(safeRedirectPath("   "), DEFAULT_AFTER_LOGIN);
  });

  it("berilgan zaxira qiymatni ishlatadi", () => {
    assert.equal(safeRedirectPath(null, "/admin"), "/admin");
    assert.equal(safeRedirectPath("https://evil.uz", "/admin"), "/admin");
  });
});

describe("defaultLandingForRole", () => {
  it("adminni admin panelga yuboradi", () => {
    assert.equal(defaultLandingForRole("ADMIN"), "/admin");
    assert.equal(defaultLandingForRole("SUPER_ADMIN"), "/admin");
  });

  it("mijoz va developerni kabinetga yuboradi", () => {
    assert.equal(defaultLandingForRole("CUSTOMER"), "/dashboard");
    assert.equal(defaultLandingForRole("DEVELOPER"), "/dashboard");
  });

  it("noma'lum rolda ham xavfsiz qiymat qaytaradi", () => {
    assert.equal(defaultLandingForRole("SOMETHING_NEW"), "/dashboard");
  });
});
