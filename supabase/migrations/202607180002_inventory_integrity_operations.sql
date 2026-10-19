-- ============================================================================
-- SOLURE SCENTS — DATABASE MIGRATION 202607180002
-- INVENTORY INTEGRITY OPERATIONS & ATOMIC STOCK ADJUSTMENTS
-- ============================================================================
-- Description:
-- 1. Hardens public.adjust_inventory with explicit row-level locking (FOR UPDATE)
--    and precise error classification (P0002 for missing level, 22000 for
--    reserved stock violations, and 0-delta idempotency).
-- 2. Introduces public.set_variant_inventory_stock for atomic, idempotent
--    variant stock management (used by admin product edits and reconciliation).
-- 3. Enforces inventory invariants: on_hand >= reserved, reserved >= 0.
-- 4. Restricts execution to authenticated admins and service_role.
-- ============================================================================

begin;

-- 1. Ensure Inventory Constraints (Invariants)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inventory_levels_on_hand_gte_reserved_check'
  ) then
    -- Verify constraint isn't already covered by inline column check
    if not exists (
      select 1 from information_schema.check_constraints
      where constraint_name like '%reserved%on_hand%'
    ) then
      alter table public.inventory_levels
        add constraint inventory_levels_on_hand_gte_reserved_check
        check (on_hand >= reserved);
    end if;
  end if;
end;
$$;

-- 2. Hardened public.adjust_inventory
create or replace function public.adjust_inventory(
  target_inventory_level_id uuid,
  quantity_delta integer,
  movement_reason public.inventory_movement_reason,
  movement_note text default null,
  movement_reference_type text default null,
  movement_reference_id uuid default null
)
returns public.inventory_levels
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_level public.inventory_levels;
  v_actor_id uuid := null;
begin
  -- Resolve valid actor id if present in profiles
  if auth.uid() is not null and exists (select 1 from public.profiles where id = auth.uid()) then
    v_actor_id := auth.uid();
  end if;

  -- Lock inventory level row to prevent concurrent race conditions
  select * into v_level
  from public.inventory_levels
  where id = target_inventory_level_id
  for update;

  if not found then
    raise exception 'inventory level % not found', target_inventory_level_id using errcode = 'P0002';
  end if;

  -- Idempotency check: 0 delta is a safe no-op
  if quantity_delta = 0 then
    return v_level;
  end if;

  -- Invariant: cannot reduce below reserved stock
  if (v_level.on_hand + quantity_delta) < v_level.reserved then
    raise exception 'inventory adjustment would violate reserved stock (on_hand: %, delta: %, reserved: %)',
      v_level.on_hand, quantity_delta, v_level.reserved using errcode = '22000';
  end if;

  -- Invariant: on_hand cannot be negative
  if (v_level.on_hand + quantity_delta) < 0 then
    raise exception 'inventory on_hand cannot be negative' using errcode = '22000';
  end if;

  update public.inventory_levels
  set on_hand = on_hand + quantity_delta,
      updated_at = now()
  where id = v_level.id
  returning * into v_level;

  insert into public.inventory_movements (
    inventory_level_id,
    actor_id,
    reason,
    quantity_delta,
    reference_type,
    reference_id,
    note
  ) values (
    v_level.id,
    v_actor_id,
    movement_reason,
    quantity_delta,
    movement_reference_type,
    movement_reference_id,
    movement_note
  );

  return v_level;
end;
$$;

-- 3. Atomic Variant Stock Level Adjustment & Reconciliation
create or replace function public.set_variant_inventory_stock(
  p_variant_id uuid,
  p_location_id uuid,
  p_target_on_hand integer,
  p_reason public.inventory_movement_reason default 'correction',
  p_note text default null,
  p_actor_id uuid default null
)
returns public.inventory_levels
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_level public.inventory_levels;
  v_delta integer;
  v_valid_actor_id uuid := null;
