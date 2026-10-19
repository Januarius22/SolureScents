-- ============================================================================
-- SOLURE SCENTS — DATABASE MIGRATION 202607190001
-- SPRINT 3.3: PERFUME COLLECTIONS (PREMIUM & REGULAR)
-- ============================================================================
-- Architecture: Non-destructive addition of collection tier classification
-- Target Table: public.products
-- Allowed Values: 'premium', 'regular' (or null for legacy unclassified)
--
-- IMPORTANT:
-- This migration is prepared for future deployment with explicit approval.
-- Do not run or deploy without user authorization.
-- ============================================================================

begin;

-- 1. Add collection classification column to products
alter table public.products 
  add column if not exists collection text;

-- 2. Enforce allowed collection classifications
alter table public.products 
  drop constraint if exists products_collection_check;

alter table public.products 
  add constraint products_collection_check 
  check (collection is null or collection in ('premium', 'regular'));

-- 3. Composite performance index for published storefront filtering
create index if not exists products_collection_status_idx 
  on public.products(collection, status) 
  where status = 'active';

comment on column public.products.collection is 'Perfume collection tier classification: premium or regular';

commit;
