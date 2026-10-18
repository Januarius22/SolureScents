import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import type {
  PaymentGateway,
  PaymentInitiation,
  PaymentRequest,
  RefundRequest,
  PaymentState,
} from "../types/payment";

export interface PaystackTransactionVerification {
  status: "success" | "failed" | "abandoned" | "reversed" | "pending";
  reference: string;
  amountMinor: number;
  currency: string;
  gatewayResponse: string;
  paidAt?: string;
  channel?: string;
  customerEmail: string;
  metadata?: Record<string, unknown>;
}

export class PaystackConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaystackConfigurationError";
  }
}

/**
 * Official Paystack Gateway Adapter (Sprint 3 — Test Mode Only).
 *
 * Security & Integrity Guarantees:
 * 1. STRICT TEST-MODE ENFORCEMENT: Rejects any live API keys (sk_live_...) immediately.
 * 2. Never hardcodes keys; resolves exclusively from PAYSTACK_SECRET_KEY.
 * 3. Enforces authoritative NGN currency and positive integer kobo minor amounts.
 * 4. Verifies HMAC-SHA512 webhook signatures in constant time.
 * 5. Supports server-side transaction verification via GET /transaction/verify/:reference.
 */
export class PaystackGateway implements PaymentGateway {
  readonly provider = "paystack";
  private readonly baseUrl = "https://api.paystack.co";

  /**
   * Resolves and strictly validates test-mode Paystack credentials.
   */
  private getSecretKey(): string {
    const key = process.env.PAYSTACK_SECRET_KEY?.trim();
    if (!key) {
      throw new PaystackConfigurationError(
        "PAYSTACK_SECRET_KEY is not configured in environment variables. External Paystack testing is blocked.",
      );
    }

    if (key.startsWith("sk_live_")) {
      throw new PaystackConfigurationError(
        "FATAL SECURITY VIOLATION: Live Paystack credentials detected! Sprint 3 operates strictly in TEST MODE (sk_test_... only).",
      );
    }

    if (!key.startsWith("sk_test_")) {
      throw new PaystackConfigurationError(
        "Invalid Paystack secret key format. Test mode keys must begin with 'sk_test_'.",
      );
    }

    return key;
  }

  /**
   * Checks whether test credentials are configured.
   */
  isConfigured(): boolean {
    try {
      this.getSecretKey();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initiates a secure Paystack transaction in test mode.
   */
  async initiate(request: PaymentRequest): Promise<PaymentInitiation> {
    const secretKey = this.getSecretKey();

    if (request.currency.toUpperCase() !== "NGN") {
      throw new Error(`Paystack integration for Solure Scents supports NGN only, received: ${request.currency}`);
    }

    if (!Number.isInteger(request.amountMinor) || request.amountMinor <= 0) {
      throw new Error(`Invalid payment amount: ${request.amountMinor}. Amount must be a positive integer in kobo.`);
    }

    if (!request.customerEmail || !request.customerEmail.includes("@")) {
      throw new Error("A valid customer email address is required for payment initialization.");
    }

    // Generate deterministic or safe random Paystack reference
    const reference = `sol_pstk_${Date.now()}_${randomBytes(6).toString("hex")}`;

    const payload = {
      email: request.customerEmail,
      amount: request.amountMinor, // Paystack requires amount in kobo
      currency: "NGN",
      reference,
      callback_url: request.returnUrl,
      metadata: {
        orderId: request.orderId,
        idempotencyKey: request.idempotencyKey,
        custom_fields: [
          {
            display_name: "Order ID",
            variable_name: "order_id",
            value: request.orderId,
          },
        ],
      },
    };

    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.status || !data.data?.authorization_url) {
      const msg = data.message || `HTTP ${response.status} ${response.statusText}`;
      throw new Error(`Paystack transaction initialization failed: ${msg}`);
    }

    return {
      providerReference: data.data.reference ?? reference,
      redirectUrl: data.data.authorization_url,
      state: "requires_action",
    };
  }

  /**
   * Performs authoritative server-to-server transaction verification against Paystack API.
   * Never trusts client-reported redirect parameters alone.
   */
  async verifyTransaction(reference: string): Promise<PaystackTransactionVerification> {
    const secretKey = this.getSecretKey();

    if (!reference || typeof reference !== "string") {
      throw new Error("Payment reference is required for Paystack verification.");
    }

    const response = await fetch(
      `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    const data = await response.json();

    if (!response.ok || !data.status || !data.data) {
      const msg = data.message || `HTTP ${response.status}`;
      throw new Error(`Paystack verification request failed for reference ${reference}: ${msg}`);
    }

    const tx = data.data;

    let normalizedStatus: PaystackTransactionVerification["status"] = "pending";
    if (tx.status === "success") normalizedStatus = "success";
    else if (tx.status === "failed") normalizedStatus = "failed";
    else if (tx.status === "abandoned") normalizedStatus = "abandoned";
    else if (tx.status === "reversed") normalizedStatus = "reversed";

    return {
      status: normalizedStatus,
      reference: tx.reference,
      amountMinor: tx.amount, // kobo
      currency: tx.currency,
      gatewayResponse: tx.gateway_response ?? tx.status,
      paidAt: tx.paid_at,
      channel: tx.channel,
      customerEmail: tx.customer?.email,
      metadata: tx.metadata,
    };
  }

  /**
   * Verifies an incoming Paystack webhook HMAC-SHA512 signature in constant time.
   */
  verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string | null): boolean {
    if (!signatureHeader || !rawBody) return false;

    try {
      const secretKey = this.getSecretKey();
      const expectedSignature = createHmac("sha512", secretKey)
        .update(rawBody)
        .digest("hex");

      const expectedBuf = Buffer.from(expectedSignature, "hex");
      const headerBuf = Buffer.from(signatureHeader, "hex");

      if (expectedBuf.length !== headerBuf.length) {
        return false;
      }

      return timingSafeEqual(expectedBuf, headerBuf);
    } catch {
      return false;
    }
  }

  /**
   * Processes a refund via Paystack test API.
   */
  async refund(request: RefundRequest): Promise<{ providerReference: string; state: PaymentState }> {
    const secretKey = this.getSecretKey();

    const response = await fetch(`${this.baseUrl}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction: request.paymentReference,
        amount: request.amountMinor,
        customer_note: request.reason || "Customer refund",
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      throw new Error(`Paystack refund failed: ${data.message || response.statusText}`);
    }

    return {
      providerReference: data.data?.reference || request.paymentReference,
      state: "refunded",
    };
  }
}

export const paystackGateway = new PaystackGateway();
