begin;

create extension if not exists citext with schema extensions;

create type public.product_status as enum ('draft', 'active', 'archived');
create type public.variant_status as enum ('draft', 'active', 'discontinued');
create type public.note_position as enum ('top', 'heart', 'base');
create type public.fragrance_concentration as enum ('edc', 'edt', 'edp', 'parfum', 'extrait', 'oil');
create type public.sillage_level as enum ('intimate', 'moderate', 'strong', 'enormous');
create type public.inventory_movement_reason as enum ('receipt', 'sale', 'return', 'damage', 'correction', 'transfer_in', 'transfer_out');
create type public.inventory_reservation_status as enum ('active', 'converted', 'released', 'expired');
create type public.cart_status as enum ('active', 'converted', 'abandoned', 'expired');
create type public.discount_kind as enum ('percentage', 'fixed_amount', 'free_shipping');
create type public.checkout_status as enum ('open', 'processing', 'completed', 'expired', 'cancelled');
create type public.order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
create type public.payment_status as enum ('pending', 'requires_action', 'authorized', 'captured', 'partially_refunded', 'refunded', 'failed', 'cancelled');
create type public.fulfillment_status as enum ('unfulfilled', 'processing', 'partially_fulfilled', 'fulfilled', 'returned');

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  founded_year integer check (founded_year is null or founded_year between 1200 and extract(year from now())::integer),
  website_url text,
  logo_path text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  hero_image_path text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fragrance_families (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.fragrance_families(id) on delete restrict,
  name text not null unique check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);

create table public.fragrance_notes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.occasions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  family_id uuid references public.fragrance_families(id) on delete set null,
  name text not null check (char_length(name) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  subtitle text,
  description text not null check (char_length(description) between 20 and 10000),
  story text,
  concentration public.fragrance_concentration not null,
  perfumer text,
  launch_year integer check (launch_year is null or launch_year between 1700 and extract(year from now())::integer + 1),
  longevity_hours_min numeric(4,1) check (longevity_hours_min is null or longevity_hours_min >= 0),
  longevity_hours_max numeric(4,1) check (longevity_hours_max is null or longevity_hours_max >= longevity_hours_min),
  sillage public.sillage_level,
  status public.product_status not null default 'draft',
  is_featured boolean not null default false,
  seo_title text check (seo_title is null or char_length(seo_title) <= 70),
  seo_description text check (seo_description is null or char_length(seo_description) <= 170),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, name),
  check ((status = 'active' and published_at is not null) or status <> 'active')
);

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text not null check (char_length(alt_text) between 2 and 180),
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, storage_path)
);

create unique index product_media_one_primary_idx on public.product_media(product_id) where is_primary;

create table public.product_notes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  note_id uuid not null references public.fragrance_notes(id) on delete restrict,
  position public.note_position not null,
  prominence smallint not null default 1 check (prominence between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, note_id, position)
);

create table public.collection_products (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_id, product_id)
);

create table public.product_seasons (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  relevance smallint not null default 3 check (relevance between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, season_id)
);

create table public.product_occasions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  occasion_id uuid not null references public.occasions(id) on delete cascade,
  relevance smallint not null default 3 check (relevance between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, occasion_id)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku extensions.citext not null unique,
  barcode text unique,
  size_ml numeric(7,2) not null check (size_ml > 0),
  label text not null check (char_length(label) between 1 and 40),
  price_minor bigint not null check (price_minor >= 0),
  compare_at_price_minor bigint check (compare_at_price_minor is null or compare_at_price_minor > price_minor),
  cost_minor bigint check (cost_minor is null or cost_minor >= 0),
  currency text not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  weight_grams integer not null check (weight_grams > 0),
  low_stock_limit integer not null default 5 check (low_stock_limit >= 0),
  status public.variant_status not null default 'draft',
  is_available boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size_ml)
);

