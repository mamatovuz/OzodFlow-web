import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

// Ommaviy: mijoz buyurtma holatini kuzatadi
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: { number: true, status: true, tableName: true, total: true },
  });
  if (!order) return fail("Buyurtma topilmadi", 404);
  return ok(order);
}
