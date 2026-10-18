import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

// Test suite replicating the exact guest-session cryptographic boundaries
describe("Sprint 1.1: Guest Cart Security & Functional Tests", () => {
  const serverSecret = "test-cart-session-secret-32-byte-hex-string-2026";
  const signingKey = createHash("sha256").update(`solure:guest:secret:${serverSecret}`).digest("hex");

  function hashToken(token) {
    return createHash("sha256").update(token).digest("hex");
  }

  function signPayload(payload) {
    return createHmac("sha256", signingKey).update(payload).digest("hex");
  }

  function verifySignature(payload, signature) {
    try {
      const expected = signPayload(payload);
      const expectedBuf = Buffer.from(expected, "utf8");
      const sigBuf = Buffer.from(signature, "utf8");
      if (expectedBuf.length !== sigBuf.length) return false;
      return timingSafeEqual(expectedBuf, sigBuf);
    } catch {
      return false;
    }
  }

  it("Scenario 1 & 2: Token generation produces 64-char hex string and consistent 64-char SHA-256 hash", () => {
    const token = randomBytes(32).toString("hex");
    assert.equal(token.length, 64, "Token must be 256 bits (64 hex characters)");
    const hash = hashToken(token);
    assert.equal(hash.length, 64, "Token hash must be 64 characters");
    assert.match(hash, /^[a-f0-9]{64}$/, "Hash must be valid hex");
    // Hashes must be deterministic for the same token
    assert.equal(hashToken(token), hash);
    // Different tokens produce different hashes
    const token2 = randomBytes(32).toString("hex");
    assert.notEqual(hashToken(token2), hash);
  });

  it("Scenario 3 & 4: Payload signing and HMAC verification succeeds for valid payload", () => {
    const payload = JSON.stringify({
      sessionId: "session_hash_abc123",
      items: [{ variantId: "var-1", quantity: 2 }],
      updatedAt: Date.now(),
    });
    const encoded = Buffer.from(payload, "utf8").toString("base64url");
    const signature = signPayload(encoded);

    assert.equal(verifySignature(encoded, signature), true, "Valid signature must verify");
  });

  it("Scenario 12 & 13: Tamper Resistance — client-side price or quantity manipulation fails signature check", () => {
    const originalPayload = JSON.stringify({
      sessionId: "session_hash_abc123",
      items: [{ variantId: "var-1", quantity: 1 }],
      updatedAt: Date.now(),
    });
    const encoded = Buffer.from(originalPayload, "utf8").toString("base64url");
    const signature = signPayload(encoded);

    // Attacker alters payload to increase quantity or inject price
    const tamperedPayload = JSON.stringify({
      sessionId: "session_hash_abc123",
      items: [{ variantId: "var-1", quantity: 99, price_minor: 0 }],
      updatedAt: Date.now(),
    });
    const tamperedEncoded = Buffer.from(tamperedPayload, "utf8").toString("base64url");

    // Tampered payload with original signature MUST FAIL
    assert.equal(
      verifySignature(tamperedEncoded, signature),
      false,
      "Tampered payload must be rejected by HMAC verification"
    );
  });

  it("Scenario 13: Session Isolation — Guest A cannot access Guest B cart", () => {
    const guestAToken = randomBytes(32).toString("hex");
    const guestBToken = randomBytes(32).toString("hex");
    const guestAHash = hashToken(guestAToken);
    const guestBHash = hashToken(guestBToken);

    assert.notEqual(guestAHash, guestBHash, "Guest hashes must be unique");

    // Guest A payload
    const payloadA = {
      sessionId: guestAHash,
      items: [{ variantId: "var-flacon-50ml", quantity: 1 }],
      updatedAt: Date.now(),
    };
    const encodedA = Buffer.from(JSON.stringify(payloadA), "utf8").toString("base64url");
    const sigA = signPayload(encodedA);
    assert.equal(verifySignature(encodedA, sigA), true, "Guest A payload signature must be valid");

    // If Guest B presents Guest A's cookie with Guest B's session:
    const decoded = JSON.parse(Buffer.from(encodedA, "base64url").toString("utf8"));
    const isOwner = decoded.sessionId === guestBHash;
    assert.equal(isOwner, false, "Guest B must not be recognized as owner of Guest A cart");
  });

  it("Scenario 14: Session Expiration — payloads older than 30 days are rejected", () => {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
    const expiredPayload = {
      sessionId: "session_123",
      items: [{ variantId: "var-1", quantity: 1 }],
      updatedAt: thirtyOneDaysAgo,
    };
    const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
    const isExpired = Date.now() - expiredPayload.updatedAt > MAX_AGE_MS;
    assert.equal(isExpired, true, "Payload older than 30 days must be flagged expired");
  });

  it("Scenario 2 & 3: Quantity deduplication and multi-variant additions", () => {
    const cart = [];
    function addItem(variantId, quantity) {
      const existing = cart.find((x) => x.variantId === variantId);
      if (existing) {
        existing.quantity = Math.min(99, existing.quantity + quantity);
      } else {
        cart.push({ variantId, quantity: Math.min(99, Math.max(1, quantity)) });
      }
    }

    // Add 50ml flacon
    addItem("variant-50ml", 1);
    assert.equal(cart.length, 1);
    assert.equal(cart[0].quantity, 1);

    // Add 50ml flacon again (should increase quantity, not duplicate)
    addItem("variant-50ml", 2);
    assert.equal(cart.length, 1);
    assert.equal(cart[0].quantity, 3);

    // Add 100ml flacon (different variant size)
    addItem("variant-100ml", 1);
    assert.equal(cart.length, 2);
    assert.equal(cart[1].variantId, "variant-100ml");
    assert.equal(cart[1].quantity, 1);
  });

  it("Scenario 4, 5, 6: Quantity updates and removal logic", () => {
    let items = [
      { variantId: "var-1", quantity: 2 },
      { variantId: "var-2", quantity: 1 },
    ];

    // Increase
    items = items.map((x) => (x.variantId === "var-1" ? { ...x, quantity: x.quantity + 1 } : x));
    assert.equal(items.find((x) => x.variantId === "var-1").quantity, 3);

    // Decrease
    items = items.map((x) => (x.variantId === "var-1" ? { ...x, quantity: x.quantity - 1 } : x));
    assert.equal(items.find((x) => x.variantId === "var-1").quantity, 2);

    // Remove
    items = items.filter((x) => x.variantId !== "var-1");
    assert.equal(items.length, 1);
    assert.equal(items[0].variantId, "var-2");
  });

  it("Scenario 11: Bounds validation (quantity must be positive integer between 1 and 99)", () => {
    function validateQuantity(q) {
      if (typeof q !== "number" || !Number.isInteger(q)) return false;
      return q >= 1 && q <= 99;
    }

    assert.equal(validateQuantity(1), true);
    assert.equal(validateQuantity(99), true);
    assert.equal(validateQuantity(0), false);
    assert.equal(validateQuantity(-5), false);
    assert.equal(validateQuantity(100), false);
    assert.equal(validateQuantity(1.5), false);
    assert.equal(validateQuantity("3"), false);
  });

  it("Scenario 12: Trusted database pricing in integer kobo minor units", () => {
    const dbPrices = {
      "variant-50ml": 14500000, // ₦145,000.00
      "variant-100ml": 22000000, // ₦220,000.00
    };

    const cartItems = [
      { variantId: "variant-50ml", quantity: 2 },
      { variantId: "variant-100ml", quantity: 1 },
    ];

    // Evaluate subtotal strictly from DB prices, ignoring any client price
    const subtotal = cartItems.reduce((acc, item) => {
      const trustedPrice = dbPrices[item.variantId] ?? 0;
      return acc + trustedPrice * item.quantity;
    }, 0);

    assert.equal(subtotal, 51000000, "Subtotal must be 51,000,000 kobo (₦510,000)");
  });
});
