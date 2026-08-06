import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { getSessionUser } from "./auth";
import { prisma } from "./prisma";
import { log, newRequestId } from "./log";

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(message: string, status = 400, extra?: unknown) {
  return NextResponse.json(
    { success: false, error: message, ...(extra ? { details: extra } : {}) },
    { status }
  );
}

/**
 * Nazoratli API xatosi. Route ichida `throw new ApiError("...", 404)` deyish
 * mumkin — `route()` o'ramchisi uni to'g'ri {success,error} javobiga aylantiradi.
 */
export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

// Next route-context bilan mos: statik route'da ham, [id] route'da ham ishlaydi
type RouteCtx = { params: Promise<Record<string, string>> };
type Handler = (req: Request, ctx: RouteCtx) => Promise<Response> | Response;

/**
 * Global xato ushlagich. Har qanday `throw` (ApiError, ZodError yoki kutilmagan)
 * bir xil JSON konvertга aylantiriladi va log'ga request-id bilan yoziladi.
 *
 *   export const POST = route(async (req) => { ... });
 */
export function route(handler: Handler): Handler {
  return async (req, ctx) => {
    const reqId = newRequestId();
    try {
      const res = await handler(req, ctx);
      res.headers.set("x-request-id", reqId);
      return res;
    } catch (err) {
      if (err instanceof ApiError) {
        return withId(fail(err.message, err.status, err.details), reqId);
      }
      if (err instanceof ZodError) {
        return withId(fail("Ma'lumotlar noto'g'ri", 422, err.flatten().fieldErrors), reqId);
      }
      log.error("api_unhandled", {
        reqId,
        method: (req as Request)?.method,
        url: (req as Request)?.url,
        err: err instanceof Error ? err.message : String(err),
      });
      return withId(fail("Server xatosi", 500), reqId);
    }
  };
}

function withId(res: Response, reqId: string): Response {
  res.headers.set("x-request-id", reqId);
  return res;
}

/**
 * JSON tanani o'qiydi va zod bilan tekshiradi. Yaroqsiz bo'lsa ZodError/ApiError
 * tashlaydi — `route()` uni 422 ga aylantiradi.
 */
export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError("So'rov tanasi noto'g'ri (JSON kutilgan)", 400);
  }
  return schema.parse(body);
}

/** URL query'dan sahifalash parametrlarini o'qiydi (limit cheklangan). */
export function parsePaging(
  url: string,
  opts: { defaultLimit?: number; maxLimit?: number } = {}
): { limit: number; cursor: string | null } {
  const { defaultLimit = 50, maxLimit = 100 } = opts;
  const sp = new URL(url).searchParams;
  const raw = parseInt(sp.get("limit") || "", 10);
  const limit = Number.isFinite(raw) ? Math.min(maxLimit, Math.max(1, raw)) : defaultLimit;
  return { limit, cursor: sp.get("cursor") };
}

/** Standart ro'yxat javobi: { items, nextCursor, total? } */
export function listOk(
  items: { id: string }[],
  limit: number,
  total?: number
) {
  let nextCursor: string | null = null;
  let out = items;
  if (items.length > limit) {
    out = items.slice(0, limit);
    nextCursor = out[out.length - 1]?.id ?? null;
  }
  return ok({ items: out, nextCursor, ...(total !== undefined ? { total } : {}) });
}

/** Sessiya foydalanuvchisini oladi yoki 401 qaytaradi */
export async function authGuard() {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, res: fail("Avtorizatsiya talab qilinadi", 401) };
  }
  return { user, res: null };
}

/** Faqat admin uchun — aks holda 403 */
export async function adminGuard() {
  const user = await getSessionUser();
  if (!user) return { user: null, res: fail("Avtorizatsiya talab qilinadi", 401) };
  if (user.role !== "ADMIN")
    return { user: null, res: fail("Ruxsat yo'q", 403) };
  return { user, res: null };
}

/**
 * Restoran foydalanuvchiga tegishli ekanini tekshiradi.
 * Egasi yoki a'zosi bo'lsa ruxsat beradi.
 */
export async function guardRestaurant(userId: string, restaurantId: string) {
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
    },
  });
  return restaurant;
}

/** Foydalanuvchining birinchi restoranini oladi */
export async function getUserRestaurant(userId: string) {
  return prisma.restaurant.findFirst({
    where: { OR: [{ ownerId: userId }, { memberships: { some: { userId } } }] },
    orderBy: { createdAt: "asc" },
  });
}

/** Foydalanuvchi restoran egasimi (owner) */
export async function isOwner(userId: string) {
  const r = await prisma.restaurant.findFirst({ where: { ownerId: userId } });
  return !!r;
}

/** Xodim (membership) ma'lumotini oladi */
export async function getMembership(userId: string) {
  return prisma.membership.findFirst({
    where: { userId },
    include: { restaurant: { select: { id: true, name: true, currency: true, slug: true } } },
  });
}