begin
  if p_target_on_hand < 0 then
    raise exception 'stock count cannot be negative' using errcode = '22000';
  end if;

  -- Resolve valid actor id if present in profiles
  if p_actor_id is not null and exists (select 1 from public.profiles where id = p_actor_id) then
    v_valid_actor_id := p_actor_id;
  elsif auth.uid() is not null and exists (select 1 from public.profiles where id = auth.uid()) then
    v_valid_actor_id := auth.uid();
  end if;

  -- Verify variant and location exist
  if not exists (select 1 from public.product_variants where id = p_variant_id) then
    raise exception 'product variant % not found', p_variant_id using errcode = 'P0002';
  end if;

  if not exists (select 1 from public.inventory_locations where id = p_location_id) then
    raise exception 'inventory location % not found', p_location_id using errcode = 'P0002';
  end if;

  -- Attempt to select and lock existing row
  select * into v_level
  from public.inventory_levels
  where variant_id = p_variant_id and location_id = p_location_id
  for update;

  if not found then
    -- Issue 6: Concurrency-safe initialization using ON CONFLICT DO NOTHING to prevent race condition 23505 errors
    insert into public.inventory_levels (
      variant_id,
      location_id,
      on_hand,
      reserved
    ) values (
      p_variant_id,
      p_location_id,
      p_target_on_hand,
      0
    )
    on conflict (variant_id, location_id) do nothing
    returning * into v_level;

    if v_level.id is not null then
      -- Successfully inserted new inventory row
      if p_target_on_hand > 0 then
        insert into public.inventory_movements (
          inventory_level_id,
          actor_id,
          reason,
          quantity_delta,
          reference_type,
          reference_id,
          note
        ) values (
          v_level.id,
          v_valid_actor_id,
          'receipt',
          p_target_on_hand,
          'initial_setup',
          p_variant_id,
          coalesce(p_note, 'Initial stock intake')
        );
      end if;

      return v_level;
    else
      -- Concurrent transaction inserted the row first; re-select with row lock
      select * into v_level
      from public.inventory_levels
      where variant_id = p_variant_id and location_id = p_location_id
      for update;
    end if;
  end if;

  -- Existing level update (or concurrent race loser)
  v_delta := p_target_on_hand - v_level.on_hand;

  -- Idempotency check: if stock is already at target, no-op
  if v_delta = 0 then
    return v_level;
  end if;

  -- Invariant check: cannot reduce below active reservations
  if p_target_on_hand < v_level.reserved then
    raise exception 'target stock % is less than currently reserved stock % for variant %',
      p_target_on_hand, v_level.reserved, p_variant_id using errcode = '22000';
  end if;

  update public.inventory_levels
  set on_hand = p_target_on_hand,
      updated_at = now()
  where id = v_level.id
  returning * into v_level;

  insert into public.inventory_movements (
    inventory_level_id,
    actor_id,
    reason,
    quantity_delta,
    reference_type,
    reference_id,
    note
  ) values (
    v_level.id,
    v_valid_actor_id,
    p_reason,
    v_delta,
    'manual_adjustment',
    p_variant_id,
    coalesce(p_note, 'Admin stock adjustment')
  );

  return v_level;
end;
$$;

-- 4. Permissions Hardening: Strict Least Privilege Execution
-- Issue 1 & 8: Revoke execution from public, anon, and authenticated; grant exclusively to service_role
revoke all on function public.adjust_inventory(uuid, integer, public.inventory_movement_reason, text, text, uuid) from public, anon, authenticated;
grant execute on function public.adjust_inventory(uuid, integer, public.inventory_movement_reason, text, text, uuid) to service_role;

revoke all on function public.set_variant_inventory_stock(uuid, uuid, integer, public.inventory_movement_reason, text, uuid) from public, anon, authenticated;
grant execute on function public.set_variant_inventory_stock(uuid, uuid, integer, public.inventory_movement_reason, text, uuid) to service_role;

commit;
