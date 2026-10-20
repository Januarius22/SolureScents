"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, RotateCcw } from "lucide-react";

interface CustomerFiltersToolbarProps {
  currentSearch?: string;
  currentSort?: string;
}

export function CustomerFiltersToolbar({
  currentSearch = "",
  currentSort = "spend_desc",
}: CustomerFiltersToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(currentSearch);
  const [sort, setSort] = useState(currentSort);

  const applyFilters = (updates: { search?: string; sort?: string }) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("page"); // Reset page

    const newSearch = updates.search !== undefined ? updates.search : search;
    const newSort = updates.sort !== undefined ? updates.sort : sort;

    if (newSearch.trim()) sp.set("search", newSearch.trim());
    else sp.delete("search");

    if (newSort && newSort !== "spend_desc") sp.set("sort", newSort);
    else sp.delete("sort");

    startTransition(() => {
      router.push(`/admin/customers?${sp.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ search });
  };

  const resetFilters = () => {
    setSearch("");
    setSort("spend_desc");

    const sp = new URLSearchParams();
    const pageSize = searchParams.get("pageSize");
    if (pageSize) sp.set("pageSize", pageSize);

    startTransition(() => {
      router.push(`/admin/customers?${sp.toString()}`);
    });
  };

  const hasActiveFilters = Boolean(currentSearch) || currentSort !== "spend_desc";

  return (
    <div className="flex flex-col gap-3 rounded border border-charcoal/15 bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative flex-1">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="text"
          placeholder="Search by customer name, email or phone number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-charcoal/20 bg-ivory/30 py-2 pl-9 pr-20 text-xs text-charcoal focus:border-gold focus:bg-white focus:outline-hidden"
        />
        <button
          type="submit"
          className="absolute right-1 top-1 bottom-1 bg-charcoal px-3 text-[11px] font-semibold uppercase tracking-wider text-pearl hover:bg-gold hover:text-charcoal transition"
        >
          Search
        </button>
      </form>

      {/* Sort & Reset */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <span className="hidden sm:inline text-[11px] uppercase tracking-wider">Sort:</span>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              applyFilters({ sort: e.target.value });
            }}
            className="border border-charcoal/20 bg-white py-1.5 px-2 text-xs text-charcoal focus:border-gold focus:outline-hidden"
          >
            <option value="spend_desc">Highest Spend</option>
            <option value="spend_asc">Lowest Spend</option>
            <option value="orders_desc">Most Orders</option>
            <option value="newest">Newest Order</option>
            <option value="oldest">Oldest Order</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex min-h-9 items-center gap-1.5 border border-charcoal/20 px-3 text-xs font-semibold uppercase tracking-wider text-muted hover:border-gold hover:text-charcoal transition"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
