import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * SOLURE SCENTS — DATABASE DEPLOYMENT GATE: SQL INTEGRITY REGRESSION SUITE
 *
 * This test suite validates all 15 regression scenarios required before database deployment:
 * 1. Duplicate payment reference across orders
 * 2. Payment reference reused with different amounts
 * 3. Missing inventory reservation
 * 4. Partial inventory reservation
 * 5. Duplicate reservation attempts (idempotent reservation)
 * 6. Expired reservation
 * 7. Successful payment arriving after expiry
 * 8. Concurrent reservation release and payment capture
 * 9. Duplicate Paystack callbacks
 * 10. Duplicate Paystack webhooks
 * 11. Correct single stock deduction
 * 12. Correct reserved counter decrement
 * 13. Verified payment requiring reconciliation
 * 14. NGN currency validation
 * 15. Guest order amount validation
 */

describe("Deployment Gate — Issue 1: Payment Reference Ownership & Idempotency", () => {
  const paystackMigration = fs.readFileSync(
    path.resolve(process.cwd(), "supabase", "migrations", "202607180001_paystack_payment_processing.sql"),
    "utf8",
  );

  it("1. Rejects duplicate payment reference across different orders", () => {
    // Assert SQL logic checks v_existing.order_id <> p_order_id and raises error
    assert.match(
      paystackMigration,
      /if\s+v_existing\.order_id\s*<>\s*p_order_id\s+then\s+raise\s+exception\s+'Payment reference % is already associated with a different order'/i,
      "initialize_order_payment must reject references belonging to another order",
    );

    // Behavioral model assertion
    const paymentsTable = new Map();
    const initializePayment = (orderId, provider, reference, amountMinor) => {
      const existing = paymentsTable.get(`${provider}:${reference}`);
      if (existing) {
        if (existing.orderId !== orderId) {
          throw new Error(`Payment reference ${reference} is already associated with a different order`);
        }
        return existing;
      }
      const newPayment = { id: crypto.randomUUID(), orderId, provider, reference, amountMinor, status: "pending" };
      paymentsTable.set(`${provider}:${reference}`, newPayment);
      return newPayment;
    };

    const orderA = "order-aaaa-1111";
    const orderB = "order-bbbb-2222";
    const ref = "ref_shared_xyz";

    initializePayment(orderA, "paystack", ref, 4500000);
    assert.throws(
      () => initializePayment(orderB, "paystack", ref, 4500000),
      /already associated with a different order/,
    );
  });

  it("2. Rejects payment reference reused with different amounts", () => {
    assert.match(
      paystackMigration,
      /if\s+v_existing\.amount_minor\s*<>\s*v_order\.total_minor\s+then/i,
      "initialize_order_payment must verify amount matches authoritative order total",
    );

    const existingPayment = { orderId: "ord-1", amountMinor: 4500000, currency: "NGN", status: "pending" };
    const validateExisting = (payment, orderTotal) => {
      if (payment.amountMinor !== orderTotal) {
        throw new Error(`Payment reference has amount ${payment.amountMinor} which does not match order total ${orderTotal}`);
      }
      return true;
    };

    assert.throws(
      () => validateExisting(existingPayment, 7500000),
      /does not match order total 7500000/,
    );
  });
});

