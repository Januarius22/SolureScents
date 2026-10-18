"use client";

import { useState } from "react";
import Image from "next/image";
import { ProductVisual } from "@/components/store/product-visual";

interface MediaItem {
  id?: string;
  storage_path: string;
  alt_text?: string | null;
  is_primary?: boolean;
}

interface ProductGalleryProps {
  media: MediaItem[];
  productName: string;
  concentration?: string;
  categoryLabel?: string;
}

export function ProductGallery({
  media,
  productName,
  concentration = "EDP",
  categoryLabel = "Unisex",
}: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const activeMedia = media[selectedIndex] ?? media[0];

  return (
    <div className="lg:sticky lg:top-32 space-y-4">
      {/* Main Showcase Flacon Box */}
      <div className="relative aspect-[4/5] w-full overflow-hidden border border-charcoal/15 bg-gradient-to-b from-[#FBF9F5] via-[#F5F0E6] to-[#EDE6D8] shadow-[0_12px_40px_rgba(29,27,25,0.06)]">
        {activeMedia ? (
          <Image
            src={activeMedia.storage_path}
            alt={activeMedia.alt_text || productName}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover transition-all duration-700 ease-out"
            unoptimized={activeMedia.storage_path.startsWith("http://localhost")}
          />
        ) : (
          <ProductVisual label={productName.slice(0, 12)} />
        )}

        {/* Ambient Subtle Vignette */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/20 via-transparent to-black/5"
        />

        {/* Floating Luxury Badges */}
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2 bg-charcoal/90 px-3 py-1.5 text-[10px] font-semibold tracking-[0.2em] text-pearl uppercase backdrop-blur-md shadow-sm">
          <span>{concentration.toUpperCase()}</span>
        </div>

        <div className="absolute right-4 top-4 z-10 bg-pearl/90 border border-gold/30 px-3 py-1.5 text-[10px] font-semibold tracking-[0.16em] text-gold uppercase backdrop-blur-md shadow-sm">
          <span>{categoryLabel}</span>
        </div>
      </div>

      {/* Multi-Image Thumbnails */}
      {media.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {media.map((m, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                type="button"
                key={m.storage_path + idx}
                onClick={() => setSelectedIndex(idx)}
                className={`group relative aspect-square overflow-hidden border transition-all duration-300 ${
                  isSelected
                    ? "border-gold ring-2 ring-gold/40 shadow-sm"
                    : "border-charcoal/15 opacity-70 hover:opacity-100 hover:border-gold/50"
                }`}
              >
                <Image
                  src={m.storage_path}
                  alt={m.alt_text || `${productName} view ${idx + 1}`}
                  fill
                  sizes="120px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized={m.storage_path.startsWith("http://localhost")}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
