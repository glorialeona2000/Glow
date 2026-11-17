import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";

export function newToken() {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newRef() {
  const bytes = randomBytes(6);
  let s = "";
  for (const b of bytes) s += REF_ALPHABET[b % REF_ALPHABET.length];
  return `BV-${s}`;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-nf-client-connection-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    "0.0.0.0"
  );
}

/** L'adresse IP n'est jamais stockée en clair : uniquement une empreinte salée (anti-abus). */
export function hashIp(ip: string) {
  const salt = process.env.IP_HASH_SALT || "belavica";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export function turnstileEnabled() {
  return !!(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

export async function verifyTurnstile(token: string | null | undefined, ip: string): Promise<boolean> {
  if (!turnstileEnabled()) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch {
    return false;
  }
}

export function siteUrl() {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}


function appSecret() {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 32) throw new Error("APP_SECRET manquant ou trop court (32 caractères minimum).");
  return s;
}

/** Jeton du lien "gérer mon rendez-vous" : signature HMAC de l'identifiant (rien à stocker). */
export function manageToken(bookingId: string) {
  return createHmac("sha256", appSecret()).update(`manage:${bookingId}`).digest("base64url").slice(0, 32);
}

export function manageUrl(bookingId: string) {
  return `${siteUrl()}/rdv/${bookingId}.${manageToken(bookingId)}`;
}

export function verifyManageParam(param: string): string | null {
  const [id, token] = decodeURIComponent(param).split(".");
  if (!id || !token || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const expected = Buffer.from(manageToken(id));
  const given = Buffer.from(token);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return id;
}