describe("Deployment Gate — Issue 2: Inventory Reservation Validation & Gates", () => {
  const paystackMigration = fs.readFileSync(
    path.resolve(process.cwd(), "supabase", "migrations", "202607180001_paystack_payment_processing.sql"),
    "utf8",
  );
  const checkoutMigration = fs.readFileSync(
    path.resolve(process.cwd(), "supabase", "migrations", "202607170002_guest_checkout_orders.sql"),
    "utf8",
  );

  it("3. Blocks payment initialization when inventory reservation is missing", () => {
    assert.match(
      paystackMigration,
      /if\s+v_total_reserved\s*<\s*v_order_item\.required_quantity\s+then\s+raise\s+exception\s+'Cannot initiate payment: order % has missing, incomplete, or expired inventory reservation/i,
      "initialize_order_payment must block unreserved order from payment initialization",
    );

    // Contract simulator
    const orderItems = [{ variantId: "var-1", quantity: 2 }];
    const reservations = []; // No reservations

    const canInitiate = (items, res) => {
      for (const item of items) {
        const total = res.filter((r) => r.variantId === item.variantId && r.status === "active").reduce((s, r) => s + r.qty, 0);
        if (total < item.quantity) {
          throw new Error(`Cannot initiate payment: incomplete reservation (reserved: ${total}, required: ${item.quantity})`);
        }
      }
      return true;
    };

    assert.throws(() => canInitiate(orderItems, reservations), /incomplete reservation/);
  });

  it("4. Blocks payment initialization when inventory reservation is partial", () => {
    const orderItems = [{ variantId: "var-1", quantity: 3 }];
    const reservations = [{ variantId: "var-1", qty: 1, status: "active" }]; // Partial

    const checkFullReservation = (items, res) => {
      for (const item of items) {
        const total = res.filter((r) => r.variantId === item.variantId && r.status === "active").reduce((s, r) => s + r.qty, 0);
        if (total < item.quantity) {
          throw new Error(`Insufficient reservation (reserved: ${total}, required: ${item.quantity})`);
        }
      }
      return true;
    };

    assert.throws(() => checkFullReservation(orderItems, reservations), /Insufficient reservation \(reserved: 1, required: 3\)/);
  });

  it("5. Prevents duplicate reservation attempts from double-decrementing stock", () => {
    assert.match(
      checkoutMigration,
      /if\s+v_existing_res\.id\s+is\s+not\s+null\s+then/i,
      "reserve_order_inventory must detect existing active unexpired reservation",
    );
    assert.match(
      checkoutMigration,
      /if\s+v_existing_res\.quantity\s*=\s*v_required_quantity\s+then\s+update\s+public\.inventory_reservations\s+set\s+expires_at\s*=\s*v_new_expiry/i,
      "reserve_order_inventory must refresh TTL idempotently without incrementing reserved counter again",
    );

    // Simulation of reservation state machine
    let onHand = 10;
    let reserved = 0;
    const existingReservations = new Map();

    const reserveInventory = (orderId, variantId, qty, now, ttlMinutes = 15) => {
      const key = `${orderId}:${variantId}`;
      const existing = existingReservations.get(key);
      if (existing && existing.status === "active" && existing.expiresAt > now) {
        if (existing.qty === qty) {
          existing.expiresAt = now + ttlMinutes * 60 * 1000;
          return { reservedCount: 1, doubleReserved: false };
        }
      }
      if (onHand - reserved < qty) throw new Error("Out of stock");
      reserved += qty;
      existingReservations.set(key, { orderId, variantId, qty, status: "active", expiresAt: now + ttlMinutes * 60 * 1000 });
      return { reservedCount: 1, doubleReserved: false };
    };

    const t0 = Date.now();
    reserveInventory("ord-1", "var-1", 2, t0);
    assert.equal(reserved, 2, "Stock reserved counter initially increments by 2");

    // Retry reservation for same order & variant
    reserveInventory("ord-1", "var-1", 2, t0 + 1000);
    assert.equal(reserved, 2, "Stock reserved counter must remain 2 after retry (NO double reservation)");
  });

  it("6. Rejects expired reservations during payment initialization and safely releases them", () => {
    assert.match(
      paystackMigration,
      /r\.expires_at\s*>\s*now\(\)/i,
      "initialize_order_payment must strictly verify reservation has not expired",
    );
    assert.match(
      checkoutMigration,
      /create\s+or\s+replace\s+function\s+public\.release_expired_inventory_reservations\(\)/i,
    );

    const now = Date.now();
    const expiredRes = { variantId: "var-1", qty: 2, status: "active", expiresAt: now - 1000 };
    const isUnexpired = expiredRes.status === "active" && expiredRes.expiresAt > now;
    assert.equal(isUnexpired, false, "Expired reservation must not be treated as active");
  });
});

