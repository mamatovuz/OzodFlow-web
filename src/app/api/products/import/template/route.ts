import { authGuard } from "@/lib/api";
import { IMPORT_COLUMNS } from "@/lib/excel-import";
import writeXlsxFile, { type SheetData } from "write-excel-file/node";

export const dynamic = "force-dynamic";

// Excel shablonini (namuna qatorlari bilan) yuklab beradi.
export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;

  // Sarlavha qatori (qalin, sariq fon)
  const headerRow = IMPORT_COLUMNS.map((c) => ({
    value: c.header,
    fontWeight: "bold" as const,
    backgroundColor: "#FFF2CC",
    borderColor: "#D9B300",
  }));

  // 2 ta namuna qator
  const exampleRows = [0, 1].map((i) =>
    IMPORT_COLUMNS.map((c) =>
      c.examples[i] ? { value: c.examples[i], type: String } : null
    )
  );

  const data: SheetData = [headerRow, ...exampleRows];

  const columns = IMPORT_COLUMNS.map((c) => ({
    width: c.key === "imageUrl" || c.key === "description" ? 34 : 18,
  }));

  const buffer = await writeXlsxFile(data, { columns }).toBuffer();

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="ozodflow-menyu-shablon.xlsx"',
    },
  });
}
