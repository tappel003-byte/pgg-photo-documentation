import { createHmac, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

const COOKIE_NAME = "pgg-office-session";
const SESSION_DAYS = 14;
const SESSION_MAX_AGE = 60 * 60 * 24 * SESSION_DAYS;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

/** Session HMAC secret: NLF_SESSION_SECRET (at least 16 characters). */
function sessionSecret(): string | null {
  const secret = process.env.NLF_SESSION_SECRET?.trim();
  return secret && secret.length >= 16 ? secret : null;
}

/** Company office password: NLF_OFFICE_PASSWORD. */
function configuredOfficePassword(): string | null {
  return process.env.NLF_OFFICE_PASSWORD?.trim() || null;
}

function signPayload(payload: string): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifySignedToken(token: string): boolean {
  const secret = sessionSecret();
  if (!secret) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  try {
    if (sig.length !== expected.length) return false;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  } catch {
    return false;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      v?: number;
      exp?: number;
    };
    return data.v === 1 && typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

export function officeAuthConfigured(): boolean {
  return Boolean(sessionSecret() && configuredOfficePassword());
}

export function verifyOfficePassword(password: string): boolean {
  const expected = configuredOfficePassword();
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function issueOfficeSession(): void {
  const exp = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = Buffer.from(JSON.stringify({ v: 1, exp }), "utf8").toString("base64url");
  const token = signPayload(payload);
  if (!token) throw new Error("Office session secret is not configured.");
  setCookie(COOKIE_NAME, token, cookieOptions);
}

export function clearOfficeSession(): void {
  deleteCookie(COOKIE_NAME, cookieOptions);
}

export function hasValidOfficeSession(): boolean {
  const token = getCookie(COOKIE_NAME);
  if (!token) return false;
  return verifySignedToken(token);
}
