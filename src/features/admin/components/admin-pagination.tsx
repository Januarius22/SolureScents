import Link from "next/link";

interface AdminPaginationProps {
  currentPage: number;
  pageSize?: number;
  totalCount: number;
  baseUrl: string;
  searchParams?: Record<string, string | undefined>;
  itemLabel?: string;
}

export function AdminPagination({
  currentPage,
  pageSize = 10,
  totalCount,
  baseUrl,
  searchParams = {},
  itemLabel = "records",
}: AdminPaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages <= 1 && totalCount <= pageSize) {
    return (
      <div className="flex items-center justify-between border-t border-charcoal/10 pt-4 text-xs text-muted">
        <p>
          Showing all <strong className="font-semibold text-charcoal">{totalCount}</strong> {itemLabel}
        </p>
      </div>
    );
  }

  const validPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const fromIndex = totalCount > 0 ? (validPage - 1) * pageSize + 1 : 0;
  const toIndex = Math.min(validPage * pageSize, totalCount);

  const buildPageHref = (page: number) => {
    const sp = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v !== undefined && v !== "" && k !== "page") {
        sp.set(k, v);
      }
    });
    if (page > 1) {
      sp.set("page", String(page));
    }
    const qs = sp.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  };

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
      <p className="text-xs text-muted">
        Showing <strong className="font-semibold text-charcoal">{fromIndex}–{toIndex}</strong> of{" "}
        <strong className="font-semibold text-charcoal">{totalCount}</strong> {itemLabel}
      </p>

      {totalPages > 1 && (
        <>
          {/* Desktop pagination */}
          <div className="hidden sm:flex items-center gap-1.5">
            {validPage > 1 ? (
              <Link
                href={buildPageHref(validPage - 1)}
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
                  href={buildPageHref(p)}
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
                href={buildPageHref(validPage + 1)}
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
                href={buildPageHref(validPage - 1)}
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
                href={buildPageHref(validPage + 1)}
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
