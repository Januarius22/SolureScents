-- Solure Scents — Sprint 3 Migration: Paystack Payment Processing, Webhooks & Inventory Finalization
-- Architecture: Atomic Payment Lifecycle, Idempotent Webhook Processing, Safe Inventory Fulfillment & Reconciliation
-- Target Tables: public.payments, public.payment_events, public.orders, public.inventory_levels, public.inventory_reservations

begin;

-- 1. Ensure public.payments has all necessary Paystack attributes and reconciliation indicators
alter table public.payments add column if not exists customer_email text;
alter table public.payments add column if not exists channel text;
alter table public.payments add column if not exists gateway_response text;
alter table public.payments add column if not exists paid_at timestamptz;
alter table public.payments add column if not exists provider_metadata jsonb default '{}'::jsonb;
alter table public.payments add column if not exists requires_reconciliation boolean not null default false;
alter table public.payments add column if not exists reconciliation_reason text;

-- Ensure idempotency_key accepts text formats (e.g. init_... or standard UUIDs)
alter table public.payments alter column idempotency_key drop default;
alter table public.payments alter column idempotency_key type text using idempotency_key::text;
alter table public.payments alter column idempotency_key set default gen_random_uuid()::text;

-- 2. Ensure public.orders has inventory status indicator
alter table public.orders add column if not exists inventory_status text not null default 'pending';
alter table public.orders drop constraint if exists orders_inventory_status_check;
alter table public.orders add constraint orders_inventory_status_check 
  check (inventory_status in ('pending', 'fulfilled', 'reconciliation_required'));

-- 3. Idempotency constraint on provider references
create unique index if not exists payments_provider_reference_uniq_idx
  on public.payments (provider, provider_reference)
  where provider_reference is not null;

create index if not exists payments_order_id_status_idx
  on public.payments (order_id, status);

create index if not exists payments_status_created_idx
  on public.payments (status, created_at desc);