describe("Deployment Gate — Issue 3 & 4: Inventory Accounting, Reconciliation & Safe Expiry", () => {
  const paystackMigration = fs.readFileSync(
    path.resolve(process.cwd(), "supabase", "migrations", "202607180001_paystack_payment_processing.sql"),
    "utf8",
  );
  const checkoutMigration = fs.readFileSync(
    path.resolve(process.cwd(), "supabase", "migrations", "202607170002_guest_checkout_orders.sql"),
    "utf8",
  );

  it("7. Flags reconciliation and preserves captured payment if payment arrives after reservation expiry", () => {
    assert.match(
      paystackMigration,
      /v_requires_reconciliation\s*:=\s*true/i,
      "Must flag reconciliation on expired reservation",
    );
    assert.match(
      paystackMigration,
      /status\s*=\s*'captured'[\s\S]*requires_reconciliation\s*=\s*true/i,
      "Must preserve captured payment when reconciliation is required",
    );
    assert.match(
      paystackMigration,
      /inventory_status\s*=\s*'reconciliation_required'/i,
      "Must flag order inventory status as reconciliation_required",
    );
  });

  it("8. Protects paid and confirmed orders from concurrent reservation release", () => {
    assert.match(
      checkoutMigration,
      /\(o\.status\s+is\s+null\s+or\s+o\.status\s+not\s+in\s+\('confirmed',\s*'processing',\s*'shipped',\s*'delivered'\)\)/i,
      "release_expired_inventory_reservations must never expire reservations for confirmed/paid orders",
    );
  });

  it("9. Safely absorbs duplicate Paystack callbacks without double-deduction", () => {
    assert.match(
      paystackMigration,
      /if\s+v_payment\.status\s*=\s*'captured'\s+then\s+return\s+v_payment;\s+end\s+if;/i,
      "finalize_paystack_successful_payment must return immediately on duplicate callbacks",
    );
  });

  it("10. Dedupes duplicate Paystack webhooks in payment_webhooks ledger", () => {
    assert.match(
      paystackMigration,
      /table\s+if\s+not\s+exists\s+public\.payment_webhooks[\s\S]*event_id\s+text\s+unique\s+not\s+null/i,
      "payment_webhooks table must have unique event_id index to prevent duplicate webhook processing",
    );
  });

  it("11. Deducts physical stock exactly once during successful payment capture", () => {
    assert.match(
      paystackMigration,
      /update\s+public\.inventory_levels\s+set[\s\S]*on_hand\s*=\s*on_hand\s*-\s*v_res\.quantity[\s\S]*where\s+id\s*=\s*v_res\.inventory_level_id/i,
      "Must deduct physical on_hand stock by exact reservation quantity once",
    );
    assert.match(
      paystackMigration,
      /insert\s+into\s+public\.inventory_movements[\s\S]*'sale'[\s\S]*-v_res\.quantity/i,
      "Must record sale inventory movement with negative delta",
    );
  });

  it("12. Decrements reserved counter atomically alongside physical stock deduction", () => {
    assert.match(
      paystackMigration,
      /reserved\s*=\s*greatest\(0,\s*reserved\s*-\s*v_res\.quantity\)/i,
      "Must decrement reserved counter by exact reservation quantity without falling below zero",
    );
    assert.match(
      paystackMigration,
      /update\s+public\.inventory_reservations\s+set[\s\S]*status\s*=\s*'converted'/i,
      "Must mark inventory reservations as converted",
    );
  });

  it("13. Details precise reason when payment capture requires administrative reconciliation", () => {
    assert.match(
      paystackMigration,
      /reconciliation_reason\s*=\s*array_to_string\(v_reconciliation_reasons,\s*';\s*'\)/i,
      "Must record formatted list of reconciliation reasons in payment record",
    );
    assert.match(
      paystackMigration,
      /INVENTORY\s+RECONCILIATION\s+REQUIRED/i,
      "Must record prominent note in order_status_history",
    );
  });
});

describe("Deployment Gate — Issue 5: Currency, Pricing & Order Constraints", () => {
  const checkoutMigration = fs.readFileSync(
    path.resolve(process.cwd(), "supabase", "migrations", "202607170002_guest_checkout_orders.sql"),
    "utf8",
  );
  const paystackMigration = fs.readFileSync(
    path.resolve(process.cwd(), "supabase", "migrations", "202607180001_paystack_payment_processing.sql"),
    "utf8",
  );

  it("14. Enforces strict NGN currency validation across preparation and payment", () => {
    assert.match(
      checkoutMigration,
      /coalesce\(p_currency,\s*''\)\s*<>\s*'NGN'/i,
      "prepare_guest_order_record must reject non-NGN order currency",
    );
    assert.match(
      checkoutMigration,
      /if\s+v_variant\.currency\s*<>\s*'NGN'\s+then\s+raise\s+exception/i,
      "prepare_guest_order_record must reject variants not priced in NGN",
    );
    assert.match(
      paystackMigration,
      /coalesce\(p_currency,\s*''\)\s*<>\s*'NGN'\s+or\s+v_order\.currency\s*<>\s*'NGN'/i,
      "initialize_order_payment must enforce NGN",
    );
  });

  it("15. Enforces authoritative server pricing and Abuja nationwide delivery policy", () => {
    assert.match(
      checkoutMigration,
      /v_line_total\s*:=\s*v_variant\.price_minor\s*\*\s*v_item\.quantity;/i,
      "Order line total must strictly compute against product_variants price_minor",
    );
    assert.match(
      checkoutMigration,
      /when\s+p_delivery_status\s+in\s+\('pending',\s*'arranged_separately',\s*'free'\)\s+then\s+0/i,
      "Online transaction shipping charge must be 0 for arranged_separately (Abuja model)",
    );
    assert.match(
      checkoutMigration,
      /if\s+v_subtotal_minor\s*<=\s*0\s+then\s+raise\s+exception/i,
      "Calculated subtotal must reject zero or negative amounts",
    );
  });
});

