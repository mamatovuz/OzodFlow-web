import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=700&q=70`;

async function main() {
  // Eski demo'ni tozalash
  const existing = await prisma.user.findUnique({
    where: { email: "demo-owner@ozodflow.uz" },
  });
  if (existing) await prisma.user.delete({ where: { id: existing.id } });
  await prisma.restaurant.deleteMany({ where: { slug: "demo" } });

  const password = await bcrypt.hash("demo1234", 10);

  const user = await prisma.user.create({
    data: {
      name: "Ziravor Demo",
      email: "demo-owner@ozodflow.uz",
      password,
      restaurants: {
        create: {
          name: "Ziravor",
          slug: "test",
          description:
            "Milliy va sharq taomlari restorani. Tandir, ochoq va an'anaviy retseptlar bo'yicha tayyorlangan taomlar.",
          logo: img("1517248135467-4c7edcad34c4"),
          cover: img("1552566626-52f8b828add9"),
          phone: "+998 93 230 34 10",
          telegram: "@ziravor",
          instagram: "@ziravor.uz",
          address: "Samarqand sh, Registon ko'chasi 12",
          workHours: "Har kuni 09:00 - 23:00",
          hasDelivery: true,
          currency: "UZS",
          primaryColor: "#C26A1A",
          menuTheme: "ziravor",
          plan: "PROMAX",
          planUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      },
    },
    include: { restaurants: true },
  });
  const rid = user.restaurants[0].id;

  // Bannerlar
  await prisma.banner.createMany({
    data: [
      {
        restaurantId: rid,
        image: img("1633321088355-d0f81134ca3b"),
        title: "Kaboblar haftasi",
        subtitle: "Barcha kaboblarga 20% chegirma",
        sortOrder: 0,
      },
      {
        restaurantId: rid,
        image: img("1414235077428-338989a2e8c0"),
        title: "Yangi taomlar",
        subtitle: "Menyuda 8 ta yangi taom",
        sortOrder: 1,
      },
    ],
  });

  // Stollar
  for (const name of ["Stol 1", "Stol 2", "VIP 1", "Terassa 1"]) {
    await prisma.restaurantTable.create({
      data: {
        restaurantId: rid,
        name,
        code: name.replace(/\s+/g, "").toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(),
      },
    });
  }

  type P = {
    name: string;
    price: number;
    desc: string;
    weight?: string;
    kcal?: number;
    img: string;
    tags?: string[];
    spicy?: number;
  };
  const menu: Record<string, P[]> = {
    Oshlar: [
      { name: "To'y oshi", price: 42000, desc: "An'anaviy Samarqand oshi, mol go'shti va sabzi bilan", weight: "350g", kcal: 620, img: "1596797038530-2c107229654b", tags: ["bestseller", "recommend"] },
      { name: "Chayxona osh", price: 38000, desc: "Zira va nut qo'shilgan maxsus osh", weight: "320g", kcal: 580, img: "1585032226651-759b368d7246", tags: ["recommend"] },
      { name: "Bahori osh", price: 45000, desc: "Yosh sabzi va no'xat bilan", weight: "340g", kcal: 600, img: "1631515243349-e0cb75fb8d3a" },
    ],
    Kaboblar: [
      { name: "Qo'y kabob", price: 28000, desc: "Ko'mirda pishirilgan yumshoq qo'y go'shti", weight: "180g", kcal: 320, img: "1633321088355-d0f81134ca3b", tags: ["bestseller"], spicy: 1 },
      { name: "Tovuq kabob", price: 22000, desc: "Marinadlangan tovuq filesi", weight: "180g", kcal: 280, img: "1662487034268-33c95f2a5d8f" },
      { name: "Lula kabob", price: 26000, desc: "Ziravorli qiyma kabob", weight: "170g", kcal: 340, img: "1544025162-d76694265947", tags: ["new"], spicy: 2 },
    ],
    Salatlar: [
      { name: "Achichuk", price: 16000, desc: "Pomidor, piyoz va ko'katlar", weight: "200g", kcal: 90, img: "1512621776951-a57141f2eefd", tags: ["vegetarian"] },
      { name: "Sezar", price: 32000, desc: "Tovuq, parmezan, kruton, sous", weight: "220g", kcal: 320, img: "1550304943-4f24f54ddde9", tags: ["recommend"] },
    ],
    Ichimliklar: [
      { name: "Choy (choynak)", price: 8000, desc: "Ko'k yoki qora choy", weight: "0.6L", img: "1544787219-7f47ccb76574" },
      { name: "Fresh apelsin", price: 22000, desc: "Yangi siqilgan sharbat", weight: "0.4L", img: "1613478223719-2ab802602423", tags: ["new"] },
      { name: "Cola 0.5", price: 12000, desc: "Sovuq gazli ichimlik", weight: "0.5L", img: "1554866585-cd94860890b7" },
    ],
  };

  let co = 0;
  for (const [cat, items] of Object.entries(menu)) {
    const category = await prisma.category.create({
      data: { restaurantId: rid, name: cat, sortOrder: co++ },
    });
    let po = 0;
    for (const it of items) {
      const tags = it.tags || [];
      await prisma.product.create({
        data: {
          restaurantId: rid,
          categoryId: category.id,
          name: it.name,
          description: it.desc,
          price: it.price,
          oldPrice: tags.includes("bestseller") ? Math.round(it.price * 1.2) : null,
          weight: it.weight,
          calories: it.kcal ?? null,
          spicyLevel: it.spicy ?? 0,
          images: JSON.stringify([img(it.img)]),
          isBestseller: tags.includes("bestseller"),
          isNew: tags.includes("new"),
          isRecommended: tags.includes("recommend"),
          isVegetarian: tags.includes("vegetarian"),
          isHalal: true,
          sortOrder: po++,
          views: Math.floor(Math.random() * 300),
        },
      });
    }
  }

  console.log("✓ Demo tayyor: /m/demo (Ziravor)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
