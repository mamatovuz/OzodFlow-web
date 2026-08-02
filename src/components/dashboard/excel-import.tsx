"use client";

import { useRef, useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Button, Card } from "@/components/ui";
import { IMPORT_COLUMNS } from "@/lib/excel-import";

type ImportResult = {
  created: number;
  categoriesCreated: string[];
  skipped: { row: number; reason: string }[];
  warnings: string[];
  limitReached: boolean;
};

export function ExcelImport({ onImported }: { onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/products/import", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Import qilishda xatolik");
      } else {
        setResult(json.data as ImportResult);
        onImported();
      }
    } catch {
      setError("Tarmoq xatosi. Qayta urinib ko'ring.");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Card className="mt-6 p-4 sm:p-5">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Excel orqali ommaviy qo'shish</h3>
            <p className="mt-0.5 text-sm text-muted">
              Bir nechta mahsulotni Excel (.xlsx) faylda birdaniga qo'shing
            </p>
          </div>
        </div>
      </div>

      {/* Amallar */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <a
          href="/api/products/import/template"
          download
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-all hover:bg-surface-2 active:scale-[0.98] sm:w-auto"
        >
          <Download className="h-4 w-4" /> Shablonni yuklab olish
        </a>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          onChange={handleFile}
          className="hidden"
        />
        <Button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {loading ? "Yuklanmoqda..." : "Excel faylni yuklash"}
        </Button>
      </div>

      {/* Xatolik */}
      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Natija */}
      {result && (
        <div className="mt-3 space-y-2">
          <div className="flex items-start gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <b>{result.created} ta</b> mahsulot qo'shildi
              {result.categoriesCreated.length > 0 && (
                <>
                  {" "}
                  ({result.categoriesCreated.length} ta yangi kategoriya:{" "}
                  {result.categoriesCreated.join(", ")})
                </>
              )}
            </span>
          </div>
          {result.warnings.length > 0 && (
            <div className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
              <ul className="list-inside list-disc space-y-0.5">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {result.skipped.length > 0 && (
            <details className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
              <summary className="cursor-pointer font-medium text-muted">
                {result.skipped.length} ta qator o'tkazib yuborildi
              </summary>
              <ul className="mt-2 list-inside list-disc space-y-0.5 text-muted">
                {result.skipped.map((s, i) => (
                  <li key={i}>
                    {s.row}-qator: {s.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Batafsil — Excel formati */}
      <details className="mt-4 rounded-lg border border-border">
        <summary className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground">
          <Info className="h-4 w-4 text-accent" /> Batafsil — Excel qanday bo'lishi kerak?
        </summary>
        <div className="space-y-3 border-t border-border px-3 py-3 text-sm text-muted">
          <p>
            Fayl <b>.xlsx</b> (Excel) formatida bo'lsin. <b>Birinchi qator</b> — ustun
            nomlari (sarlavha), keyingi qatorlar — mahsulotlar. Har bir mahsulot alohida
            qatorda. Eng oson yo'l: yuqoridagi <b>shablonni yuklab olib</b>, ustidan
            to'ldirish.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border text-foreground">
                  <th className="py-1.5 pr-3 font-semibold">Ustun</th>
                  <th className="py-1.5 pr-3 font-semibold">Majburiymi</th>
                  <th className="py-1.5 font-semibold">Izoh</th>
                </tr>
              </thead>
              <tbody>
                {IMPORT_COLUMNS.map((c) => (
                  <tr key={c.key} className="border-b border-border/50 align-top">
                    <td className="py-1.5 pr-3 font-medium text-foreground">{c.header}</td>
                    <td className="py-1.5 pr-3">
                      {c.required ? (
                        <span className="text-error">Ha</span>
                      ) : (
                        "Yo'q"
                      )}
                    </td>
                    <td className="py-1.5">{c.hint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="list-inside list-disc space-y-1">
            <li>
              <b>Kategoriya</b> mavjud bo'lmasa — avtomatik yaratiladi (bir xil nomlar
              birlashtiriladi).
            </li>
            <li>
              <b>Narx</b> va <b>Eski narx</b> — faqat raqam yozing (masalan: 12000).
            </li>
            <li>
              <b>Rasm URL</b> — rasmning to'liq internet manzili (https:// bilan). Rasm
              o'sha havoladan olinadi. Bo'sh qoldirsangiz ham bo'ladi.
            </li>
            <li>Bo'sh qatorlar va noto'g'ri qatorlar avtomatik o'tkazib yuboriladi.</li>
            <li>Qo'shilgandan keyin har bir mahsulotni tahrirlab, rasm yoki narxni o'zgartirishingiz mumkin.</li>
          </ul>
        </div>
      </details>
    </Card>
  );
}
