import Link from "next/link";
import { AccountHeader, Money, Panel } from "@/components/account/account-ui";
import { getCommerceOperations } from "@/features/admin/services/commerce-operations";

export const metadata = { title: "Administration" };

/** Admin application boundary confirmation page. */
export default async function AdminPage() {
  const d=await getCommerceOperations();const revenue=d.orders.filter(o=>!(["cancelled","refunded"] as string[]).includes(o.status)).reduce((s,o)=>s+o.total_minor,0);const low=d.levels.filter(l=>{const v=d.variants.find(x=>x.id===l.variant_id);return l.on_hand-l.reserved<=(v?.low_stock_limit??0)}).length;
  return <><AccountHeader eyebrow="Operations" title="Commerce command centre" copy="A unified view of orders, stock exposure, and payment readiness."/><div className="grid gap-4 sm:grid-cols-3"><Panel><p className="text-xs text-muted uppercase">Orders</p><p className="mt-3 font-display text-4xl">{d.orders.length}</p></Panel><Panel><p className="text-xs text-muted uppercase">Order value</p><p className="mt-3 font-display text-4xl"><Money amount={revenue} currency={d.orders[0]?.currency??"NGN"}/></p></Panel><Panel><p className="text-xs text-muted uppercase">Low-stock records</p><p className="mt-3 font-display text-4xl">{low}</p></Panel></div><div className="mt-6 grid gap-4 sm:grid-cols-3">{([{label:"Inventory",href:"/admin/inventory"},{label:"Orders",href:"/admin/orders"},{label:"Payments",href:"/admin/payments"}] as const).map(({label,href})=><Link className="border bg-white p-6 font-display text-2xl transition hover:border-gold hover:text-gold" href={href} key={href}>{label} →</Link>)}</div></>;
}
