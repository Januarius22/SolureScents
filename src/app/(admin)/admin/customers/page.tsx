import { Mail, ShoppingBag, Users, Phone, MapPin } from "lucide-react";
import type { Metadata } from "next";

import { Money } from "@/components/account/account-ui";
import { getAdminCustomers } from "@/features/admin/services/commerce-operations";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { CustomerFiltersToolbar } from "@/features/admin/components/customer-filters-toolbar";

export const metadata: Metadata = {
  title: "Customer & Guest Directory | Solure Scents Admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    sort?: string;
  }>;
}

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Pagination params
  const rawPage = typeof params.page === "string" ? params.page : undefined;
  const page =
    rawPage && !Number.isNaN(Number(rawPage)) && Number(rawPage) > 0
      ? Math.floor(Number(rawPage))
      : 1;

  const rawPageSize = typeof params.pageSize === "string" ? params.pageSize : undefined;
  const pageSize =
    rawPageSize && [10, 20, 50].includes(Number(rawPageSize))
      ? Number(rawPageSize)
      : 10; // Default: pageSize = 10

  // Filter params
  const searchQuery = params.search?.trim().toLowerCase() ?? "";
  const sortOption = params.sort ?? "spend_desc";

  const allCustomers = await getAdminCustomers();

  // Filter customers by search (name, email, phone)
  const filteredCustomers = allCustomers.filter((c) => {
    if (!searchQuery) return true;
    const email = c.email.toLowerCase();
    const name = (c.name ?? "").toLowerCase();
    const phone = (c.phone ?? "").toLowerCase();
    return email.includes(searchQuery) || name.includes(searchQuery) || phone.includes(searchQuery);
  });

  // Sort customers
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (sortOption === "spend_asc") {
      return a.totalSpentMinor - b.totalSpentMinor;
    }
    if (sortOption === "orders_desc") {
      return b.orderCount - a.orderCount;
    }
    if (sortOption === "newest") {
      return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
    }
    if (sortOption === "oldest") {
      return new Date(a.lastOrderDate).getTime() - new Date(b.lastOrderDate).getTime();
    }
    // Default: spend_desc
    return b.totalSpentMinor - a.totalSpentMinor;
  });

  const totalRevenue = allCustomers.reduce((sum, c) => sum + c.totalSpentMinor, 0);
  const primaryCurrency = allCustomers[0]?.currency ?? "NGN";

  const totalCount = sortedCustomers.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const validPage = Math.max(1, Math.min(page, totalPages || 1));
  const pagedCustomers = sortedCustomers.slice(
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
          <b className="text-charcoal font-semibold">{allCustomers.length} Contacts</b>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Unique Shoppers</p>
          <p className="mt-2 font-display text-3xl text-charcoal">{allCustomers.length}</p>
          <p className="mt-1 text-xs text-muted">Deduplicated guest purchasers</p>
        </div>
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Total Verified Spend</p>
          <p className="mt-2 font-display text-3xl text-charcoal">
            <Money amount={totalRevenue} currency={primaryCurrency} />
          </p>
          <p className="mt-1 text-xs text-muted">Across verified captured checkouts</p>
        </div>
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Contact Policy</p>
          <p className="mt-2 font-display text-3xl text-gold">Email & Phone</p>
          <p className="mt-1 text-xs text-muted">Direct concierge outreach without accounts</p>
        </div>
      </div>

      {/* Task 7: Search and Sort Toolbar */}
      <CustomerFiltersToolbar
        currentSearch={params.search}
        currentSort={params.sort}
      />

      {/* Customers List Table in Scrollable Container with Sticky Header */}
      <div className="border border-charcoal/10 bg-white p-6 shadow-soft space-y-4">
        <div>
          <h2 className="font-display text-2xl text-charcoal">Shopper Contact List</h2>
          <p className="text-xs text-muted">
            Click email or phone to contact customers regarding their flacon delivery.
          </p>
        </div>

        {sortedCustomers.length > 0 ? (
          <div>
            <div className="overflow-x-auto overflow-y-auto max-h-[580px] border border-charcoal/10 rounded">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-charcoal/15 bg-white shadow-xs">
                  <tr className="text-muted uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 font-semibold">Customer Details</th>
                    <th className="py-3 px-4 font-semibold">Location</th>
                    <th className="py-3 px-4 font-semibold text-center">Orders</th>
                    <th className="py-3 px-4 font-semibold text-right">Verified Spend</th>
                    <th className="py-3 px-4 font-semibold">Last Order</th>
                    <th className="py-3 px-4 font-semibold text-right">Concierge Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal/5">
                  {pagedCustomers.map((c) => (
                    <tr key={c.email} className="hover:bg-ivory/50 transition-colors">
                      <td className="py-4 px-4 font-medium text-charcoal">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-8 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/70 shrink-0">
                            <Users size={14} />
                          </span>
                          <div>
                            <span className="font-semibold text-charcoal block text-xs">
                              {c.name ?? "Guest Customer"}
                            </span>
                            <span className="font-mono text-muted text-[11px] block">{c.email}</span>
                            {c.phone && (
                              <span className="font-mono text-[10px] text-muted/80 block mt-0.5">
                                {c.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-muted">
                        {c.shippingCity || c.shippingState ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin size={12} className="text-gold shrink-0" />
                            <span>{[c.shippingCity, c.shippingState].filter(Boolean).join(", ")}</span>
                          </div>
                        ) : (
                          <span className="text-muted/60 italic">Not specified</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center font-mono font-medium">
                        <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-xs">
                          <ShoppingBag size={11} />
                          {c.orderCount}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right font-medium text-charcoal">
                        <Money amount={c.totalSpentMinor} currency={c.currency} />
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-muted">
                        <span className="font-mono font-semibold text-charcoal block text-[11px]">
                          {c.lastOrderNumber}
                        </span>
                        <span className="block text-[10px] text-muted/70">
                          {new Date(c.lastOrderDate).toLocaleDateString("en-NG", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.phone && (
                            <a
                              href={`tel:${c.phone}`}
                              className="inline-flex items-center gap-1 border border-charcoal/20 px-2 py-1 text-[0.62rem] font-semibold tracking-wider text-charcoal uppercase hover:border-gold hover:text-gold transition"
                              title={`Call ${c.phone}`}
                            >
                              <Phone size={11} />
                              <span className="hidden sm:inline">Call</span>
                            </a>
                          )}
                          <a
                            href={`mailto:${c.email}?subject=Regarding your Solure Scents Order ${c.lastOrderNumber}`}
                            className="inline-flex items-center gap-1 border border-charcoal/20 px-2.5 py-1 text-[0.62rem] font-semibold tracking-wider text-charcoal uppercase hover:border-gold hover:text-gold transition"
                            title={`Email ${c.email}`}
                          >
                            <Mail size={11} />
                            <span>Email</span>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <AdminPagination
              currentPage={validPage}
              pageSize={pageSize}
              totalCount={totalCount}
              baseUrl="/admin/customers"
              searchParams={{
                search: params.search,
                sort: params.sort,
              }}
              itemLabel="customer contacts"
            />
          </div>
        ) : (
          <div className="py-16 text-center text-muted">
            <Users size={32} className="mx-auto mb-3 text-gold/40" />
            <p className="font-display text-2xl text-charcoal">
              {allCustomers.length === 0 ? "No customer contacts yet" : "No customers match your search"}
            </p>
            <p className="mt-1 text-xs">
              {allCustomers.length === 0
                ? "When shoppers complete checkout, their email contact and order details will appear here automatically."
                : "Try searching with a different name, email, or clear your search to see all customers."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
