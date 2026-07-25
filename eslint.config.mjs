import nextConfig from "eslint-config-next";

/**
 * ESLint flat config.
 *
 * Next.js 16 da `next lint` buyrug'i olib tashlangan — endi to'g'ridan-to'g'ri
 * `eslint .` ishlatiladi. `eslint-config-next` flat config massivini
 * eksport qiladi, shuning uchun uni yoyib qo'yamiz.
 *
 * @type {import("eslint").Linter.Config[]}
 */
const config = [
  {
    ignores: [
      // Eski Vite ilovasi arxivda — u boshqa qoidalar bilan yozilgan va
      // tekshirilishi kerak emas.
      "legacy/**",
      ".next/**",
      "dist/**",
      "node_modules/**",
      "data/**",
      "prisma/migrations/**",
      "next-env.d.ts",
      // Deploy platformalarining build natijalari — bu bizning kod emas,
      // ichida minifikatsiya qilingan kutubxonalar bo'ladi.
      ".vercel/**",
      ".turbo/**",
    ],
  },

  ...nextConfig,

  {
    rules: {
      // Ishlatilmagan o'zgaruvchilar uchun ESLint qoidasi ATAYLAB YO'Q:
      // `tsconfig.json` da `noUnusedLocals` va `noUnusedParameters` yoqilgan,
      // ya'ni `npm run typecheck` shuni allaqachon ushlaydi. Ikkinchi
      // tekshiruvchi faqat `typescript-eslint` bog'liqligini qo'shardi.
      //
      // TypeScript `_` bilan boshlanadigan parametrlarni e'tiborsiz
      // qoldiradi, shuning uchun `.map((_unused, index) => ...)` ishlaydi.

      // `console.log` production kodida qolib ketmasligi kerak, lekin
      // `console.warn`/`console.error` ataylab ishlatiladi (json-field.ts,
      // settings.ts — buzuq ma'lumot haqida ogohlantirish).
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  },

  {
    // Buyruq satri skriptlari uchun konsolga yozish — bu ILOVA INTERFEYSI,
    // qoldirilgan debug emas. Seed nima qilganini aytmasa foydasi kam.
    files: ["prisma/**/*.ts", "scripts/**/*.{ts,mjs,js}"],
    rules: {
      "no-console": "off",
    },
  },
];

export default config;
