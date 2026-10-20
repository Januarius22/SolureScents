"use client";

import { useState } from "react";
import { Download, Loader2, AlertCircle } from "lucide-react";

interface DownloadReceiptButtonProps {
  orderId: string;
  orderNumber: string;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
}

export function DownloadReceiptButton({
  orderId,
  orderNumber,
  className = "",
  variant = "outline",
}: DownloadReceiptButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/receipt`, {
        method: "GET",
        headers: { Accept: "application/pdf" },
      });

      if (!response.ok) {
        let errorMsg = "Unable to download receipt.";
        try {
          const json = await response.json();
          errorMsg = json.error || errorMsg;
        } catch {
          // fallback text
        }
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Solure-Scents-Receipt-${orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[DownloadReceiptButton] Error:", err);
      setError(err instanceof Error ? err.message : "Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const baseStyle =
    variant === "primary"
      ? "inline-flex items-center justify-center gap-2.5 bg-charcoal px-6 py-3.5 text-xs font-semibold tracking-[0.16em] text-pearl uppercase transition hover:bg-gold hover:text-charcoal disabled:opacity-50"
      : "inline-flex items-center justify-center gap-2 border border-charcoal/25 bg-white px-5 py-3 text-xs font-semibold tracking-[0.14em] text-charcoal uppercase transition hover:border-gold hover:text-gold hover:bg-champagne/10 disabled:opacity-50";

  return (
    <div className="inline-block text-center">
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className={`${baseStyle} ${className}`}
        aria-label={`Download official receipt for order ${orderNumber}`}
        data-testid="download-receipt-btn"
      >
        {downloading ? (
          <Loader2 size={15} className="animate-spin text-gold" />
        ) : (
          <Download size={15} className="text-gold" />
        )}
        <span>{downloading ? "Preparing Receipt..." : "DOWNLOAD RECEIPT (PDF)"}</span>
      </button>

      {error && (
        <p className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-rose-600" role="alert">
          <AlertCircle size={12} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
