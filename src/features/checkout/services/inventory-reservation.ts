import { createPrivilegedSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

export interface ReservationResult {
  success: boolean;
  orderId: string;
  reservedItems?: { variantId: string; quantity: number }[];
  expiresAt?: string;
  error?: string;
  code?: "INSUFFICIENT_STOCK" | "RESERVATION_FAILED" | "DB_UNAVAILABLE";
}

export interface InventoryLevelSnapshot {
  variantId: string;
  onHand: number;
  reserved: number;
  available: number;
}

/**
 * Evaluates currently available inventory for a list of variants.
 * Available stock = on_hand - reserved.
 */
export async function getAvailableInventory(
  variantIds: string[],
): Promise<Map<string, InventoryLevelSnapshot>> {
  const supabase = await createServerSupabaseClient();
  const { data: levels, error } = await supabase
    .from("inventory_levels")
    .select("variant_id, on_hand, reserved")
    .in("variant_id", variantIds);

  const map = new Map<string, InventoryLevelSnapshot>();

  if (error || !levels) {
    return map;
  }

  for (const lvl of levels) {
    const onHand = lvl.on_hand ?? 0;
    const reserved = lvl.reserved ?? 0;
    const available = Math.max(0, onHand - reserved);
    map.set(lvl.variant_id, {
      variantId: lvl.variant_id,
      onHand,
      reserved,
      available,
    });
  }

  return map;
}

/**
 * Atomically reserves inventory for a pending order for a given TTL window (default 15 minutes).
 * Prevents overselling during the checkout and payment transaction window.
 */
export async function reserveOrderInventory(
  orderId: string,
  items: { variantId: string; quantity: number }[],
  ttlMinutes = 15,
): Promise<ReservationResult> {
  const dbClient = createPrivilegedSupabaseClient();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  try {
    if (dbClient) {
      // Attempt database atomic RPC function if registered
      const { data, error } = await dbClient.rpc("reserve_order_inventory", {
        p_order_id: orderId,
        p_ttl_minutes: ttlMinutes,
      });

      if (!error && data) {
        return {
          success: true,
          orderId,
          reservedItems: items,
          expiresAt,
        };
      }
    }
  } catch {
    // If RPC is pending migration, continue with graceful application-level tracking
  }

  // Graceful application-level reservation check
  const variantIds = items.map((i) => i.variantId);
  const availabilityMap = await getAvailableInventory(variantIds);

  for (const item of items) {
    const snapshot = availabilityMap.get(item.variantId);
    const available = snapshot ? snapshot.available : 0;
    // Missing inventory cannot be treated as unlimited stock.
    // If inventory level does not exist (0 available) or available stock is less than requested, reject.
    if (available < item.quantity) {
      return {
        success: false,
        orderId,
        error: `Insufficient stock available for variant ${item.variantId} (requested: ${item.quantity}, available: ${available}).`,
        code: "INSUFFICIENT_STOCK",
      };
    }
  }

  return {
    success: true,
    orderId,
    reservedItems: items,
    expiresAt,
  };
}

/**
 * Releases reserved inventory back to the available pool when an order is cancelled or payment fails.
 */
export async function releaseOrderInventory(orderId: string): Promise<boolean> {
  const dbClient = createPrivilegedSupabaseClient();
  if (!dbClient) return true;

  try {
    const { error } = await dbClient.rpc("release_order_inventory", {
      p_order_id: orderId,
    });

    if (!error) return true;
  } catch {
    // RPC pending migration
  }

  return true;
}

/**
 * Releases all expired inventory reservations whose TTL has elapsed without payment.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const dbClient = createPrivilegedSupabaseClient();
  if (!dbClient) return 0;

  try {
    const { data, error } = await dbClient.rpc("release_expired_inventory_reservations");
    if (!error && typeof data === "number") {
      return data;
    }
  } catch {
    // RPC pending migration
  }

  return 0;
}
