import { describe, it, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

/**
 * SOLURE SCENTS — POSTGRESQL BEHAVIORAL INTEGRITY TEST SUITE (PGlite PostgreSQL 16)
 *
 * Targeted tests for:
 * 1. Expiry releases reserved counters.
 * 2. Repeated expiry cannot double-release.
 * 3. Expiry and payment callback concurrency.
 * 4. Excess reservation cannot over-deduct stock.
 * 5. Exact quantity fulfillment.
 * 6. Insufficient reservation reconciliation.
 * 7. Underpayment does not confirm an order.
 * 8. Wrong-currency transaction does not confirm an order.
 * 9. Duplicate callback does not deduct twice.
 */

describe("PostgreSQL Behavioral Verification — Real PostgreSQL 16 Execution", () => {
  let db;

  const initSchema = async () => {
    db = new PGlite();

    // 1. Core Schema Setup
    await db.exec(`
      CREATE SCHEMA IF NOT EXISTS extensions;
      CREATE DOMAIN extensions.citext AS text;

      CREATE TABLE IF NOT EXISTS public.orders (
        id uuid primary key default gen_random_uuid(),
        order_number text unique default 'SOL-' || floor(random() * 1000000)::text,
        profile_id uuid,
        guest_session_hash text,
        guest_access_token_hash text,
        status text not null default 'pending',
        fulfillment_status text not null default 'unfulfilled',
        inventory_status text not null default 'pending',
        currency text not null default 'NGN',
        subtotal_minor bigint not null default 0,
        discount_minor bigint not null default 0,
        shipping_minor bigint not null default 0,
        tax_minor bigint not null default 0,
        total_minor bigint generated always as (subtotal_minor - discount_minor + shipping_minor + tax_minor) stored,
        customer_email extensions.citext,
        customer_note text,
        delivery_status text not null default 'pending',
        is_total_settled boolean not null default true,
        placed_at timestamptz,
        expires_at timestamptz,
        shipping_address jsonb default '{}'::jsonb,
        billing_address jsonb default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      CREATE TABLE IF NOT EXISTS public.order_items (
        id uuid primary key default gen_random_uuid(),
        order_id uuid not null references public.orders(id) on delete cascade,
        variant_id uuid not null,
        product_name text not null,
        variant_label text not null,
        brand_name text not null default 'Solure Scents',
        sku text not null,
        quantity integer not null check (quantity > 0),
        unit_price_minor bigint not null,
        discount_minor bigint not null default 0,
        currency text not null default 'NGN',
        created_at timestamptz not null default now()
      );

      CREATE TABLE IF NOT EXISTS public.inventory_locations (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        is_active boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      CREATE TABLE IF NOT EXISTS public.inventory_levels (
        id uuid primary key default gen_random_uuid(),
        variant_id uuid not null,
        location_id uuid not null references public.inventory_locations(id),
        on_hand integer not null default 0 check (on_hand >= 0),
        reserved integer not null default 0 check (reserved >= 0),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      CREATE TABLE IF NOT EXISTS public.inventory_reservations (
        id uuid primary key default gen_random_uuid(),
        order_id uuid references public.orders(id) on delete cascade,
        inventory_level_id uuid not null references public.inventory_levels(id),
        variant_id uuid not null,
        quantity integer not null check (quantity > 0),
        status text not null default 'active',
        expires_at timestamptz not null,
        released_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      CREATE TABLE IF NOT EXISTS public.inventory_movements (
        id uuid primary key default gen_random_uuid(),
        inventory_level_id uuid not null references public.inventory_levels(id),
        reason text not null,
        quantity_delta integer not null,
        reference_type text,
        reference_id uuid,
        note text,
        created_at timestamptz not null default now()
      );

      CREATE TABLE IF NOT EXISTS public.payments (
        id uuid primary key default gen_random_uuid(),
        order_id uuid not null references public.orders(id),
        provider text not null,
        provider_reference text not null unique,
        idempotency_key text,
        amount_minor bigint not null,
        currency text not null default 'NGN',
        status text not null default 'pending',
        customer_email text,
        channel text,
        gateway_response text,
        paid_at timestamptz,
        captured_at timestamptz,
        metadata jsonb default '{}'::jsonb,
        provider_metadata jsonb default '{}'::jsonb,
        requires_reconciliation boolean not null default false,
        reconciliation_reason text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      CREATE TABLE IF NOT EXISTS public.payment_events (
        id uuid primary key default gen_random_uuid(),
        payment_id uuid not null references public.payments(id),
        provider text not null,
        provider_event_id text unique,
        event_type text not null,
        payload jsonb default '{}'::jsonb,
        processed_at timestamptz not null default now(),
        created_at timestamptz not null default now()
      );

      CREATE TABLE IF NOT EXISTS public.order_status_history (
        id uuid primary key default gen_random_uuid(),
        order_id uuid not null references public.orders(id) on delete cascade,
        from_status text,
        to_status text not null,
        note text,
        created_at timestamptz not null default now()
      );

      CREATE TABLE IF NOT EXISTS public.products (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        status text not null default 'active',
        brand_id uuid
      );

      CREATE TABLE IF NOT EXISTS public.product_variants (
        id uuid primary key default gen_random_uuid(),
        product_id uuid not null references public.products(id),
        sku text not null,
        label text not null,
        price_minor bigint not null,
        currency text not null default 'NGN',
        status text not null default 'active',
        is_available boolean not null default true
      );
    `);

    // 2. Load the actual stored procedures from the migration files
    const checkoutSql = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/migrations/202607170002_guest_checkout_orders.sql"),
      "utf8"
    );
    const paystackSql = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/migrations/202607180001_paystack_payment_processing.sql"),
      "utf8"
    );

    // Extract reserve_order_inventory, release_order_inventory, release_expired_inventory_reservations
    const extractFunction = (sql, name) => {
      const regex = new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\)\\s*returns[\\s\\S]*?\\$\\$[\\s\\S]*?\\$\\$;`, "i");
      const match = sql.match(regex);
      if (!match) throw new Error(`Function ${name} not found in SQL migration`);
      return match[0];
    };

    const reserveFn = extractFunction(checkoutSql, "reserve_order_inventory");
    const releaseFn = extractFunction(checkoutSql, "release_order_inventory");
    const releaseExpiredFn = extractFunction(checkoutSql, "release_expired_inventory_reservations");
    const finalizeFn = extractFunction(paystackSql, "finalize_paystack_successful_payment");

    await db.exec(reserveFn);
    await db.exec(releaseFn);
    await db.exec(releaseExpiredFn);
    await db.exec(finalizeFn);
  };

  before(async () => {
    await initSchema();
  });

  beforeEach(async () => {
    // Clear dynamic tables between test cases
    await db.exec(`
      DELETE FROM public.payment_events;
      DELETE FROM public.payments;
      DELETE FROM public.order_status_history;
      DELETE FROM public.inventory_movements;
      DELETE FROM public.inventory_reservations;
      DELETE FROM public.order_items;
      DELETE FROM public.orders;
      DELETE FROM public.inventory_levels;
      DELETE FROM public.inventory_locations;
      DELETE FROM public.product_variants;
      DELETE FROM public.products;
    `);
  });

  // Helper setup
  const setupBaseFixture = async ({ onHand = 10, reserved = 0 }) => {
    const locRes = await db.query(
      `INSERT INTO public.inventory_locations (name, is_active) VALUES ('Abuja Main Atelier', true) RETURNING id;`
    );
    const locationId = locRes.rows[0].id;

    const prodRes = await db.query(
      `INSERT INTO public.products (name, status) VALUES ('Khalifa Scent', 'active') RETURNING id;`
    );
    const productId = prodRes.rows[0].id;

    const varRes = await db.query(
      `INSERT INTO public.product_variants (product_id, sku, label, price_minor, currency, status, is_available)
       VALUES ($1, 'KHL-50', '50ml', 4500000, 'NGN', 'active', true) RETURNING id;`,
      [productId]
    );
    const variantId = varRes.rows[0].id;

    const levelRes = await db.query(
      `INSERT INTO public.inventory_levels (variant_id, location_id, on_hand, reserved)
       VALUES ($1, $2, $3, $4) RETURNING id;`,
      [variantId, locationId, onHand, reserved]
    );
    const levelId = levelRes.rows[0].id;

    return { locationId, productId, variantId, levelId };
  };

  const createOrder = async ({ variantId, quantity = 1, unitPrice = 4500000, status = "pending" }) => {
    const subtotal = unitPrice * quantity;
    const ordRes = await db.query(
      `INSERT INTO public.orders (status, fulfillment_status, inventory_status, currency, subtotal_minor, shipping_minor, is_total_settled, expires_at)
       VALUES ($1, 'unfulfilled', 'pending', 'NGN', $2, 0, true, now() + interval '1 hour') RETURNING id, total_minor;`,
      [status, subtotal]
    );
    const orderId = ordRes.rows[0].id;
    const totalMinor = ordRes.rows[0].total_minor;

    await db.query(
      `INSERT INTO public.order_items (order_id, variant_id, product_name, variant_label, sku, quantity, unit_price_minor, currency)
       VALUES ($1, $2, 'Khalifa Scent', '50ml', 'KHL-50', $3, $4, 'NGN');`,
      [orderId, variantId, quantity, unitPrice]
    );

    return { orderId, totalMinor };
  };

  it("1. Expiry releases reserved counters atomically", async () => {
    const { variantId, levelId } = await setupBaseFixture({ onHand: 10, reserved: 2 });
    const { orderId } = await createOrder({ variantId, quantity: 2 });

    // Insert an expired reservation
    await db.query(
      `INSERT INTO public.inventory_reservations (order_id, inventory_level_id, variant_id, quantity, status, expires_at)
       VALUES ($1, $2, $3, 2, 'active', now() - interval '5 minutes');`,
      [orderId, levelId, variantId]
    );

    // Call release_expired_inventory_reservations()
    const res = await db.query(`SELECT public.release_expired_inventory_reservations() as released;`);
    assert.equal(res.rows[0].released, 1, "Must release 1 expired reservation");

    // Verify inventory level reserved counter was decremented
    const level = (await db.query(`SELECT on_hand, reserved FROM public.inventory_levels WHERE id = $1;`, [levelId])).rows[0];
    assert.equal(level.on_hand, 10, "on_hand stock must not change upon reservation release");
    assert.equal(level.reserved, 0, "reserved counter must be decremented from 2 to 0");

    // Verify reservation status marked expired
    const reservation = (await db.query(`SELECT status, released_at FROM public.inventory_reservations WHERE order_id = $1;`, [orderId])).rows[0];
    assert.equal(reservation.status, "expired");
    assert.ok(reservation.released_at, "released_at timestamp must be set");
  });

  it("2. Repeated expiry cannot double-release", async () => {
    const { variantId, levelId } = await setupBaseFixture({ onHand: 10, reserved: 2 });
    const { orderId } = await createOrder({ variantId, quantity: 2 });

    await db.query(
      `INSERT INTO public.inventory_reservations (order_id, inventory_level_id, variant_id, quantity, status, expires_at)
       VALUES ($1, $2, $3, 2, 'active', now() - interval '10 minutes');`,
      [orderId, levelId, variantId]
    );

    // First expiry run
    const firstRun = await db.query(`SELECT public.release_expired_inventory_reservations() as released;`);
    assert.equal(firstRun.rows[0].released, 1);

    // Second expiry run (immediate repeat)
    const secondRun = await db.query(`SELECT public.release_expired_inventory_reservations() as released;`);
    assert.equal(secondRun.rows[0].released, 0, "Repeated expiry must release 0 reservations");

    // Check inventory levels
    const level = (await db.query(`SELECT on_hand, reserved FROM public.inventory_levels WHERE id = $1;`, [levelId])).rows[0];
    assert.equal(level.reserved, 0, "reserved counter must stay 0 and never fall negative");
  });

  it("3. Expiry and payment callback concurrency (confirmed order protected)", async () => {
    const { variantId, levelId } = await setupBaseFixture({ onHand: 10, reserved: 2 });
    const { orderId, totalMinor } = await createOrder({ variantId, quantity: 2, status: "pending" });

    // Reservation expired 1 second ago
    await db.query(
      `INSERT INTO public.inventory_reservations (order_id, inventory_level_id, variant_id, quantity, status, expires_at)
       VALUES ($1, $2, $3, 2, 'active', now() - interval '1 second');`,
      [orderId, levelId, variantId]
    );

    // Create pending payment
    const ref = "ref_concurrent_test_1";
    await db.query(
      `INSERT INTO public.payments (order_id, provider, provider_reference, amount_minor, currency, status)
       VALUES ($1, 'paystack', $2, $3, 'NGN', 'pending');`,
      [orderId, ref, totalMinor]
    );

    // Payment arrives and finalizes
    await db.query(
      `SELECT public.finalize_paystack_successful_payment($1, $2, 'NGN');`,
      [ref, totalMinor]
    );

    // Verify order was processed and payment was captured
    const payment = (await db.query(`SELECT status, requires_reconciliation FROM public.payments WHERE provider_reference = $1;`, [ref])).rows[0];
    assert.equal(payment.status, "captured", "Payment must be captured");

    // Scheduled release runs after payment finalization
    const releaseResult = await db.query(`SELECT public.release_expired_inventory_reservations() as released;`);
    // Should NOT release reservations of paid/confirmed order
    assert.equal(releaseResult.rows[0].released, 0, "Cannot release reservations of confirmed/paid orders");
  });

  it("4. Excess reservation cannot over-deduct stock", async () => {
    const { variantId, levelId } = await setupBaseFixture({ onHand: 10, reserved: 5 });
    // Order purchases quantity: 1, but reservation has quantity: 5 (over-reservation)
    const { orderId, totalMinor } = await createOrder({ variantId, quantity: 1 });

    await db.query(
      `INSERT INTO public.inventory_reservations (order_id, inventory_level_id, variant_id, quantity, status, expires_at)
       VALUES ($1, $2, $3, 5, 'active', now() + interval '15 minutes');`,
      [orderId, levelId, variantId]
    );

    const ref = "ref_excess_res_test";
    await db.query(
      `INSERT INTO public.payments (order_id, provider, provider_reference, amount_minor, currency, status)
       VALUES ($1, 'paystack', $2, $3, 'NGN', 'pending');`,
      [orderId, ref, totalMinor]
    );

    // Finalize payment
    await db.query(
      `SELECT public.finalize_paystack_successful_payment($1, $2, 'NGN');`,
      [ref, totalMinor]
    );

    // Stock on_hand must NOT have 5 deducted! Must stay 10 because excess reservation requires reconciliation
    const level = (await db.query(`SELECT on_hand, reserved FROM public.inventory_levels WHERE id = $1;`, [levelId])).rows[0];
    assert.equal(level.on_hand, 10, "Physical stock must NOT be over-deducted on reservation quantity mismatch");
    assert.equal(level.reserved, 0, "Reserved quantity must be safely released to prevent locking");

    const payment = (await db.query(`SELECT status, requires_reconciliation, reconciliation_reason FROM public.payments WHERE provider_reference = $1;`, [ref])).rows[0];
    assert.equal(payment.status, "captured");
    assert.equal(payment.requires_reconciliation, true);
    assert.match(payment.reconciliation_reason, /Reservation quantity mismatch/);
  });

  it("5. Exact quantity fulfillment succeeds atomically", async () => {
    const { variantId, levelId } = await setupBaseFixture({ onHand: 10, reserved: 2 });
    const { orderId, totalMinor } = await createOrder({ variantId, quantity: 2 });

    await db.query(
      `INSERT INTO public.inventory_reservations (order_id, inventory_level_id, variant_id, quantity, status, expires_at)
       VALUES ($1, $2, $3, 2, 'active', now() + interval '15 minutes');`,
      [orderId, levelId, variantId]
    );

    const ref = "ref_exact_fulfillment_1";
    await db.query(
      `INSERT INTO public.payments (order_id, provider, provider_reference, amount_minor, currency, status)
       VALUES ($1, 'paystack', $2, $3, 'NGN', 'pending');`,
      [orderId, ref, totalMinor]
    );

    // Finalize exact payment
    await db.query(
      `SELECT public.finalize_paystack_successful_payment($1, $2, 'NGN');`,
      [ref, totalMinor]
    );

    // Stock on_hand must be exactly 10 - 2 = 8, reserved = 0
    const level = (await db.query(`SELECT on_hand, reserved FROM public.inventory_levels WHERE id = $1;`, [levelId])).rows[0];
    assert.equal(level.on_hand, 8, "on_hand stock must be exactly decremented by purchased quantity");
    assert.equal(level.reserved, 0, "reserved counter must be decremented by 2 to 0");

    // Inventory movement recorded
    const movement = (await db.query(`SELECT quantity_delta, reason, reference_type FROM public.inventory_movements WHERE reference_id = $1;`, [orderId])).rows[0];
    assert.equal(movement.quantity_delta, -2);
    assert.equal(movement.reason, "sale");
    assert.equal(movement.reference_type, "order");

    // Reservation converted
    const reservation = (await db.query(`SELECT status FROM public.inventory_reservations WHERE order_id = $1;`, [orderId])).rows[0];
    assert.equal(reservation.status, "converted");

    // Order confirmed and inventory fulfilled
    const order = (await db.query(`SELECT status, fulfillment_status, inventory_status FROM public.orders WHERE id = $1;`, [orderId])).rows[0];
    assert.equal(order.status, "confirmed");
    assert.equal(order.inventory_status, "fulfilled");
  });

  it("6. Insufficient reservation reconciliation handles shortage safely", async () => {
    const { variantId, levelId } = await setupBaseFixture({ onHand: 10, reserved: 1 });
    // Order requires 2, but only 1 reserved
    const { orderId, totalMinor } = await createOrder({ variantId, quantity: 2 });

    await db.query(
      `INSERT INTO public.inventory_reservations (order_id, inventory_level_id, variant_id, quantity, status, expires_at)
       VALUES ($1, $2, $3, 1, 'active', now() + interval '15 minutes');`,
      [orderId, levelId, variantId]
    );

    const ref = "ref_shortage_test";
    await db.query(
      `INSERT INTO public.payments (order_id, provider, provider_reference, amount_minor, currency, status)
       VALUES ($1, 'paystack', $2, $3, 'NGN', 'pending');`,
      [orderId, ref, totalMinor]
    );

    await db.query(
      `SELECT public.finalize_paystack_successful_payment($1, $2, 'NGN');`,
      [ref, totalMinor]
    );

    // on_hand must NOT be partially deducted or made negative
    const level = (await db.query(`SELECT on_hand, reserved FROM public.inventory_levels WHERE id = $1;`, [levelId])).rows[0];
    assert.equal(level.on_hand, 10, "Physical stock must not be deducted on reservation shortage");
    assert.equal(level.reserved, 0, "Reserved counter must be released safely");

    const order = (await db.query(`SELECT status, inventory_status FROM public.orders WHERE id = $1;`, [orderId])).rows[0];
    assert.equal(order.status, "confirmed", "Customer paid in full; order marked confirmed for admin reconciliation");
    assert.equal(order.inventory_status, "reconciliation_required");
  });

  it("7. Underpayment does not confirm an order", async () => {
    const { variantId, levelId } = await setupBaseFixture({ onHand: 10, reserved: 1 });
    // Total is 4500000 (45,000 NGN)
    const { orderId, totalMinor } = await createOrder({ variantId, quantity: 1, unitPrice: 4500000 });

    await db.query(
      `INSERT INTO public.inventory_reservations (order_id, inventory_level_id, variant_id, quantity, status, expires_at)
       VALUES ($1, $2, $3, 1, 'active', now() + interval '15 minutes');`,
      [orderId, levelId, variantId]
    );

    const ref = "ref_underpayment_test";
    await db.query(
      `INSERT INTO public.payments (order_id, provider, provider_reference, amount_minor, currency, status)
       VALUES ($1, 'paystack', $2, $3, 'NGN', 'pending');`,
      [orderId, ref, totalMinor]
    );

    // Customer only paid 50000 (500 NGN) instead of 4500000
    const underpaidAmount = 50000;
    await db.query(
      `SELECT public.finalize_paystack_successful_payment($1, $2, 'NGN');`,
      [ref, underpaidAmount]
    );

    // CRITICAL ASSERTION: Order MUST REMAIN pending! NEVER confirmed!
    const order = (await db.query(`SELECT status, fulfillment_status, inventory_status, is_total_settled FROM public.orders WHERE id = $1;`, [orderId])).rows[0];
    assert.equal(order.status, "pending", "Underpaid order MUST NEVER be marked confirmed");
    assert.equal(order.is_total_settled, false, "Underpaid order must not be marked settled");
    assert.equal(order.inventory_status, "reconciliation_required");

    // Payment captured evidence is preserved so money received from Paystack is auditable
    const payment = (await db.query(`SELECT status, requires_reconciliation, reconciliation_reason FROM public.payments WHERE provider_reference = $1;`, [ref])).rows[0];
    assert.equal(payment.status, "captured", "Gateway charge evidence must be preserved");
    assert.equal(payment.requires_reconciliation, true);
    assert.match(payment.reconciliation_reason, /Payment amount mismatch/);

    // Physical stock must NOT be deducted
    const level = (await db.query(`SELECT on_hand, reserved FROM public.inventory_levels WHERE id = $1;`, [levelId])).rows[0];
    assert.equal(level.on_hand, 10, "Stock must not be deducted on underpayment");
  });

  it("8. Wrong-currency transaction does not confirm an order", async () => {
    const { variantId, levelId } = await setupBaseFixture({ onHand: 10, reserved: 1 });
    const { orderId, totalMinor } = await createOrder({ variantId, quantity: 1, unitPrice: 4500000 });

    await db.query(
      `INSERT INTO public.inventory_reservations (order_id, inventory_level_id, variant_id, quantity, status, expires_at)
       VALUES ($1, $2, $3, 1, 'active', now() + interval '15 minutes');`,
      [orderId, levelId, variantId]
    );

    const ref = "ref_currency_mismatch_test";
    await db.query(
      `INSERT INTO public.payments (order_id, provider, provider_reference, amount_minor, currency, status)
       VALUES ($1, 'paystack', $2, $3, 'NGN', 'pending');`,
      [orderId, ref, totalMinor]
    );

    // Paystack sends transaction in USD instead of NGN
    await db.query(
      `SELECT public.finalize_paystack_successful_payment($1, $2, 'USD');`,
      [ref, totalMinor]
    );

    // CRITICAL ASSERTION: Order MUST REMAIN pending! NEVER confirmed!
    const order = (await db.query(`SELECT status, inventory_status FROM public.orders WHERE id = $1;`, [orderId])).rows[0];
    assert.equal(order.status, "pending", "Wrong-currency transaction MUST NEVER confirm an order");
    assert.equal(order.inventory_status, "reconciliation_required");

    const payment = (await db.query(`SELECT status, requires_reconciliation, reconciliation_reason FROM public.payments WHERE provider_reference = $1;`, [ref])).rows[0];
    assert.equal(payment.status, "captured", "Gateway charge evidence preserved");
    assert.equal(payment.requires_reconciliation, true);
    assert.match(payment.reconciliation_reason, /Currency mismatch/);
  });

  it("9. Duplicate callback does not deduct twice", async () => {
    const { variantId, levelId } = await setupBaseFixture({ onHand: 10, reserved: 2 });
    const { orderId, totalMinor } = await createOrder({ variantId, quantity: 2 });

    await db.query(
      `INSERT INTO public.inventory_reservations (order_id, inventory_level_id, variant_id, quantity, status, expires_at)
       VALUES ($1, $2, $3, 2, 'active', now() + interval '15 minutes');`,
      [orderId, levelId, variantId]
    );

    const ref = "ref_duplicate_callback_test";
    await db.query(
      `INSERT INTO public.payments (order_id, provider, provider_reference, amount_minor, currency, status)
       VALUES ($1, 'paystack', $2, $3, 'NGN', 'pending');`,
      [orderId, ref, totalMinor]
    );

    // First callback execution
    await db.query(
      `SELECT public.finalize_paystack_successful_payment($1, $2, 'NGN');`,
      [ref, totalMinor]
    );

    // Second callback execution (duplicate delivery)
    await db.query(
      `SELECT public.finalize_paystack_successful_payment($1, $2, 'NGN');`,
      [ref, totalMinor]
    );

    // Third callback execution (subsequent webhook)
    await db.query(
      `SELECT public.finalize_paystack_successful_payment($1, $2, 'NGN');`,
      [ref, totalMinor]
    );

    // Invariants check: Stock deducted EXACTLY ONCE
    const level = (await db.query(`SELECT on_hand, reserved FROM public.inventory_levels WHERE id = $1;`, [levelId])).rows[0];
    assert.equal(level.on_hand, 8, "Stock must only be deducted ONCE (10 - 2 = 8), not multiplied by duplicates");
    assert.equal(level.reserved, 0, "Reserved counter must be 0");

    const movements = (await db.query(`SELECT count(*)::integer as count FROM public.inventory_movements WHERE reference_id = $1;`, [orderId])).rows[0];
    assert.equal(movements.count, 1, "Exactly one inventory movement record must exist for the order");
  });
});
