/** Formats integer minor units without introducing floating-point arithmetic into storage. */
export function formatMoney(amountMinor: number, currency: string, locale = "en-NG"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amountMinor / 100);
}
