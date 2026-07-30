import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "ozodflow-dev-secret-change-me"
);
const COOKIE = "ozodflow_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  avatar: string | null;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

async function signToken(payload: { sub: string; sid: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(SECRET);
}

export async function createSession(
  userId: string,
  meta?: { userAgent?: string; ip?: string }
) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const tokenId = crypto.randomUUID();
  const jwt = await signToken({ sub: userId, sid: tokenId });

  await prisma.session.create({
    data: {
      id: tokenId,
      userId,
      token: jwt,
      userAgent: meta?.userAgent,
      ip: meta?.ip,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }
  cookieStore.delete(COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const sid = payload.sid as string;

    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) return null;

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      phone: session.user.phone,
      role: session.user.role,
      avatar: session.user.avatar,
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
