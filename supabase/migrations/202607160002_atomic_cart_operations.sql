begin;

create or replace function public.add_cart_item(target_variant_id uuid, add_quantity integer)
returns public.cart_items
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_cart public.carts;
  selected_variant public.product_variants;
  updated_item public.cart_items;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if add_quantity < 1 or add_quantity > 99 then raise exception 'quantity must be between 1 and 99'; end if;

  select * into selected_variant
  from public.product_variants
  where id = target_variant_id and status = 'active' and is_available;
  if selected_variant.id is null then raise exception 'variant is not available'; end if;

  select * into active_cart
  from public.carts
  where profile_id = auth.uid() and status = 'active'
  for update;

  if active_cart.id is null then
    insert into public.carts (profile_id, currency)
    values (auth.uid(), selected_variant.currency)
    returning * into active_cart;
  end if;

  if active_cart.currency <> selected_variant.currency then
    raise exception 'cart currency does not match variant currency';
  end if;

  insert into public.cart_items (cart_id, variant_id, quantity, unit_price_minor, currency)
  values (active_cart.id, selected_variant.id, add_quantity, selected_variant.price_minor, selected_variant.currency)
  on conflict (cart_id, variant_id) do update
  set quantity = least(99, public.cart_items.quantity + excluded.quantity)
  returning * into updated_item;

  return updated_item;
end;
$$;

revoke all on function public.add_cart_item(uuid, integer) from public;
grant execute on function public.add_cart_item(uuid, integer) to authenticated;

commit;
