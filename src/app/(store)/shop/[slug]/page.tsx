import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck, Truck, Sparkles, Droplets } from "lucide-react";

import { ProductGallery } from "@/components/store/product-gallery";
import { ProductAddToCart } from "@/components/store/product-add-to-cart";
import { getProductBySlug } from "@/features/storefront/services/storefront-service";
import { siteConfig } from "@/config/site";

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Fragrance not found" };
  return {
    title: product.seo_title ?? `${product.name} — Solure Scents`,
    description: product.seo_description ?? product.description.slice(0, 160),
  };
}

export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // Infer category for luxury badge
  const subLower = (product.subtitle || "").toLowerCase();
  const categoryLabel =
    subLower.includes("women") || subLower.includes("woman") || subLower.includes("pour femme")
      ? "Pour Femme"
      : subLower.includes("men") || subLower.includes("man") || subLower.includes("pour homme")
      ? "Pour Homme"
      : "Unisex Fragrance";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: { "@type": "Brand", name: product.brand.name },
    offers: product.variants.map((v: { price_minor: number; currency: string }) => ({
      "@type": "Offer",
      price: v.price_minor / 100,
      priceCurrency: v.currency,
      availability: "https://schema.org/InStock",
      url: `${siteConfig.url}/shop/${product.slug}`,
    })),
  };

  const hasNotes =
    product.notes.top.length > 0 ||
    product.notes.heart.length > 0 ||
    product.notes.base.length > 0;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="mx-auto max-w-[90rem] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left Column: Interactive Luxury Product Gallery */}
          <div>
            <ProductGallery
              media={product.media}
              productName={product.name}
              concentration={product.concentration}
              categoryLabel={categoryLabel}
            />
          </div>

          {/* Right Column: Product Narrative, Add to Bag & Guarantees */}
          <div className="flex flex-col justify-between space-y-8">
            <div>
              {/* Brand & Concentration Eyebrow */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="h-px w-6 bg-gold" />
                <p className="text-[0.66rem] font-semibold tracking-[0.24em] text-gold uppercase">
                  {product.brand.name} · {product.concentration.toUpperCase()}
                </p>
                {Boolean(product.collection) && (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 text-[9px] font-bold tracking-[0.18em] uppercase rounded-sm ${
                      product.collection === "premium"
                        ? "bg-gold/15 text-gold border border-gold/40 shadow-sm"
                        : "bg-charcoal/10 text-charcoal border border-charcoal/20"
                    }`}
                  >
                    {product.collection === "premium" ? "✦ Premium Collection" : "Regular Collection"}
                  </span>
                )}
              </div>

              {/* Fragrance Title */}
              <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl text-charcoal tracking-tight leading-[1.05]">
                {product.name}
              </h1>

              {/* Subtitle / Mood */}
              {product.subtitle && (
                <p className="mt-2 text-base sm:text-lg font-serif italic text-muted">
                  {product.subtitle}
                </p>
              )}

              {/* Description */}
              <p className="mt-6 text-sm sm:text-base leading-relaxed text-muted">
                {product.description}
              </p>

              {/* Size Selector and Add to Cart Component */}
              <div className="mt-8 border-t border-charcoal/10 pt-6">
                <ProductAddToCart variants={product.variants} productName={product.name} />
              </div>
            </div>

            {/* Olfactory Pyramid (When Notes are Present) */}
            {hasNotes && (
              <div className="border-t border-charcoal/10 pt-8">
                <div className="flex items-center gap-2">
                  <Droplets size={14} className="text-gold" />
                  <span className="text-[0.66rem] font-semibold tracking-[0.2em] text-gold uppercase">
                    The Olfactory Architecture
                  </span>
                </div>
                <h2 className="mt-2 font-display text-2xl text-charcoal">The Fragrance Pyramid</h2>

                <div className="mt-6 space-y-4">
                  {/* Top Notes */}
                  {product.notes.top.length > 0 && (
                    <div className="border border-charcoal/10 bg-ivory/30 p-4 sm:p-5 transition hover:border-gold/40">
                      <div className="flex items-center justify-between border-b border-charcoal/10 pb-2">
                        <span className="text-[0.62rem] font-bold tracking-[0.2em] text-gold uppercase">
                          Head Notes · Opening Impression
                        </span>
                        <span className="text-[10px] text-muted italic">Initial 15–30 mins</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {product.notes.top.map((note: string) => (
                          <span
                            key={note}
                            className="border border-charcoal/15 bg-white px-3 py-1 text-xs font-medium text-charcoal shadow-xs"
                          >
                            {note}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Heart Notes */}
                  {product.notes.heart.length > 0 && (
                    <div className="border border-charcoal/10 bg-ivory/30 p-4 sm:p-5 transition hover:border-gold/40">
                      <div className="flex items-center justify-between border-b border-charcoal/10 pb-2">
                        <span className="text-[0.62rem] font-bold tracking-[0.2em] text-gold uppercase">
                          Heart Notes · Olfactory Core
                        </span>
                        <span className="text-[10px] text-muted italic">2 to 6 hours</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {product.notes.heart.map((note: string) => (
                          <span
                            key={note}
                            className="border border-charcoal/15 bg-white px-3 py-1 text-xs font-medium text-charcoal shadow-xs"
                          >
                            {note}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Base Notes */}
                  {product.notes.base.length > 0 && (
                    <div className="border border-charcoal/10 bg-ivory/30 p-4 sm:p-5 transition hover:border-gold/40">
                      <div className="flex items-center justify-between border-b border-charcoal/10 pb-2">
                        <span className="text-[0.62rem] font-bold tracking-[0.2em] text-gold uppercase">
                          Foundation · Lingering Sillage
                        </span>
                        <span className="text-[10px] text-muted italic">Enduring drydown</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {product.notes.base.map((note: string) => (
                          <span
                            key={note}
                            className="border border-charcoal/15 bg-white px-3 py-1 text-xs font-medium text-charcoal shadow-xs"
                          >
                            {note}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Atelier Story / Narrative (When Provided) */}
            {product.story && (
              <div className="border-t border-charcoal/10 pt-8">
                <span className="text-[0.66rem] font-semibold tracking-[0.2em] text-gold uppercase">
                  Atelier Notes
                </span>
                <h2 className="mt-2 font-display text-2xl text-charcoal">The Narrative</h2>
                <div className="mt-4 border-l-2 border-gold pl-5 py-1">
                  <p className="font-serif text-base italic leading-relaxed text-charcoal/90">
                    &ldquo;{product.story}&rdquo;
                  </p>
                </div>
              </div>
            )}

            {/* Luxury Trust & Service Guarantees (Always Present) */}
            <div className="border-t border-charcoal/10 pt-8">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="border border-charcoal/10 bg-white p-4 text-center sm:text-left transition hover:border-gold/40">
                  <ShieldCheck size={18} className="text-gold mx-auto sm:mx-0" />
                  <p className="mt-2 text-xs font-semibold text-charcoal uppercase tracking-wider">
                    Authentic Guarantee
                  </p>
                  <p className="mt-1 text-[11px] text-muted leading-relaxed">
                    100% pure undiluted perfume oils compounded for Nigerian skin.
                  </p>
                </div>

                <div className="border border-charcoal/10 bg-white p-4 text-center sm:text-left transition hover:border-gold/40">
                  <Truck size={18} className="text-gold mx-auto sm:mx-0" />
                  <p className="mt-2 text-xs font-semibold text-charcoal uppercase tracking-wider">
                    Nationwide Courier
                  </p>
                  <p className="mt-1 text-[11px] text-muted leading-relaxed">
                    Direct dispatch from our Abuja Atelier; insured delivery across all 36 States & FCT.
                  </p>
                </div>

                <div className="border border-charcoal/10 bg-white p-4 text-center sm:text-left transition hover:border-gold/40">
                  <Sparkles size={18} className="text-gold mx-auto sm:mx-0" />
                  <p className="mt-2 text-xs font-semibold text-charcoal uppercase tracking-wider">
                    Signature Unboxing
                  </p>
                  <p className="mt-1 text-[11px] text-muted leading-relaxed">
                    Presented in Solure gift packaging with a complimentary sample vial.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