create table public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code extensions.citext not null unique,
  address jsonb not null default '{}'::jsonb check (jsonb_typeof(address) = 'object'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_levels (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  location_id uuid not null references public.inventory_locations(id) on delete restrict,
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0 and reserved <= on_hand),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variant_id, location_id)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_level_id uuid not null references public.inventory_levels(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  reason public.inventory_movement_reason not null,
  quantity_delta integer not null check (quantity_delta <> 0),
  reference_type text,
  reference_id uuid,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'Home' check (char_length(label) between 1 and 40),
  recipient_name text not null check (char_length(recipient_name) between 2 and 120),
  phone text not null check (char_length(phone) between 7 and 30),
  line_1 text not null,
  line_2 text,
  city text not null,
  state_region text not null,
  postal_code text,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  is_default_shipping boolean not null default false,
  is_default_billing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index addresses_default_shipping_idx on public.addresses(profile_id) where is_default_shipping;
create unique index addresses_default_billing_idx on public.addresses(profile_id) where is_default_billing;

create table public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  country_codes text[] not null default '{}',
  state_regions text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code extensions.citext not null unique,
  description text,
  price_minor bigint not null check (price_minor >= 0),
  currency text not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  estimated_days_min integer not null check (estimated_days_min > 0),
  estimated_days_max integer not null check (estimated_days_max >= estimated_days_min),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipping_zone_methods (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.shipping_zones(id) on delete cascade,
  method_id uuid not null references public.shipping_methods(id) on delete cascade,
  minimum_subtotal_minor bigint check (minimum_subtotal_minor is null or minimum_subtotal_minor >= 0),
  maximum_subtotal_minor bigint check (maximum_subtotal_minor is null or maximum_subtotal_minor >= minimum_subtotal_minor),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (zone_id, method_id)
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.cart_status not null default 'active',
  currency text not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index carts_one_active_per_profile_idx on public.carts(profile_id) where status = 'active';

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity between 1 and 99),
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind public.discount_kind not null,
  value integer not null check (value >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  minimum_subtotal_minor bigint check (minimum_subtotal_minor is null or minimum_subtotal_minor >= 0),
  maximum_discount_minor bigint check (maximum_discount_minor is null or maximum_discount_minor >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz,
  maximum_redemptions integer check (maximum_redemptions is null or maximum_redemptions > 0),
  maximum_redemptions_per_profile integer check (maximum_redemptions_per_profile is null or maximum_redemptions_per_profile > 0),
  is_automatic boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check ((kind = 'percentage' and value between 1 and 10000 and currency is null) or (kind = 'fixed_amount' and currency is not null) or (kind = 'free_shipping' and value = 0))
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts(id) on delete cascade,
  code extensions.citext not null unique check (char_length(code::text) between 3 and 40),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.discount_products (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (discount_id, product_id)
);

create table public.discount_collections (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (discount_id, collection_id)
);

create table public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  cart_id uuid not null references public.carts(id) on delete restrict,
  shipping_address_id uuid references public.addresses(id) on delete restrict,
  billing_address_id uuid references public.addresses(id) on delete restrict,
  shipping_method_id uuid references public.shipping_methods(id) on delete restrict,
  coupon_id uuid references public.coupons(id) on delete set null,
  status public.checkout_status not null default 'open',
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  subtotal_minor bigint not null default 0 check (subtotal_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  shipping_minor bigint not null default 0 check (shipping_minor >= 0),
  tax_minor bigint not null default 0 check (tax_minor >= 0),
  total_minor bigint generated always as (subtotal_minor - discount_minor + shipping_minor + tax_minor) stored,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_minor <= subtotal_minor + shipping_minor)
);

create sequence public.order_number_sequence start with 100001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('SOL-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_sequence')::text, 8, '0')),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  checkout_session_id uuid unique references public.checkout_sessions(id) on delete restrict,
  status public.order_status not null default 'pending',
  fulfillment_status public.fulfillment_status not null default 'unfulfilled',
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  shipping_minor bigint not null default 0 check (shipping_minor >= 0),
  tax_minor bigint not null default 0 check (tax_minor >= 0),
  total_minor bigint generated always as (subtotal_minor - discount_minor + shipping_minor + tax_minor) stored,
  shipping_address jsonb not null check (jsonb_typeof(shipping_address) = 'object'),
  billing_address jsonb not null check (jsonb_typeof(billing_address) = 'object'),
  customer_email extensions.citext not null,
  customer_note text,
  placed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_minor <= subtotal_minor + shipping_minor)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_label text not null,
  brand_name text not null,
  sku text not null,
  quantity integer not null check (quantity > 0),
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  line_total_minor bigint generated always as ((unit_price_minor * quantity) - discount_minor) stored,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_minor <= unit_price_minor * quantity)
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  from_status public.order_status,
  to_status public.order_status not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null check (provider ~ '^[a-z][a-z0-9_-]{1,39}$'),
  provider_reference text,
  idempotency_key uuid not null unique default gen_random_uuid(),
  status public.payment_status not null default 'pending',
  amount_minor bigint not null check (amount_minor > 0),
  refunded_minor bigint not null default 0 check (refunded_minor between 0 and amount_minor),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  authorized_at timestamptz,
  captured_at timestamptz,
  failed_at timestamptz,
  failure_code text,
  failure_message text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete set null,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  checkout_session_id uuid not null references public.checkout_sessions(id) on delete cascade,
  inventory_level_id uuid not null references public.inventory_levels(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  status public.inventory_reservation_status not null default 'active',
  expires_at timestamptz not null,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checkout_session_id, inventory_level_id)
);

