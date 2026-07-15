"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireApplicationAccess } from "@/features/auth/services/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function removeWishlistItem(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const access = await requireApplicationAccess("account");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("wishlist_items").delete().eq("id", id).eq("profile_id", access.id);
  if (error) throw new Error("Unable to update wishlist.", { cause: error });
  revalidatePath("/account/wishlist");
}

export async function markNotificationRead(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const access = await requireApplicationAccess("account");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("profile_id", access.id);
  if (error) throw new Error("Unable to update notification.", { cause: error });
  revalidatePath("/account/notifications"); revalidatePath("/account");
}

export async function updateProfile(formData: FormData) {
  const values = z.object({ full_name: z.string().trim().min(2).max(120), phone: z.string().trim().min(7).max(30) }).parse({ full_name: formData.get("full_name"), phone: formData.get("phone") });
  const access = await requireApplicationAccess("account");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("profiles").update(values).eq("id", access.id);
  if (error) throw new Error("Unable to update profile.", { cause: error });
  revalidatePath("/account/profile"); revalidatePath("/account");
}

export async function updatePreferences(formData: FormData) {
  const access = await requireApplicationAccess("account");
  const supabase = await createServerSupabaseClient();
  const values = { profile_id: access.id, order_updates: formData.has("order_updates"), rewards: formData.has("rewards"), editorial: formData.has("editorial"), marketing_email: formData.has("marketing_email") };
  const { error } = await supabase.from("notification_preferences").upsert(values, { onConflict: "profile_id" });
  if (error) throw new Error("Unable to update preferences.", { cause: error });
  revalidatePath("/account/settings");
}
