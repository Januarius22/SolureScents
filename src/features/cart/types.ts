export interface CartItem {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  subtitle: string | null;
  concentration: string;
  variantLabel: string;
  sizeMl: number;
  sku: string;
  unitPriceMinor: number;
  currency: string;
  quantity: number;
  lineTotalMinor: number;
  isAvailable: boolean;
  maxStock?: number;
  imagePath?: string | null;
}

export interface Cart {
  id: string;
  currency: string;
  items: CartItem[];
  itemCount: number;
  subtotalMinor: number;
  expiresAt: string;
  isGuest: boolean;
}