create index products_brand_status_idx on public.products(brand_id, status, published_at desc);
create index products_family_status_idx on public.products(family_id, status);
create index product_variants_product_status_idx on public.product_variants(product_id, status, is_available);
create index product_notes_note_idx on public.product_notes(note_id, position);
create index collection_products_collection_sort_idx on public.collection_products(collection_id, sort_order);
create index inventory_levels_variant_idx on public.inventory_levels(variant_id);
create index inventory_movements_level_created_idx on public.inventory_movements(inventory_level_id, created_at desc);
create index cart_items_cart_idx on public.cart_items(cart_id);
create index checkout_sessions_profile_status_idx on public.checkout_sessions(profile_id, status, created_at desc);
create index orders_profile_created_idx on public.orders(profile_id, created_at desc);
create index orders_status_created_idx on public.orders(status, created_at desc);
create index order_items_order_idx on public.order_items(order_id);
create index payments_order_created_idx on public.payments(order_id, created_at desc);
create index payments_status_created_idx on public.payments(status, created_at desc);
create index inventory_reservations_expiry_idx on public.inventory_reservations(expires_at) where status = 'active';

create trigger brands_set_updated_at before update on public.brands for each row execute function public.set_updated_at();
create trigger collections_set_updated_at before update on public.collections for each row execute function public.set_updated_at();
create trigger fragrance_families_set_updated_at before update on public.fragrance_families for each row execute function public.set_updated_at();
create trigger fragrance_notes_set_updated_at before update on public.fragrance_notes for each row execute function public.set_updated_at();
create trigger seasons_set_updated_at before update on public.seasons for each row execute function public.set_updated_at();
create trigger occasions_set_updated_at before update on public.occasions for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger product_media_set_updated_at before update on public.product_media for each row execute function public.set_updated_at();
create trigger product_notes_set_updated_at before update on public.product_notes for each row execute function public.set_updated_at();
create trigger collection_products_set_updated_at before update on public.collection_products for each row execute function public.set_updated_at();
create trigger product_seasons_set_updated_at before update on public.product_seasons for each row execute function public.set_updated_at();
create trigger product_occasions_set_updated_at before update on public.product_occasions for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants for each row execute function public.set_updated_at();
create trigger inventory_locations_set_updated_at before update on public.inventory_locations for each row execute function public.set_updated_at();
create trigger inventory_levels_set_updated_at before update on public.inventory_levels for each row execute function public.set_updated_at();
create trigger inventory_movements_set_updated_at before update on public.inventory_movements for each row execute function public.set_updated_at();
create trigger addresses_set_updated_at before update on public.addresses for each row execute function public.set_updated_at();
create trigger shipping_zones_set_updated_at before update on public.shipping_zones for each row execute function public.set_updated_at();
create trigger shipping_methods_set_updated_at before update on public.shipping_methods for each row execute function public.set_updated_at();
create trigger shipping_zone_methods_set_updated_at before update on public.shipping_zone_methods for each row execute function public.set_updated_at();
create trigger carts_set_updated_at before update on public.carts for each row execute function public.set_updated_at();
create trigger cart_items_set_updated_at before update on public.cart_items for each row execute function public.set_updated_at();
create trigger discounts_set_updated_at before update on public.discounts for each row execute function public.set_updated_at();
create trigger coupons_set_updated_at before update on public.coupons for each row execute function public.set_updated_at();
create trigger discount_products_set_updated_at before update on public.discount_products for each row execute function public.set_updated_at();
create trigger discount_collections_set_updated_at before update on public.discount_collections for each row execute function public.set_updated_at();
create trigger checkout_sessions_set_updated_at before update on public.checkout_sessions for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger order_items_set_updated_at before update on public.order_items for each row execute function public.set_updated_at();
create trigger order_status_history_set_updated_at before update on public.order_status_history for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger payment_events_set_updated_at before update on public.payment_events for each row execute function public.set_updated_at();
create trigger inventory_reservations_set_updated_at before update on public.inventory_reservations for each row execute function public.set_updated_at();

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
  updated_level public.inventory_levels;
