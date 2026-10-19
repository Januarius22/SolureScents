-- Solure Scents — Sprint 2.1 Migration: Guest Checkout, Anti-Overselling & Order Consistency
-- Architecture: Secure Anonymous Guest Orders with Session/Access Token Boundaries
-- Target Tables: public.orders, public.order_items, public.checkout_sessions, public.inventory_reservations

begin;

-- 1. Relax profile_id requirement to allow guest orders without customer accounts
alter table public.orders alter column profile_id drop not null;

-- 2. Add guest session hash column (links order to the guest shopping session)
alter table public.orders add column if not exists guest_session_hash text;
alter table public.orders drop constraint if exists orders_guest_session_hash_format;
alter table public.orders add constraint orders_guest_session_hash_format 
  check (guest_session_hash is null or guest_session_hash ~ '^[a-f0-9]{64}$');

-- 3. Add guest access token hash column (cryptographic capability token for order confirmation & tracking)
alter table public.orders add column if not exists guest_access_token_hash text;
alter table public.orders drop constraint if exists orders_guest_access_token_hash_format;
alter table public.orders add constraint orders_guest_access_token_hash_format 
  check (guest_access_token_hash is null or guest_access_token_hash ~ '^[a-f0-9]{64}$');

-- 4. Add order preparation expiry timestamp (unpaid orders expire after 60 minutes)
alter table public.orders add column if not exists expires_at timestamptz default (now() + interval '60 minutes');

-- 5. Add carrier and tracking columns if not already present
alter table public.orders add column if not exists carrier text;
alter table public.orders add column if not exists tracking_number text;
alter table public.orders add column if not exists tracking_url text;

-- 6. Add delivery pricing status & settlement flag
alter table public.orders add column if not exists delivery_status text not null default 'pending';
alter table public.orders drop constraint if exists orders_delivery_status_check;
alter table public.orders add constraint orders_delivery_status_check 
  check (delivery_status in ('configured', 'pending', 'free'));

alter table public.orders add column if not exists is_total_settled boolean not null default false;

-- 7. Constraint: An order must have at least one identity anchor (profile_id, guest_session_hash, or customer_email)
alter table public.orders drop constraint if exists orders_customer_identity_check;
alter table public.orders add constraint orders_customer_identity_check 
  check ((profile_id is not null) or (guest_session_hash is not null) or (customer_email is not null));

-- 8. Relax checkout_sessions.profile_id requirement for guest checkouts if referenced
alter table public.checkout_sessions alter column profile_id drop not null;
alter table public.checkout_sessions add column if not exists guest_session_hash text;

-- 9. Update inventory_reservations to support direct order linkages
alter table public.inventory_reservations alter column checkout_session_id drop not null;
alter table public.inventory_reservations add column if not exists order_id uuid references public.orders(id) on delete cascade;

alter table public.inventory_reservations drop constraint if exists inventory_reservations_target_check;
alter table public.inventory_reservations add constraint inventory_reservations_target_check 
  check ((checkout_session_id is not null) or (order_id is not null));

-- 10. Performance and Lookup Indexes
create index if not exists orders_guest_session_idx 
  on public.orders(guest_session_hash) 
  where guest_session_hash is not null;

create index if not exists orders_guest_access_token_idx 
  on public.orders(guest_access_token_hash) 
  where guest_access_token_hash is not null;

create index if not exists orders_customer_email_idx 
  on public.orders(customer_email);

create index if not exists orders_status_created_at_idx 
  on public.orders(status, created_at desc);

create index if not exists order_items_order_id_idx 
  on public.order_items(order_id);

create index if not exists inventory_reservations_order_id_idx 
  on public.inventory_reservations(order_id) 
  where order_id is not null;

create unique index if not exists inventory_reservations_order_level_active_idx 
  on public.inventory_reservations(order_id, inventory_level_id) 
  where status = 'active' and order_id is not null;

-- 11. Row Level Security & Access Control
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_reservations enable row level security;

