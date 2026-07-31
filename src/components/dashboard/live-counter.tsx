"use client";

import { useEffect, useState } from "react";
import { Eye, QrCode, Flame, Table2, Users } from "lucide-react";
import { Card } from "@/components/ui";

type Live = {
  viewers: number;
  todayScans: number;
  activeOrders: number;
  busyTables: number;
  staff: number;
};

export function LiveCounter() {
  const [d, setD] = useState<Live | null>(null);

  useEffect(() => {
    let stop = false;
    async function load() {
      const res = await fetch("/api/livecounter");
      if (res.ok) {
        const j = await res.json();
        if (!stop) setD(j.data);
      }
    }
    load();
    const iv = setInterval(load, 3000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, []);

  const items = [
    { icon: Eye, label: "Hozir ko'rmoqda", value: d?.viewers ?? 0, color: "text-accent bg-accent-soft", live: true },
    { icon: QrCode, label: "Bugungi skan", value: d?.todayScans ?? 0, color: "text-success bg-success/10" },
    { icon: Flame, label: "Faol buyurtma", value: d?.activeOrders ?? 0, color: "text-warning bg-warning/10" },
    { icon: Table2, label: "Band stollar", value: d?.busyTables ?? 0, color: "text-error bg-error/10" },
    { icon: Users, label: "Xodimlar", value: d?.staff ?? 0, color: "text-accent bg-accent-soft" },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
        </span>
        <h2 className="font-semibold text-foreground">Jonli statistika</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((it) => (
          <Card key={it.label} className="p-4">
            <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${it.color}`}>
              <it.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{it.value}</p>
            <p className="text-xs text-muted">{it.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
