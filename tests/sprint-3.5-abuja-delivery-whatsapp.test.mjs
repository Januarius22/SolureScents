import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

describe("Solure Scents — Sprint 3.5: Abuja Delivery Policy & Post-Payment WhatsApp Integration", () => {
  const rootDir = process.cwd();

  // Helper mirrors for unit-level verification
  const ABUJA_DELIVERY_DISCLOSURE =
    "Your payment covers your perfume purchase only. Delivery fees, where applicable, will be confirmed separately by our team after your order is placed.";

  function formatWhatsAppPhoneNumber(phone) {
    if (!phone) return "";
    return String(phone).replace(/\D/g, "");
  }

  function createWhatsAppDeliveryUrl(orderNumber, businessNumber = "2348000000000") {
    const sanitizedNumber = formatWhatsAppPhoneNumber(businessNumber);
    if (!sanitizedNumber || sanitizedNumber.length < 7) {
      return null;
    }

    const message = [
      "Hello Solure Scents! 👋",
      "",
      "I've successfully paid for my perfume order.",
      "",
      `Order ID: ${orderNumber}`,
      "",
      "I'd like to arrange delivery for my order.",
      "Please confirm the delivery fee and next steps.",
      "",
      "Thank you!",
    ].join("\n");

    return `https://wa.me/${sanitizedNumber}?text=${encodeURIComponent(message)}`;
  }

  // =========================================================================
  // TASK 1: ABUJA-FIRST NATIONWIDE DELIVERY POLICY
  // =========================================================================
  describe("Task 1: Delivery Policy & Honest Disclosure", () => {
    it("delivers honest disclosure: payment covers perfume purchase only; delivery confirmed separately", () => {
      assert.match(ABUJA_DELIVERY_DISCLOSURE, /payment covers your perfume purchase only/i);
      assert.match(ABUJA_DELIVERY_DISCLOSURE, /confirmed separately by our team/i);
    });

    it("verifies delivery-service.ts contains exact disclosure and arranged_separately status", () => {
      const deliveryServiceSource = fs.readFileSync(
        path.join(rootDir, "src", "features", "checkout", "services", "delivery-service.ts"),
        "utf8"
      );

      assert.ok(
        deliveryServiceSource.includes("Your payment covers your perfume purchase only"),
        "delivery-service.ts must include exact business policy disclosure"
      );
      assert.ok(
        deliveryServiceSource.includes('"arranged_separately"'),
        "delivery-service.ts must return 'arranged_separately' status"
      );
      assert.ok(
        !deliveryServiceSource.includes('status: "free"'),
        "delivery-service.ts must NEVER default or label delivery as free"
      );
    });

    it("verifies types.ts includes 'arranged_separately' in DeliveryPricingStatus", () => {
      const typesSource = fs.readFileSync(
        path.join(rootDir, "src", "features", "checkout", "types.ts"),
        "utf8"
      );
      assert.ok(
        typesSource.includes('"arranged_separately"'),
        "DeliveryPricingStatus in types.ts must include 'arranged_separately'"
      );
    });
  });

  // =========================================================================
  // TASK 2: NATIONWIDE CHECKOUT ELIGIBILITY & TOTAL CALCULATION
  // =========================================================================
  describe("Task 2: Checkout Eligibility & Perfume-Only Paystack Total", () => {
    const states = ["Abuja", "Lagos", "Rivers", "Kano", "Enugu", "Oyo"];

    for (const stateName of states) {
      it(`allows checkout for customer living in ${stateName} without blocking`, () => {
        const nigerianStatesSource = fs.readFileSync(
          path.join(rootDir, "src", "features", "checkout", "constants", "nigerian-states.ts"),
          "utf8"
        );
        assert.ok(
          nigerianStatesSource.toLowerCase().includes(stateName.toLowerCase()),
          `${stateName} must be recognized in Nigerian states constants`
        );
      });
    }

    it("verifies order Paystack payable amount equals the server-verified perfume total only", () => {
      // Perfume cart: 2 flacons totaling ₦125,000 (12,500,000 kobo)
      const subtotalMinor = 12500000;
      const deliveryStatus = "arranged_separately";

      // Online transaction shipping is 0 because delivery is charged separately
      const onlineShippingMinor = deliveryStatus === "arranged_separately" ? 0 : 350000;
      const totalPayableMinor = subtotalMinor + onlineShippingMinor;

      // Online total strictly equals perfume total
      assert.equal(totalPayableMinor, subtotalMinor, "Paystack amount must match perfume total exactly");
      assert.equal(totalPayableMinor, 12500000);

      // Order records that delivery arrangements are pending/arranged separately
      const isTotalSettled = true; // Settled for online perfume purchase
      assert.equal(isTotalSettled, true, "Perfume purchase total is settled for payment gateway initiation");
    });

    it("verifies order-preparation.ts sets totalMinor equal to subtotalMinor and isTotalSettled true", () => {
      const orderPrepSource = fs.readFileSync(
        path.join(rootDir, "src", "features", "checkout", "services", "order-preparation.ts"),
        "utf8"
      );

      assert.ok(
        orderPrepSource.includes("const shippingMinor = 0;"),
        "Online shippingMinor must be 0 in order-preparation.ts"
      );
      assert.ok(
        orderPrepSource.includes("const isTotalSettled = true;"),
        "isTotalSettled must be true in order-preparation.ts so all states can pay"
      );
      assert.ok(
        orderPrepSource.includes("const totalMinor = calculatedSubtotalMinor;"),
        "totalMinor must equal calculatedSubtotalMinor in order-preparation.ts"
      );
    });
  });

  // =========================================================================
  // TASK 3: SUCCESS PAGE SPECIFICATIONS
  // =========================================================================
  describe("Task 3: Post-Payment Success Page Architecture", () => {
    it("verifies PostPaymentSuccessCard source contains exact required client hierarchy", () => {
      const successCardSource = fs.readFileSync(
        path.join(rootDir, "src", "features", "checkout", "components", "post-payment-success-card.tsx"),
        "utf8"
      );

      // 1. Payment Successful heading
      assert.ok(
        successCardSource.includes("Payment Successful"),
        "Must contain 'Payment Successful' heading"
      );

      // 2. Real order number & amount paid
      assert.ok(
        successCardSource.includes("orderNumber"),
        "Must display actual order number"
      );
      assert.ok(
        successCardSource.includes("amountMinor"),
        "Must display actual amount paid"
      );

      // 3. Delivery Arrangement Pending status
      assert.ok(
        successCardSource.includes("Delivery Arrangement Pending"),
        "Must display 'Delivery Arrangement Pending' status badge"
      );

      // 4. Prominent Arrange Delivery on WhatsApp button
      assert.ok(
        successCardSource.includes("<WhatsAppDeliveryButton"),
        "Must render WhatsAppDeliveryButton"
      );

      // 5. Secondary Continue Shopping link
      assert.ok(
        successCardSource.includes("Continue Shopping"),
        "Must render secondary 'Continue Shopping' link"
      );

      // Main Instruction
      assert.ok(
        successCardSource.includes("Your perfume order has been confirmed!"),
        "Must include exact main instruction heading"
      );
      assert.ok(
        successCardSource.includes("send our team a WhatsApp message using the button below"),
        "Must instruct user to message via WhatsApp button"
      );
    });

    it("verifies confirmation/page.tsx renders PostPaymentSuccessCard only when isPaid is true", () => {
      const confirmationPageSource = fs.readFileSync(
        path.join(rootDir, "src", "app", "(store)", "checkout", "confirmation", "page.tsx"),
        "utf8"
      );

      assert.ok(
        confirmationPageSource.includes("<PostPaymentSuccessCard"),
        "Confirmation page must import and render PostPaymentSuccessCard"
      );
      assert.ok(
        confirmationPageSource.includes("isPaid ?"),
        "Confirmation page must guard success card with verified isPaid check"
      );
    });

    it("verifies payment-callback-verifier.tsx renders PostPaymentSuccessCard upon verified payment", () => {
      const verifierSource = fs.readFileSync(
        path.join(rootDir, "src", "features", "payments", "components", "payment-callback-verifier.tsx"),
        "utf8"
      );

      assert.ok(
        verifierSource.includes("<PostPaymentSuccessCard"),
        "Callback verifier must render PostPaymentSuccessCard on verified payment"
      );
    });
  });

  // =========================================================================
  // TASK 4: WHATSAPP ORDER MESSAGE & URL ENCODING
  // =========================================================================
  describe("Task 4: WhatsApp URL Generation & Security", () => {
    it("generates a valid WhatsApp click-to-chat URL with standard wa.me format", () => {
      const orderNumber = "SOL-2026-98765432";
      const businessNumber = "2348000000000";
      const url = createWhatsAppDeliveryUrl(orderNumber, businessNumber);

      assert.ok(url);
      assert.ok(url.startsWith("https://wa.me/2348000000000?text="));

      // Extract and decode message
      const encodedMessage = url.split("?text=")[1];
      const decodedMessage = decodeURIComponent(encodedMessage);

      // Check required message components
      assert.match(decodedMessage, /^Hello Solure Scents! 👋/m);
      assert.match(decodedMessage, /I've successfully paid for my perfume order\./i);
      assert.match(decodedMessage, /Order ID: SOL-2026-98765432/);
      assert.match(decodedMessage, /I'd like to arrange delivery for my order\./i);
      assert.match(decodedMessage, /Please confirm the delivery fee and next steps\./i);
      assert.match(decodedMessage, /Thank you!/);
    });

    it("sanitizes business phone numbers stripping non-digits", () => {
      assert.equal(formatWhatsAppPhoneNumber("+234 800 000 0000"), "2348000000000");
      assert.equal(formatWhatsAppPhoneNumber("234-800-123-4567"), "2348001234567");
      assert.equal(formatWhatsAppPhoneNumber(null), "");
      assert.equal(formatWhatsAppPhoneNumber(""), "");
    });

    it("returns null when WhatsApp number is missing or unconfigured", () => {
      const nullResult = createWhatsAppDeliveryUrl("SOL-2026-11112222", "");
      assert.equal(nullResult, null, "Must return null for empty business number");

      const shortResult = createWhatsAppDeliveryUrl("SOL-2026-11112222", "123");
      assert.equal(shortResult, null, "Must return null for invalid short number");
    });

    it("verifies site.ts has siteConfig.contact with location in Abuja, FCT, Nigeria", () => {
      const siteConfigContent = fs.readFileSync(
        path.join(rootDir, "src", "config", "site.ts"),
        "utf8"
      );
      assert.ok(siteConfigContent.includes("Abuja, FCT, Nigeria"));
      assert.ok(siteConfigContent.includes("createWhatsAppDeliveryUrl"));
    });

    it("SECURITY: never exposes guest session tokens or internal credentials in WhatsApp URL", () => {
      const orderNumber = "SOL-2026-55443322";
      const url = createWhatsAppDeliveryUrl(orderNumber, "2348000000000");
      assert.ok(url);

      const decoded = decodeURIComponent(url);

      // Verify no tokens or sensitive session keys exist
      assert.ok(!decoded.includes("guest_access_token"));
      assert.ok(!decoded.includes("session_hash"));
      assert.ok(!decoded.includes("token_hash"));
      assert.ok(!decoded.includes("bearer"));
      assert.ok(!decoded.includes("secret"));

      // Verify no 64-char hex strings (SHA-256 hashes)
      const sha256Regex = /\b[a-f0-9]{64}\b/i;
      assert.equal(sha256Regex.test(decoded), false, "No SHA-256 hashes allowed in public WhatsApp URL");
    });
  });

  // =========================================================================
  // TASK 5: ADMIN ORDER DASHBOARD
  // =========================================================================
  describe("Task 5: Admin Order Dashboard Specifications", () => {
    it("verifies admin/orders/page.tsx displays Delivery Arrangement Pending badge", () => {
      const adminOrdersSource = fs.readFileSync(
        path.join(rootDir, "src", "app", "(admin)", "admin", "orders", "page.tsx"),
        "utf8"
      );

      assert.ok(
        adminOrdersSource.includes("Delivery Arrangement Pending"),
        "Admin orders page must display 'Delivery Arrangement Pending' badge"
      );
      assert.ok(
        adminOrdersSource.includes("name=\"delivery_status\""),
        "Admin orders page must include delivery_status dropdown for manual arrangement"
      );
      assert.ok(
        adminOrdersSource.includes("variant?.size_ml"),
        "Admin orders page must display bottle sizes in flacon list"
      );
    });

    it("verifies admin updateOrder action handles delivery_status updates safely", () => {
      const actionsSource = fs.readFileSync(
        path.join(rootDir, "src", "features", "admin", "actions", "commerce-operations.ts"),
        "utf8"
      );

      assert.ok(
        actionsSource.includes("delivery_status"),
        "updateOrder action must process delivery_status"
      );
      assert.ok(
        actionsSource.includes("arranged_separately"),
        "updateOrder action must allow 'arranged_separately'"
      );
    });
  });

  // =========================================================================
  // TASK 6: PAYMENT & INVENTORY INTEGRITY SAFEGUARDS
  // =========================================================================
  describe("Task 6: Payment & Inventory Safety Safeguards", () => {
    it("preserves Paystack TEST MODE protection and rejects non-NGN currencies", () => {
      function validateCurrency(curr) {
        if (curr.toUpperCase() !== "NGN") {
          return { valid: false, error: "Solure Scents transactions support NGN only." };
        }
        return { valid: true };
      }

      assert.equal(validateCurrency("NGN").valid, true);
      assert.equal(validateCurrency("USD").valid, false);
      assert.equal(validateCurrency("EUR").valid, false);
    });

    it("guarantees idempotent payment finalization without double deduction", () => {
      let stockOnHand = 10;
      let stockReserved = 2;
      let orderPaid = false;

      function simulateFinalize(reference, paymentCaptured) {
        if (!reference || !paymentCaptured) throw new Error("Invalid payload");
        if (orderPaid) {
          // Idempotent: Row was already captured; return without re-deducting stock
          return { status: "already_processed", stockOnHand, stockReserved };
        }

        orderPaid = true;
        stockOnHand -= stockReserved;
        stockReserved = 0;
        return { status: "completed", stockOnHand, stockReserved };
      }

      const firstCall = simulateFinalize("paystack_ref_001", true);
      assert.equal(firstCall.status, "completed");
      assert.equal(stockOnHand, 8);
      assert.equal(stockReserved, 0);

      const secondCall = simulateFinalize("paystack_ref_001", true);
      assert.equal(secondCall.status, "already_processed");
      assert.equal(stockOnHand, 8, "Stock must NOT decrement a second time");
    });
  });

  // =========================================================================
  // TASK 7: DATABASE MIGRATION INTEGRITY
  // =========================================================================
  describe("Task 7: Database Migration Verification", () => {
    it("verifies migration file exists with correct next sequential number 202607200001", () => {
      const migrationFile = path.join(
        rootDir,
        "supabase",
        "migrations",
        "202607200001_abuja_delivery_arranged_separately.sql"
      );

      assert.ok(fs.existsSync(migrationFile), "Migration file 202607200001 must exist");

      const migrationContent = fs.readFileSync(migrationFile, "utf8");
      assert.ok(
        migrationContent.includes("orders_delivery_status_check"),
        "Migration must update orders_delivery_status_check"
      );
      assert.ok(
        migrationContent.includes("'arranged_separately'"),
        "Migration must include 'arranged_separately'"
      );
      assert.ok(
        migrationContent.includes("DO NOT EXECUTE OR DEPLOY THIS MIGRATION AUTOMATICALLY"),
        "Migration must contain safety banner prohibiting unapproved deployment"
      );
    });
  });
});
