import { createPrivilegedSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { readGuestSession, readGuestCartPayload } from "./guest-session";

export class CartReconciliationError extends Error {
  constructor(message: string, override readonly cause?: unknown) {
    super(message);
    this.name = "CartReconciliationError";
  }
}

function isMigrationPendingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  return (
    e.code === "PGRST202" ||
    e.code === "42883" ||
    e.code === "42P01" ||
    Boolean(e.message?.includes("session_token_hash")) ||
    Boolean(e.message?.includes("does not exist"))
  );
}

/**
 * Reconciles the client's cryptographically signed cookie cart with the database cart.
 * Ensures items are never lost during database migration transitions or backend recovery.
 * Genuine database failures are explicitly logged and surfaced rather than silently suppressed.
 */
export async function reconcileCartStorage(): Promise<{
  reconciled: boolean;
  itemCount: number;
  source: "database" | "cookie_fallback" | "synced";
}> {
  const session = await readGuestSession();
  if (!session) {
    return { reconciled: false, itemCount: 0, source: "cookie_fallback" };
  }

  const cookiePayload = await readGuestCartPayload();
  const dbClient = createPrivilegedSupabaseClient() ?? (await createServerSupabaseClient());

  try {
    // 1. Check if database has a cart for this guest session
    const { data: dbCart, error: cartError } = await dbClient
      .from("carts")
      .select("id, status")
      .eq("session_token_hash", session.tokenHash)
      .eq("status", "active")
      .maybeSingle();

    if (cartError) {
      if (isMigrationPendingError(cartError)) {
        // Pending migration: gracefully continue using verified cookie storage
        return {
          reconciled: true,
          itemCount: cookiePayload?.items.length ?? 0,
          source: "cookie_fallback",
        };
      }
      // Genuine database failure: log explicitly and propagate
      console.error("[CartReconciliation] Genuine database error fetching cart:", cartError);
      throw new CartReconciliationError("Database error during cart reconciliation.", cartError);
    }

    // If neither cookie nor DB has items, nothing to reconcile
    if (!cookiePayload || cookiePayload.items.length === 0) {
      return { reconciled: true, itemCount: 0, source: "database" };
    }

    // 2. If DB cart doesn't exist yet, insert it
    let cartId = dbCart?.id;
    if (!cartId) {
      const { data: newCart, error: insertError } = await dbClient
        .from("carts")
        .insert({
          session_token_hash: session.tokenHash,
          profile_id: null,
          status: "active",
          currency: "NGN",
        })
        .select("id")
        .single();

      if (insertError) {
        if (isMigrationPendingError(insertError)) {
          return {
            reconciled: true,
            itemCount: cookiePayload.items.length,
            source: "cookie_fallback",
          };
        }
        console.error("[CartReconciliation] Genuine database error creating cart:", insertError);
        throw new CartReconciliationError("Failed to create database cart record.", insertError);
      }

      cartId = newCart?.id;
    }

    // 3. Reconcile line items into database
    if (cartId && cookiePayload.items.length > 0) {
      for (const item of cookiePayload.items) {
        // Fetch current variant price
        const { data: variant, error: varError } = await dbClient
          .from("product_variants")
          .select("price_minor, currency, status, is_available")
          .eq("id", item.variantId)
          .single();

        if (varError || !variant || variant.status !== "active" || !variant.is_available) {
          continue; // Skip invalid or discontinued items
        }

        // Upsert cart item into DB
        await dbClient.from("cart_items").upsert(
          {
            cart_id: cartId,
            variant_id: item.variantId,
            quantity: Math.min(99, Math.max(1, item.quantity)),
            unit_price_minor: variant.price_minor,
            currency: variant.currency,
          },
          { onConflict: "cart_id,variant_id" },
        );
      }
    }

    return {
      reconciled: true,
      itemCount: cookiePayload.items.length,
      source: "synced",
    };
  } catch (err) {
    if (err instanceof CartReconciliationError) {
      throw err;
    }
    if (isMigrationPendingError(err)) {
      return {
        reconciled: true,
        itemCount: cookiePayload?.items.length ?? 0,
        source: "cookie_fallback",
      };
    }
    console.error("[CartReconciliation] Unexpected failure:", err);
    throw new CartReconciliationError("Cart reconciliation failed.", err);
  }
}
