"use client";

import { Send } from "lucide-react";
import { Button } from "@/components/ui";

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_TELEGRAM || "ozodflow_uz";
const MSG = "Salom! Enterprise tarifining narxini bilmoqchi edim.";

export function EnterpriseContact() {
  function contact() {
    // Adminga avtomatik bildirishnoma (bot orqali)
    fetch("/api/contact/enterprise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => {});
    // Telegramga yo'naltirish (matn oldindan yozilgan)
    const url = `https://t.me/${CONTACT.replace("@", "")}?text=${encodeURIComponent(MSG)}`;
    window.open(url, "_blank");
  }

  return (
    <Button onClick={contact} className="mt-5 w-full">
      <Send className="h-4 w-4" /> Bog'lanish
    </Button>
  );
}
