import { AccountHeader, Empty, Money, Panel } from "@/components/account/account-ui";
import { getAccountData } from "@/features/account/services/account-service";

export const metadata = { title: "Orders" };

export default async function Page() {
  const { orders } = await getAccountData();

  return (
    <>
      <AccountHeader
        eyebrow="Purchases"
        title="Orders"
        copy="Review your purchase history and fulfillment status."
      />
      <Panel>
        {orders.length ? (
          <div className="divide-y">
            {orders.map((o) => (
              <article
                className="grid gap-3 py-5 sm:grid-cols-[1fr_auto]"
                key={o.id}
              >
                <div>
                  <h2 className="font-semibold">{o.order_number}</h2>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(o.created_at).toLocaleDateString()} ·{" "}
                    <span className="capitalize">
                      {o.status.replaceAll("_", " ")}
                    </span>{" "}
                    · {o.fulfillment_status.replaceAll("_", " ")}
                  </p>
                </div>
                <strong>
                  <Money amount={o.total_minor} currency={o.currency} />
                </strong>
              </article>
            ))}
          </div>
        ) : (
          <Empty>No orders yet. Your fragrance journey can begin in the boutique.</Empty>
        )}
      </Panel>
    </>
  );
}