begin
  if not public.has_permission('inventory.write') then
    raise exception 'insufficient inventory permission' using errcode = '42501';
  end if;
  if quantity_delta = 0 then raise exception 'quantity delta cannot be zero'; end if;

  update public.inventory_levels
  set on_hand = on_hand + quantity_delta
  where id = target_inventory_level_id
    and on_hand + quantity_delta >= reserved
  returning * into updated_level;

  if updated_level.id is null then raise exception 'inventory adjustment would violate reserved stock'; end if;

  insert into public.inventory_movements (
    inventory_level_id, actor_id, reason, quantity_delta, reference_type, reference_id, note
  ) values (
    target_inventory_level_id, auth.uid(), movement_reason, quantity_delta,
    movement_reference_type, movement_reference_id, movement_note
  );
  return updated_level;
end;
$$;

create or replace function public.reserve_inventory(
  target_checkout_session_id uuid,
  target_inventory_level_id uuid,
  reserve_quantity integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation_id uuid;
  session_owner uuid;
  session_expiry timestamptz;
begin
  if reserve_quantity <= 0 then raise exception 'reservation quantity must be positive'; end if;

  select profile_id, expires_at into session_owner, session_expiry
  from public.checkout_sessions
  where id = target_checkout_session_id and status = 'open'
  for update;

  if session_owner is null or session_owner <> auth.uid() then
    raise exception 'checkout session not available' using errcode = '42501';
  end if;

  update public.inventory_levels
  set reserved = reserved + reserve_quantity
  where id = target_inventory_level_id
    and on_hand - reserved >= reserve_quantity;

  if not found then raise exception 'insufficient available inventory'; end if;

  insert into public.inventory_reservations (
    checkout_session_id, inventory_level_id, quantity, expires_at
  ) values (
    target_checkout_session_id, target_inventory_level_id, reserve_quantity, session_expiry
  ) returning id into reservation_id;
  return reservation_id;
end;
$$;

create or replace function public.release_inventory_reservation(target_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation public.inventory_reservations;
  session_owner uuid;
begin
  select * into reservation from public.inventory_reservations where id = target_reservation_id for update;
  if reservation.id is null or reservation.status <> 'active' then return; end if;

  select profile_id into session_owner from public.checkout_sessions where id = reservation.checkout_session_id;
  if session_owner <> auth.uid() and not public.has_permission('inventory.write') then
    raise exception 'reservation not available' using errcode = '42501';
  end if;

  update public.inventory_levels set reserved = reserved - reservation.quantity where id = reservation.inventory_level_id;
  update public.inventory_reservations set status = 'released', released_at = now() where id = reservation.id;
end;
$$;

create or replace function public.set_cart_item_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_price bigint;
  current_currency text;
begin
  select price_minor, currency into current_price, current_currency
  from public.product_variants
  where id = new.variant_id and status = 'active' and is_available;

  if current_price is null then raise exception 'variant is not available'; end if;
  new.unit_price_minor := current_price;
  new.currency := current_currency;
  return new;
end;
$$;

create trigger cart_items_set_trusted_price
before insert or update of variant_id, quantity on public.cart_items
for each row execute function public.set_cart_item_price();

create or replace function public.create_checkout_session(target_cart_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_session_id uuid;
  cart_owner uuid;
  cart_currency text;
  cart_subtotal bigint;
begin
  select profile_id, currency into cart_owner, cart_currency
  from public.carts
  where id = target_cart_id and status = 'active' and expires_at > now()
  for update;

  if cart_owner is null or cart_owner <> auth.uid() then
    raise exception 'cart not available' using errcode = '42501';
  end if;

  select coalesce(sum(quantity * unit_price_minor), 0) into cart_subtotal
  from public.cart_items where cart_id = target_cart_id;
  if cart_subtotal = 0 then raise exception 'cart is empty'; end if;

  update public.checkout_sessions set status = 'cancelled'
  where cart_id = target_cart_id and status = 'open';

  insert into public.checkout_sessions (profile_id, cart_id, currency, subtotal_minor)
  values (cart_owner, target_cart_id, cart_currency, cart_subtotal)
  returning id into new_session_id;
  return new_session_id;
end;
$$;

create or replace function public.get_variant_availability(target_variant_ids uuid[])
returns table (variant_id uuid, available_quantity bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id, coalesce(sum(il.on_hand - il.reserved), 0)::bigint
  from public.product_variants v
  left join public.inventory_levels il on il.variant_id = v.id
  join public.products p on p.id = v.product_id
  where v.id = any(target_variant_ids)
    and v.status = 'active' and v.is_available and p.status = 'active'
  group by v.id;
$$;

revoke all on function public.adjust_inventory(uuid, integer, public.inventory_movement_reason, text, text, uuid) from public;
revoke all on function public.reserve_inventory(uuid, uuid, integer) from public;
revoke all on function public.release_inventory_reservation(uuid) from public;
grant execute on function public.adjust_inventory(uuid, integer, public.inventory_movement_reason, text, text, uuid) to authenticated;
grant execute on function public.reserve_inventory(uuid, uuid, integer) to authenticated;
grant execute on function public.release_inventory_reservation(uuid) to authenticated;
revoke all on function public.create_checkout_session(uuid) from public;
revoke all on function public.get_variant_availability(uuid[]) from public;
grant execute on function public.create_checkout_session(uuid) to authenticated;
grant execute on function public.get_variant_availability(uuid[]) to anon, authenticated;
grant execute on function public.has_permission(text) to anon;

create or replace view public.variant_availability with (security_invoker = true) as
select
  v.id as variant_id,
  coalesce(sum(il.on_hand - il.reserved), 0)::bigint as available_quantity
from public.product_variants v
left join public.inventory_levels il on il.variant_id = v.id
group by v.id;

alter table public.brands enable row level security;
alter table public.collections enable row level security;
alter table public.fragrance_families enable row level security;
alter table public.fragrance_notes enable row level security;
alter table public.seasons enable row level security;
alter table public.occasions enable row level security;
alter table public.products enable row level security;
alter table public.product_media enable row level security;
alter table public.product_notes enable row level security;
alter table public.collection_products enable row level security;
alter table public.product_seasons enable row level security;
alter table public.product_occasions enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory_locations enable row level security;
alter table public.inventory_levels enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.addresses enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.shipping_methods enable row level security;
alter table public.shipping_zone_methods enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.discounts enable row level security;
alter table public.coupons enable row level security;
alter table public.discount_products enable row level security;
alter table public.discount_collections enable row level security;
alter table public.checkout_sessions enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;

create policy brands_public_read on public.brands for select to anon, authenticated using (is_active or public.has_permission('products.read'));
create policy collections_public_read on public.collections for select to anon, authenticated using (is_active or public.has_permission('products.read'));
create policy families_public_read on public.fragrance_families for select to anon, authenticated using (true);
create policy notes_public_read on public.fragrance_notes for select to anon, authenticated using (true);
create policy seasons_public_read on public.seasons for select to anon, authenticated using (true);
create policy occasions_public_read on public.occasions for select to anon, authenticated using (true);
create policy products_public_read on public.products for select to anon, authenticated using (status = 'active' or public.has_permission('products.read'));
create policy product_media_public_read on public.product_media for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or public.has_permission('products.read'))));
create policy product_notes_public_read on public.product_notes for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or public.has_permission('products.read'))));
create policy collection_products_public_read on public.collection_products for select to anon, authenticated using (true);
create policy product_seasons_public_read on public.product_seasons for select to anon, authenticated using (true);
create policy product_occasions_public_read on public.product_occasions for select to anon, authenticated using (true);
create policy variants_public_read on public.product_variants for select to anon, authenticated using (
  (status = 'active' and is_available and exists (select 1 from public.products p where p.id = product_id and p.status = 'active'))
  or public.has_permission('products.read')
);

