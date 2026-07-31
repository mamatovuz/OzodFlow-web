"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui";
import { formatPrice, parseJson } from "@/lib/utils";
import type { OrderItem } from "@/lib/orders";

type Data = {
  number: number;
  tableName: string | null;
  createdAt: string;
  items: string;
  total: number;
  phone: string | null;
  comment: string | null;
  restaurant: {
    name: string;
    logo: string | null;
    phone: string | null;
    address: string | null;
    currency: string;
  };
};

export function ReceiptView({ data }: { data: Data }) {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const items = parseJson<OrderItem[]>(data.items, []);
  const d = new Date(data.createdAt);

  useEffect(() => {
    if (qrRef.current) {
      QRCode.toCanvas(qrRef.current, `OZODFLOW-ORDER-${data.number}`, { width: 110, margin: 1 });
    }
  }, [data.number]);

  return (
    <div>
      <div className="mb-4 flex justify-center gap-2 print:hidden">
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Chop etish
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Download className="h-4 w-4" /> PDF (chop → PDF)
        </Button>
      </div>

      <div
        id="receipt"
        className="mx-auto max-w-xs rounded-xl border border-border bg-white p-5 text-black print:border-0 print:shadow-none"
        style={{ fontFamily: "monospace" }}
      >
        <div className="text-center">
          {data.restaurant.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.restaurant.logo} alt="" className="mx-auto mb-2 h-14 w-14 rounded-full object-cover" />
          )}
          <h2 className="text-lg font-bold">{data.restaurant.name}</h2>
          {data.restaurant.phone && <p className="text-xs">{data.restaurant.phone}</p>}
          {data.restaurant.address && <p className="text-xs">{data.restaurant.address}</p>}
        </div>

        <div className="my-3 border-y border-dashed border-gray-400 py-2 text-xs">
          <div className="flex justify-between"><span>Sana:</span><span>{d.toLocaleDateString("uz-UZ")}</span></div>
          <div className="flex justify-between"><span>Vaqt:</span><span>{d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}</span></div>
          <div className="flex justify-between"><span>Buyurtma:</span><span>#{data.number}</span></div>
          {data.tableName && <div className="flex justify-between"><span>Stol:</span><span>{data.tableName}</span></div>}
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="py-1 text-left">Nomi</th>
              <th className="py-1 text-center">x</th>
              <th className="py-1 text-right">Narx</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td className="py-0.5">{it.name}</td>
                <td className="py-0.5 text-center">{it.qty}</td>
                <td className="py-0.5 text-right">{formatPrice(it.price * it.qty, data.restaurant.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2 border-t border-dashed border-gray-400 pt-2">
          <div className="flex justify-between text-sm font-bold">
            <span>JAMI:</span>
            <span>{formatPrice(data.total, data.restaurant.currency)}</span>
          </div>
        </div>

        {data.comment && <p className="mt-2 text-xs">Izoh: {data.comment}</p>}

        <div className="mt-3 flex flex-col items-center">
          <canvas ref={qrRef} />
          <p className="mt-2 text-center text-[10px] text-gray-500">
            OzodFlow bilan yaratilgan
          </p>
        </div>
      </div>
    </div>
  );
}
