begin;

create extension if not exists pgcrypto with schema extensions;

create type public.profile_status as enum ('active', 'suspended', 'deactivated');
create type public.notification_kind as enum ('system', 'order', 'account', 'reward', 'editorial');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (full_name is null or char_length(full_name) between 2 and 120),
  phone text check (phone is null or char_length(phone) between 7 and 30),
  avatar_path text,
  locale text not null default 'en-NG' check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  currency text not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  status public.profile_status not null default 'active',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z][a-z0-9_]{2,49}$'),
  name text not null unique check (char_length(name) between 2 and 80),
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role_id, permission_id)
);

create table public.profile_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  assigned_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, role_id),
  check (expires_at is null or expires_at > created_at)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind public.notification_kind not null default 'system',
  title text not null check (char_length(title) between 1 and 140),
  body text not null check (char_length(body) between 1 and 2000),
  action_url text check (action_url is null or action_url like '/%'),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  event_name text not null check (event_name ~ '^[a-z][a-z0-9_.]{2,99}$'),
  context jsonb not null default '{}'::jsonb check (jsonb_typeof(context) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  entity_schema text not null,
  entity_table text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_status_idx on public.profiles(status);
create index profile_roles_profile_id_idx on public.profile_roles(profile_id);
create index profile_roles_role_id_idx on public.profile_roles(role_id);
create index profile_roles_active_idx on public.profile_roles(profile_id, expires_at);
create index role_permissions_role_id_idx on public.role_permissions(role_id);
create index role_permissions_permission_id_idx on public.role_permissions(permission_id);
create index notifications_profile_unread_idx on public.notifications(profile_id, created_at desc) where read_at is null;
create index activity_logs_profile_created_idx on public.activity_logs(profile_id, created_at desc);
create index activity_logs_event_created_idx on public.activity_logs(event_name, created_at desc);
create index audit_logs_entity_idx on public.audit_logs(entity_table, entity_id, created_at desc);
create index audit_logs_actor_created_idx on public.audit_logs(actor_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger roles_set_updated_at before update on public.roles for each row execute function public.set_updated_at();
create trigger permissions_set_updated_at before update on public.permissions for each row execute function public.set_updated_at();
create trigger role_permissions_set_updated_at before update on public.role_permissions for each row execute function public.set_updated_at();
create trigger profile_roles_set_updated_at before update on public.profile_roles for each row execute function public.set_updated_at();
create trigger notifications_set_updated_at before update on public.notifications for each row execute function public.set_updated_at();
create trigger activity_logs_set_updated_at before update on public.activity_logs for each row execute function public.set_updated_at();

create or replace function public.has_role(requested_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profile_roles pr
    join public.roles r on r.id = pr.role_id
    where pr.profile_id = (select auth.uid())
      and r.slug = requested_role
      and (pr.expires_at is null or pr.expires_at > now())
  );
$$;

create or replace function public.has_permission(requested_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profile_roles pr
    join public.role_permissions rp on rp.role_id = pr.role_id
    join public.permissions p on p.id = rp.permission_id
    where pr.profile_id = (select auth.uid())
      and p.code = requested_permission
      and (pr.expires_at is null or pr.expires_at > now())
  );
$$;

create or replace function public.current_user_roles()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(r.slug order by r.slug), array[]::text[])
  from public.profile_roles pr
  join public.roles r on r.id = pr.role_id
  where pr.profile_id = (select auth.uid())
    and (pr.expires_at is null or pr.expires_at > now());
$$;

revoke all on function public.has_role(text) from public;
revoke all on function public.has_permission(text) from public;
revoke all on function public.current_user_roles() from public;
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.current_user_roles() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  customer_role_id uuid;
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  );

  select id into customer_role_id from public.roles where slug = 'customer';
  if customer_role_id is null then
    raise exception 'Required customer role is not configured';
  end if;

  insert into public.profile_roles (profile_id, role_id)
  values (new.id, customer_role_id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_id uuid;
begin
  record_id := case when tg_op = 'DELETE' then old.id else new.id end;
  insert into public.audit_logs (
    actor_id, action, entity_schema, entity_table, entity_id, old_data, new_data
  ) values (
    (select auth.uid()), tg_op, tg_table_schema, tg_table_name, record_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger audit_profiles after insert or update or delete on public.profiles for each row execute function public.write_audit_log();
create trigger audit_roles after insert or update or delete on public.roles for each row execute function public.write_audit_log();
create trigger audit_permissions after insert or update or delete on public.permissions for each row execute function public.write_audit_log();
create trigger audit_role_permissions after insert or update or delete on public.role_permissions for each row execute function public.write_audit_log();
create trigger audit_profile_roles after insert or update or delete on public.profile_roles for each row execute function public.write_audit_log();

insert into public.roles (slug, name, description) values
  ('customer', 'Customer', 'Standard storefront customer'),
  ('publisher', 'Publisher', 'Creates and publishes editorial content'),
  ('inventory_manager', 'Inventory Manager', 'Manages stock and availability'),
  ('customer_support', 'Customer Support', 'Assists customers and reviews orders'),
  ('sales_manager', 'Sales Manager', 'Manages commerce performance and promotions'),
  ('administrator', 'Administrator', 'Manages platform operations and users'),
  ('super_admin', 'Super Administrator', 'Unrestricted platform administration');

insert into public.permissions (code, description) values
  ('account.read', 'Read own customer account'),
  ('account.update', 'Update own customer account'),
  ('articles.read', 'Read editorial records'),
  ('articles.write', 'Create and update editorial records'),
  ('articles.publish', 'Publish and schedule editorial records'),
  ('media.manage', 'Upload and manage editorial media'),
  ('products.read', 'Read the product administration catalogue'),
  ('products.write', 'Create and update products and variants'),
  ('inventory.read', 'Read inventory levels'),
  ('inventory.write', 'Adjust inventory levels'),
  ('orders.read', 'Read customer orders'),
  ('orders.write', 'Manage order fulfilment and status'),
  ('customers.read', 'Read customer administration data'),
  ('customers.write', 'Manage customer administration data'),
  ('discounts.write', 'Create and update discounts'),
  ('analytics.read', 'Read operational analytics'),
  ('users.manage', 'Assign roles and manage staff access'),
  ('audit.read', 'Read immutable audit history'),
  ('settings.manage', 'Manage platform configuration');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where
  (r.slug = 'customer' and p.code in ('account.read', 'account.update'))
  or (r.slug = 'publisher' and p.code in ('articles.read', 'articles.write', 'articles.publish', 'media.manage'))
  or (r.slug = 'inventory_manager' and p.code in ('products.read', 'inventory.read', 'inventory.write', 'orders.read'))
  or (r.slug = 'customer_support' and p.code in ('orders.read', 'orders.write', 'customers.read'))
  or (r.slug = 'sales_manager' and p.code in ('products.read', 'inventory.read', 'orders.read', 'orders.write', 'customers.read', 'discounts.write', 'analytics.read'))
  or (r.slug = 'administrator' and p.code <> 'settings.manage')
  or (r.slug = 'super_admin');

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profile_roles enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_read_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_admin_read on public.profiles for select to authenticated using ((select public.has_permission('customers.read')));
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_admin_update on public.profiles for update to authenticated using ((select public.has_permission('customers.write'))) with check ((select public.has_permission('customers.write')));

create policy roles_authenticated_read on public.roles for select to authenticated using (true);
create policy permissions_authenticated_read on public.permissions for select to authenticated using (true);
create policy role_permissions_authenticated_read on public.role_permissions for select to authenticated using (true);
create policy profile_roles_read_own on public.profile_roles for select to authenticated using ((select auth.uid()) = profile_id);
create policy profile_roles_admin_read on public.profile_roles for select to authenticated using ((select public.has_permission('users.manage')));
create policy profile_roles_admin_insert on public.profile_roles for insert to authenticated with check ((select public.has_permission('users.manage')));
create policy profile_roles_admin_update on public.profile_roles for update to authenticated using ((select public.has_permission('users.manage'))) with check ((select public.has_permission('users.manage')));
create policy profile_roles_admin_delete on public.profile_roles for delete to authenticated using ((select public.has_permission('users.manage')));

create policy notifications_read_own on public.notifications for select to authenticated using ((select auth.uid()) = profile_id);
create policy notifications_update_own on public.notifications for update to authenticated using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy activity_read_own on public.activity_logs for select to authenticated using ((select auth.uid()) = profile_id);
create policy activity_audit_read on public.activity_logs for select to authenticated using ((select public.has_permission('audit.read')));
create policy audit_authorized_read on public.audit_logs for select to authenticated using ((select public.has_permission('audit.read')));

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, avatar_path, locale, currency, last_seen_at) on public.profiles to authenticated;
grant select on public.roles, public.permissions, public.role_permissions to authenticated;
grant select, insert, update, delete on public.profile_roles to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select on public.activity_logs, public.audit_logs to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('editorial-media', 'editorial-media', true, 26214400, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy avatar_public_read on storage.objects for select to public using (bucket_id = 'avatars');
create policy avatar_owner_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy avatar_owner_update on storage.objects for update to authenticated using (
  bucket_id = 'avatars' and owner_id = (select auth.uid())::text
) with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy avatar_owner_delete on storage.objects for delete to authenticated using (
  bucket_id = 'avatars' and owner_id = (select auth.uid())::text
);
create policy editorial_public_read on storage.objects for select to public using (bucket_id = 'editorial-media');
create policy editorial_author_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'editorial-media' and (select public.has_permission('media.manage'))
);
create policy editorial_author_update on storage.objects for update to authenticated using (
  bucket_id = 'editorial-media' and (select public.has_permission('media.manage'))
) with check (
  bucket_id = 'editorial-media' and (select public.has_permission('media.manage'))
);
create policy editorial_author_delete on storage.objects for delete to authenticated using (
  bucket_id = 'editorial-media' and (select public.has_permission('media.manage'))
);

commit;
