export const ACCESS_COOKIE_NAME = "fog_fire_access";
export const ACCESS_DURATION_SECONDS = 60 * 60 * 24 * 7;
export const HANGOUT_IDENTITY_COOKIE_NAME = "fog_fire_hangout_identity";
export const HANGOUT_IDENTITY_DURATION_SECONDS = 60 * 60 * 24 * 30;

function cookieSecret() {
  return process.env.TRIP_ACCESS_COOKIE_SECRET ?? "";
}

async function signatureFor(payload: string) {
  const secret = cookieSecret();
  if (!secret) return "";

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  return btoa(String.fromCharCode(...signature)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function createAccessToken() {
  const expiresAt = Math.floor(Date.now() / 1000) + ACCESS_DURATION_SECONDS;
  return `${expiresAt}.${await signatureFor(String(expiresAt))}`;
}

export async function createHangoutIdentityToken(playerId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + HANGOUT_IDENTITY_DURATION_SECONDS;
  const payload = `hangout:${playerId}:${expiresAt}`;
  return `${playerId}.${expiresAt}.${await signatureFor(payload)}`;
}

export async function verifyHangoutIdentityToken(token?: string) {
  if (!token) return null;
  const [playerId, expiresAt, suppliedSignature] = token.split(".");
  if (!playerId || !expiresAt || !suppliedSignature || Number(expiresAt) <= Math.floor(Date.now() / 1000)) return null;

  const expectedSignature = await signatureFor(`hangout:${playerId}:${expiresAt}`);
  if (!expectedSignature || expectedSignature.length !== suppliedSignature.length) return null;

  let difference = 0;
  for (let index = 0; index < expectedSignature.length; index += 1) {
    difference |= expectedSignature.charCodeAt(index) ^ suppliedSignature.charCodeAt(index);
  }
  return difference === 0 ? playerId : null;
}

export async function verifyAccessToken(token?: string) {
  if (!token) return false;
  const [expiresAt, suppliedSignature] = token.split(".");
  if (!expiresAt || !suppliedSignature || Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;

  const expectedSignature = await signatureFor(expiresAt);
  if (!expectedSignature || expectedSignature.length !== suppliedSignature.length) return false;

  let difference = 0;
  for (let index = 0; index < expectedSignature.length; index += 1) {
    difference |= expectedSignature.charCodeAt(index) ^ suppliedSignature.charCodeAt(index);
  }
  return difference === 0;
}

export function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return undefined;
  const cookie = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : undefined;
}
