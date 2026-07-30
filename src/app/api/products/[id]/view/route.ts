import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api";

// Ommaviy — mijoz mahsulotni ochganda ko'rishlar sonini oshiradi
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.product
    .update({ where: { id }, data: { views: { increment: 1 } } })
    .catch(() => {});
  return ok({ tracked: true });
}
