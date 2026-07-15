import type { PaymentGateway } from "@/features/payments/types/payment";

/** Fails closed until an explicitly configured, live payment adapter is registered. */
export class PaymentGatewayRegistry {
  readonly #gateways = new Map<string, PaymentGateway>();

  register(gateway: PaymentGateway): void {
    if (this.#gateways.has(gateway.provider)) {
      throw new Error(`Payment gateway already registered: ${gateway.provider}`);
    }
    this.#gateways.set(gateway.provider, gateway);
  }

  get(provider: string): PaymentGateway {
    const gateway = this.#gateways.get(provider);
    if (!gateway) throw new Error(`Payment gateway is not configured: ${provider}`);
    return gateway;
  }
}

export const paymentGateways = new PaymentGatewayRegistry();
