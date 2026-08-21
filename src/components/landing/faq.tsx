"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "OzodFlow qanday ishlaydi?",
    a: "Ro'yxatdan o'tasiz, restoran menyusini yaratasiz va tayyor QR kodni chop etib stollarga qo'yasiz. Mijozlar QR kodni skanerlab menyuni ko'radi.",
  },
  {
    q: "QR kod uchun printer kerakmi?",
    a: "Yo'q. QR kodni telefoningizga PNG yoki PDF ko'rinishida yuklab olasiz. Xohlasangiz uyda oddiy printerda chop etasiz yoki tez bosmaxonaga topshirasiz — maxsus qurilma shart emas.",
  },
  {
    q: "Mijoz QR kodni qanday skanerlaydi?",
    a: "Har qanday zamonaviy telefon kamerasi QR kodni o'qiydi — alohida ilova o'rnatish shart emas. Kamerani QR kodga tutadi va menyu brauzerda darhol ochiladi.",
  },
  {
    q: "Internet bo'lmasa nima bo'ladi?",
    a: "Menyu ochilishi uchun mijozda internet bo'lishi kerak (odatda mobil internet yetarli). Menyu juda yengil — sekin internetda ham tez ochiladi. Wi-Fi bergan bo'lsangiz, mijozlar undan foydalanadi.",
  },
  {
    q: "Menyuni qancha vaqtda yarataman?",
    a: "Bir necha daqiqada. Kategoriya va mahsulotlarni qo'lda qo'shasiz yoki Excel fayldan ommaviy import qilasiz. POS (kassa) tizimingiz bo'lsa, mahsulotlar avtomatik tortiladi.",
  },
  {
    q: "Menyuni istalgan vaqt o'zgartira olamanmi?",
    a: "Albatta. Narx, rasm, tavsif va mavjudlik holatini real vaqtda o'zgartirasiz — mijozlar darhol yangilangan menyuni ko'radi. Qayta chop etish shart emas.",
  },
  {
    q: "Har bir stol uchun alohida QR bo'ladimi?",
    a: "Ha. Har stolga alohida QR yaratasiz. Mijoz skanerlaganda buyurtma qaysi stoldan kelganini tizim avtomatik biladi.",
  },
  {
    q: "Buyurtmalar qayerga keladi?",
    a: "Buyurtmalar to'g'ridan-to'g'ri boshqaruv panelingizga tushadi — yangi buyurtmada ovozli signal chiqadi. Holatini (qabul qilindi → tayyorlanmoqda → tayyor) bir bosishda o'zgartirasiz.",
  },
  {
    q: "Bir nechta filialni boshqarsa bo'ladimi?",
    a: "Ha, Business tarifda barcha filiallarni, xodimlarni va rollarni bitta paneldan boshqarasiz.",
  },
  {
    q: "Yetkazib berish (dostavka) bormi?",
    a: "Ha. Mijoz menyuda 'Yetkazib berish'ni tanlab, xaritada joylashuvini belgilaydi — buyurtma manzil bilan panelga keladi.",
  },
  {
    q: "O'z domenimni ulay olamanmi?",
    a: "Ha. menu.restoraningiz.uz kabi o'z domeningizni ulaysiz — barcha tariflarda bepul (DNS orqali o'zingiz ulaysiz) yoki biz o'rnatib beramiz.",
  },
  {
    q: "To'lov qanday amalga oshiriladi?",
    a: "Karta orqali qulay to'lov. Obuna muddati tugashidan oldin avtomatik eslatma olasiz. Tarifni istalgan vaqt o'zgartirishingiz mumkin.",
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