create policy catalogue_admin_all_brands on public.brands for all to authenticated using (public.has_permission('products.write')) with check (public.has_permission('products.write'));
create policy catalogue_admin_all_collections on public.collections for all to authenticated using (public.has_permission('products.write')) with check (public.has_permission('products.write'));
create policy catalogue_admin_all_products on public.products for all to authenticated using (public.has_permission('products.write')) with check (public.has_permission('products.write'));
create policy catalogue_admin_all_variants on public.product_variants for all to authenticated using (public.has_permission('products.write')) with check (public.has_permission('products.write'));
create policy catalogue_admin_all_families on public.fragrance_families for all to authenticated using (public.has_permission('products.write')) with check (public.has_permission('products.write'));
create policy catalogue_admin_all_notes on public.fragrance_notes for all to authenticated using (public.has_permission('products.write')) with check (public.has_permission('products.write'));
create policy catalogue_admin_all_media on public.product_media for all to authenticated using (public.has_permission('products.write')) with check (public.has_permission('products.write'));
create policy catalogue_admin_all_product_notes on public.product_notes for all to authenticated using (public.has_permission('products.write')) with check (public.has_permission('products.write'));
create policy catalogue_admin_all_collection_products on public.collection_products for all to authenticated using (public.has_permission('products.write')) with check (public.has_permission('products.write'));
create policy catalogue_admin_all_product_seasons on public.product_seasons for all to authenticated using (public.has_permission('products.write')) with check (public.has_permission('products.write'));
create policy catalogue_admin_all_product_occasions on public.product_occasions for all to authenticated using (public.has_permission('products.write')) with check (public.has_permission('products.write'));

