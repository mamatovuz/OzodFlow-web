/**
 * Instagram OAuth yordamchi: ulash havolasini yaratish va CSRF himoyasi uchun
 * `state` ni imzolash/tekshirish (JWT). State ichida restaurantId saqlanadi.
 */
import { SignJWT, jwtVerify } from "jose";
import { IG_OAUTH_AUTHORIZE, IG_SCOPES, getIgConfig, getRedirectUri } from "./config";

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET || "ozodflow-dev-secret-change-me";
  return new TextEncoder().encode(s);
}

/** state = imzolangan JWT (restaurantId + tasodifiy nonce, 10 daqiqa amal qiladi) */
export async function signState(restaurantId: string): Promise<string> {
  return new SignJWT({ rid: restaurantId, n: crypto.randomUUID() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret());
}

export async function verifyState(state: string): Promise<{ restaurantId: string } | null> {
  try {
    const { payload } = await jwtVerify(state, secret());
    return { restaurantId: payload.rid as string };
  } catch {
    return null;
  }
}

/** Instagram ulash (login) havolasini yaratadi */
export async function buildAuthUrl(restaurantId: string): Promise<string> {
  const cfg = getIgConfig();
  const state = await signState(restaurantId);
  const params = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: IG_SCOPES.join(","),
    state,
  });
  return `${IG_OAUTH_AUTHORIZE}?${params.toString()}`;
}
