import Link from "next/link";
import { AccountHeader, Empty, Money, Panel } from "@/components/account/account-ui";
import { getOverview } from "@/features/account/services/account-service";

export const metadata = { title: "My Account" };

/** Customer application boundary confirmation page. */
export default async function AccountPage() {
  const data = await getOverview();
  const metrics = [{ label: "Reward points", value: data.rewards.points_balance.toLocaleString() }, { label: "Saved scents", value: data.wishlist }, { label: "Unread updates", value: data.unread }];
  return <><AccountHeader eyebrow="Customer dashboard" title={`Welcome${data.name ? `, ${data.name.split(" ")[0]}` : " back"}`} copy="Track every order, curate your fragrance wardrobe, and manage your Solure experience."/><div className="grid gap-4 sm:grid-cols-3">{metrics.map((item) => <Panel key={item.label}><p className="text-xs tracking-wider text-muted uppercase">{item.label}</p><p className="mt-3 font-display text-3xl">{item.value}</p></Panel>)}</div><div className="mt-6"><Panel title="Recent orders">{data.orders.length ? <div className="divide-y">{data.orders.map((order) => <Link className="flex items-center justify-between py-4 text-sm hover:text-gold" href="/account/orders" key={order.id}><span><b>{order.order_number}</b><span className="ml-3 text-muted capitalize">{order.status}</span></span><Money amount={order.total_minor} currency={order.currency}/></Link>)}</div> : <Empty>Your first fragrance order will appear here.</Empty>}</Panel></div></>;
}
