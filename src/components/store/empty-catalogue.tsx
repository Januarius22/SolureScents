import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export function EmptyCatalogue({ filtered = false }: { filtered?: boolean }) {
  return <div className="border border-dashed px-6 py-20 text-center"><p className="text-xs tracking-[0.2em] text-gold uppercase">The edit is being prepared</p><h2 className="mt-4 font-display text-4xl">{filtered ? "No fragrances match this selection." : "Our first fragrances arrive soon."}</h2><p className="mx-auto mt-4 max-w-lg text-muted">Every composition is reviewed before it enters the Solure collection.</p>{filtered ? <Link href="/shop" className={buttonStyles("secondary", "mt-8")}>Clear filters</Link> : null}</div>;
}
