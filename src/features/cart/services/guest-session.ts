import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const GUEST_SESSION_COOKIE_NAME = "solure_guest_session";
const GUEST_CART_DATA_COOKIE_NAME = "solure_guest_cart_data";
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

let runtimeDevSecret: string | undefined;

/**
 * Derives a private server-side secret key for HMAC validation without exposing raw secrets.
 * Strictly requires a private server secret in production and rejects public key fallbacks.
 */
function getSigningSecret(): string {
  const secret = process.env.CART_SESSION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (secret && secret.length >= 16) {
    return createHash("sha256").update(`solure:guest:secret:${secret}`).digest("hex");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "CART_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY must be configured in production for secure guest session signing.",
    );
  }

  // Development/Test fallback: stable development key ensures consistency across Next.js workers and reloads
  if (!runtimeDevSecret) {
    runtimeDevSecret = "solure_dev_guest_cart_session_secret_lagos_2026";
  }
  return createHash("sha256").update(`solure:guest:runtime:${runtimeDevSecret}`).digest("hex");
}

export interface GuestCartDataPayload {
  sessionId: string;
  items: { variantId: string; quantity: number }[];
  updatedAt: number;
}

/**
 * Computes a SHA-256 one-way hash of an opaque guest session token.
 * Used for database lookups and storage without persisting raw tokens.
 */
export function hashGuestSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates an HMAC-SHA256 signature for a string payload using the server secret.
 */
function signPayload(payload: string): string {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("hex");
}

/**
 * Verifies that a signed value matches its HMAC signature using constant-time comparison.
 */
function verifySignature(payload: string, signature: string): boolean {
  try {
    const expected = signPayload(payload);
    const expectedBuffer = Buffer.from(expected, "utf8");
    const signatureBuffer = Buffer.from(signature, "utf8");
    if (expectedBuffer.length !== signatureBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch {
    return false;
  }
}

/**
 * Resolves the active guest session token from HTTP-only cookies, or creates a new one.
 * Must only be called within Next.js Server Actions or Route Handlers where cookies can be set.
 */
export async function getOrCreateGuestSession(): Promise<{ token: string; tokenHash: string; isNew: boolean }> {
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(GUEST_SESSION_COOKIE_NAME)?.value;

  if (existingCookie && existingCookie.length === 64) {
    return {
      token: existingCookie,
      tokenHash: hashGuestSessionToken(existingCookie),
      isNew: false,
    };
  }

  // Generate cryptographically secure 256-bit opaque random token (64 hex characters)
  const newToken = randomBytes(32).toString("hex");
  const tokenHash = hashGuestSessionToken(newToken);

  cookieStore.set(GUEST_SESSION_COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });

  return { token: newToken, tokenHash, isNew: true };
}

/**
 * Reads existing guest session token without creating a new cookie if absent.
 */
export async function readGuestSession(): Promise<{ token: string; tokenHash: string } | null> {
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(GUEST_SESSION_COOKIE_NAME)?.value;
  if (!existingCookie || existingCookie.length !== 64) return null;

  return {
    token: existingCookie,
    tokenHash: hashGuestSessionToken(existingCookie),
  };
}

/**
 * Reads and verifies the signed guest cart payload from the HTTP-only cookie.
 * Prevents client tampering, validates expiration, and ensures data matches the active session.
 */
export async function readGuestCartPayload(): Promise<GuestCartDataPayload | null> {
  const cookieStore = await cookies();
  const session = await readGuestSession();
  if (!session) return null;

  const rawCookie = cookieStore.get(GUEST_CART_DATA_COOKIE_NAME)?.value;
  if (!rawCookie) return { sessionId: session.tokenHash, items: [], updatedAt: Date.now() };

  const dotIndex = rawCookie.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const encodedPayload = rawCookie.slice(0, dotIndex);
  const signature = rawCookie.slice(dotIndex + 1);

  if (!verifySignature(encodedPayload, signature)) {
    console.warn("Invalid guest cart signature detected; discarding corrupted state.");
    return null;
  }

  try {
    const jsonString = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const parsed = JSON.parse(jsonString) as GuestCartDataPayload;

    // Verify session match
    if (parsed.sessionId !== session.tokenHash) {
      console.warn("Session ID mismatch in guest cart cookie; discarding state.");
      return null;
    }

    // Verify expiration within 30 days
    if (Date.now() - parsed.updatedAt > COOKIE_MAX_AGE_SECONDS * 1000) {
      console.warn("Guest cart cookie payload has expired; discarding state.");
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("Failed to parse guest cart payload", error);
    return null;
  }
}

/**
 * Serializes, signs, and writes the guest cart payload into an HTTP-only secure cookie.
 */
export async function writeGuestCartPayload(items: { variantId: string; quantity: number }[]): Promise<void> {
  const cookieStore = await cookies();
  const { tokenHash } = await getOrCreateGuestSession();

  const payload: GuestCartDataPayload = {
    sessionId: tokenHash,
    items: items.filter((x) => x.quantity > 0 && x.quantity <= 99),
    updatedAt: Date.now(),
  };

  const jsonString = JSON.stringify(payload);
  const encodedPayload = Buffer.from(jsonString, "utf8").toString("base64url");
  const signature = signPayload(encodedPayload);
  const signedCookieValue = `${encodedPayload}.${signature}`;

  cookieStore.set(GUEST_CART_DATA_COOKIE_NAME, signedCookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
}

/**
 * Clears the guest cart cookie upon order completion or manual bag emptying.
 */
export async function clearGuestCartCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_CART_DATA_COOKIE_NAME);
}
