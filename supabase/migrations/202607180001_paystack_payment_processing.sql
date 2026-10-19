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
    raise exception 'Order % has expired and cannot initiate payment' using errcode = '22000';
  end if;

  -- Validate order settlement (Issue 2)
  if not coalesce(v_order.is_total_settled, false) then
    raise exception 'Order % total is not settled and cannot initiate payment', p_order_id using errcode = '22000';
  end if;

  -- Verify no existing captured or authorized payment exists for this order
  if exists (
    select 1 from public.payments
    where order_id = p_order_id and status in ('captured', 'authorized')
  ) then
    raise exception 'Order % already has an active or captured payment' using errcode = '23505';
  end if;

  -- Validate currency (strict NGN support)
  if coalesce(p_currency, '') <> 'NGN' or v_order.currency <> 'NGN' then
    raise exception 'Unsupported currency: % (Order: %). Solure Scents processes NGN only.' using errcode = '22000';
  end if;

  -- Authoritative amount verification: must match settled order total
  if p_amount_minor <> v_order.total_minor then
    raise exception 'Payment amount % does not match settled order total %' using errcode = '22000';
  end if;

  -- Check if payment attempt with this reference already exists
  select * into v_existing
  from public.payments
  where provider = p_provider and provider_reference = p_provider_reference;

  if v_existing.id is not null then
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
  v_inv_level public.inventory_levels;
  v_requires_reconciliation boolean := false;
  v_reconciliation_reasons text[] := array[]::text[];
  v_items_to_deduct jsonb := '[]'::jsonb;
  v_deduct record;
  v_res record;
  v_reserved_level_id uuid;
