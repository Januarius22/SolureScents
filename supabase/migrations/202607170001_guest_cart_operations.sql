-- Solure Scents — Sprint 1 Migration: Guest Shopping Cart Support
-- Architecture: Secure Guest Session via Opaque Token Hash (SHA-256)
-- Target Tables: public.carts, public.cart_items

begin;

-- 1. Relax profile_id requirement to allow anonymous guest carts
alter table public.carts alter column profile_id drop not null;

-- 2. Add session_token_hash column for guest session ownership
alter table public.carts add column if not exists session_token_hash text;

-- 3. Ensure session_token_hash is a valid 64-character SHA-256 hex string when present
alter table public.carts drop constraint if exists carts_session_token_hash_format;
alter table public.carts add constraint carts_session_token_hash_format 
  check (session_token_hash is null or session_token_hash ~ '^[a-f0-9]{64}$');

-- 4. Constraint: A cart must belong to either an authenticated profile or a guest session
alter table public.carts drop constraint if exists carts_owner_or_guest_check;
alter table public.carts add constraint carts_owner_or_guest_check 
  check ((profile_id is not null) or (session_token_hash is not null));

-- 5. Index for fast guest cart lookups
create unique index if not exists carts_one_active_per_guest_session_idx 
  on public.carts(session_token_hash) 
  where status = 'active' and session_token_hash is not null;

-- 6. Atomic Security Definer Function: Add Guest Cart Item
create or replace function public.add_guest_cart_item(
  p_session_token_hash text,
  target_variant_id uuid,
  add_quantity integer
)
returns public.cart_items
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cart public.carts;
  v_variant public.product_variants;
  v_updated_item public.cart_items;
begin
  -- Validate session token hash (must be 64-character SHA-256 hex)
  if p_session_token_hash is null or not (p_session_token_hash ~ '^[a-f0-9]{64}$') then
    raise exception 'invalid guest session identifier' using errcode = '42501';
  end if;

  -- Validate quantity limits (1 to 99)
  if add_quantity < 1 or add_quantity > 99 then
    raise exception 'quantity must be between 1 and 99' using errcode = '22003';
  end if;

  -- Validate that variant exists, is active, available, and belongs to an active product
  select v.* into v_variant
  from public.product_variants v
  join public.products p on p.id = v.product_id
  where v.id = target_variant_id 
    and v.status = 'active' 
    and v.is_available 
    and p.status = 'active';

  if v_variant.id is null then
    raise exception 'fragrance variant is currently unavailable' using errcode = 'P0002';
  end if;

  -- Retrieve or atomically create active guest cart
  select * into v_cart
  from public.carts
  where session_token_hash = p_session_token_hash 
    and status = 'active' 
    and expires_at > now()
  for update;

  if v_cart.id is null then
    insert into public.carts (profile_id, session_token_hash, currency, status, expires_at)
    values (null, p_session_token_hash, v_variant.currency, 'active', now() + interval '30 days')
    returning * into v_cart;
  end if;

  -- Verify currency match
  if v_cart.currency <> v_variant.currency then
    raise exception 'cart currency does not match variant currency' using errcode = '22000';
  end if;

  -- Atomically upsert cart item with trusted price from product_variants
  insert into public.cart_items (cart_id, variant_id, quantity, unit_price_minor, currency)
  values (v_cart.id, v_variant.id, add_quantity, v_variant.price_minor, v_variant.currency)
  on conflict (cart_id, variant_id) do update
  set quantity = least(99, public.cart_items.quantity + excluded.quantity),
      unit_price_minor = excluded.unit_price_minor,
      updated_at = now()
  returning * into v_updated_item;

  -- Touch cart updated_at
  update public.carts set updated_at = now() where id = v_cart.id;

  return v_updated_item;
end;
$$;

-- 7. Atomic Security Definer Function: Update Guest Cart Item Quantity
create or replace function public.update_guest_cart_item(
  p_session_token_hash text,
  target_item_id uuid,
  new_quantity integer
)
returns public.cart_items
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cart public.carts;
  v_item public.cart_items;
begin
  if p_session_token_hash is null or not (p_session_token_hash ~ '^[a-f0-9]{64}$') then
    raise exception 'invalid guest session identifier' using errcode = '42501';
  end if;

  select * into v_cart
  from public.carts
  where session_token_hash = p_session_token_hash 
    and status = 'active' 
    and expires_at > now();

  if v_cart.id is null then
    raise exception 'cart not found or expired' using errcode = 'P0002';
  end if;

  if new_quantity <= 0 then
    -- Remove item if quantity set to 0 or negative
    delete from public.cart_items where id = target_item_id and cart_id = v_cart.id;
    return null;
  else
    update public.cart_items
    set quantity = least(99, new_quantity),
        updated_at = now()
    where id = target_item_id and cart_id = v_cart.id
    returning * into v_item;

    if v_item.id is null then
      raise exception 'cart item not found' using errcode = 'P0002';
    end if;

    update public.carts set updated_at = now() where id = v_cart.id;
    return v_item;
  end if;
end;
$$;

-- 8. Atomic Security Definer Function: Remove Guest Cart Item
create or replace function public.remove_guest_cart_item(
  p_session_token_hash text,
  target_item_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cart public.carts;
begin
  if p_session_token_hash is null or not (p_session_token_hash ~ '^[a-f0-9]{64}$') then
    raise exception 'invalid guest session identifier' using errcode = '42501';
  end if;

  select * into v_cart
  from public.carts
  where session_token_hash = p_session_token_hash 
    and status = 'active' 
    and expires_at > now();

  if v_cart.id is null then
    return false;
  end if;

  delete from public.cart_items where id = target_item_id and cart_id = v_cart.id;
  update public.carts set updated_at = now() where id = v_cart.id;

  return true;
end;
$$;

-- 9. Permissions: Revoke execution from public and anon; grant exclusively to service_role
revoke all on function public.add_guest_cart_item(text, uuid, integer) from public, anon;
revoke all on function public.update_guest_cart_item(text, uuid, integer) from public, anon;
revoke all on function public.remove_guest_cart_item(text, uuid) from public, anon;

grant execute on function public.add_guest_cart_item(text, uuid, integer) to service_role;
grant execute on function public.update_guest_cart_item(text, uuid, integer) to service_role;
grant execute on function public.remove_guest_cart_item(text, uuid) to service_role;

commit;
