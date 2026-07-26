import { redirect } from "next/navigation";

/**
 * `/settings` — bo'limi yo'q manzil.
 *
 * Bu yerda alohida "umumiy" sahifa yasashning ma'nosi yo'q: u birinchi
 * bo'limning nusxasi bo'lardi. Shuning uchun to'g'ridan yo'naltiramiz.
 */
export default function SettingsIndexPage() {
  redirect("/settings/profile");
}