-- 4. Dedicated Webhook Event Ledger for Idempotent Delivery Handling
create table if not exists public.payment_webhooks (
  id uuid primary key default gen_random_uuid(),
  event_id text unique not null,
  provider text not null default 'paystack',
  event_type text not null,
  reference text,
  order_id uuid references public.orders(id) on delete set null,
  payload jsonb not null,
  processed boolean not null default false,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payment_webhooks enable row level security;

drop policy if exists payment_webhooks_staff_read on public.payment_webhooks;
create policy payment_webhooks_staff_read
  on public.payment_webhooks
  for select
  to authenticated
  using (public.has_permission('orders.read'));

-- 5. Atomic Payment Initialization RPC
create or replace function public.initialize_order_payment(
  p_order_id uuid,
  p_provider text,
  p_provider_reference text,
  p_amount_minor bigint,
  p_currency text,
  p_idempotency_key text,
  p_customer_email text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_existing public.payments;
  v_new_payment public.payments;
  v_order_item record;
  v_total_reserved integer;
begin
  -- Validate target order
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_order.status in ('confirmed', 'processing', 'shipped', 'delivered') then
    raise exception 'Order is already paid and confirmed' using errcode = '23505';
  end if;

  if v_order.status = 'cancelled' then
    raise exception 'Cannot pay for cancelled order' using errcode = '22000';
  end if;

  -- Validate order expiration
  if v_order.expires_at is not null and v_order.expires_at < now() then
    raise exception 'Order % has expired and cannot initiate payment', p_order_id using errcode = '22000';
  end if;

  -- Validate order settlement
  if not coalesce(v_order.is_total_settled, false) then
    raise exception 'Order % total is not settled and cannot initiate payment', p_order_id using errcode = '22000';
  end if;

  -- Verify no existing captured or authorized payment exists for this order
  if exists (
    select 1 from public.payments
    where order_id = p_order_id and status in ('captured', 'authorized')
  ) then
    raise exception 'Order % already has an active or captured payment', p_order_id using errcode = '23505';
  end if;

  -- Validate currency (strict NGN support)
  if coalesce(p_currency, '') <> 'NGN' or v_order.currency <> 'NGN' then
    raise exception 'Unsupported currency: % (Order: %). Solure Scents processes NGN only.', coalesce(p_currency, 'null'), v_order.currency using errcode = '22000';
  end if;

  -- Authoritative amount verification: must match settled order total
  if p_amount_minor <> v_order.total_minor then
    raise exception 'Payment amount % does not match settled order total %', p_amount_minor, v_order.total_minor using errcode = '22000';
  end if;

  if v_order.total_minor <= 0 then
    raise exception 'Payment amount must be greater than zero' using errcode = '22000';
  end if;

  -- ISSUE 2 REQUIREMENT: Verify line items exist and that complete, active, unexpired inventory
  -- reservations exist for EVERY purchased variant before payment begins.
  if not exists (select 1 from public.order_items where order_id = p_order_id and variant_id is not null) then
    raise exception 'Cannot initiate payment: order % has no order items', p_order_id using errcode = '22000';
  end if;

  for v_order_item in
    select variant_id, sum(quantity)::integer as required_quantity
    from public.order_items
    where order_id = p_order_id and variant_id is not null
    group by variant_id
    order by variant_id asc
  loop
    select coalesce(sum(r.quantity), 0)::integer into v_total_reserved
    from public.inventory_reservations r
    join public.inventory_levels l on l.id = r.inventory_level_id
    join public.inventory_locations loc on loc.id = l.location_id
    where r.order_id = p_order_id
      and l.variant_id = v_order_item.variant_id
      and r.status = 'active'
      and r.expires_at > now()
      and loc.is_active = true;

    if v_total_reserved < v_order_item.required_quantity then
      raise exception 'Cannot initiate payment: order % has missing, incomplete, or expired inventory reservation for variant % (reserved: %, required: %)',
        p_order_id, v_order_item.variant_id, v_total_reserved, v_order_item.required_quantity
        using errcode = '22000';
    end if;
  end loop;

  -- ISSUE 1 REQUIREMENT: Payment Reference Ownership & Safe Idempotent Retries
  select * into v_existing
  from public.payments
  where provider = p_provider and provider_reference = p_provider_reference
  for update;

  if v_existing.id is not null then
    -- Verify reference ownership: must belong to the exact same order
    if v_existing.order_id <> p_order_id then
      raise exception 'Payment reference % is already associated with a different order', p_provider_reference using errcode = '23505';
    end if;

    -- Verify amount matches authoritative order total
    if v_existing.amount_minor <> v_order.total_minor then
      raise exception 'Payment reference % has amount % which does not match order total %', p_provider_reference, v_existing.amount_minor, v_order.total_minor using errcode = '22000';
    end if;

    -- Verify currency matches NGN
    if v_existing.currency <> 'NGN' then
      raise exception 'Payment reference % currency % must be NGN', p_provider_reference, v_existing.currency using errcode = '22000';
    end if;

    -- Verify payment state permits idempotent reuse (only pending payments can be reinitialized)
    if v_existing.status <> 'pending' then
      raise exception 'Payment reference % is in terminal state % and cannot be reinitialized', p_provider_reference, v_existing.status using errcode = '22000';
    end if;

    return v_existing;
  end if;

  -- Insert new pending payment attempt
  insert into public.payments (
    order_id,
    provider,
    provider_reference,
    idempotency_key,
    amount_minor,
    currency,
    status,
    customer_email,
    metadata,
    created_at,
    updated_at
  ) values (
    p_order_id,
    p_provider,
    p_provider_reference,
    p_idempotency_key,
    v_order.total_minor,
    'NGN',
    'pending',
    coalesce(p_customer_email, v_order.customer_email),
    p_metadata,
    now(),
    now()
  )
  returning * into v_new_payment;

  return v_new_payment;
end;
$$;

-- 6. Atomic Payment Finalization & Inventory Reconciliation RPC
create or replace function public.finalize_paystack_successful_payment(
  p_reference text,
  p_amount_minor bigint,
  p_currency text,
  p_gateway_response text default null,
  p_channel text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
  v_order public.orders;
  v_item record;
  v_res record;
  v_reserved_level_id uuid;
  v_is_payment_dispute boolean := false;
  v_is_inventory_dispute boolean := false;
  v_requires_reconciliation boolean := false;
  v_reconciliation_reasons text[] := array[]::text[];
  v_total_active_reserved integer;
  v_active_res_count integer;
  v_order_variant_count integer;
  v_res_variant_count integer;
begin
  -- 1. Locate and lock payment record
  if p_reference is null or trim(p_reference) = '' then
    raise exception 'Payment reference cannot be empty' using errcode = '22000';
  end if;

  select * into v_payment
  from public.payments
  where provider = 'paystack' and provider_reference = p_reference
  for update;

  if v_payment.id is null then
    raise exception 'Payment record with reference % not found', p_reference using errcode = 'P0002';
  end if;

  -- Strict Idempotency: If already captured, return immediately (safe against duplicate webhooks and callbacks)
  -- This ensures duplicate callbacks or webhooks NEVER deduct stock twice or execute multiple transitions.
  if v_payment.status = 'captured' then
    return v_payment;
  end if;

  -- 2. Locate and lock target order
  select * into v_order
  from public.orders
  where id = v_payment.order_id
  for update;

  if v_order.id is null then
    raise exception 'Associated order % not found', v_payment.order_id using errcode = 'P0002';
  end if;

  -- 3. ISSUE 3 REQUIREMENT: Authoritative Payment Integrity Validations
  -- Strict Currency Validation: Only NGN is supported
  if coalesce(p_currency, '') <> 'NGN' or v_payment.currency <> 'NGN' or v_order.currency <> 'NGN' then
    v_is_payment_dispute := true;
    v_requires_reconciliation := true;
    v_reconciliation_reasons := array_append(
      v_reconciliation_reasons,
      format('Currency mismatch: Paystack %s, Stored Payment %s, Order %s (Only NGN supported)', coalesce(p_currency, 'NULL'), v_payment.currency, v_order.currency)
    );
  end if;

  -- Strict Amount Validation: Validate exact amount in integer kobo against stored payment and order total
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor <> v_payment.amount_minor or p_amount_minor <> v_order.total_minor then
    v_is_payment_dispute := true;
    v_requires_reconciliation := true;
    v_reconciliation_reasons := array_append(
      v_reconciliation_reasons,
      format('Payment amount mismatch: Paystack %s kobo, Stored Payment %s kobo, Order total %s kobo', coalesce(p_amount_minor, 0), v_payment.amount_minor, v_order.total_minor)
    );
  end if;

  -- 4. Deterministic Row Locking: Lock all active reservations and linked inventory levels
  -- in strict order to avoid concurrent checkout and release deadlocks
  perform 1
  from public.inventory_reservations r
  join public.inventory_levels l on l.id = r.inventory_level_id
  where r.order_id = v_order.id and r.status = 'active'
  order by r.inventory_level_id, r.id
  for update of r, l;

  -- 5. ISSUE 2 REQUIREMENT: Exact Reservation Matching & Inventory Integrity Accounting
  -- Validate line items existence
  if not exists (select 1 from public.order_items where order_id = v_order.id and variant_id is not null) then
    v_is_inventory_dispute := true;
    v_requires_reconciliation := true;
    v_reconciliation_reasons := array_append(v_reconciliation_reasons, 'Order has no line items');
  end if;

  -- Compare distinct variant counts
  select count(distinct variant_id)::integer into v_order_variant_count
  from public.order_items
  where order_id = v_order.id and variant_id is not null;

  select count(distinct l.variant_id)::integer into v_res_variant_count
  from public.inventory_reservations r
  join public.inventory_levels l on l.id = r.inventory_level_id
  where r.order_id = v_order.id and r.status = 'active';

  if v_order_variant_count <> v_res_variant_count then
    v_is_inventory_dispute := true;
    v_requires_reconciliation := true;
    v_reconciliation_reasons := array_append(
      v_reconciliation_reasons,
      format('Distinct variant count mismatch: order has %s variants, active reservations have %s', v_order_variant_count, v_res_variant_count)
    );
  end if;

  -- Detect orphan or foreign active reservations (reservations for variants not in this order's items)
  if exists (
    select 1
    from public.inventory_reservations r
    join public.inventory_levels l on l.id = r.inventory_level_id
    where r.order_id = v_order.id
      and r.status = 'active'
      and l.variant_id not in (
        select variant_id from public.order_items where order_id = v_order.id and variant_id is not null
      )
  ) then
    v_is_inventory_dispute := true;
    v_requires_reconciliation := true;
    v_reconciliation_reasons := array_append(
      v_reconciliation_reasons,
      'Orphan reservation detected: active reservations contain variants not belonging to order items'
    );
  end if;

  -- Aggregate order items by variant and aggregate active reservations by variant. Require EXACT quantity equality.
  for v_item in
    select variant_id, sum(quantity)::integer as quantity 
    from public.order_items 
    where order_id = v_order.id and variant_id is not null
    group by variant_id
    order by variant_id asc
  loop
    -- Check exact inventory_level_id from active reservations for this variant
    select r.inventory_level_id into v_reserved_level_id
    from public.inventory_reservations r
    join public.inventory_levels l on l.id = r.inventory_level_id
    where r.order_id = v_order.id 
      and l.variant_id = v_item.variant_id 
      and r.status = 'active'
    limit 1;

    select coalesce(sum(r.quantity), 0)::integer, count(*)::integer
    into v_total_active_reserved, v_active_res_count
    from public.inventory_reservations r
    join public.inventory_levels l on l.id = r.inventory_level_id
    where r.order_id = v_order.id 
      and l.variant_id = v_item.variant_id 
      and r.status = 'active';

    if v_active_res_count = 0 then
      v_is_inventory_dispute := true;
      v_requires_reconciliation := true;
      v_reconciliation_reasons := array_append(
        v_reconciliation_reasons,
        format('Missing reservation for variant %s (required: %s)', v_item.variant_id, v_item.quantity)
      );
    elsif v_total_active_reserved <> v_item.quantity then
      -- EXACT QUANTITY EQUALITY: Prevents under-reservation AND excess reservation over-deductions
      v_is_inventory_dispute := true;
      v_requires_reconciliation := true;
      v_reconciliation_reasons := array_append(
        v_reconciliation_reasons,
        format('Reservation quantity mismatch for variant %s: order requires %s, active reservation has %s',
          v_item.variant_id, v_item.quantity, v_total_active_reserved)
      );
    end if;
  end loop;

  -- Validate inventory location, level IDs, physical stock invariants, and expiration
  for v_res in
    select r.id, r.inventory_level_id, l.variant_id, r.quantity, r.expires_at,
           l.id as level_id, l.variant_id as level_variant_id, l.location_id, l.on_hand, l.reserved,
           loc.id as loc_id, loc.is_active as loc_is_active
    from public.inventory_reservations r
    left join public.inventory_levels l on l.id = r.inventory_level_id
    left join public.inventory_locations loc on loc.id = l.location_id
    where r.order_id = v_order.id and r.status = 'active'
    order by r.inventory_level_id, r.id
  loop
    -- Detect missing or inconsistent inventory level records
    if v_res.level_id is null or v_res.level_variant_id <> v_res.variant_id then
      v_is_inventory_dispute := true;
      v_requires_reconciliation := true;
      v_reconciliation_reasons := array_append(
        v_reconciliation_reasons,
        format('Inconsistent reservation %s: level %s is invalid or does not match variant %s', v_res.id, v_res.inventory_level_id, v_res.variant_id)
      );
    end if;

    -- Validate active inventory location
    if v_res.loc_id is null or not v_res.loc_is_active then
      v_is_inventory_dispute := true;
      v_requires_reconciliation := true;
      v_reconciliation_reasons := array_append(
        v_reconciliation_reasons,
        format('Location %s for reservation %s is missing or inactive', v_res.location_id, v_res.id)
      );
    end if;

    -- Validate reservation expiration
    if v_res.expires_at <= now() then
      v_is_inventory_dispute := true;
      v_requires_reconciliation := true;
      v_reconciliation_reasons := array_append(
        v_reconciliation_reasons,
        format('Reservation %s for variant %s expired before payment capture (expiry: %s)', v_res.id, v_res.variant_id, v_res.expires_at)
      );
    end if;

    -- Validate on_hand physical stock >= reservation quantity
    if v_res.on_hand is not null and v_res.on_hand < v_res.quantity then
      v_is_inventory_dispute := true;
      v_requires_reconciliation := true;
      v_reconciliation_reasons := array_append(
        v_reconciliation_reasons,
        format('Physical stock on_hand (%s) on level %s is insufficient for reservation (%s)', v_res.on_hand, v_res.inventory_level_id, v_res.quantity)
      );
    end if;

    -- Validate reserved counter >= reservation quantity
    if v_res.reserved is not null and v_res.reserved < v_res.quantity then
      v_is_inventory_dispute := true;
      v_requires_reconciliation := true;
      v_reconciliation_reasons := array_append(
        v_reconciliation_reasons,
        format('Reserved counter (%s) on level %s is less than reservation quantity (%s)', v_res.reserved, v_res.inventory_level_id, v_res.quantity)
      );
    end if;
  end loop;

  -- 6. State Transitions & Safe Fulfillment Execution
  if v_is_payment_dispute then
    -- =========================================================================
    -- BRANCH 1: PAYMENT INTEGRITY DISPUTE (Amount mismatch or Non-NGN Currency)
    -- =========================================================================
    -- CRITICAL REQUIREMENTS:
    -- 1. Preserve evidence of actual gateway charges: Record payment as captured with dispute metadata.
    -- 2. DO NOT mark order confirmed: Order status MUST REMAIN 'pending' pending human investigation.
    -- 3. Never ask a verified payer to pay again without investigation.
    -- 4. Safely release any active reservations to avoid locking physical stock indefinitely.
    update public.payments
    set
      status = 'captured',
      captured_at = now(),
      paid_at = now(),
      gateway_response = p_gateway_response,
      channel = p_channel,
      requires_reconciliation = true,
      reconciliation_reason = array_to_string(v_reconciliation_reasons, '; '),
      metadata = coalesce(metadata, '{}'::jsonb) || p_metadata || jsonb_build_object(
        'requires_reconciliation', true,
        'reconciliation_reason', array_to_string(v_reconciliation_reasons, '; '),
        'dispute_type', 'payment_integrity'
      ),
      updated_at = now()
    where id = v_payment.id
    returning * into v_payment;

    update public.orders
    set
      status = 'pending',
      fulfillment_status = 'unfulfilled',
      inventory_status = 'reconciliation_required',
      is_total_settled = false,
      updated_at = now()
    where id = v_order.id;

    -- Safely release any active reservations for this order to prevent holding stock during payment disputes
    for v_res in 
      select id, inventory_level_id, quantity 
      from public.inventory_reservations 
      where order_id = v_order.id and status = 'active'
      order by inventory_level_id, id
      for update
    loop
      update public.inventory_levels
      set reserved = greatest(0, reserved - v_res.quantity),
          updated_at = now()
      where id = v_res.inventory_level_id;

      update public.inventory_reservations
      set status = 'released',
          released_at = now(),
          updated_at = now()
      where id = v_res.id;
    end loop;

    insert into public.order_status_history (
      order_id,
      from_status,
      to_status,
      note,
      created_at
    ) values (
      v_order.id,
      v_order.status,
      'pending',
      format('Payment captured via Paystack (%s kobo, %s). ⚠️ PAYMENT INTEGRITY DISPUTE: %s. Order remains pending investigation.', coalesce(p_amount_minor, 0), coalesce(p_currency, 'NULL'), array_to_string(v_reconciliation_reasons, '; ')),
      now()
    );

  elsif v_is_inventory_dispute then
    -- =========================================================================
    -- BRANCH 2: INVENTORY RECONCILIATION REQUIRED (Payment exact, Stock/Reservation issue)
    -- =========================================================================
    -- The customer paid the exact required amount in full.
    -- Order is confirmed, but physical stock cannot be automatically deducted.
    -- Avoid incorrect stock deductions. Release reserved counters safely.
    update public.payments
    set
      status = 'captured',
      captured_at = now(),
      paid_at = now(),
      gateway_response = p_gateway_response,
      channel = p_channel,
      requires_reconciliation = true,
      reconciliation_reason = array_to_string(v_reconciliation_reasons, '; '),
      metadata = coalesce(metadata, '{}'::jsonb) || p_metadata || jsonb_build_object(
        'requires_reconciliation', true,
        'reconciliation_reason', array_to_string(v_reconciliation_reasons, '; '),
        'dispute_type', 'inventory_reconciliation'
      ),
      updated_at = now()
    where id = v_payment.id
    returning * into v_payment;

    update public.orders
    set
      status = 'confirmed',
      fulfillment_status = 'unfulfilled',
      inventory_status = 'reconciliation_required',
      is_total_settled = true,
      placed_at = coalesce(placed_at, now()),
      updated_at = now()
    where id = v_order.id;

    -- Safely release reservations to avoid permanent reserved counter lockup
    for v_res in 
      select id, inventory_level_id, quantity 
      from public.inventory_reservations 
      where order_id = v_order.id and status = 'active'
      order by inventory_level_id, id
      for update
    loop
      update public.inventory_levels
      set reserved = greatest(0, reserved - v_res.quantity),
          updated_at = now()
      where id = v_res.inventory_level_id;

      update public.inventory_reservations
      set status = 'released',
          released_at = now(),
          updated_at = now()
      where id = v_res.id;
    end loop;

    insert into public.order_status_history (
      order_id,
      from_status,
      to_status,
      note,
      created_at
    ) values (
      v_order.id,
      v_order.status,
      'confirmed',
      format('Payment captured via Paystack (%s kobo, %s). ⚠️ INVENTORY RECONCILIATION REQUIRED: %s', p_amount_minor, p_currency, array_to_string(v_reconciliation_reasons, '; ')),
      now()
    );

  else
    -- =========================================================================
    -- BRANCH 3: EXACT MATCH - FULL SUCCESSFUL FULFILLMENT
    -- =========================================================================
    -- Payment exact + reservations match exact required quantities + stock verified.
    -- Deduct physical stock exactly once and convert reservations atomically.
    update public.payments
    set
      status = 'captured',
      captured_at = now(),
      paid_at = now(),
      gateway_response = p_gateway_response,
      channel = p_channel,
      requires_reconciliation = false,
      reconciliation_reason = null,
      metadata = coalesce(metadata, '{}'::jsonb) || p_metadata,
      updated_at = now()
    where id = v_payment.id
    returning * into v_payment;

    update public.orders
    set
      status = 'confirmed',
      fulfillment_status = case when fulfillment_status = 'unfulfilled' then 'unfulfilled' else fulfillment_status end,
      inventory_status = 'fulfilled',
      is_total_settled = true,
      placed_at = coalesce(placed_at, now()),
      updated_at = now()
    where id = v_order.id;

    -- Deduct physical stock exactly once and convert the corresponding reservations exactly once
    for v_res in 
      select r.id, r.inventory_level_id, l.variant_id, r.quantity 
      from public.inventory_reservations r
      join public.inventory_levels l on l.id = r.inventory_level_id
      where r.order_id = v_order.id and r.status = 'active'
      order by r.inventory_level_id, r.id
      for update of r
    loop
      update public.inventory_levels
      set
        on_hand = on_hand - v_res.quantity,
        reserved = greatest(0, reserved - v_res.quantity),
        updated_at = now()
      where id = v_res.inventory_level_id;

      insert into public.inventory_movements (
        inventory_level_id,
        reason,
        quantity_delta,
        reference_type,
        reference_id,
        note,
        created_at
      ) values (
        v_res.inventory_level_id,
        'sale',
        -v_res.quantity,
        'order',
        v_order.id,
        format('Sale fulfillment for Order %s via Paystack %s', v_order.order_number, p_reference),
        now()
      );

      update public.inventory_reservations
      set
        status = 'converted',
        released_at = now(),
        updated_at = now()
      where id = v_res.id;
    end loop;

    insert into public.order_status_history (
      order_id,
      from_status,
      to_status,
      note,
      created_at
    ) values (
      v_order.id,
      v_order.status,
      'confirmed',
      format('Payment confirmed via Paystack (Ref: %s, Amount: %s kobo, %s). Stock deducted.', p_reference, p_amount_minor, p_currency),
      now()
    );
  end if;

  -- 7. Log Payment Event in public.payment_events ledger
  insert into public.payment_events (
    payment_id,
    provider,
    provider_event_id,
    event_type,
    payload,
    processed_at,
    created_at
  ) values (
    v_payment.id,
    'paystack',
    p_reference || ':' || case when v_is_payment_dispute then 'disputed' when v_is_inventory_dispute then 'reconciliation' else 'captured' end || ':' || extract(epoch from now())::bigint,
    case 
      when v_is_payment_dispute then 'payment.disputed'
      when v_is_inventory_dispute then 'payment.reconciliation_required'
      else 'payment.captured'
    end,
    jsonb_build_object(
      'reference', p_reference,
      'amount_minor', p_amount_minor,
      'currency', p_currency,
      'gateway_response', p_gateway_response,
      'channel', p_channel,
      'is_payment_dispute', v_is_payment_dispute,
      'is_inventory_dispute', v_is_inventory_dispute,
      'requires_reconciliation', (v_is_payment_dispute or v_is_inventory_dispute),
      'reconciliation_reasons', v_reconciliation_reasons,
      'timestamp', now()
    ),
    now(),
    now()
  );

  return v_payment;
end;
$$;

-- 7. Atomic Payment Failure RPC
create or replace function public.finalize_paystack_failed_payment(
  p_reference text,
  p_failure_code text default null,
  p_failure_message text default null
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
begin
  select * into v_payment
  from public.payments
  where provider = 'paystack' and provider_reference = p_reference
  for update;

  if v_payment.id is null then
    raise exception 'Payment record % not found', p_reference using errcode = 'P0002';
  end if;

  -- If already in terminal state, return
  if v_payment.status in ('captured', 'refunded') then
    return v_payment;
  end if;

  update public.payments
  set
    status = 'failed',
    failed_at = now(),
    failure_code = p_failure_code,
    failure_message = p_failure_message,
    updated_at = now()
  where id = v_payment.id
  returning * into v_payment;

  -- Immediately release any active inventory reservations for the order
  if v_payment.order_id is not null then
    perform public.release_order_inventory(v_payment.order_id);
  end if;

  -- Log payment event in public.payment_events ledger
  insert into public.payment_events (
    payment_id,
    provider,
    provider_event_id,
    event_type,
    payload,
    processed_at,
    created_at
  ) values (
    v_payment.id,
    'paystack',
    p_reference || ':failed:' || extract(epoch from now())::bigint,
    'payment.failed',
    jsonb_build_object(
      'reference', p_reference,
      'failure_code', p_failure_code,
      'failure_message', p_failure_message,
      'timestamp', now()
    ),
    now(),
    now()
  );

  return v_payment;
end;
$$;

-- 8. Permissions & Grants: Strict Least Privilege Execution
revoke all on function public.initialize_order_payment(uuid, text, text, bigint, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.finalize_paystack_successful_payment(text, bigint, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.finalize_paystack_failed_payment(text, text, text) from public, anon, authenticated;

grant execute on function public.initialize_order_payment(uuid, text, text, bigint, text, text, text, jsonb) to service_role;
grant execute on function public.finalize_paystack_successful_payment(text, bigint, text, text, text, jsonb) to service_role;
grant execute on function public.finalize_paystack_failed_payment(text, text, text) to service_role;

revoke all on public.payment_webhooks from public, anon;
grant select on public.payment_webhooks to authenticated;
grant all on public.payment_webhooks to service_role;

commit;
