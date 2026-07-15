begin;

create type public.review_status as enum ('pending', 'published', 'rejected');
create type public.reward_transaction_kind as enum ('earned', 'redeemed', 'adjusted', 'expired');

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(profile_id, product_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade, order_item_id uuid references public.order_items(id) on delete set null,
  rating smallint not null check (rating between 1 and 5), title text check (title is null or char_length(title) between 2 and 120),
  body text not null check (char_length(body) between 20 and 3000), status public.review_status not null default 'pending',
  is_verified_purchase boolean not null default false, published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(profile_id, product_id)
);

create table public.reward_accounts (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null unique references public.profiles(id) on delete cascade,
  points_balance integer not null default 0 check(points_balance >= 0), lifetime_points integer not null default 0 check(lifetime_points >= 0),
  tier text not null default 'atelier' check(tier in ('atelier','signature','maison')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.reward_transactions (
  id uuid primary key default gen_random_uuid(), reward_account_id uuid not null references public.reward_accounts(id) on delete cascade,
  kind public.reward_transaction_kind not null, points integer not null check(points <> 0), description text not null,
  order_id uuid references public.orders(id) on delete set null, expires_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null unique references public.profiles(id) on delete cascade,
  order_updates boolean not null default true, rewards boolean not null default true, editorial boolean not null default true,
  marketing_email boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.orders add column tracking_number text, add column tracking_url text, add column carrier text, add column shipped_at timestamptz, add column delivered_at timestamptz;

create index wishlist_profile_created_idx on public.wishlist_items(profile_id, created_at desc);
create index reviews_product_status_idx on public.reviews(product_id, status, published_at desc);
create index rewards_account_created_idx on public.reward_transactions(reward_account_id, created_at desc);

create trigger wishlist_set_updated_at before update on public.wishlist_items for each row execute function public.set_updated_at();
create trigger reviews_set_updated_at before update on public.reviews for each row execute function public.set_updated_at();
create trigger reward_accounts_set_updated_at before update on public.reward_accounts for each row execute function public.set_updated_at();
create trigger reward_transactions_set_updated_at before update on public.reward_transactions for each row execute function public.set_updated_at();
create trigger notification_preferences_set_updated_at before update on public.notification_preferences for each row execute function public.set_updated_at();

create or replace function public.handle_customer_profile_defaults() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.reward_accounts(profile_id) values(new.id);
  insert into public.notification_preferences(profile_id) values(new.id);
  return new;
end; $$;
create trigger on_customer_profile_created after insert on public.profiles for each row execute function public.handle_customer_profile_defaults();

insert into public.reward_accounts(profile_id) select id from public.profiles on conflict(profile_id) do nothing;
insert into public.notification_preferences(profile_id) select id from public.profiles on conflict(profile_id) do nothing;

alter table public.wishlist_items enable row level security; alter table public.reviews enable row level security;
alter table public.reward_accounts enable row level security; alter table public.reward_transactions enable row level security;
alter table public.notification_preferences enable row level security;

create policy wishlist_owner_all on public.wishlist_items for all to authenticated using(profile_id=auth.uid()) with check(profile_id=auth.uid());
create policy reviews_public_read on public.reviews for select to anon,authenticated using(status='published' or profile_id=auth.uid());
create policy reviews_owner_insert on public.reviews for insert to authenticated with check(profile_id=auth.uid());
create policy reviews_owner_update on public.reviews for update to authenticated using(profile_id=auth.uid()) with check(profile_id=auth.uid() and status='pending');
create policy reviews_owner_delete on public.reviews for delete to authenticated using(profile_id=auth.uid());
create policy reward_account_owner_read on public.reward_accounts for select to authenticated using(profile_id=auth.uid());
create policy reward_transactions_owner_read on public.reward_transactions for select to authenticated using(exists(select 1 from public.reward_accounts ra where ra.id=reward_account_id and ra.profile_id=auth.uid()));
create policy preferences_owner_all on public.notification_preferences for all to authenticated using(profile_id=auth.uid()) with check(profile_id=auth.uid());

grant select,insert,update,delete on public.wishlist_items to authenticated;
grant select on public.reviews to anon,authenticated; grant insert,update,delete on public.reviews to authenticated;
grant select on public.reward_accounts,public.reward_transactions to authenticated;
grant select,insert,update,delete on public.notification_preferences to authenticated;

create trigger audit_reviews after insert or update or delete on public.reviews for each row execute function public.write_audit_log();
create trigger audit_reward_accounts after insert or update or delete on public.reward_accounts for each row execute function public.write_audit_log();
commit;
