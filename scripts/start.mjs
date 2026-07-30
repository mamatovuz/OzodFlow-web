// Production start skripti (Railway).
// 1) Volume ulangan bo'lsa bazani/yuklamalarni volume ichiga yo'naltiradi (o'chmaydi).
// 2) Schema'ni bazaga qo'llaydi.
// 3) Admin akkaunt yo'q bo'lsa yaratadi.
// 4) Next serverni ishga tushiradi.

import { spawnSync, spawn } from "node:child_process";

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
  await prisma.$disconnect();
} catch (e) {
  console.error("[start] Admin bootstrap xato (davom etadi):", e?.message);
}

// Next server
const child = spawn("npx", ["next", "start"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 0));
