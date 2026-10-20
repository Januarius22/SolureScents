import type { Metadata } from "next";
import Link from "next/link";
import { Search, RotateCcw } from "lucide-react";

import {
  AccountHeader,
  Empty,
  Panel,
  buttonClass,
  inputClass,
} from "@/components/account/account-ui";
import { adjustInventory } from "@/features/admin/actions/commerce-operations";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { getCommerceOperations } from "@/features/admin/services/commerce-operations";

export const metadata: Metadata = {
  title: "Inventory Operations & Stock Control | Solure Scents Admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
    sort?: string;
  }>;
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Pagination parameters
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

  // Search & Filter parameters
  const searchQuery = params.search?.trim().toLowerCase() ?? "";
  const statusFilter = params.status ?? "all";
  const sortOption = params.sort ?? "default";

  const d = await getCommerceOperations();
  const products = new Map(d.products.map((p) => [p.id, p.name]));
  const variants = new Map(d.variants.map((v) => [v.id, v]));
  const locations = new Map(d.locations.map((l) => [l.id, l.name]));

  // Filter levels
  const filteredLevels = d.levels.filter((l) => {
    const v = variants.get(l.variant_id);
    const productName = (v ? products.get(v.product_id) : "")?.toLowerCase() ?? "";
    const sku = (v?.sku ?? "").toLowerCase();
    const label = (v?.label ?? "").toLowerCase();
    const locationName = (locations.get(l.location_id) ?? "").toLowerCase();

    if (searchQuery) {
      const match =
        productName.includes(searchQuery) ||
        sku.includes(searchQuery) ||
        label.includes(searchQuery) ||
        locationName.includes(searchQuery);
      if (!match) return false;
    }

    const available = l.on_hand - l.reserved;
    const limit = v?.low_stock_limit ?? 0;

    if (statusFilter === "out_of_stock" && available > 0) return false;
    if (statusFilter === "low_stock" && (available <= 0 || available > limit)) return false;
    if (statusFilter === "healthy" && available <= limit) return false;

    return true;
  });

  // Sort levels
  const sortedLevels = [...filteredLevels].sort((a, b) => {
    const vA = variants.get(a.variant_id);
    const vB = variants.get(b.variant_id);
    const availA = a.on_hand - a.reserved;
    const availB = b.on_hand - b.reserved;

    if (sortOption === "avail_asc") return availA - availB;
    if (sortOption === "avail_desc") return availB - availA;
    if (sortOption === "on_hand_desc") return b.on_hand - a.on_hand;

    // Default: prioritize low/out of stock items first, then updated_at
    const isLowA = availA <= (vA?.low_stock_limit ?? 0);
    const isLowB = availB <= (vB?.low_stock_limit ?? 0);
    if (isLowA && !isLowB) return -1;
    if (!isLowA && isLowB) return 1;

    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const totalCount = sortedLevels.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const validPage = Math.max(1, Math.min(page, totalPages || 1));
  const pagedLevels = sortedLevels.slice(
    (validPage - 1) * pageSize,
    validPage * pageSize,
  );

  const hasActiveFilters = Boolean(searchQuery) || statusFilter !== "all" || sortOption !== "default";

  return (
    <div className="space-y-6">
      <AccountHeader
        eyebrow="Stock Control & Movements"
        title="Inventory Allocations"
        copy="Monitor real-time availability by warehouse location and post auditable stock movements."
      />

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 rounded border border-charcoal/15 bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <form className="relative flex-1" method="GET">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            name="search"
            defaultValue={params.search ?? ""}
            placeholder="Search by perfume, SKU, flacon size, or location..."
            className="w-full border border-charcoal/20 bg-ivory/30 py-2 pl-9 pr-20 text-xs text-charcoal focus:border-gold focus:bg-white focus:outline-hidden"
          />
          {params.pageSize && <input type="hidden" name="pageSize" value={params.pageSize} />}
          <button
            type="submit"
            className="absolute right-1 top-1 bottom-1 bg-charcoal px-3 text-[11px] font-semibold uppercase tracking-wider text-pearl hover:bg-gold hover:text-charcoal transition"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Filter Links */}
          <div className="inline-flex rounded border border-charcoal/15 bg-white p-0.5 text-xs">
            <Link
              href="/admin/inventory"
              className={`rounded px-2.5 py-1 text-[11px] font-semibold transition ${
                statusFilter === "all"
                  ? "bg-charcoal text-pearl font-bold shadow-xs"
                  : "text-charcoal/70 hover:bg-ivory hover:text-gold"
              }`}
            >
              All
            </Link>
            <Link
              href="/admin/inventory?status=low_stock"
              className={`rounded px-2.5 py-1 text-[11px] font-semibold transition ${
                statusFilter === "low_stock"
                  ? "bg-amber-600 text-pearl font-bold shadow-xs"
                  : "text-amber-800 hover:bg-amber-50"
              }`}
            >
              Low Stock
            </Link>
            <Link
              href="/admin/inventory?status=out_of_stock"
              className={`rounded px-2.5 py-1 text-[11px] font-semibold transition ${
                statusFilter === "out_of_stock"
                  ? "bg-rose-700 text-pearl font-bold shadow-xs"
                  : "text-rose-800 hover:bg-rose-50"
              }`}
            >
              Out of Stock
            </Link>
          </div>

          {hasActiveFilters && (
            <Link
              href="/admin/inventory"
              className="inline-flex min-h-8 items-center gap-1 border border-charcoal/20 px-2.5 text-xs font-semibold uppercase tracking-wider text-muted hover:border-gold hover:text-charcoal transition"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </Link>
          )}
        </div>
      </div>

      <Panel title={`Stock Levels (${totalCount} Filtered Allocations)`}>
        {sortedLevels.length ? (
          <div>
            {/* Scrollable Container with Controlled Maximum Height */}
            <div className="space-y-4 overflow-y-auto max-h-[640px] pr-1">
              {pagedLevels.map((l) => {
                const v = variants.get(l.variant_id);
                const available = l.on_hand - l.reserved;
                const isLow = available <= (v?.low_stock_limit ?? 0);
                const isOutOfStock = available <= 0;

                return (
                  <article
                    className={`border p-4 sm:p-5 shadow-soft transition-all rounded ${
                      isOutOfStock
                        ? "border-rose-300 bg-rose-50/20"
                        : isLow
                        ? "border-amber-300 bg-amber-50/20"
                        : "border-charcoal/15 bg-white"
                    }`}
                    key={l.id}
                  >
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-semibold text-charcoal text-sm sm:text-base">
                            {v ? products.get(v.product_id) : "Product"} · {v?.label}
                          </h2>
                          {isOutOfStock && (
                            <span className="rounded bg-rose-100 border border-rose-300 px-2 py-0.5 text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                              Out of Stock
                            </span>
                          )}
                          {!isOutOfStock && isLow && (
                            <span className="rounded bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                              Low Stock
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          SKU: <span className="font-mono font-medium text-charcoal">{v?.sku}</span> · Location:{" "}
                          <span className="font-medium text-charcoal">
                            {locations.get(l.location_id) ?? "Main Atelier"}
                          </span>
                        </p>
                      </div>

                      <div className="flex sm:flex-col items-center justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-charcoal/10 sm:px-4">
                        <span className="text-xs text-muted sm:order-2">On hand</span>
                        <b className="font-mono text-sm sm:order-1 text-charcoal">{l.on_hand}</b>
                      </div>

                      <div className="flex sm:flex-col items-center justify-between sm:justify-center sm:px-4">
                        <span className="text-xs text-muted sm:order-2">Reserved</span>
                        <b className="font-mono text-sm text-muted sm:order-1">{l.reserved}</b>
                      </div>

                      <div className="flex sm:flex-col items-center justify-between sm:justify-center sm:px-4">
                        <span className="text-xs text-muted sm:order-2">Available</span>
                        <b
                          className={`font-mono text-sm sm:order-1 ${
                            isOutOfStock
                              ? "text-rose-700 font-extrabold"
                              : isLow
                              ? "text-amber-700 font-extrabold"
                              : "text-emerald-700 font-bold"
                          }`}
                        >
                          {available}
                        </b>
                      </div>
                    </div>

                    {/* Stock Movement Form */}
                    <form
                      action={adjustInventory}
                      className="mt-4 border-t border-charcoal/10 pt-3 grid gap-2 sm:grid-cols-[8rem_11rem_1fr_auto]"
                    >
                      <input name="id" type="hidden" value={l.id} />
                      <input
                        aria-label="Quantity adjustment"
                        className={inputClass}
                        name="quantity"
                        placeholder="+10 or -2"
                        required
                        type="number"
                      />
                      <select
                        aria-label="Reason"
                        className={inputClass}
                        name="reason"
                        defaultValue="receipt"
                      >
                        <option value="receipt">Receipt (New Stock)</option>
                        <option value="return">Return</option>
                        <option value="damage">Damage / Waste</option>
                        <option value="correction">Inventory Correction</option>
                        <option value="transfer_in">Transfer In</option>
                        <option value="transfer_out">Transfer Out</option>
                      </select>
                      <input
                        aria-label="Adjustment note"
                        className={inputClass}
                        name="note"
                        placeholder="Audit note / reason"
                      />
                      <button className={buttonClass} type="submit">
                        Post Movement
                      </button>
                    </form>
                  </article>
                );
              })}
            </div>

            <AdminPagination
              currentPage={validPage}
              pageSize={pageSize}
              totalCount={totalCount}
              baseUrl="/admin/inventory"
              searchParams={{
                search: params.search,
                status: params.status,
                sort: params.sort,
              }}
              itemLabel="inventory allocations"
            />
          </div>
        ) : (
          <Empty>
            {d.levels.length === 0
              ? "No inventory levels exist yet. Add variants to an active stock location first."
              : "No stock allocations match your current search and filter. Reset filters to view all."}
          </Empty>
        )}
      </Panel>
    </div>
  );
}