create policy inventory_read on public.inventory_locations for select to authenticated using (public.has_permission('inventory.read'));
create policy inventory_levels_read on public.inventory_levels for select to authenticated using (public.has_permission('inventory.read'));
create policy inventory_movements_read on public.inventory_movements for select to authenticated using (public.has_permission('inventory.read'));
create policy inventory_reservations_staff_read on public.inventory_reservations for select to authenticated using (public.has_permission('inventory.read'));
create policy inventory_locations_admin_all on public.inventory_locations for all to authenticated using (public.has_permission('inventory.write')) with check (public.has_permission('inventory.write'));
create policy inventory_levels_admin_insert on public.inventory_levels for insert to authenticated with check (public.has_permission('inventory.write'));

create policy addresses_owner_all on public.addresses for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy shipping_zones_public_read on public.shipping_zones for select to anon, authenticated using (is_active);
create policy shipping_methods_public_read on public.shipping_methods for select to anon, authenticated using (is_active);
create policy shipping_zone_methods_public_read on public.shipping_zone_methods for select to anon, authenticated using (true);
create policy shipping_zones_admin_all on public.shipping_zones for all to authenticated using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));
create policy shipping_methods_admin_all on public.shipping_methods for all to authenticated using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));
create policy shipping_zone_methods_admin_all on public.shipping_zone_methods for all to authenticated using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));

create policy carts_owner_all on public.carts for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy cart_items_owner_all on public.cart_items for all to authenticated using (exists (select 1 from public.carts c where c.id = cart_id and c.profile_id = auth.uid())) with check (exists (select 1 from public.carts c where c.id = cart_id and c.profile_id = auth.uid() and c.status = 'active'));
create policy discounts_automatic_read on public.discounts for select to anon, authenticated using (is_active and is_automatic and starts_at <= now() and (ends_at is null or ends_at > now()));
create policy discounts_admin_all on public.discounts for all to authenticated using (public.has_permission('discounts.write')) with check (public.has_permission('discounts.write'));
create policy coupons_admin_all on public.coupons for all to authenticated using (public.has_permission('discounts.write')) with check (public.has_permission('discounts.write'));
create policy discount_products_admin_all on public.discount_products for all to authenticated using (public.has_permission('discounts.write')) with check (public.has_permission('discounts.write'));
create policy discount_collections_admin_all on public.discount_collections for all to authenticated using (public.has_permission('discounts.write')) with check (public.has_permission('discounts.write'));

