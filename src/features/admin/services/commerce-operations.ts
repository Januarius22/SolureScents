import { requireApplicationAccess } from "@/features/auth/services/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCommerceOperations() {
  await requireApplicationAccess("admin");
  const db=await createServerSupabaseClient();
  const [orders,payments,levels,locations,variants,products]=await Promise.all([
    db.from("orders").select("*").order("created_at",{ascending:false}),
    db.from("payments").select("*").order("created_at",{ascending:false}),
    db.from("inventory_levels").select("*").order("updated_at",{ascending:false}),
    db.from("inventory_locations").select("*").eq("is_active",true),
    db.from("product_variants").select("id,product_id,label,sku,low_stock_limit"),
    db.from("products").select("id,name"),
  ]);
  for(const result of [orders,payments,levels,locations,variants,products]) if(result.error) throw new Error("Unable to load commerce operations.",{cause:result.error});
  return {orders:orders.data??[],payments:payments.data??[],levels:levels.data??[],locations:locations.data??[],variants:variants.data??[],products:products.data??[]};
}
