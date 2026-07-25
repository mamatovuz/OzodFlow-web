import { db } from "@/lib/db";
import { QuestionKind } from "@/lib/enums";

/**
 * Developer arizasi uchun test savollari.
 *
 * Spec talabi: "Developer registration must NOT be easy." Shuning uchun test
 * uch qatlamdan iborat:
 *
 *  • MULTIPLE_CHOICE — avtomatik baholanadi, asosiy bilimni filtrlaydi
 *  • CODING          — qo'lda baholanadi, haqiqiy kod yozishni ko'rsatadi
 *  • PRACTICAL/OPEN  — fikrlash tarzini va tajribani ochadi
 *
 * Avtomatik savollar ataylab "esda saqlash" emas, TUSHUNISHNI tekshiradi —
 * javobni Google'dan ko'chirish oson bo'lgan savollardan foyda yo'q.
 *
 * Savollarni admin panelda tahrirlash va yangisini qo'shish mumkin.
 */

type QuestionSeed = {
  /** Barqaror kalit — qayta seed qilinganda dublikat bo'lmasligi uchun */
  key: string;
  kind: string;
  prompt: string;
  options?: Array<{ id: string; text: string }>;
  correctAnswer?: string;
  explanation?: string;
  points: number;
  language?: string;
  timeLimit?: number;
};