create policy checkout_owner_read on public.checkout_sessions for select to authenticated using (profile_id = auth.uid());
create policy reservations_owner_read on public.inventory_reservations for select to authenticated using (exists (select 1 from public.checkout_sessions cs where cs.id = checkout_session_id and cs.profile_id = auth.uid()));

create policy orders_owner_read on public.orders for select to authenticated using (profile_id = auth.uid() or public.has_permission('orders.read'));
create policy order_items_owner_read on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.profile_id = auth.uid() or public.has_permission('orders.read'))));
create policy order_history_owner_read on public.order_status_history for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.profile_id = auth.uid() or public.has_permission('orders.read'))));
create policy payments_owner_read on public.payments for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.profile_id = auth.uid() or public.has_permission('orders.read'))));
create policy payment_events_staff_read on public.payment_events for select to authenticated using (public.has_permission('orders.read'));

grant select on public.brands, public.collections, public.fragrance_families, public.fragrance_notes, public.seasons, public.occasions, public.products, public.product_media, public.product_notes, public.collection_products, public.product_seasons, public.product_occasions, public.product_variants, public.shipping_zones, public.shipping_methods, public.shipping_zone_methods to anon, authenticated;
grant select, insert, update, delete on public.brands, public.collections, public.products, public.product_variants to authenticated;
grant insert, update, delete on public.fragrance_families, public.fragrance_notes, public.product_media, public.product_notes, public.collection_products, public.product_seasons, public.product_occasions to authenticated;
grant select on public.inventory_locations, public.inventory_levels, public.inventory_movements, public.inventory_reservations to authenticated;
grant insert, update, delete on public.inventory_locations to authenticated;
grant insert on public.inventory_levels to authenticated;
grant select, insert, update, delete on public.addresses, public.carts, public.cart_items to authenticated;
grant select on public.discounts to anon, authenticated;
grant select on public.coupons, public.discount_products, public.discount_collections to authenticated;
grant insert, update, delete on public.discounts, public.coupons, public.discount_products, public.discount_collections to authenticated;
grant insert, update, delete on public.shipping_zones, public.shipping_methods, public.shipping_zone_methods to authenticated;
grant select on public.checkout_sessions to authenticated;
grant select on public.orders, public.order_items, public.order_status_history, public.payments, public.payment_events to authenticated;
grant select on public.variant_availability to authenticated;

create trigger audit_products after insert or update or delete on public.products for each row execute function public.write_audit_log();
create trigger audit_product_variants after insert or update or delete on public.product_variants for each row execute function public.write_audit_log();
create trigger audit_inventory_levels after insert or update or delete on public.inventory_levels for each row execute function public.write_audit_log();
create trigger audit_discounts after insert or update or delete on public.discounts for each row execute function public.write_audit_log();
create trigger audit_orders after insert or update or delete on public.orders for each row execute function public.write_audit_log();
create trigger audit_payments after insert or update or delete on public.payments for each row execute function public.write_audit_log();

insert into public.seasons (name, slug) values
  ('Spring', 'spring'), ('Summer', 'summer'), ('Autumn', 'autumn'), ('Winter', 'winter');

insert into public.occasions (name, slug) values
  ('Everyday', 'everyday'), ('Office', 'office'), ('Evening', 'evening'),
  ('Formal', 'formal'), ('Date Night', 'date-night'), ('Celebration', 'celebration'), ('Travel', 'travel');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-media', 'product-media', true, 26214400, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy product_media_storage_public_read on storage.objects for select to public using (bucket_id = 'product-media');
create policy product_media_storage_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'product-media' and public.has_permission('products.write'));
create policy product_media_storage_admin_update on storage.objects for update to authenticated using (bucket_id = 'product-media' and public.has_permission('products.write')) with check (bucket_id = 'product-media' and public.has_permission('products.write'));
create policy product_media_storage_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'product-media' and public.has_permission('products.write'));

commit;
