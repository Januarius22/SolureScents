import { NextRequest, NextResponse } from "next/server";
import { getVerifiedGuestOrder } from "@/features/checkout/services/guest-order-access";
import { generateOrderReceiptPdf } from "@/features/checkout/services/receipt-pdf-generator";
import { getActiveConfirmationAuth } from "@/features/checkout/services/confirmation-session";
import { createServerSupabaseClient, createPrivilegedSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders/[id]/receipt
 * Secure endpoint for downloading official Solure Scents order receipt as PDF.
 *
 * Security Requirements (Tasks 6 & 9):
 * 1. Authorizes guest access via short-lived HTTP-only confirmation session cookie or capability token.
 * 2. Rejects unauthorized access with 401/403 (Guest A cannot access Guest B's receipt).
 * 3. Enforces authoritative payment verification: Refuses to issue official receipts for
 *    unpaid, pending, reconciliation-required, or failed transactions.
 * 4. Never accepts client-supplied financial amounts or status values.
 * 5. Applies strict no-store caching headers to protect customer privacy.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const providedToken = searchParams.get("token");

    // 1. Authorize Guest Order Access
    const order = await getVerifiedGuestOrder(id, providedToken);
    if (!order) {
      return NextResponse.json(
        {
          error:
            "Unauthorized access to order receipt. A valid guest confirmation session or capability token is required.",
        },
        { status: 401 },
      );
    }

    // 2. Authoritative Payment Settlement Verification
    // Check order status
    const isOrderPaidStatus = ["confirmed", "processing", "shipped", "delivered"].includes(
      order.status,
    );

    // Check confirmation session for authenticated settlement state
    const authSession = await getActiveConfirmationAuth(order.id);
    if (authSession?.paymentStatus === "reconciliation_required") {
      return NextResponse.json(
        {
          error:
            "Payment is currently undergoing administrative confirmation review. Official purchase receipts can only be generated once reconciliation has completed.",
        },
        { status: 403 },
      );
    }

    // Check payments ledger for authoritative captured state
    const dbClient = createPrivilegedSupabaseClient() ?? (await createServerSupabaseClient());
    let capturedPayment: {
      provider: string;
      provider_reference: string | null;
      status: string;
      captured_at?: string | null;
      paid_at?: string | null;
    } | null = null;

    try {
      const { data: payRecord } = await dbClient
        .from("payments")
        .select("provider, provider_reference, status, captured_at, paid_at")
        .eq("order_id", order.id)
        .eq("status", "captured")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      capturedPayment = payRecord;
    } catch {
      // payments table may be pending migration
    }

    const isSessionPaid = authSession?.paymentStatus === "captured";
    const isVerifiedPaid = isOrderPaidStatus || Boolean(capturedPayment) || isSessionPaid;

    if (!isVerifiedPaid) {
      return NextResponse.json(
        {
          error:
            "Official purchase receipts can only be generated for verified and finalized paid orders. Order status is currently pending or unverified.",
        },
        { status: 403 },
      );
    }

    // 3. Generate Official PDF
    const pdfBytes = generateOrderReceiptPdf(order, {
      paymentMethod: capturedPayment?.provider ? "Paystack" : "Paystack (Test Mode)",
      paymentReference: capturedPayment?.provider_reference || null,
      paymentDate: capturedPayment?.paid_at || capturedPayment?.captured_at || order.createdAt,
      verifiedStatus: "Verified & Settled",
    });

    const filename = `Solure-Scents-Receipt-${order.orderNumber}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err) {
    console.error("[OrderReceiptApi] Unexpected error generating receipt:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while generating your order receipt." },
      { status: 500 },
    );
  }
}
