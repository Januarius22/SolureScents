import { requireApplicationAccess } from "@/features/auth/services/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface DailyMetric{date:string;orders:number;revenueMinor:number}
/** Builds a bounded operational snapshot through RLS-protected reads; no customer PII is exposed in aggregates. */
export async function getAnalyticsSnapshot(){await requireApplicationAccess("admin");const db=await createServerSupabaseClient();const since=new Date();since.setUTCDate(since.getUTCDate()-29);since.setUTCHours(0,0,0,0);const [orders,products,customers,payments]=await Promise.all([
  db.from("orders").select("id,status,total_minor,currency,created_at").gte("created_at",since.toISOString()).order("created_at"),
  db.from("products").select("id",{count:"exact",head:true}).eq("status","active"),
  db.from("profiles").select("id",{count:"exact",head:true}).eq("status","active"),
  db.from("payments").select("status,amount_minor,refunded_minor").gte("created_at",since.toISOString()),
]);for(const x of [orders,products,customers,payments])if(x.error)throw new Error("Unable to load analytics.",{cause:x.error});const daily=new Map<string,DailyMetric>();for(let i=0;i<30;i++){const d=new Date(since);d.setUTCDate(d.getUTCDate()+i);const date=d.toISOString().slice(0,10);daily.set(date,{date,orders:0,revenueMinor:0})}for(const o of orders.data??[]){const m=daily.get(o.created_at.slice(0,10));if(m){m.orders++;if(!["cancelled","refunded"].includes(o.status))m.revenueMinor+=o.total_minor}}const valid=(orders.data??[]).filter(o=>!["cancelled","refunded"].includes(o.status));const revenue=valid.reduce((s,o)=>s+o.total_minor,0);const captured=(payments.data??[]).filter(p=>["captured","partially_refunded"].includes(p.status)).reduce((s,p)=>s+p.amount_minor-p.refunded_minor,0);return {currency:orders.data?.[0]?.currency??"NGN",daily:[...daily.values()],orders:orders.data?.length??0,revenue,captured,averageOrder:valid.length?Math.round(revenue/valid.length):0,activeProducts:products.count??0,customers:customers.count??0};}
