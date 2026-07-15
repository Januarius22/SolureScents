import { requireApplicationAccess } from "@/features/auth/services/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function context() {
  const access = await requireApplicationAccess("account");
  return { access, supabase: await createServerSupabaseClient() };
}

function unwrap<T>(result: { data: T; error: { message: string } | null }, message: string): NonNullable<T> {
  if (result.error || result.data === null) throw new Error(message, { cause: result.error });
  return result.data as NonNullable<T>;
}

export async function getOverview() {
  const { access, supabase } = await context();
  const [profile, orders, wishlist, rewards, notifications] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", access.id).single(),
    supabase.from("orders").select("id,order_number,status,total_minor,currency,created_at").eq("profile_id", access.id).order("created_at", { ascending: false }).limit(3),
    supabase.from("wishlist_items").select("id", { count: "exact", head: true }).eq("profile_id", access.id),
    supabase.from("reward_accounts").select("points_balance,tier").eq("profile_id", access.id).single(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("profile_id", access.id).is("read_at", null),
  ]);
  return { name: unwrap(profile, "Unable to load profile.").full_name, orders: unwrap(orders, "Unable to load orders."), wishlist: wishlist.count ?? 0, rewards: unwrap(rewards, "Unable to load rewards."), unread: notifications.count ?? 0 };
}

export async function getAccountData() {
  const { access, supabase } = await context();
  const [profile, orders, wishlist, products, addresses, reviews, rewards, notifications, preferences] = await Promise.all([
    supabase.from("profiles").select("full_name,phone,currency,locale").eq("id", access.id).single(),
    supabase.from("orders").select("id,order_number,status,fulfillment_status,total_minor,currency,created_at,tracking_url,carrier").eq("profile_id", access.id).order("created_at", { ascending: false }),
    supabase.from("wishlist_items").select("id,product_id,created_at").eq("profile_id", access.id).order("created_at", { ascending: false }),
    supabase.from("products").select("id,name,slug,subtitle").eq("status", "active"),
    supabase.from("addresses").select("*").eq("profile_id", access.id).order("is_default_shipping", { ascending: false }),
    supabase.from("reviews").select("*").eq("profile_id", access.id).order("created_at", { ascending: false }),
    supabase.from("reward_accounts").select("*").eq("profile_id", access.id).single(),
    supabase.from("notifications").select("*").eq("profile_id", access.id).order("created_at", { ascending: false }),
    supabase.from("notification_preferences").select("*").eq("profile_id", access.id).single(),
  ]);
  return { access, profile: unwrap(profile, "Unable to load profile."), orders: unwrap(orders, "Unable to load orders."), wishlist: unwrap(wishlist, "Unable to load wishlist."), products: unwrap(products, "Unable to load products."), addresses: unwrap(addresses, "Unable to load addresses."), reviews: unwrap(reviews, "Unable to load reviews."), rewards: unwrap(rewards, "Unable to load rewards."), notifications: unwrap(notifications, "Unable to load notifications."), preferences: unwrap(preferences, "Unable to load preferences.") };
}
