"use client";

import { useState, useTransition, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Truck,
  MapPin,
  Phone,
  Mail,
  User,
  AlertCircle,
  FileText,
  Lock,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { Cart } from "@/features/cart/types";
import { NIGERIAN_STATES } from "../constants/nigerian-states";
import { normalizeNigerianPhone } from "../validation/checkout-schema";
import { getDeliveryQuoteAction, submitGuestCheckoutAction } from "../actions/checkout-actions";
import type { DeliveryQuote } from "../types";

function formatMoney(amountMinor: number): string {
  const naira = Math.floor(amountMinor / 100);
  return `₦${naira.toLocaleString("en-NG")}`;
}

export function CheckoutForm({ cart }: { cart: Cart }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form Field State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [cityOrLga, setCityOrLga] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  // Validation & Error State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Delivery Quote State
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null);
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);

  // Unique accessible IDs
  const fullNameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const stateId = useId();
  const cityOrLgaId = useId();
  const streetAddressId = useId();
  const landmarkId = useId();
  const deliveryInstructionsId = useId();
  const orderNotesId = useId();

  // Handle phone changes with real-time feedback
  const phoneValidation = normalizeNigerianPhone(phone);

  // Handle state change & query delivery quote
  const handleStateChange = (selectedState: string) => {
    setState(selectedState);
    if (!selectedState) {
      setDeliveryQuote(null);
      return;
    }

    setIsCalculatingDelivery(true);
    startTransition(async () => {
      try {
        const quote = await getDeliveryQuoteAction(selectedState, cart.subtotalMinor);
        setDeliveryQuote(quote);
      } catch {
        // Fallback silently
      } finally {
        setIsCalculatingDelivery(false);
      }
    });
  };

  // Field validation
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errs.fullName = "Please enter your full name.";
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Please enter a valid email address for order notifications.";
    }

    if (!phone.trim()) {
      errs.phone = "Phone number is required for dispatch.";
    } else if (!phoneValidation.isValid) {
      errs.phone = phoneValidation.error ?? "Invalid Nigerian phone number.";
    }

    if (!state.trim()) {
      errs.state = "Please select your delivery state.";
    }

    if (!cityOrLga.trim() || cityOrLga.trim().length < 2) {
      errs.cityOrLga = "City or Local Government Area is required.";
    }

    if (!streetAddress.trim() || streetAddress.trim().length < 5) {
      errs.streetAddress = "Please provide your detailed street delivery address.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      const firstError = Object.values(errors)[0];
      if (firstError) setSubmitError(firstError);
      return;
    }

    startTransition(async () => {
      const res = await submitGuestCheckoutAction({
        fullName,
        email,
        phone,
        state,
        cityOrLga,
        streetAddress,
        landmark: landmark || undefined,
        deliveryInstructions: deliveryInstructions || undefined,
        orderNotes: orderNotes || undefined,
      });

      if (!res.success || !res.orderId) {
        setSubmitError(res.error ?? "Failed to prepare order. Please check your details.");
        return;
      }

      // Navigate to order preparation confirmation view using token-free URL architecture
      router.push(`/checkout/confirmation?order_id=${encodeURIComponent(res.orderId)}`);
    });
  };

  const isPendingShipping = !deliveryQuote || deliveryQuote.status === "pending";
  const isFreeShipping = deliveryQuote?.status === "free";
  const shippingMinor = isPendingShipping ? null : (isFreeShipping ? 0 : (deliveryQuote.feeMinor ?? 0));
  const grandTotalMinor = cart.subtotalMinor + (shippingMinor ?? 0);

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-12 lg:grid-cols-12">
      {/* Left Column: Guest Checkout Form (7 cols) */}
      <div className="space-y-10 lg:col-span-7">
        {/* Error notification banner */}
        {submitError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-none border border-red-300 bg-red-50/80 p-4 text-sm text-red-900"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold">Unable to complete order preparation</p>
              <p className="mt-0.5 text-xs text-red-800">{submitError}</p>
            </div>
          </div>
        )}

        {/* Section 1: Contact Information */}
        <section className="border border-charcoal/10 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-charcoal/10 pb-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15 font-mono text-xs font-semibold text-gold">
              1
            </span>
            <div>
              <h2 className="font-display text-xl text-charcoal">Customer Contact</h2>
              <p className="text-xs text-muted">
                No account required. We send order status updates directly to your email.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label htmlFor={fullNameId} className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-charcoal">
                <User size={13} className="text-gold" />
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id={fullNameId}
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Amara Okafor"
                className={`mt-2 w-full border bg-ivory/30 px-4 py-3 text-sm text-charcoal outline-none transition-colors placeholder:text-muted/60 focus:border-gold focus:bg-white ${
                  errors.fullName ? "border-red-400" : "border-charcoal/15"
                }`}
              />
              {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor={emailId} className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-charcoal">
                  <Mail size={13} className="text-gold" />
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id={emailId}
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className={`mt-2 w-full border bg-ivory/30 px-4 py-3 text-sm text-charcoal outline-none transition-colors placeholder:text-muted/60 focus:border-gold focus:bg-white ${
                    errors.email ? "border-red-400" : "border-charcoal/15"
                  }`}
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor={phoneId} className="flex items-center justify-between text-xs font-semibold tracking-wider uppercase text-charcoal">
                  <span className="flex items-center gap-2">
                    <Phone size={13} className="text-gold" />
                    Phone Number <span className="text-red-500">*</span>
                  </span>
                  {phone && phoneValidation.isValid && (
                    <span className="text-[11px] font-normal text-emerald-600">
                      ✓ {phoneValidation.display}
                    </span>
                  )}
                </label>
                <input
                  id={phoneId}
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0803 123 4567 or +234..."
                  className={`mt-2 w-full border bg-ivory/30 px-4 py-3 text-sm text-charcoal outline-none transition-colors placeholder:text-muted/60 focus:border-gold focus:bg-white ${
                    errors.phone ? "border-red-400" : "border-charcoal/15"
                  }`}
                />
                {errors.phone ? (
                  <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
                ) : (
                  <p className="mt-1 text-[11px] text-muted">For dispatch call and courier notifications.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Nigerian Delivery Information */}
        <section className="border border-charcoal/10 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-charcoal/10 pb-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15 font-mono text-xs font-semibold text-gold">
              2
            </span>
            <div>
              <h2 className="font-display text-xl text-charcoal">Delivery Destination</h2>
              <p className="text-xs text-muted">Nationwide white-glove packaging and delivery across Nigeria.</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor={stateId} className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-charcoal">
                  <MapPin size={13} className="text-gold" />
                  State / Territory <span className="text-red-500">*</span>
                </label>
                <select
                  id={stateId}
                  required
                  value={state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className={`mt-2 w-full border bg-ivory/30 px-4 py-3 text-sm text-charcoal outline-none transition-colors focus:border-gold focus:bg-white ${
                    errors.state ? "border-red-400" : "border-charcoal/15"
                  }`}
                >
                  <option value="" disabled>
                    Select Nigerian State
                  </option>
                  {NIGERIAN_STATES.map((st) => (
                    <option key={st.code} value={st.name}>
                      {st.name}
                    </option>
                  ))}
                </select>
                {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state}</p>}
              </div>

              <div>
                <label htmlFor={cityOrLgaId} className="text-xs font-semibold tracking-wider uppercase text-charcoal">
                  City or LGA <span className="text-red-500">*</span>
                </label>
                <input
                  id={cityOrLgaId}
                  type="text"
                  required
                  value={cityOrLga}
                  onChange={(e) => setCityOrLga(e.target.value)}
                  placeholder="e.g. Victoria Island, Ikeja, Garki"
                  className={`mt-2 w-full border bg-ivory/30 px-4 py-3 text-sm text-charcoal outline-none transition-colors placeholder:text-muted/60 focus:border-gold focus:bg-white ${
                    errors.cityOrLga ? "border-red-400" : "border-charcoal/15"
                  }`}
                />
                {errors.cityOrLga && <p className="mt-1 text-xs text-red-600">{errors.cityOrLga}</p>}
              </div>
            </div>

            <div>
              <label htmlFor={streetAddressId} className="text-xs font-semibold tracking-wider uppercase text-charcoal">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                id={streetAddressId}
                type="text"
                autoComplete="street-address"
                required
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="House/Plot number, street name, estate or apartment building"
                className={`mt-2 w-full border bg-ivory/30 px-4 py-3 text-sm text-charcoal outline-none transition-colors placeholder:text-muted/60 focus:border-gold focus:bg-white ${
                  errors.streetAddress ? "border-red-400" : "border-charcoal/15"
                }`}
              />
              {errors.streetAddress && <p className="mt-1 text-xs text-red-600">{errors.streetAddress}</p>}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor={landmarkId} className="text-xs font-semibold tracking-wider uppercase text-charcoal">
                  Nearby Landmark <span className="text-xs font-normal text-muted">(Optional)</span>
                </label>
                <input
                  id={landmarkId}
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near Civic Centre, Behind GTBank"
                  className="mt-2 w-full border border-charcoal/15 bg-ivory/30 px-4 py-3 text-sm text-charcoal outline-none transition-colors placeholder:text-muted/60 focus:border-gold focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor={deliveryInstructionsId} className="text-xs font-semibold tracking-wider uppercase text-charcoal">
                  Delivery Instructions <span className="text-xs font-normal text-muted">(Optional)</span>
                </label>
                <input
                  id={deliveryInstructionsId}
                  type="text"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder="e.g. Call security on arrival"
                  className="mt-2 w-full border border-charcoal/15 bg-ivory/30 px-4 py-3 text-sm text-charcoal outline-none transition-colors placeholder:text-muted/60 focus:border-gold focus:bg-white"
                />
              </div>
            </div>

            {/* Delivery notice card */}
            {state && (
              <div className="rounded-none border border-gold/30 bg-champagne/10 p-4 text-xs text-charcoal/90">
                <div className="flex items-start gap-2.5">
                  <Truck size={16} className="mt-0.5 shrink-0 text-gold" />
                  <div>
                    <span className="font-semibold text-charcoal">
                      Estimated Timeline: {deliveryQuote?.estimatedDays ?? "2 - 5 business days"}
                    </span>
                    <p className="mt-1 text-charcoal/80">
                      {deliveryQuote?.notice ??
                        "Courier delivery options and fees are confirmed before dispatch."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Order Notes */}
        <section className="border border-charcoal/10 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-charcoal/10 pb-4">
            <FileText size={18} className="text-gold" />
            <div>
              <h2 className="font-display text-xl text-charcoal">Boutique Notes</h2>
              <p className="text-xs text-muted">Complimentary gift cards or special requests.</p>
            </div>
          </div>

          <div className="mt-5">
            <textarea
              id={orderNotesId}
              rows={3}
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="If this is a curated gift, enter your handwritten message or special request..."
              className="w-full border border-charcoal/15 bg-ivory/30 p-4 text-sm text-charcoal outline-none transition-colors placeholder:text-muted/60 focus:border-gold focus:bg-white"
            />
          </div>
        </section>
      </div>

      {/* Right Column: Order Summary & Review (5 cols) */}
      <div className="space-y-6 lg:col-span-5">
        <aside className="sticky top-28 border border-charcoal/15 bg-white p-6 shadow-soft sm:p-8">
          <div className="flex items-center justify-between border-b border-charcoal/10 pb-5">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-gold uppercase">Your Fragrance Bag</p>
              <h3 className="font-display text-2xl text-charcoal">Order Summary</h3>
            </div>
            <Link
              href="/cart"
              className="text-xs font-medium text-gold transition-colors hover:text-charcoal hover:underline"
            >
              Modify ({cart.itemCount})
            </Link>
          </div>

          {/* Cart item listing */}
          <div className="mt-6 divide-y divide-charcoal/10">
            {cart.items.map((item) => (
              <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center border border-charcoal/10 bg-ivory">
                  <Sparkles size={20} className="text-gold/40" />
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-charcoal text-[10px] font-semibold text-white">
                    {item.quantity}
                  </span>
                </div>

                <div className="flex-1">
                  <h4 className="font-display text-sm font-semibold text-charcoal">{item.productName}</h4>
                  <p className="text-xs text-muted">
                    {item.variantLabel} {item.sizeMl > 0 ? `· ${item.sizeMl}ml` : ""}
                  </p>
                  <p className="mt-1 text-xs font-mono text-charcoal/80">
                    {formatMoney(item.unitPriceMinor)} × {item.quantity}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-mono text-sm font-semibold text-charcoal">
                    {formatMoney(item.lineTotalMinor)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Subtotals & Fees */}
          <div className="mt-6 space-y-3 border-t border-charcoal/10 pt-5 text-sm">
            <div className="flex justify-between text-muted">
              <span>Bag Subtotal</span>
              <span className="font-mono font-medium text-charcoal">{formatMoney(cart.subtotalMinor)}</span>
            </div>

            <div className="flex items-center justify-between text-muted">
              <span className="flex items-center gap-1.5">
                Delivery Service
                {isCalculatingDelivery && <Loader2 size={12} className="animate-spin text-gold" />}
              </span>
              <span className="font-mono text-xs font-semibold text-charcoal">
                {deliveryQuote?.status === "free" ? (
                  <span className="text-emerald-700">₦0 (Complimentary)</span>
                ) : deliveryQuote?.status === "configured" && deliveryQuote.feeMinor !== null ? (
                  formatMoney(deliveryQuote.feeMinor)
                ) : (
                  <span className="font-sans text-[11px] font-normal text-amber-800">
                    Calculated prior to dispatch
                  </span>
                )}
              </span>
            </div>

            <div className="border-t border-charcoal/15 pt-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="font-display text-lg text-charcoal">
                    {isPendingShipping ? "Product Subtotal" : "Order Total"}
                  </span>
                  <p className="text-[10px] text-muted">
                    {deliveryQuote?.status === "free"
                      ? "Includes verified complimentary delivery"
                      : deliveryQuote?.status === "configured"
                        ? "Includes verified courier delivery"
                        : "Excludes courier dispatch fee (quoted prior to shipment)"}
                  </p>
                </div>
                <span className="font-display text-2xl font-bold text-charcoal">
                  {formatMoney(grandTotalMinor)}
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 space-y-4">
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 border border-charcoal bg-charcoal px-6 py-4 font-sans text-xs font-semibold tracking-[0.18em] text-white uppercase transition-all duration-300 hover:bg-gold hover:border-gold hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-gold" />
                  <span>Securing Order Details...</span>
                </>
              ) : (
                <>
                  <span>Review & Prepare Order</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            <div className="space-y-2 pt-2 text-center text-[11px] text-muted">
              <p className="flex items-center justify-center gap-1.5 text-charcoal/80">
                <Lock size={12} className="text-gold" />
                <span>Zero registration required · 256-bit encrypted checkout</span>
              </p>
              <p className="text-[10px] text-muted/80">
                Live payment gateway activation arrives in Sprint 3. Submitting prepares your order securely without immediate charge.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}
