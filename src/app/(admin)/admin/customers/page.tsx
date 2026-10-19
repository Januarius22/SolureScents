import { Mail, ShoppingBag, Users } from "lucide-react";
import type { Metadata } from "next";

import { Money } from "@/components/account/account-ui";
import { getAdminCustomers } from "@/features/admin/services/commerce-operations";

import { AdminPagination } from "@/features/admin/components/admin-pagination";

export const metadata: Metadata = {
  title: "Customer & Guest Directory | Solure Scents Admin",
};

export default async function AdminCustomersPage({
  searchParams,
}: PageProps<"/admin/customers">) {
  const params = await searchParams;
  const rawPage = typeof params.page === "string" ? params.page : undefined;
  const page =
    rawPage && !Number.isNaN(Number(rawPage)) && Number(rawPage) > 0
      ? Math.floor(Number(rawPage))
      : 1;

  const pageSize = 10;
  const customers = await getAdminCustomers();

  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpentMinor, 0);
  const primaryCurrency = customers[0]?.currency ?? "NGN";

  const totalCount = customers.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const validPage = Math.max(1, Math.min(page, totalPages || 1));
  const pagedCustomers = customers.slice(
    (validPage - 1) * pageSize,
    validPage * pageSize,
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-charcoal/10 pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
            Guest Shoppers & Inquiries
          </p>
          <h1 className="mt-2 font-display text-4xl text-charcoal sm:text-5xl">
            Customer Directory
          </h1>
          <p className="mt-2 text-sm text-muted">
            All customer contacts captured through orders. Shoppers checkout as guests and are notified by email.
          </p>
        </div>

        <div className="border border-charcoal/15 bg-white px-4 py-2 text-xs">
          <span className="text-muted">Total Shoppers: </span>
          <b className="text-charcoal font-semibold">{customers.length} Contacts</b>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Unique Shoppers</p>
          <p className="mt-2 font-display text-3xl text-charcoal">{customers.length}</p>
          <p className="mt-1 text-xs text-muted">Direct guest purchasers</p>
        </div>
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Customer Spend</p>
          <p className="mt-2 font-display text-3xl text-charcoal">
            <Money amount={totalRevenue} currency={primaryCurrency} />
          </p>
          <p className="mt-1 text-xs text-muted">Across all completed checkouts</p>
        </div>
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Contact Policy</p>
          <p className="mt-2 font-display text-3xl text-gold">Email Only</p>
          <p className="mt-1 text-xs text-muted">No customer password creation required</p>
        </div>
      </div>

      {/* Customers List Table */}
      <div className="border border-charcoal/10 bg-white p-6 shadow-soft">
        <h2 className="font-display text-2xl text-charcoal">Shopper Contact List</h2>
        <p className="text-xs text-muted">
          Click email to launch your default mail client for customer support or concierge inquiries.
        </p>

        {customers.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-charcoal/10 text-muted uppercase tracking-wider">
                  <th className="py-3 pr-4 font-semibold">Customer Email</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold text-center">Orders</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Spent</th>
                  <th className="py-3 px-4 font-semibold">Last Order</th>
                  <th className="py-3 pl-4 font-semibold text-right">Concierge Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/5">
                {pagedCustomers.map((c) => (
                  <tr key={c.email} className="hover:bg-ivory/50 transition-colors">
                    <td className="py-4 pr-4 font-medium text-charcoal">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/70">
                          <Users size={13} />
                        </span>
                        <span className="font-mono">{c.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-muted">
                      {c.shippingCity ? `${c.shippingCity}, ${c.shippingCountry ?? ""}` : "Not specified"}
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-medium">
                      <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5">
                        <ShoppingBag size={11} />
                        {c.orderCount}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-charcoal">
                      <Money amount={c.totalSpentMinor} currency={c.currency} />
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-muted">
                      <span>{c.lastOrderNumber}</span>
                      <span className="block text-[10px] text-muted/70">
                        {new Date(c.lastOrderDate).toLocaleDateString("en-NG", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="py-4 pl-4 text-right">
                      <a
                        href={`mailto:${c.email}?subject=Regarding your Solure Scents Order ${c.lastOrderNumber}`}
                        className="inline-flex items-center gap-1.5 border border-charcoal/20 px-3 py-1 text-[0.62rem] font-semibold tracking-wider text-charcoal uppercase hover:border-gold hover:text-gold"
                      >
                        <Mail size={12} />
                        <span>Email</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <AdminPagination
              currentPage={validPage}
              pageSize={pageSize}
              totalCount={totalCount}
              baseUrl="/admin/customers"
              searchParams={{}}
              itemLabel="customer contacts"
            />
          </div>
        ) : (
          <div className="py-16 text-center text-muted">
            <Users size={32} className="mx-auto mb-3 text-gold/40" />
            <p className="font-display text-2xl text-charcoal">No customer contacts yet</p>
            <p className="mt-1 text-xs">
              When shoppers complete checkout, their email contact and order details will appear here automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
