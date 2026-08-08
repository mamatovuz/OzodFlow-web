"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "OzodFlow qanday ishlaydi?",
    a: "Ro'yxatdan o'tasiz, restoran menyusini yaratasiz va tayyor QR kodni chop etib stollarga qo'yasiz. Mijozlar QR kodni skanerlab menyuni ko'radi.",
  },
  {
    q: "Bepul foydalanish mumkinmi?",
    a: "Ha, Free tarifda 20 tagacha mahsulot, asosiy QR kod va asosiy dizayn bepul beriladi. Xohlagan vaqtda Starter yoki Business tarifga o'tishingiz mumkin.",
  },
  {
    q: "Menyuni istalgan vaqt o'zgartira olamanmi?",
    a: "Albatta. Narx, rasm, tavsif va mavjudlik holatini real vaqtda o'zgartirasiz — mijozlar darhol yangilangan menyuni ko'radi. Qayta chop etish shart emas.",
  },
  {
    q: "Bir nechta filialni boshqarsa bo'ladimi?",
    a: "Ha, Business tarifda barcha filiallarni, xodimlarni va rollarni bitta paneldan boshqarasiz.",
  },
  {
    q: "To'lov qanday amalga oshiriladi?",
    a: "Click, Payme va Paynet orqali qulay to'lov. Obuna muddati tugashidan oldin avtomatik eslatma olasiz.",
  },
  {
    q: "Ma'lumotlarim xavfsizmi?",
    a: "Ha. Barcha ma'lumotlar shifrlangan holda saqlanadi, JWT autentifikatsiya, SSL va muntazam backup qo'llaniladi.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl divide-y divide-border rounded-2xl border border-border bg-card">
      {faqs.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
          >
            <span className="font-medium text-foreground">{item.q}</span>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-muted transition-transform ${
                open === i ? "rotate-180" : ""
              }`}
            />
          </button>
          {open === i && (
            <p className="px-6 pb-5 text-sm leading-relaxed text-muted animate-fade-in">
              {item.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