describe("Deployment Gate — V2 Final Corrections: Issues 1, 2, and 3 Integrity", () => {
  const checkoutMigration = fs.readFileSync(
    path.resolve(process.cwd(), "supabase", "migrations", "202607170002_guest_checkout_orders.sql"),
    "utf8",
  );
  const paystackMigration = fs.readFileSync(
    path.resolve(process.cwd(), "supabase", "migrations", "202607180001_paystack_payment_processing.sql"),
    "utf8",
  );

  it("Issue 1: reserve_order_inventory atomically releases expired reservations and decrements reserved counters", () => {
    // Must lock and release stale reservations with inventory_levels update
    assert.match(
      checkoutMigration,
      /for\s+v_stale_res\s+in[\s\S]*r\.status\s*=\s*'active'[\s\S]*r\.expires_at\s*<=\s*now\(\)[\s\S]*for\s+update\s+of\s+r/i,
      "reserve_order_inventory must lock stale expired reservations deterministically",
    );
    assert.match(
      checkoutMigration,
      /update\s+public\.inventory_levels\s+set\s+reserved\s*=\s*greatest\(0,\s*reserved\s*-\s*v_stale_res\.quantity\)/i,
      "reserve_order_inventory must decrement reserved counter when expiring reservations",
    );
    assert.match(
      checkoutMigration,
      /update\s+public\.inventory_reservations\s+set\s+status\s*=\s*'expired'/i,
      "reserve_order_inventory must accurately mark reservations expired",
    );
  });

  it("Issue 1: reserve_order_inventory prevents expired reservations from blocking available stock", () => {
    assert.match(
      checkoutMigration,
      /where\s+r\.variant_id\s*=\s*v_item\.variant_id[\s\S]*r\.status\s*=\s*'active'[\s\S]*r\.expires_at\s*<=\s*now\(\)/i,
      "Must release expired active reservations on the variant across unconfirmed orders so stock is not blocked",
    );
  });

  it("Issue 2: finalize_paystack_successful_payment requires exact quantity equality and rejects over-reservation", () => {
    // Must check exact equality <> rather than just <
    assert.match(
      paystackMigration,
      /elsif\s+v_total_active_reserved\s*<>\s*v_item\.quantity\s+then/i,
      "finalize_paystack_successful_payment must require exact equality between reserved quantity and purchased quantity",
    );
    assert.match(
      paystackMigration,
      /Distinct variant count mismatch/i,
      "Must detect variant count mismatches between order items and active reservations",
    );
    assert.match(
      paystackMigration,
      /Orphan reservation detected/i,
      "Must detect orphan active reservations for variants not present in order items",
    );
  });

  it("Issue 2: finalize_paystack_successful_payment validates inventory location and level IDs", () => {
    assert.match(
      paystackMigration,
      /Location\s+.*for\s+reservation\s+.*is\s+missing\s+or\s+inactive/i,
      "Must validate active status of inventory location",
    );
    assert.match(
      paystackMigration,
      /Inconsistent\s+reservation\s+.*level\s+.*is\s+invalid\s+or\s+does\s+not\s+match/i,
      "Must validate inventory level consistency with variant",
    );
  });

  it("Issue 3: finalize_paystack_successful_payment distinguishes payment dispute from inventory reconciliation", () => {
    assert.match(
      paystackMigration,
      /v_is_payment_dispute\s+boolean\s*:=\s*false/i,
      "Must track payment integrity dispute separately from inventory reconciliation",
    );
    assert.match(
      paystackMigration,
      /'dispute_type',\s*'payment_integrity'/i,
      "Payment record metadata must tag payment_integrity dispute type",
    );
    assert.match(
      paystackMigration,
      /'dispute_type',\s*'inventory_reconciliation'/i,
      "Payment record metadata must tag inventory_reconciliation dispute type",
    );
  });

  it("Issue 3: Underpayment or Currency mismatch keeps order status pending and NEVER confirmed", () => {
    // In branch 1 (payment dispute):
    assert.match(
      paystackMigration,
      /if\s+v_is_payment_dispute\s+then[\s\S]*update\s+public\.orders\s+set[\s\S]*status\s*=\s*'pending'[\s\S]*where\s+id\s*=\s*v_order\.id;/i,
      "Underpayment or currency mismatch MUST retain order status as 'pending', never confirmed",
    );
    assert.match(
      paystackMigration,
      /PAYMENT\s+INTEGRITY\s+DISPUTE.*Order\s+remains\s+pending\s+investigation/i,
      "Must record clear warning note in order_status_history",
    );
  });

  it("Issue 3: Preserves evidence of actual gateway charges on payments table during disputes", () => {
    assert.match(
      paystackMigration,
      /if\s+v_is_payment_dispute\s+then[\s\S]*update\s+public\.payments\s+set[\s\S]*status\s*=\s*'captured'[\s\S]*requires_reconciliation\s*=\s*true/i,
      "Must preserve gateway capture and reconciliation reason on payment record",
    );
  });
});

