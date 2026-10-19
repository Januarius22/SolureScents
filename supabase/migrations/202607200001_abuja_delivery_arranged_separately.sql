-- ==============================================================================
-- Solure Scents — Migration 202607200001_abuja_delivery_arranged_separately.sql
-- Description: Abuja-first nationwide delivery policy & 'arranged_separately' delivery status
--
-- IMPORTANT DEPLOYMENT SAFETY RULES:
-- 1. DO NOT EXECUTE OR DEPLOY THIS MIGRATION AUTOMATICALLY.
-- 2. Requires Super Administrator sign-off prior to production deployment.
-- 3. Non-destructive alteration: expands check constraint without dropping data.
-- ==============================================================================

begin;

-- 1. Expand public.orders delivery_status check constraint to support 'arranged_separately'
alter table public.orders drop constraint if exists orders_delivery_status_check;

alter table public.orders add constraint orders_delivery_status_check
  check (delivery_status in ('configured', 'pending', 'free', 'arranged_separately'));

-- 2. Ensure default delivery status remains 'arranged_separately' under Abuja-first model
alter table public.orders alter column delivery_status set default 'arranged_separately';

-- 3. Update comments documenting the nationwide Abuja delivery arrangement architecture
comment on column public.orders.delivery_status is 
  'Delivery pricing settlement status: configured (preset courier rate), pending (unconfirmed), free (complimentary promotion), arranged_separately (Abuja atelier nationwide policy: customer pays perfume total only online; courier fee confirmed and paid separately via WhatsApp).';

commit;
