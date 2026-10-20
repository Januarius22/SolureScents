import Link from "next/link";

interface AdminPaginationProps {
  currentPage: number;
  pageSize?: number;
  totalCount: number;
  baseUrl: string;
  searchParams?: Record<string, string | undefined>;
  itemLabel?: string;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
}

export function AdminPagination({
  currentPage,
  pageSize = 10,
  totalCount,
  baseUrl,
  searchParams = {},
  itemLabel = "records",
  pageSizeOptions = [10, 20, 50],
  showPageSizeSelector = true,
}: AdminPaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize);

  const buildQueryHref = (newPage?: number, newPageSize?: number) => {
    const sp = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v !== undefined && v !== "" && k !== "page" && k !== "pageSize" && k !== "limit") {
        sp.set(k, v);
      }
    });

    const targetPageSize = newPageSize ?? pageSize;
    if (targetPageSize !== 10) {
      sp.set("pageSize", String(targetPageSize));
    }

    const targetPage = newPage ?? currentPage;
    if (targetPage > 1 && !newPageSize) {
      sp.set("page", String(targetPage));
    }

    const qs = sp.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  };

  const validPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const fromIndex = totalCount > 0 ? (validPage - 1) * pageSize + 1 : 0;
  const toIndex = Math.min(validPage * pageSize, totalCount);

  const pageNumbers: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (validPage > 3) pageNumbers.push("...");
    const start = Math.max(2, validPage - 1);
    const end = Math.min(totalPages - 1, validPage + 1);
    for (let i = start; i <= end; i++) pageNumbers.push(i);
    if (validPage < totalPages - 2) pageNumbers.push("...");
    pageNumbers.push(totalPages);
  }

  return (
    <nav
      aria-label="Admin pagination"
      className="mt-6 flex flex-col gap-4 border-t border-charcoal/10 pt-5 sm:flex-row sm:items-center sm:justify-between"
    >
      {/* Information & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <p>
          Showing{" "}
          <strong className="font-semibold text-charcoal">
            {fromIndex}–{toIndex}
          </strong>{" "}
          of <strong className="font-semibold text-charcoal">{totalCount}</strong> {itemLabel}
        </p>

        {showPageSizeSelector && totalCount > 10 && (
          <div className="flex items-center gap-1.5 border-l border-charcoal/15 pl-3">
            <span className="text-[11px] text-muted">Per page:</span>
            <div className="inline-flex rounded border border-charcoal/15 bg-white p-0.5 shadow-xs">
              {pageSizeOptions.map((sz) => {
                const isActive = pageSize === sz;
                return (
                  <Link
                    key={sz}
                    href={buildQueryHref(1, sz)}
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold transition ${
                      isActive
                        ? "bg-charcoal text-pearl font-bold shadow-xs"
                        : "text-charcoal/70 hover:bg-ivory hover:text-gold"
                    }`}
                    aria-label={`Show ${sz} per page`}
                  >
                    {sz}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <>
          {/* Desktop pagination */}
          <div className="hidden sm:flex items-center gap-1.5">
            {validPage > 1 ? (
              <Link
                href={buildQueryHref(validPage - 1)}
                className="inline-flex min-h-9 items-center justify-center border border-charcoal/20 bg-white px-3 text-xs font-semibold uppercase tracking-wider text-charcoal transition hover:border-gold hover:text-gold"
              >
                ← Prev
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex min-h-9 items-center justify-center border border-charcoal/10 bg-ivory/50 px-3 text-xs font-semibold uppercase tracking-wider text-muted/40 cursor-not-allowed select-none"
              >
                ← Prev
              </span>
            )}

            {pageNumbers.map((p, idx) => {
              if (p === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="flex size-9 items-center justify-center text-xs text-muted"
                  >
                    …
                  </span>
                );
              }
              const isActive = p === validPage;
              return (
                <Link
                  key={p}
                  href={buildQueryHref(p)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex size-9 items-center justify-center border text-xs font-semibold transition ${
                    isActive
                      ? "border-charcoal bg-charcoal text-pearl font-bold shadow-xs"
                      : "border-charcoal/15 bg-white text-charcoal hover:border-gold hover:text-gold"
                  }`}
                >
                  {p}
                </Link>
              );
            })}

            {validPage < totalPages ? (
              <Link
                href={buildQueryHref(validPage + 1)}
                className="inline-flex min-h-9 items-center justify-center border border-charcoal/20 bg-white px-3 text-xs font-semibold uppercase tracking-wider text-charcoal transition hover:border-gold hover:text-gold"
              >
                Next →
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex min-h-9 items-center justify-center border border-charcoal/10 bg-ivory/50 px-3 text-xs font-semibold uppercase tracking-wider text-muted/40 cursor-not-allowed select-none"
              >
                Next →
              </span>
            )}
          </div>

          {/* Mobile compact pagination */}
          <div className="flex sm:hidden items-center justify-between gap-2">
            {validPage > 1 ? (
              <Link
                href={buildQueryHref(validPage - 1)}
                className="inline-flex min-h-9 flex-1 items-center justify-center border border-charcoal/20 bg-white px-3 text-xs font-semibold uppercase tracking-wider text-charcoal"
              >
                ← Prev
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex min-h-9 flex-1 items-center justify-center border border-charcoal/10 bg-ivory/50 px-3 text-xs font-semibold uppercase tracking-wider text-muted/40 cursor-not-allowed select-none"
              >
                ← Prev
              </span>
            )}

            <div className="flex items-center justify-center border border-charcoal/15 bg-white px-3 py-1.5 text-xs font-medium text-charcoal shrink-0">
              <span className="font-bold text-gold mr-1">{validPage}</span>
              <span className="text-muted">/ {totalPages}</span>
            </div>

            {validPage < totalPages ? (
              <Link
                href={buildQueryHref(validPage + 1)}
                className="inline-flex min-h-9 flex-1 items-center justify-center border border-charcoal/20 bg-white px-3 text-xs font-semibold uppercase tracking-wider text-charcoal"
              >
                Next →
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex min-h-9 flex-1 items-center justify-center border border-charcoal/10 bg-ivory/50 px-3 text-xs font-semibold uppercase tracking-wider text-muted/40 cursor-not-allowed select-none"
              >
                Next →
              </span>
            )}
          </div>
        </>
      )}
    </nav>
  );
}
