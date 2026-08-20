/* Signierte Sessions als HttpOnly-Cookie: HMAC-SHA256, kein Server-Store. */

export interface SessionUser {
  id: string;
  login: string;
  name: string;
  avatar: string;
}

const enc = new TextEncoder();
const SESSION_MAX_AGE_S = 30 * 24 * 3600;

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSession(
  user: SessionUser,
  secret: string,
  now: number = Date.now(),
): Promise<string> {
  const payload = { ...user, exp: now + SESSION_MAX_AGE_S * 1000 };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body));
  return `${body}.${b64url(new Uint8Array(sig))}`;
}

export async function verifySession(
  token: string | null,
  secret: string,
  now: number = Date.now(),
): Promise<SessionUser | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let sigBytes: Uint8Array;
  try {
    sigBytes = b64urlDecode(sig);
  } catch {
    return null;
  }
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), sigBytes, enc.encode(body));
  if (!ok) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    if (typeof data.exp !== "number" || data.exp < now) return null;
    const { id, login, name, avatar } = data;
    if ([id, login, name, avatar].some((v) => typeof v !== "string")) return null;
    return { id, login, name, avatar };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string): string {
  return `floss_session=${token}; Max-Age=${SESSION_MAX_AGE_S}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie(): string {
  return `floss_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function getCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq) === name) return part.slice(eq + 1);
  }
  return null;
}
