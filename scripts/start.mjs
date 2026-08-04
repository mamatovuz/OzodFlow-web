// Production start skripti (Railway).
// 1) Volume ulangan bo'lsa bazani/yuklamalarni volume ichiga yo'naltiradi (o'chmaydi).
// 2) Schema'ni bazaga qo'llaydi.
// 3) Admin akkaunt yo'q bo'lsa yaratadi.
// 4) Next serverni ishga tushiradi.

import { spawnSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const vol = process.env.RAILWAY_VOLUME_MOUNT_PATH;

if (vol) {
  process.env.DATABASE_URL = `file:${vol}/prod.db`;
  process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || `${vol}/uploads`;
  console.log("[start] Railway volume:", vol);
  console.log("[start] DATABASE_URL =", process.env.DATABASE_URL);
} else {
  console.log("[start] Volume yo'q — DATABASE_URL:", process.env.DATABASE_URL);
}

// Schema'ni qo'llash
const push = spawnSync(
  "npx",
  ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"],
  { stdio: "inherit", env: process.env, shell: true }
);
if (push.status !== 0) {
  console.error("[start] prisma db push xato:", push.status);
  process.exit(push.status || 1);
}

// Admin akkauntni ta'minlash (yo'q bo'lsa yaratadi, parolni O'ZGARTIRMAYDI)
try {
  const { PrismaClient } = await import("@prisma/client");
  const bcrypt = (await import("bcryptjs")).default;
  const prisma = new PrismaClient();
  const email = (process.env.ADMIN_EMAIL || "mamatovo354@gmail.com")
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "123@Ozod";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name: "Administrator",
        email,
        password: await bcrypt.hash(password, 10),
        role: "ADMIN",
      },
    });
    console.log("[start] Admin yaratildi:", email);
  } else if (existing.role !== "ADMIN") {
    await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
    console.log("[start] Admin roli tiklandi:", email);
  } else {
    console.log("[start] Admin mavjud:", email);
  }

  // Eski tarif qiymatlarini yangi tizimga o'tkazish (PROMAX -> BUSINESS)
  try {
    const r1 = await prisma.restaurant.updateMany({ where: { plan: "PROMAX" }, data: { plan: "BUSINESS" } });
    if (r1.count) console.log("[start] Tarif migratsiya: PROMAX -> BUSINESS", r1.count);
    await prisma.paymentRequest.updateMany({ where: { plan: "PROMAX" }, data: { plan: "BUSINESS" } });
    await prisma.promoCode.updateMany({ where: { scope: "PROMAX" }, data: { scope: "BUSINESS" } });
  } catch (e) {
    console.error("[start] Migratsiya xato (davom etadi):", e?.message);
  }

  // Demo restoran yo'q bo'lsa yaratamiz (/m/test)
  const demo = await prisma.restaurant.findUnique({ where: { slug: "test" } });
  await prisma.$disconnect();
  if (!demo) {
    console.log("[start] Demo restoran yaratilmoqda...");
    const seed = spawnSync("npx", ["tsx", "prisma/seed-demo.ts"], {
      stdio: "inherit",
      env: process.env,
      shell: true,
    });
    if (seed.status !== 0) console.error("[start] Demo seed xato (davom etadi)");
  }
} catch (e) {
  console.error("[start] Bootstrap xato (davom etadi):", e?.message);
}

// POS avtomatik sinxron uchun ichki cron sekret (agar berilmagan bo'lsa)
if (!process.env.CRON_SECRET) {
  process.env.CRON_SECRET = randomUUID();
  console.log("[start] CRON_SECRET avtomatik yaratildi (POS auto-sync uchun)");
}

// Next server
const child = spawn("npx", ["next", "start"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 0));

// ─── POS avtomatik menyu sinxroni ───
// Bu start jarayoni tirik turadi, shuning uchun har ~5 daqiqada ichki
// /api/pos/cron ni chaqiramiz. Muddati kelgan integratsiyalar sinxronlanadi.
// Railway'da tashqi cron sozlashsiz ishlaydi. O'chirish: POS_AUTO_SYNC=off
if (process.env.POS_AUTO_SYNC !== "off") {
  const port = process.env.PORT || 3000;
  const cronUrl = `http://127.0.0.1:${port}/api/pos/cron`;
  const runCron = async () => {
    try {
      const res = await fetch(cronUrl, {
        headers: { "x-cron-secret": process.env.CRON_SECRET },
      });
      if (!res.ok && res.status !== 401) {
        console.error("[cron] POS sync javob:", res.status);
      }
    } catch {
      // server hali tayyor bo'lmasligi mumkin — keyingi urinishda
    }
  };
  // Server ko'tarilishiga vaqt beramiz, so'ng har 5 daqiqada
  setTimeout(() => {
    runCron();
    setInterval(runCron, 5 * 60 * 1000);
  }, 45_000);
}
