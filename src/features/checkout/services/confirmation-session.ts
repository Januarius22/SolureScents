import { createHmac, createHash, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

const CONFIRMATION_COOKIE_NAME = "solure_order_conf_auth";
const CONFIRMATION_TTL_MS = 30 * 60 * 1000; // 30 minutes

let runtimeDevSecret: string | null = null;

function getSigningKey(): string {
  const secret = process.env.CART_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (secret && secret.length >= 16) {
    return createHash("sha256").update(`solure:conf:secret:${secret}`).digest("hex");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "CART_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY must be configured in production for order confirmation security.",
    );
  }

  if (!runtimeDevSecret) {
    runtimeDevSecret = randomBytes(32).toString("hex");
  }
  return createHash("sha256").update(`solure:conf:runtime:${runtimeDevSecret}`).digest("hex");
}

export interface ConfirmationSessionPayload {
  orderId: string;
  orderNumber: string;
  tokenHash: string;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Signs an order confirmation authorization payload using HMAC-SHA256.
 */
export function signConfirmationPayload(payload: ConfirmationSessionPayload): string {
  const key = getSigningKey();
  const serialized = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", key).update(serialized).digest("hex");
  return `${serialized}.${signature}`;
}

/**
 * Verifies and decodes a confirmation authorization cookie value.
 * Performs constant-time HMAC check and asserts timestamp expiration.
 */
export function verifyConfirmationCookie(rawCookie: string): ConfirmationSessionPayload | null {
  if (!rawCookie || typeof rawCookie !== "string" || !rawCookie.includes(".")) {
    return null;
  }

  const [serialized, signature] = rawCookie.split(".");
  if (!serialized || !signature) return null;

  try {
    const key = getSigningKey();
    const expectedSig = createHmac("sha256", key).update(serialized).digest("hex");
    const expectedBuf = Buffer.from(expectedSig, "utf8");
    const sigBuf = Buffer.from(signature, "utf8");

    if (expectedBuf.length !== sigBuf.length || !timingSafeEqual(expectedBuf, sigBuf)) {
      return null;
    }

    const payloadJson = Buffer.from(serialized, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as ConfirmationSessionPayload;

    // Verify expiry
    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Issues an HTTP-only confirmation authorization cookie for a newly prepared order.
 * Replaces transmitting capability tokens via URL query parameters.
 */
export async function issueConfirmationAuthorization(
  orderId: string,
  orderNumber: string,
  tokenHash: string,
): Promise<void> {
  const now = Date.now();
  const payload: ConfirmationSessionPayload = {
    orderId,
    orderNumber,
    tokenHash,
    issuedAt: now,
    expiresAt: now + CONFIRMATION_TTL_MS,
  };

  const signed = signConfirmationPayload(payload);
  const cookieStore = await cookies();

  cookieStore.set(CONFIRMATION_COOKIE_NAME, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/checkout/confirmation",
    maxAge: 30 * 60, // 30 minutes
  });
}

/**
 * Reads and verifies the active confirmation authorization cookie for a given order.
 */
export async function getActiveConfirmationAuth(
  targetOrderId?: string | null,
): Promise<ConfirmationSessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CONFIRMATION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const verified = verifyConfirmationCookie(raw);
  if (!verified) return null;

  // If a specific order ID or number is requested, assert it matches this session
  if (targetOrderId) {
    if (verified.orderId !== targetOrderId && verified.orderNumber !== targetOrderId) {
      return null;
    }
  }

  return verified;
}
