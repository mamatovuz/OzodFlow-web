import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@ozodflow.uz";
  const password = await bcrypt.hash("demo1234", 10);

  // Eski demo'ni tozalash
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const user = await prisma.user.create({
    data: {
      name: "Demo Restoran",
      email,
      password,
      restaurants: {
        create: {
          name: "Osh Markazi",
          slug: "osh-markazi",
          description: "Milliy va zamonaviy taomlar",
          phone: "+998 90 123 45 67",
          telegram: "@oshmarkazi",
          instagram: "@oshmarkazi",
          address: "Toshkent sh, Amir Temur ko'chasi 12",
          workHours: "Har kuni 09:00 - 23:00",
          hasDelivery: true,
          currency: "UZS",
          primaryColor: "#2563EB",
          menuTheme: "light",
          plan: "FREE",
          planUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    },
    include: { restaurants: true },
  });

  const restaurantId = user.restaurants[0].id;

  const menu: Record<string, { name: string; price: number; desc: string; tags?: string[] }[]> = {
    "Milliy taomlar": [
      { name: "Osh (Palov)", price: 45000, desc: "An'anaviy Toshkent oshi, mol go'shti bilan", tags: ["bestseller"] },
      { name: "Manti", price: 35000, desc: "Bug'da pishirilgan qo'l manti (5 dona)" },
      { name: "Lag'mon", price: 38000, desc: "Qo'l lag'mon, sabzavotlar bilan", tags: ["new"] },
      { name: "Somsa", price: 12000, desc: "Tandirda pishirilgan go'shtli somsa" },
    ],
    "Salatlar": [
      { name: "Achichuk", price: 18000, desc: "Pomidor, piyoz va ko'katlar", tags: ["vegetarian"] },
      { name: "Sezar salat", price: 32000, desc: "Tovuq, parmezan, kruton" },
    ],
    "Ichimliklar": [
      { name: "Choy (choynak)", price: 8000, desc: "Ko'k yoki qora choy" },
      { name: "Kola 0.5", price: 12000, desc: "Sovuq gazli ichimlik" },
      { name: "Fresh apelsin", price: 22000, desc: "Yangi siqilgan sharbat", tags: ["new"] },
    ],
  };

  let catOrder = 0;
  for (const [catName, items] of Object.entries(menu)) {
    const category = await prisma.category.create({
      data: { restaurantId, name: catName, sortOrder: catOrder++ },
    });
    let prodOrder = 0;
    for (const item of items) {
      const tags = item.tags || [];
      await prisma.product.create({
        data: {
          restaurantId,
          categoryId: category.id,
          name: item.name,
          description: item.desc,
          price: item.price,
          sortOrder: prodOrder++,
          isBestseller: tags.includes("bestseller"),
          isNew: tags.includes("new"),
          isVegetarian: tags.includes("vegetarian"),
          isHalal: true,
          views: Math.floor(Math.random() * 200),
        },
      });
    }
  }

  // Namuna skan hodisalari (statistika uchun)
  const now = Date.now();
  const scans = Array.from({ length: 120 }, () => ({
    restaurantId,
    createdAt: new Date(now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
    visitorId: Math.random().toString(36).slice(2),
  }));
  await prisma.scanEvent.createMany({ data: scans });

  // Admin foydalanuvchi
  const adminPass = await bcrypt.hash("admin1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@ozodflow.uz" },
    update: { role: "ADMIN", password: adminPass },
    create: {
      name: "Administrator",
      email: "admin@ozodflow.uz",
      password: adminPass,
      role: "ADMIN",
    },
  });

  // Namuna to'lov kartasi
  const cardCount = await prisma.paymentCard.count();
  if (cardCount === 0) {
    await prisma.paymentCard.create({
      data: {
        bankName: "Uzcard",
        cardNumber: "8600 1234 5678 9012",
        cardHolder: "OZODBEK MAMATOV",
        isActive: true,
      },
    });
  }

  console.log("✓ Seed tayyor!");
  console.log("  Owner: demo@ozodflow.uz / demo1234");
  console.log("  Admin: admin@ozodflow.uz / admin1234");
  console.log("  Menyu: /m/osh-markazi");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
