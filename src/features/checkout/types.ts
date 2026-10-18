import type { Database } from "@/types/database";

export interface CheckoutContactInfo {
  fullName: string;
  email: string;
  phone: string;
  normalizedPhone: string;
}

export interface CheckoutDeliveryAddress {
  state: string;
  stateCode?: string;
  cityOrLga: string;
  streetAddress: string;
  landmark?: string;
  deliveryInstructions?: string;
}

export interface CheckoutFormData {
  fullName: string;
  email: string;
  phone: string;
  state: string;
  cityOrLga: string;
  streetAddress: string;
  landmark?: string;
  deliveryInstructions?: string;
  orderNotes?: string;
}

export type DeliveryPricingStatus = "configured" | "pending" | "free";

export interface DeliveryQuote {
  state: string;
  zone: string;
  estimatedDays: string;
  status: DeliveryPricingStatus;
  feeMinor: number | null; // null represents pending courier calculation
  currency: "NGN";
  isConfigured: boolean;
  notice: string;
  breakdownLabel: string;
}

export interface PreparedOrderItem {
  variantId: string;
  productName: string;
  variantLabel: string;
  sizeMl: number;
  sku: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  currency: string;
}

export interface PreparedOrder {
  id: string;
  orderNumber: string;
  status: "pending";
  fulfillmentStatus: Database["public"]["Enums"]["fulfillment_status"];
  currency: "NGN";
  deliveryStatus: DeliveryPricingStatus;
  subtotalMinor: number;
  shippingMinor: number | null; // null if pending, 0 if free, >0 if configured
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  isTotalSettled: boolean; // false if delivery is pending (product-only total), true if delivery is settled/free
  customerEmail: string;
  shippingAddress: CheckoutDeliveryAddress & {
    recipientName: string;
    phone: string;
    email: string;
    deliveryNotice: string;
    deliveryStatus: DeliveryPricingStatus;
  };
  billingAddress: Record<string, unknown>;
  customerNote: string | null;
  items: PreparedOrderItem[];
  expiresAt: string;
  guestAccessToken: string;
  createdAt: string;
}

export interface PrepareOrderResult {
  success: boolean;
  order?: PreparedOrder;
  error?: string;
  code?: string;
}