-- 12. Atomic Server-Side Order Preparation Function
create or replace function public.prepare_guest_order_record(
  p_guest_session_hash text,
  p_guest_access_token_hash text,
  p_customer_email text,
  p_shipping_address jsonb,
  p_billing_address jsonb,
  p_customer_note text,
  p_shipping_minor bigint,
  p_currency text,
  p_items jsonb,
  p_delivery_status text default 'pending',
  p_is_total_settled boolean default false
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_item record;
  v_subtotal_minor bigint := 0;
  v_line_total bigint;
  v_variant public.product_variants;
  v_effective_shipping bigint;
begin
  -- Validate guest session hash
  if p_guest_session_hash is null or not (p_guest_session_hash ~ '^[a-f0-9]{64}$') then
    raise exception 'invalid guest session identifier' using errcode = '42501';
  end if;

  -- Validate guest access token hash
  if p_guest_access_token_hash is null or not (p_guest_access_token_hash ~ '^[a-f0-9]{64}$') then
    raise exception 'invalid guest access token hash' using errcode = '42501';
  end if;

  -- Validate items array
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'order must contain at least one fragrance item' using errcode = '22000';
  end if;

  -- Validate addresses
  if p_shipping_address is null or jsonb_typeof(p_shipping_address) <> 'object' then
    raise exception 'invalid shipping address structure' using errcode = '22023';
  end if;

  -- Recompute subtotal strictly against live database prices (aggregating duplicate variants)
  for v_item in 
    select variant_id, sum(quantity)::integer as quantity 
    from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
    group by variant_id
  loop
    if v_item.quantity < 1 or v_item.quantity > 99 then
      raise exception 'item quantity must be between 1 and 99' using errcode = '22003';
    end if;

    select v.* into v_variant
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = v_item.variant_id
      and v.status = 'active'
      and v.is_available
      and p.status = 'active';

    if not found then
      raise exception 'fragrance variant is unavailable' using errcode = 'P0002';
    end if;

    v_line_total := v_variant.price_minor * v_item.quantity;
    v_subtotal_minor := v_subtotal_minor + v_line_total;
  end loop;

  -- Effective shipping: if pending, shipping is recorded as 0 minor with is_total_settled = false
  v_effective_shipping := case when p_delivery_status = 'pending' then 0 else coalesce(p_shipping_minor, 0) end;

  -- Create pending order record (remains unpaid/pending until Sprint 3 gateway capture)
  insert into public.orders (
    profile_id,
    guest_session_hash,
    guest_access_token_hash,
    status,
    fulfillment_status,
    currency,
    subtotal_minor,
    discount_minor,
    shipping_minor,
    tax_minor,
    shipping_address,
    billing_address,
    customer_email,
    customer_note,
    delivery_status,
    is_total_settled,
    placed_at,
    expires_at
  ) values (
    null,
    p_guest_session_hash,
    p_guest_access_token_hash,
    'pending',
    'unfulfilled',
    coalesce(p_currency, 'NGN'),
    v_subtotal_minor,
    0,
    v_effective_shipping,
    0,
    p_shipping_address,
    coalesce(p_billing_address, p_shipping_address),
    lower(trim(p_customer_email))::extensions.citext,
    p_customer_note,
    p_delivery_status,
    p_is_total_settled,
    null,
    now() + interval '60 minutes'
  )
  returning * into v_order;

  -- Insert consolidated order line items with server-verified prices
  for v_item in 
    select variant_id, sum(quantity)::integer as quantity 
    from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
    group by variant_id
  loop
    select v.* into v_variant
    from public.product_variants v
    where v.id = v_item.variant_id;

    insert into public.order_items (
      order_id,
      variant_id,
      product_name,
      variant_label,
      brand_name,
      sku,
      quantity,
      unit_price_minor,
      discount_minor,
      currency
    ) values (
      v_order.id,
      v_variant.id,
      (select name from public.products where id = v_variant.product_id),
      v_variant.label,
      coalesce((select b.name from public.brands b join public.products p on p.brand_id = b.id where p.id = v_variant.product_id), 'Solure Scents'),
      v_variant.sku,
      v_item.quantity,
      v_variant.price_minor,
      0,
      v_variant.currency
    );
  end loop;

  return v_order;
end;
$$;

-- 13. Atomic Inventory Reservation Functions (Anti-Overselling Architecture)
create or replace function public.reserve_order_inventory(
  p_order_id uuid,
  p_ttl_minutes integer default 15
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
  v_level public.inventory_levels;
  v_count integer := 0;
begin
  for v_item in 
    select variant_id, sum(quantity)::integer as quantity 
    from public.order_items 
    where order_id = p_order_id and variant_id is not null
    group by variant_id
  loop
    -- Lock inventory level row to prevent race conditions during concurrent checkouts
    select * into v_level
    from public.inventory_levels
    where variant_id = v_item.variant_id
    order by on_hand desc
    limit 1
    for update;

    if not found then
      raise exception 'no inventory level configured for variant %', v_item.variant_id using errcode = 'P0002';
    end if;

    if (v_level.on_hand - v_level.reserved) < v_item.quantity then
      raise exception 'insufficient inventory for variant % (available: %, requested: %)', 
        v_item.variant_id, (v_level.on_hand - v_level.reserved), v_item.quantity using errcode = '22000';
    end if;

    update public.inventory_levels
    set reserved = reserved + v_item.quantity,
        updated_at = now()
    where id = v_level.id;

    insert into public.inventory_reservations (
      order_id,
      inventory_level_id,
      variant_id,
      quantity,
      status,
      expires_at
    ) values (
      p_order_id,
      v_level.id,
      v_item.variant_id,
      v_item.quantity,
      'active',
      now() + (p_ttl_minutes || ' minutes')::interval
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.release_order_inventory(
  p_order_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res record;
  v_released integer := 0;
begin
  for v_res in 
    select id, inventory_level_id, quantity 
    from public.inventory_reservations 
    where order_id = p_order_id and status = 'active'
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

    v_released := v_released + 1;
  end loop;

  return v_released;
end;
$$;

create or replace function public.release_expired_inventory_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res record;
  v_released integer := 0;
begin
  for v_res in 
    select id, inventory_level_id, quantity 
    from public.inventory_reservations 
    where status = 'active' and expires_at < now()
    for update
  loop
    update public.inventory_levels
    set reserved = greatest(0, reserved - v_res.quantity),
        updated_at = now()
    where id = v_res.inventory_level_id;

    update public.inventory_reservations
    set status = 'expired',
        released_at = now(),
        updated_at = now()
    where id = v_res.id;

    v_released := v_released + 1;
  end loop;

  return v_released;
end;
$$;

-- Restrict privileged procedures strictly to service_role
revoke all on function public.prepare_guest_order_record(text, text, text, jsonb, jsonb, text, bigint, text, jsonb, text, boolean) from public, anon, authenticated;
grant execute on function public.prepare_guest_order_record(text, text, text, jsonb, jsonb, text, bigint, text, jsonb, text, boolean) to service_role;

revoke all on function public.reserve_order_inventory(uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_order_inventory(uuid, integer) to service_role;

revoke all on function public.release_order_inventory(uuid) from public, anon, authenticated;
grant execute on function public.release_order_inventory(uuid) to service_role;

revoke all on function public.release_expired_inventory_reservations() from public, anon, authenticated;
grant execute on function public.release_expired_inventory_reservations() to service_role;

commit;
