export type PaymentState = "pending" | "requires_action" | "authorized" | "captured" | "partially_refunded" | "refunded" | "failed" | "cancelled";

export interface PaymentRequest {
  amountMinor: number;
  currency: string;
  customerEmail: string;
  idempotencyKey: string;
  orderId: string;
  returnUrl: string;
}

export interface PaymentInitiation {
  clientSecret?: string;
  providerReference: string;
  redirectUrl?: string;
  state: PaymentState;
}

export interface RefundRequest {
  amountMinor: number;
  idempotencyKey: string;
  paymentReference: string;
  reason?: string;
}

/** Provider-independent contract; a live adapter is intentionally selected in Phase 7. */
export interface PaymentGateway {
  readonly provider: string;
  initiate(request: PaymentRequest): Promise<PaymentInitiation>;
  refund(request: RefundRequest): Promise<{ providerReference: string; state: PaymentState }>;
}
