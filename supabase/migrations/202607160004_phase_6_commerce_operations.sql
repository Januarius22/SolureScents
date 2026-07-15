begin;

create or replace function public.update_order_operations(
  target_order_id uuid,
  next_status public.order_status,
  next_fulfillment_status public.fulfillment_status,
  tracking_carrier text default null,
  tracking_code text default null,
  tracking_link text default null,
  status_note text default null
) returns public.orders language plpgsql security definer set search_path = '' as $$
declare current_order public.orders; updated_order public.orders;
begin
  if not public.has_permission('orders.write') then raise exception 'insufficient order permission' using errcode='42501'; end if;
  select * into current_order from public.orders where id=target_order_id for update;
  if current_order.id is null then raise exception 'order not found'; end if;
  update public.orders set status=next_status, fulfillment_status=next_fulfillment_status,
    carrier=nullif(trim(tracking_carrier),''), tracking_number=nullif(trim(tracking_code),''), tracking_url=nullif(trim(tracking_link),''),
    shipped_at=case when next_status='shipped' and shipped_at is null then now() else shipped_at end,
    delivered_at=case when next_status='delivered' and delivered_at is null then now() else delivered_at end
  where id=target_order_id returning * into updated_order;
  if current_order.status is distinct from next_status then
    insert into public.order_status_history(order_id,actor_id,from_status,to_status,note)
    values(target_order_id,auth.uid(),current_order.status,next_status,nullif(trim(status_note),''));
  end if;
  return updated_order;
end $$;

create or replace function public.prepare_offline_payment(
  target_order_id uuid,
  payment_provider text,
  payment_reference text default null
) returns public.payments language plpgsql security definer set search_path = '' as $$
declare target_order public.orders; new_payment public.payments;
begin
  if not public.has_permission('orders.write') then raise exception 'insufficient order permission' using errcode='42501'; end if;
  if payment_provider !~ '^[a-z][a-z0-9_-]{1,39}$' then raise exception 'invalid provider'; end if;
  select * into target_order from public.orders where id=target_order_id;
  if target_order.id is null then raise exception 'order not found'; end if;
  insert into public.payments(order_id,provider,provider_reference,status,amount_minor,currency,metadata)
  values(target_order.id,payment_provider,nullif(trim(payment_reference),''),'pending',target_order.total_minor,target_order.currency,jsonb_build_object('mode','offline_preparation','live_gateway',false))
  returning * into new_payment;
  return new_payment;
end $$;

revoke all on function public.update_order_operations(uuid,public.order_status,public.fulfillment_status,text,text,text,text) from public;
revoke all on function public.prepare_offline_payment(uuid,text,text) from public;
grant execute on function public.update_order_operations(uuid,public.order_status,public.fulfillment_status,text,text,text,text) to authenticated;
grant execute on function public.prepare_offline_payment(uuid,text,text) to authenticated;

commit;