begin
  -- 1. Locate and lock payment record
  select * into v_payment
  from public.payments
  where provider = 'paystack' and provider_reference = p_reference
  for update;

  if v_payment.id is null then
    raise exception 'Payment record with reference % not found', p_reference using errcode = 'P0002';
  end if;

  -- Idempotency: If already captured, return immediately
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

  -- 3. Currency Validation (Only NGN is supported)
  if coalesce(p_currency, '') <> 'NGN' or v_payment.currency <> 'NGN' or v_order.currency <> 'NGN' then
    v_requires_reconciliation := true;
    v_reconciliation_reasons := array_append(
      v_reconciliation_reasons,
      format('Currency mismatch: Paystack %s, Stored Payment %s, Order %s (Only NGN supported)', p_currency, v_payment.currency, v_order.currency)
    );
  end if;

  -- 4. Amount Validation: Check Paystack amount against stored payment and settled order total
  if p_amount_minor <> v_payment.amount_minor or p_amount_minor <> v_order.total_minor then
    v_requires_reconciliation := true;
    v_reconciliation_reasons := array_append(
      v_reconciliation_reasons,
      format('Payment amount mismatch: Paystack %s kobo, Stored Payment %s kobo, Order total %s kobo', p_amount_minor, v_payment.amount_minor, v_order.total_minor)
    );
  end if;

  -- 5. Deterministic locking: lock active reservations for this order first
  perform 1
  from public.inventory_reservations
  where order_id = v_order.id and status = 'active'
  for update;

  -- 6. Rigorous Inventory Verification: inspect stock for every order item (aggregated by variant)
  for v_item in
    select variant_id, sum(quantity)::integer as quantity 
    from public.order_items 
    where order_id = v_order.id and variant_id is not null
    group by variant_id
  loop
    -- Look up exact inventory level reserved during checkout (Issue 5: Location Consistency)
    select inventory_level_id into v_reserved_level_id
    from public.inventory_reservations
    where order_id = v_order.id 
      and variant_id = v_item.variant_id 
      and status = 'active'
    limit 1;

    if v_reserved_level_id is not null then
      select * into v_inv_level
      from public.inventory_levels
      where id = v_reserved_level_id
      for update;
    else
      -- Reservation missing or expired: select level with highest on-hand
      select * into v_inv_level
      from public.inventory_levels
      where variant_id = v_item.variant_id
      order by on_hand desc
      limit 1
      for update;
    end if;

    if v_inv_level.id is null then
      v_requires_reconciliation := true;
      v_reconciliation_reasons := array_append(
        v_reconciliation_reasons,
        format('Missing inventory level record for variant %s (requested: %s)', v_item.variant_id, v_item.quantity)
      );
    elsif v_inv_level.on_hand < v_item.quantity then
      v_requires_reconciliation := true;
      v_reconciliation_reasons := array_append(
        v_reconciliation_reasons,
        format('Insufficient on-hand stock for variant %s at location level %s (on_hand: %s, requested: %s)', v_item.variant_id, v_inv_level.id, v_inv_level.on_hand, v_item.quantity)
      );
    else
      -- Item is fully stocked and verified
      v_items_to_deduct := v_items_to_deduct || jsonb_build_object(
        'level_id', v_inv_level.id,
        'quantity', v_item.quantity,
        'variant_id', v_item.variant_id
      );
    end if;
  end loop;

  -- 7. Execute Inventory State Transition (Case A: Fulfilled vs Case B: Reconciliation Required)
  if v_requires_reconciliation then
    -- CASE B: Payment verified & captured, but inventory shortage requires administrative review.
    -- Preserve successful payment; do not deduct stock; do not create negative inventory.
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
        'reconciliation_reason', array_to_string(v_reconciliation_reasons, '; ')
      ),
      updated_at = now()
    where id = v_payment.id
    returning * into v_payment;

    update public.orders
    set
      status = 'confirmed',
      fulfillment_status = 'unfulfilled',
      inventory_status = 'reconciliation_required',
      placed_at = coalesce(placed_at, now()),
      updated_at = now()
    where id = v_order.id;

    -- Issue 3: Atomically decrement reserved counters on inventory_levels AND release reservations
    for v_res in 
      select id, inventory_level_id, quantity 
      from public.inventory_reservations 
      where order_id = v_order.id and status = 'active'
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

    -- Record Order Status History with prominent reconciliation warning
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
      format('Payment captured via Paystack (%s %s). ⚠️ INVENTORY RECONCILIATION REQUIRED: %s', p_amount_minor / 100, p_currency, array_to_string(v_reconciliation_reasons, '; ')),
      now()
    );

  else
    -- CASE A: Payment verified and ALL items have sufficient verified stock.
    -- Safely deduct inventory and convert reservations.
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
      placed_at = coalesce(placed_at, now()),
      updated_at = now()
    where id = v_order.id;

    -- Execute stock deduction for verified items at their exact reserved locations
    for v_deduct in select * from jsonb_to_recordset(v_items_to_deduct) as x(level_id uuid, quantity integer, variant_id uuid) loop
      update public.inventory_levels
      set
        on_hand = on_hand - v_deduct.quantity,
        reserved = greatest(0, reserved - v_deduct.quantity),
        updated_at = now()
      where id = v_deduct.level_id;

      insert into public.inventory_movements (
        inventory_level_id,
        reason,
        quantity_delta,
        reference_type,
        reference_id,
        note,
        created_at
      ) values (
        v_deduct.level_id,
        'sale',
        -v_deduct.quantity,
        'order',
        v_order.id,
        format('Sale fulfillment for Order %s via Paystack %s', v_order.order_number, p_reference),
        now()
      );
    end loop;

    -- Mark active inventory reservations as converted
    update public.inventory_reservations
    set
      status = 'converted',
      released_at = now(),
      updated_at = now()
    where order_id = v_order.id and status = 'active';

    -- Record Order Status History
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
      format('Payment confirmed via Paystack (Ref: %s, Amount: %s %s). Stock deducted.', p_reference, p_amount_minor / 100, p_currency),
      now()
    );
  end if;

  -- 8. Log Payment Event in public.payment_events ledger
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
    p_reference || ':captured:' || extract(epoch from now())::bigint,
    'payment.captured',
    jsonb_build_object(
      'reference', p_reference,
      'amount_minor', p_amount_minor,
      'currency', p_currency,
      'gateway_response', p_gateway_response,
      'channel', p_channel,
      'requires_reconciliation', v_requires_reconciliation,
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
