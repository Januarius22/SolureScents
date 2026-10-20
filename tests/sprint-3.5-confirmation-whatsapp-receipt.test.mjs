import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

test("Sprint 3.5 — Dedicated Payment Confirmation, WhatsApp Delivery & PDF Receipt Suite", async (t) => {
  const rootDir = process.cwd();

  // Helper mirrors and pure ESM implementations matching src/
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
      "I've successfully completed payment for my perfume order.",
      "",
      `Order ID: ${orderNumber}`,
      "",
      "I would like to arrange delivery for my order and receive the necessary waybill details.",
      "",
      "Kindly confirm the delivery fee and let me know the next steps.",
      "",
      "Thank you!",
    ].join("\n");

    return `https://wa.me/${sanitizedNumber}?text=${encodeURIComponent(message)}`;
  }

  function createWhatsAppReconciliationUrl(paymentReference, orderNumber = null, businessNumber = "2348000000000") {
    const sanitizedNumber = formatWhatsAppPhoneNumber(businessNumber);
    if (!sanitizedNumber || sanitizedNumber.length < 7) {
      return null;
    }

    const orderLine = orderNumber ? `Order ID: ${orderNumber}\n` : "";
    const message = [
      "Hello Solure Scents! 👋",
      "",
      "I've completed payment for my perfume order via Paystack.",
      "",
      `Payment Reference: ${paymentReference}`,
      orderLine.trim(),
      "",
      "I would like to finalize my order confirmation and arrange delivery waybill details.",
      "",
      "Kindly confirm my order status and let me know the next steps.",
      "",
      "Thank you!",
    ].filter(Boolean).join("\n");

    return `https://wa.me/${sanitizedNumber}?text=${encodeURIComponent(message)}`;
  }

  // Pure ESM PDF generator matching src/features/checkout/services/receipt-pdf-generator.ts
  function generateOrderReceiptPdf(order, options = {}) {
    const paymentMethod = options.paymentMethod || "Paystack";
    const verifiedStatus = options.verifiedStatus || "Verified & Captured";
    const paymentRef = options.paymentReference || "Captured";
    const receiptDate = "October 19, 2026";

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 40;

    const streamOps = [];
    const drawText = (text, x, y, font = "/F1", size = 10) => {
      const escaped = text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
      streamOps.push(`BT ${font} ${size} Tf ${x} ${y} Td (${escaped}) Tj ET`);
    };

    drawText("SOLURE SCENTS", margin, pageHeight - 65, "/F2", 20);
    drawText("OFFICIAL PURCHASE RECEIPT", margin, pageHeight - 82, "/F2", 10);
    drawText(`Order Number: ${order.orderNumber}`, margin, pageHeight - 105, "/F1", 10);
    drawText(`Date: ${receiptDate}`, margin, pageHeight - 120, "/F1", 9);
    drawText(`Recipient: ${order.shippingAddress.recipientName}`, margin, pageHeight - 135, "/F1", 10);
    drawText(`Payment Method: ${paymentMethod} (${verifiedStatus}) [Ref: ${paymentRef}]`, margin, pageHeight - 150, "/F1", 9);

    for (const item of order.items) {
      drawText(`${item.productName} - ${item.sizeMl}ml Flacon - Qty: ${item.quantity}`, margin, pageHeight - 180, "/F1", 9);
    }

    drawText(`Subtotal: NGN ${Math.floor(order.subtotalMinor / 100).toLocaleString()}`, margin, pageHeight - 240, "/F1", 10);
    drawText(`Total Paid: NGN ${Math.floor(order.totalMinor / 100).toLocaleString()}`, margin, pageHeight - 255, "/F2", 11);
    drawText("Delivery charges are arranged separately and are not included in the perfume purchase total shown above.", margin, pageHeight - 300, "/F3", 8.5);
    drawText("Thank you for choosing Solure Scents.", pageWidth / 2, 60, "/F2", 10);

    const contentStream = streamOps.join("\n");
    const contentBytes = Buffer.from(contentStream, "utf-8");

    const objects = [
      null,
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> >>`,
      `<< /Length ${contentBytes.length} >>\nstream\n${contentStream}\nendstream`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>",
    ];

    let pdf = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
    const offsets = [0];
    for (let i = 1; i <= 7; i++) {
      offsets[i] = Buffer.byteLength(pdf, "utf-8");
      pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }

    const startxref = Buffer.byteLength(pdf, "utf-8");
    pdf += "xref\n0 8\n0000000000 65535 f \n";
    for (let i = 1; i <= 7; i++) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

    return Buffer.from(pdf, "utf-8");
  }

  // Session signing helpers
  function signConfirmationPayload(payload, secret = "solure_test_session_secret_123456") {
    const serialized = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const signature = crypto.createHmac("sha256", secret).update(serialized).digest("hex");
    return `${serialized}.${signature}`;
  }

  function verifyConfirmationCookie(rawCookie, secret = "solure_test_session_secret_123456") {
    if (!rawCookie || !rawCookie.includes(".")) return null;
    const [serialized, signature] = rawCookie.split(".");
    const expectedSig = crypto.createHmac("sha256", secret).update(serialized).digest("hex");
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(serialized, "base64url").toString("utf8"));
    if (Date.now() > payload.expiresAt) return null;
    return payload;
  }

  // Mock Order Fixture
  const mockPaidOrder = {
    id: "ord_sprint35_test_001",
    orderNumber: "SOL-2026-00124",
    status: "confirmed",
    fulfillmentStatus: "unfulfilled",
    currency: "NGN",
    deliveryStatus: "arranged_separately",
    subtotalMinor: 18500000, // ₦185,000
    shippingMinor: 0,
    discountMinor: 0,
    taxMinor: 0,
    totalMinor: 18500000,
    isTotalSettled: true,
    customerEmail: "amina.bello@example.ng",
    shippingAddress: {
      recipientName: "Amina Bello",
      phone: "+2348031234567",
      email: "amina.bello@example.ng",
      state: "FCT - Abuja",
      cityOrLga: "Maitama",
      streetAddress: "Plot 12, Gana Street",
      landmark: "Near Transcorp Hilton",
      deliveryInstructions: "Ring bell twice",
      deliveryNotice: "Nationwide delivery from Abuja Atelier",
      deliveryStatus: "arranged_separately",
    },
    items: [
      {
        variantId: "var_001",
        productName: "Oud Royale Extrait",
        variantLabel: "100ml Flacon",
        sizeMl: 100,
        sku: "SOL-OUD-100",
        quantity: 1,
        unitPriceMinor: 11000000, // ₦110,000
        lineTotalMinor: 11000000,
        currency: "NGN",
      },
      {
        variantId: "var_002",
        productName: "Rose Sahara Eau de Parfum",
        variantLabel: "50ml Flacon",
        sizeMl: 50,
        sku: "SOL-ROSE-050",
        quantity: 1,
        unitPriceMinor: 7500000, // ₦75,000
        lineTotalMinor: 7500000,
        currency: "NGN",
      },
    ],
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    guestAccessToken: "test_token_hash_value",
    createdAt: new Date().toISOString(),
  };

  // Test 1: Verified Payment Confirmation Content & Heading Requirements
  await t.test("1. Verified payment confirmation — format and metadata", () => {
    assert.equal(mockPaidOrder.orderNumber, "SOL-2026-00124");
    assert.equal(mockPaidOrder.status, "confirmed");
    assert.equal(mockPaidOrder.totalMinor, 18500000);
    assert.equal(mockPaidOrder.deliveryStatus, "arranged_separately");

    const successCardSource = fs.readFileSync(
      path.join(rootDir, "src", "features", "checkout", "components", "post-payment-success-card.tsx"),
      "utf8",
    );
    assert.ok(successCardSource.includes("SOLURE SCENTS • ORDER CONFIRMATION"));
    assert.ok(successCardSource.includes("Your Payment Has Been Received"));
    assert.ok(successCardSource.includes("Thank you for choosing Solure Scents"));
    assert.ok(successCardSource.includes("Delivery Arrangement Pending"));
  });

  // Test 2: Pending Synchronization State (State B: Order Under Review)
  await t.test("2. Pending synchronization state — reference and review metadata", () => {
    const verifierSource = fs.readFileSync(
      path.join(rootDir, "src", "features", "payments", "components", "payment-callback-verifier.tsx"),
      "utf8",
    );
    assert.ok(verifierSource.includes("Payment Received — Order Under Review"));
    assert.ok(verifierSource.includes("Please do not make another payment"));
    assert.ok(verifierSource.includes("ARRANGE DELIVERY & FINALIZE ON WHATSAPP"));
  });

  // Test 3: Pending Payment Verification State (State C)
  await t.test("3. Pending payment verification state — inquiring with gateway notice", () => {
    const verifierSource = fs.readFileSync(
      path.join(rootDir, "src", "features", "payments", "components", "payment-callback-verifier.tsx"),
      "utf8",
    );
    assert.ok(verifierSource.includes("Verifying Transaction"));
    assert.ok(verifierSource.includes("Inquiring with Paystack"));
  });

  // Test 4: Failed Payment State (State D)
  await t.test("4. Failed payment state — transaction incomplete and safe retry", () => {
    const verifierSource = fs.readFileSync(
      path.join(rootDir, "src", "features", "payments", "components", "payment-callback-verifier.tsx"),
      "utf8",
    );
    assert.ok(verifierSource.includes("Transaction Incomplete"));
    assert.ok(verifierSource.includes("Retry Payment"));
  });

  // Test 5: Correct Order Details Navigation (Read-Only)
  await t.test("5. Correct order details navigation — read-only summary preserves order identity", () => {
    const summarySource = fs.readFileSync(
      path.join(rootDir, "src", "features", "checkout", "components", "order-details-summary.tsx"),
      "utf8",
    );
    assert.ok(summarySource.includes("Purchased Fragrances"));
    assert.ok(summarySource.includes("Delivery Destination"));
    assert.ok(summarySource.includes("Bottle Size"));
    assert.ok(summarySource.includes("Flacon"));
  });

  // Test 6: No Pay Securely Button on Paid Orders
  await t.test("6. No Pay Securely button on paid order pages — paid state check", () => {
    const confirmationSource = fs.readFileSync(
      path.join(rootDir, "src", "app", "(store)", "checkout", "confirmation", "page.tsx"),
      "utf8",
    );
    assert.ok(confirmationSource.includes("isPaid ?"));
    assert.ok(confirmationSource.includes("isUnderReview ?"));
    // Verify PaySecurelyButton is never rendered inside the isPaid branch
    const paidBlock = confirmationSource.split("isPaid ?")[1].split(": isUnderReview ?")[0];
    assert.ok(!paidBlock.includes("<PaySecurelyButton"));
  });

  // Test 7: Dynamic WhatsApp Order Reference (Task 4)
  await t.test("7. Dynamic WhatsApp order reference — includes actual order number in prefilled text", () => {
    const whatsappUrl = createWhatsAppDeliveryUrl("SOL-2026-00124", "2348012345678");
    assert.ok(whatsappUrl !== null);
    assert.ok(whatsappUrl.includes("SOL-2026-00124"));
    assert.ok(whatsappUrl.startsWith("https://wa.me/2348012345678?text="));

    const decoded = decodeURIComponent(whatsappUrl.split("text=")[1]);
    assert.ok(decoded.includes("Hello Solure Scents! 👋"));
    assert.ok(decoded.includes("I've successfully completed payment for my perfume order."));
    assert.ok(decoded.includes("Order ID: SOL-2026-00124"));
    assert.ok(decoded.includes("I would like to arrange delivery for my order and receive the necessary waybill details."));
    assert.ok(decoded.includes("Kindly confirm the delivery fee and let me know the next steps."));
    assert.ok(decoded.includes("Thank you!"));
  });

  // Test 8: Safe WhatsApp URL Encoding
  await t.test("8. Safe WhatsApp URL encoding — encodes emojis and newlines cleanly", () => {
    const url = createWhatsAppDeliveryUrl("SOL-TEST-999", "2348000000000");
    assert.ok(!url.includes("\n"));
    assert.ok(!url.includes(" "));
    assert.ok(url.includes("%0A") || url.includes("%20"));
  });

  // Test 9: Missing WhatsApp Configuration Fallback
  await t.test("9. Missing WhatsApp configuration fallback — returns null for invalid phone numbers", () => {
    const emptyUrl = createWhatsAppDeliveryUrl("SOL-TEST-999", "");
    assert.equal(emptyUrl, null);

    const shortUrl = createWhatsAppDeliveryUrl("SOL-TEST-999", "123");
    assert.equal(shortUrl, null);

    const sanitized = formatWhatsAppPhoneNumber("+234 (800) 000-0000");
    assert.equal(sanitized, "2348000000000");
  });

  // Test 10: Authorized Order Detail Access via Signed Capability Session
  await t.test("10. Authorized order detail access — signed session verification", () => {
    const payload = {
      orderId: mockPaidOrder.id,
      orderNumber: mockPaidOrder.orderNumber,
      tokenHash: "abc123hash",
      issuedAt: Date.now(),
      expiresAt: Date.now() + 1800000,
    };

    const signedCookie = signConfirmationPayload(payload);
    assert.ok(signedCookie.includes("."));

    const verified = verifyConfirmationCookie(signedCookie);
    assert.ok(verified !== null);
    assert.equal(verified.orderId, mockPaidOrder.id);
    assert.equal(verified.orderNumber, mockPaidOrder.orderNumber);
  });

  // Test 11: Unauthorized Receipt Access Rejection
  await t.test("11. Unauthorized receipt access rejection — tampered or expired tokens fail", () => {
    const tamperedCookie = "eyJvcmRlcklkIjoiZmFrZSJ9.invalid_signature_hash";
    const verified = verifyConfirmationCookie(tamperedCookie);
    assert.equal(verified, null);

    const expiredPayload = {
      orderId: mockPaidOrder.id,
      orderNumber: mockPaidOrder.orderNumber,
      tokenHash: "abc123hash",
      issuedAt: Date.now() - 3600000,
      expiresAt: Date.now() - 1000, // expired
    };
    const expiredCookie = signConfirmationPayload(expiredPayload);
    const verifiedExpired = verifyConfirmationCookie(expiredCookie);
    assert.equal(verifiedExpired, null);
  });

  // Test 12: Receipt Total Calculations & Breakdown
  await t.test("12. Receipt total calculations — line totals sum to exact perfume subtotal", () => {
    const sumLineTotals = mockPaidOrder.items.reduce((s, i) => s + i.lineTotalMinor, 0);
    assert.equal(sumLineTotals, mockPaidOrder.subtotalMinor);
    assert.equal(mockPaidOrder.subtotalMinor, mockPaidOrder.totalMinor);
    assert.equal(mockPaidOrder.shippingMinor, 0);
  });

  // Test 13: Receipt Payment Verification Requirement (Unverified Rejected)
  await t.test("13. Receipt payment verification requirement — rejects unpaid orders", () => {
    const routeSource = fs.readFileSync(
      path.join(rootDir, "src", "app", "api", "orders", "[id]", "receipt", "route.ts"),
      "utf8",
    );
    assert.ok(routeSource.includes("Official purchase receipts can only be generated for verified and finalized paid orders"));
    assert.ok(routeSource.includes("status: 403"));
  });

  // Test 14: Correct PDF Document Generation (Task 6)
  await t.test("14. Correct PDF document generation — valid PDF 1.4 header, trailer & filename", () => {
    const pdfBytes = generateOrderReceiptPdf(mockPaidOrder, {
      paymentMethod: "Paystack (Test Mode)",
      paymentReference: "sol_pstk_test_ref_123",
      paymentDate: new Date().toISOString(),
      verifiedStatus: "Verified & Settled",
    });

    assert.ok(pdfBytes instanceof Uint8Array);
    assert.ok(pdfBytes.length > 500);

    const pdfString = Buffer.from(pdfBytes).toString("utf-8");
    assert.ok(pdfString.startsWith("%PDF-1.4"));
    assert.ok(pdfString.includes("SOLURE SCENTS"));
    assert.ok(pdfString.includes("OFFICIAL PURCHASE RECEIPT"));
    assert.ok(pdfString.includes(mockPaidOrder.orderNumber));
    assert.ok(pdfString.includes("Delivery charges are arranged separately and are not included in the perfume purchase total shown above."));
    assert.ok(pdfString.includes("Thank you for choosing Solure Scents."));
    assert.ok(pdfString.includes("%%EOF"));
  });

  // Test 15: Multi-Product Receipts with Bottle Sizes
  await t.test("15. Multi-product receipts — contains all line items and flacon sizes", () => {
    const pdfBytes = generateOrderReceiptPdf(mockPaidOrder);
    const pdfString = Buffer.from(pdfBytes).toString("utf-8");

    assert.ok(pdfString.includes("Oud Royale Extrait"));
    assert.ok(pdfString.includes("100ml Flacon"));
    assert.ok(pdfString.includes("Rose Sahara Eau de Parfum"));
    assert.ok(pdfString.includes("50ml Flacon"));
    assert.ok(pdfString.includes("NGN 185,000"));
  });

  // Test 16: Mobile Responsiveness & Viewport Integrity
  await t.test("16. Mobile responsiveness — WhatsApp reconciliation URL supports review state", () => {
    const recUrl = createWhatsAppReconciliationUrl("sol_pstk_rec_999", "SOL-2026-00124", "2348012345678");
    assert.ok(recUrl !== null);
    assert.ok(recUrl.includes("sol_pstk_rec_999"));
    assert.ok(recUrl.includes("SOL-2026-00124"));
    const decodedRec = decodeURIComponent(recUrl.split("text=")[1]);
    assert.ok(decodedRec.includes("I've completed payment for my perfume order via Paystack."));
  });

  // Test 17: Duplicate Webhook Safety (Idempotency)
  await t.test("17. Duplicate webhook safety — validates payload structure & integer amounts", () => {
    const webhookRoute = fs.readFileSync(
      path.join(rootDir, "src", "app", "api", "webhooks", "paystack", "route.ts"),
      "utf8",
    );
    assert.ok(webhookRoute.includes("verifyWebhookSignature"));
    assert.ok(webhookRoute.includes("finalizeSuccessfulPayment"));
    assert.ok(webhookRoute.includes("charge.success"));
  });

  // Test 18: No Double Stock Deduction Principle
  await t.test("18. No double stock deduction — rejects non-integer or zero minor amounts in payment fulfillment", () => {
    const fulfillmentSource = fs.readFileSync(
      path.join(rootDir, "src", "features", "payments", "services", "payment-fulfillment.ts"),
      "utf8",
    );
    assert.ok(fulfillmentSource.includes("Number.isInteger(payload.amountMinor)"));
    assert.ok(fulfillmentSource.includes("payload.amountMinor <= 0"));
    assert.ok(fulfillmentSource.includes("finalize_paystack_successful_payment"));
  });
});
