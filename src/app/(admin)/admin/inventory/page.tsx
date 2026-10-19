import type { Metadata } from "next";

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

export default async function InventoryPage({
  searchParams,
}: PageProps<"/admin/inventory">) {
  const params = await searchParams;
  const rawPage = typeof params.page === "string" ? params.page : undefined;
  const page =
    rawPage && !Number.isNaN(Number(rawPage)) && Number(rawPage) > 0
      ? Math.floor(Number(rawPage))
      : 1;

  const pageSize = 10;
  const d = await getCommerceOperations();
  const products = new Map(d.products.map((p) => [p.id, p.name]));
  const variants = new Map(d.variants.map((v) => [v.id, v]));
  const locations = new Map(d.locations.map((l) => [l.id, l.name]));

  const totalCount = d.levels.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const validPage = Math.max(1, Math.min(page, totalPages || 1));
  const pagedLevels = d.levels.slice(
    (validPage - 1) * pageSize,
    validPage * pageSize,
  );

  return (
    <div className="space-y-6">
      <AccountHeader
        eyebrow="Stock Control & Movements"
        title="Inventory Allocations"
        copy="Monitor real-time availability by warehouse location and post auditable stock movements."
      />

      <Panel title={`Stock Levels (${totalCount} Allocations)`}>
        {d.levels.length ? (
          <div className="space-y-4">
            {pagedLevels.map((l) => {
              const v = variants.get(l.variant_id);
              const available = l.on_hand - l.reserved;
              const isLow = available <= (v?.low_stock_limit ?? 0);

              return (
                <article
                  className="border border-charcoal/15 bg-white p-4 sm:p-5 shadow-soft transition-all"
                  key={l.id}
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                    <div>
                      <h2 className="font-semibold text-charcoal text-sm sm:text-base">
                        {v ? products.get(v.product_id) : "Product"} · {v?.label}
                      </h2>
                      <p className="mt-1 text-xs text-muted">
                        SKU: <span className="font-mono">{v?.sku}</span> · Location:{" "}
                        <span className="font-medium text-charcoal">
                          {locations.get(l.location_id) ?? "Main Atelier"}
                        </span>
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-charcoal/10 sm:px-4">
                      <span className="text-xs text-muted sm:order-2">On hand</span>
                      <b className="font-mono text-sm sm:order-1">{l.on_hand}</b>
                    </div>

                    <div className="flex sm:flex-col items-center justify-between sm:justify-center sm:px-4">
                      <span className="text-xs text-muted sm:order-2">Reserved</span>
                      <b className="font-mono text-sm text-muted sm:order-1">{l.reserved}</b>
                    </div>

                    <div className="flex sm:flex-col items-center justify-between sm:justify-center sm:px-4">
                      <span className="text-xs text-muted sm:order-2">Available</span>
                      <b
                        className={`font-mono text-sm sm:order-1 ${
                          isLow ? "text-amber-700 font-extrabold" : "text-emerald-700"
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

            <AdminPagination
              currentPage={validPage}
              pageSize={pageSize}
              totalCount={totalCount}
              baseUrl="/admin/inventory"
              searchParams={{}}
              itemLabel="inventory allocations"
            />
          </div>
        ) : (
          <Empty>No inventory levels exist yet. Add variants to an active stock location first.</Empty>
        )}
      </Panel>
    </div>
  );
}