const QUESTIONS: QuestionSeed[] = [
  {
    key: "q-async-order",
    kind: QuestionKind.MULTIPLE_CHOICE,
    prompt:
      "JavaScript'da quyidagi kod nima chiqaradi?\n\n" +
      "console.log('1');\n" +
      "setTimeout(() => console.log('2'), 0);\n" +
      "Promise.resolve().then(() => console.log('3'));\n" +
      "console.log('4');",
    options: [
      { id: "a", text: "1, 2, 3, 4" },
      { id: "b", text: "1, 4, 3, 2" },
      { id: "c", text: "1, 4, 2, 3" },
      { id: "d", text: "1, 3, 4, 2" },
    ],
    correctAnswer: "b",
    explanation:
      "Sinxron kod avval bajariladi (1, 4). Keyin microtask navbati — " +
      "Promise (3). Oxirida macrotask — setTimeout (2).",
    points: 10,
    timeLimit: 3,
  },
  {
    key: "q-sql-index",
    kind: QuestionKind.MULTIPLE_CHOICE,
    prompt:
      "Jadvalda 5 million qator bor va `WHERE user_id = ? AND status = ?` " +
      "so'rovi sekin ishlayapti. Eng to'g'ri yechim qaysi?",
    options: [
      { id: "a", text: "`user_id` va `status` ga alohida-alohida indeks qo'yish" },
      { id: "b", text: "`(user_id, status)` ustunlariga birlashgan indeks qo'yish" },
      { id: "c", text: "Jadvalni ikkiga bo'lish" },
      { id: "d", text: "Serverga ko'proq operativ xotira qo'shish" },
    ],
    correctAnswer: "b",
    explanation:
      "Birlashgan indeks ikkala shartni bitta o'tishda qamrab oladi. Alohida " +
      "indekslarda baza faqat bittasini ishlatadi yoki qimmat birlashtirish " +
      "qiladi.",
    points: 10,
    timeLimit: 3,
  },
  {
    key: "q-money-float",
    kind: QuestionKind.MULTIPLE_CHOICE,
    prompt:
      "To'lov tizimida pul summasini saqlash uchun qaysi tip to'g'ri?",
    options: [
      { id: "a", text: "float yoki double — kasr qismini saqlaydi" },
      { id: "b", text: "butun son, eng kichik birlikda (tiyin/sent)" },
      { id: "c", text: "matn (string) — aniqlik yo'qolmaydi" },
      { id: "d", text: "farqi yo'q, muhimi formatlash to'g'ri bo'lsa" },
    ],
    correctAnswer: "b",
    explanation:
      "Float ikkilik kasr bilan ishlaydi va 0.1 + 0.2 !== 0.3 muammosini " +
      "keltiradi. Pul har doim butun son sifatida eng kichik birlikda " +
      "saqlanadi. Matn hisob-kitob uchun noqulay.",
    points: 15,
    timeLimit: 2,
  },
  {
    key: "q-logic-race",
    kind: QuestionKind.LOGIC,
    prompt:
      "Foydalanuvchi «Sotib olish» tugmasini tez-tez ikki marta bosdi va " +
      "hisobidan pul IKKI MARTA yechildi. Buni kodda qanday oldini olasiz? " +
      "Kamida ikki xil yondashuvni tushuntiring.",
    explanation:
      "Kutilgan javoblar: idempotentlik kaliti (bir xil kalitli so'rov ikki " +
      "marta bajarilmaydi), database darajasida unique constraint, " +
      "tranzaksiya va qulf (SELECT FOR UPDATE), klientda tugmani bloklash " +
      "(bu yagona himoya bo'lishi mumkin emas).",
    points: 20,
    timeLimit: 10,
  },
  {
    key: "q-coding-escrow",
    kind: QuestionKind.CODING,
    prompt:
      "Funksiya yozing: `splitPayment(total, commissionPercent)` — summani " +
      "platforma komissiyasi va ijrochi ulushiga bo'lsin.\n\n" +
      "Shartlar:\n" +
      "• natijalar yig'indisi `total` ga AYNAN teng bo'lishi kerak\n" +
      "• summa eng kichik birlikda (butun son) beriladi\n" +
      "• yaxlitlash tufayli bir tiyin ham yo'qolmasligi kerak\n\n" +
      "Nima uchun shunday yozganingizni izohda tushuntiring.",
    language: "js",
    explanation:
      "To'g'ri yechim: bir ulushni floor bilan hisoblab, ikkinchisini AYIRMA " +
      "orqali olish. Ikkalasini alohida yaxlitlash yig'indini buzadi. " +
      "Float ishlatgan javoblar past baholanadi.",
    points: 25,
    timeLimit: 25,
  },
  {
    key: "q-coding-debounce",
    kind: QuestionKind.CODING,
    prompt:
      "Qidiruv maydoniga har harf kiritilganda serverga so'rov ketmoqda va " +
      "server ortiqcha yuklanmoqda. Muammoni hal qiladigan kod yozing.\n\n" +
      "Shuningdek: eski so'rov javobi yangisidan KEYIN kelib qolsa, " +
      "noto'g'ri natija ko'rsatilmasligini ta'minlang.",
    language: "js",
    explanation:
      "Kutilgan: debounce (300-500ms) va oldingi so'rovni bekor qilish " +
      "(AbortController) yoki so'rov navbatini tekshirish. Faqat debounce " +
      "yozgan javob to'liq emas — ikkinchi shart bajarilmaydi.",
    points: 20,
    timeLimit: 20,
  },
  {
    key: "q-practical-review",
    kind: QuestionKind.PRACTICAL,
    prompt:
      "Quyidagi kodda kamida uchta muammo bor. Ularni toping va tuzatilgan " +
      "variantni yozing:\n\n" +
      "app.post('/api/withdraw', async (req, res) => {\n" +
      "  const user = await db.user.findFirst({ where: { id: req.body.userId } });\n" +
      "  if (user.balance >= req.body.amount) {\n" +
      "    await db.user.update({\n" +
      "      where: { id: user.id },\n" +
      "      data: { balance: user.balance - req.body.amount }\n" +
      "    });\n" +
      "    res.json({ ok: true });\n" +
      "  }\n" +
      "});",
    explanation:
      "Muammolar: (1) autentifikatsiya yo'q — `req.body.userId` ga ishonilgan, " +
      "istalgan odam boshqaning pulini yechishi mumkin; (2) tranzaksiya yo'q — " +
      "parallel so'rovlar balansdan ko'p pul yechadi (race condition); " +
      "(3) `amount` tekshirilmagan — manfiy son balansni oshiradi; " +
      "(4) shart bajarilmasa javob qaytmaydi — so'rov osilib qoladi; " +
      "(5) `user` null bo'lishi mumkin.",
    points: 30,
    timeLimit: 25,
  },
  {
    key: "q-open-experience",
    kind: QuestionKind.OPEN,
    prompt:
      "O'zingiz qilgan eng murakkab loyiha haqida yozing: qanday vazifa edi, " +
      "qaysi qiyinchilikka duch keldingiz va uni qanday hal qildingiz? " +
      "Agar loyiha ochiq bo'lsa — havola qoldiring.",
    explanation:
      "Baholashda: muammoni aniq tasvirlashi, qaror sabablari, o'z ishini " +
      "tanqidiy ko'rishi. Faqat texnologiya ro'yxatini sanab o'tgan javob " +
      "past baholanadi.",
    points: 20,
    timeLimit: 20,
  },
];

export async function seedQuestions(): Promise<number> {
  for (const [index, question] of QUESTIONS.entries()) {
    // `ApplicationQuestion` da tabiiy unique kalit yo'q (savol matni
    // o'zgarishi mumkin), shuning uchun barqaror `key` ni prompt boshiga
    // yashirin belgi sifatida qo'yish o'rniga — mavjudligini prompt bo'yicha
    // tekshiramiz. Seed faqat bir marta ishlaydi, keyin admin boshqaradi.
    const existing = await db.applicationQuestion.findFirst({
      where: { prompt: question.prompt },
      select: { id: true },
    });

    if (existing) {
      await db.applicationQuestion.update({
        where: { id: existing.id },
        data: { sortOrder: index, isActive: true },
      });
      continue;
    }

    await db.applicationQuestion.create({
      data: {
        kind: question.kind,
        prompt: question.prompt,
        optionsJson: question.options ? JSON.stringify(question.options) : null,
        correctAnswer: question.correctAnswer ?? null,
        explanation: question.explanation ?? null,
        points: question.points,
        language: question.language ?? null,
        timeLimit: question.timeLimit ?? null,
        sortOrder: index,
      },
    });
  }

  return QUESTIONS.length;
}
