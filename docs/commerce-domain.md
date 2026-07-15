# Commerce domain

Phase 3 establishes the database and service contracts used by the storefront, customer dashboard, admin application, and later payment integration.

## Catalogue

- A fragrance is one `products` row with one or more `product_variants`.
- Size, SKU, barcode, price, weight, availability, and low-stock limits belong to variants.
- Families, notes, seasons, occasions, brands, and collections are normalized and independently indexed.
- Public RLS exposes only active products and available variants. Staff catalogue access requires `products.read` or `products.write`.
- Product media is stored in the `product-media` bucket and mutation requires `products.write`.

## Money

All monetary values are stored as integer minor units with an ISO 4217 currency code. For example, NGN 25,000.00 is stored as `2500000` plus `NGN`. Floating-point values are never used for totals, discounts, shipping, refunds, or payments.

## Inventory

Inventory is tracked per variant and location as `on_hand` and `reserved`. Availability is always `on_hand - reserved`.

- `adjust_inventory` atomically changes stock and writes an inventory movement.
- `reserve_inventory` locks the checkout and inventory rows before reserving stock.
- `release_inventory_reservation` is idempotent and restores reserved availability.
- Direct customer inventory writes are impossible through RLS.

## Carts and checkout

- Each authenticated profile has at most one active cart.
- `add_cart_item` performs atomic quantity updates and derives price and currency from the active variant.
- A database trigger stamps the trusted current price even if the RPC is bypassed by another authenticated call.
- `create_checkout_session` recalculates the subtotal from stored cart items and rejects empty, expired, or foreign carts.
- Guest-cart persistence will be introduced with the Phase 4 storefront using a signed server-owned cart boundary; customer UUID ownership is not weakened for convenience.

## Orders and payments

Orders store immutable customer, address, product, SKU, and price snapshots. Later catalogue edits cannot rewrite historical orders.

Payments are provider-neutral records with idempotency keys and append-only provider events. `PaymentGateway` is an application interface; no live gateway is registered, so payment execution currently fails closed. Provider activation, webhooks, refunds, inventory conversion, and final order transitions belong to Phase 6/7.

## Deployment verification

The migrations are applied to the linked Supabase project. Verify at any time with:

```bash
npx supabase migration list --linked
npx supabase db lint --linked --level warning
```
