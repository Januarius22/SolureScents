import type { PreparedOrder } from "../types";

/**
 * Escapes characters for PDF text string literals.
 */
function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/**
 * Formats minor currency units into standard Nigerian Naira representation for official PDF rendering.
 */
function formatNgn(amountMinor: number): string {
  const naira = Math.floor(amountMinor / 100);
  return `NGN ${naira.toLocaleString("en-NG")}`;
}

export interface ReceiptOptions {
  paymentMethod?: string;
  paymentReference?: string | null;
  paymentDate?: string | null;
  verifiedStatus?: string;
}

/**
 * Generates a valid, standards-compliant, self-contained PDF 1.4 document buffer
 * for an official Solure Scents purchase receipt.
 *
 * Conforms to:
 * - Ultra-luxury Solure Scents A4 aesthetic (Charcoal #1A1A1A, Atelier Gold #C9A86A, Warm Ivory #F8F6F0).
 * - Exact legal clarifications required for Abuja delivery policy.
 * - Accurate line-item calculations and multi-product formatting.
 * - Zero external native dependencies; executes in pure Node/Edge runtime.
 */
export function generateOrderReceiptPdf(
  order: PreparedOrder,
  options: ReceiptOptions = {},
): Uint8Array {
  const paymentMethod = options.paymentMethod || "Paystack";
  const verifiedStatus = options.verifiedStatus || "Verified & Captured";
  const paymentRef = options.paymentReference || "Captured";
  const receiptDate = options.paymentDate
    ? new Date(options.paymentDate).toLocaleDateString("en-NG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-NG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2; // 515.28

  const streamOps: string[] = [];

  // Helper functions for drawing
  const setColor = (r: number, g: number, b: number) => {
    streamOps.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
    streamOps.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
  };

  const drawRect = (x: number, y: number, w: number, h: number, fill = true, stroke = false) => {
    streamOps.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    if (fill && stroke) streamOps.push("b");
    else if (fill) streamOps.push("f");
    else if (stroke) streamOps.push("S");
  };

  const drawLine = (x1: number, y1: number, x2: number, y2: number, width = 1) => {
    streamOps.push(`${width.toFixed(2)} w`);
    streamOps.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  };

  const drawText = (
    text: string,
    x: number,
    y: number,
    font = "/F1",
    size = 10,
    align: "left" | "right" | "center" = "left",
  ) => {
    const escaped = escapePdfText(text);
    let drawX = x;
    if (align === "right") {
      const approxWidth = text.length * (size * 0.52);
      drawX = x - approxWidth;
    } else if (align === "center") {
      const approxWidth = text.length * (size * 0.52);
      drawX = x - approxWidth / 2;
    }
    streamOps.push(`BT ${font} ${size} Tf ${drawX.toFixed(2)} ${y.toFixed(2)} Td (${escaped}) Tj ET`);
  };

  // Top Accent Gold Bar
  setColor(0.788, 0.658, 0.415); // Solure Gold
  drawRect(margin, pageHeight - 35, contentWidth, 3, true, false);

  // Solure Scents Branding
  setColor(0.1, 0.1, 0.1); // Charcoal
  drawText("SOLURE SCENTS", margin, pageHeight - 65, "/F2", 20);

  setColor(0.48, 0.42, 0.28); // Subtle Antique Gold
  drawText("OFFICIAL PURCHASE RECEIPT", margin, pageHeight - 82, "/F2", 10);

  // Atelier details right-aligned
  setColor(0.45, 0.45, 0.45);
  drawText("Solure Scents Atelier", pageWidth - margin, pageHeight - 65, "/F1", 9, "right");
  drawText("Abuja, FCT, Nigeria", pageWidth - margin, pageHeight - 78, "/F1", 9, "right");
  drawText("concierge@solurescents.com", pageWidth - margin, pageHeight - 91, "/F1", 9, "right");

  // Divider
  setColor(0.88, 0.88, 0.88);
  drawLine(margin, pageHeight - 105, pageWidth - margin, pageHeight - 105, 0.75);

  // Metadata Grid (Left: Order Info, Right: Delivery & Payment)
  const metaY = pageHeight - 125;

  // Metadata Column 1
  setColor(0.5, 0.5, 0.5);
  drawText("ORDER NUMBER:", margin, metaY, "/F2", 8);
  setColor(0.1, 0.1, 0.1);
  drawText(order.orderNumber, margin, metaY - 14, "/F2", 12);

  setColor(0.5, 0.5, 0.5);
  drawText("DATE OF PURCHASE:", margin, metaY - 34, "/F2", 8);
  setColor(0.1, 0.1, 0.1);
  drawText(receiptDate, margin, metaY - 46, "/F1", 9);

  setColor(0.5, 0.5, 0.5);
  drawText("CUSTOMER NAME:", margin, metaY - 64, "/F2", 8);
  setColor(0.1, 0.1, 0.1);
  drawText(order.shippingAddress.recipientName || "Guest Customer", margin, metaY - 76, "/F1", 9);
  drawText(order.customerEmail, margin, metaY - 88, "/F1", 9);

  // Metadata Column 2 (Right)
  const col2X = margin + 260;
  setColor(0.5, 0.5, 0.5);
  drawText("PAYMENT METHOD:", col2X, metaY, "/F2", 8);
  setColor(0.1, 0.1, 0.1);
  drawText(`${paymentMethod} (${verifiedStatus})`, col2X, metaY - 14, "/F1", 9);

  setColor(0.5, 0.5, 0.5);
  drawText("PAYMENT REFERENCE:", col2X, metaY - 34, "/F2", 8);
  setColor(0.1, 0.1, 0.1);
  drawText(paymentRef, col2X, metaY - 46, "/F1", 9);

  setColor(0.5, 0.5, 0.5);
  drawText("DELIVERY DESTINATION:", col2X, metaY - 64, "/F2", 8);
  setColor(0.1, 0.1, 0.1);
  const destState = order.shippingAddress.state ? `${order.shippingAddress.state} State` : "Nigeria";
  const destCity = order.shippingAddress.cityOrLga ? `${order.shippingAddress.cityOrLga}, ` : "";
  drawText(`${order.shippingAddress.streetAddress || ""}`, col2X, metaY - 76, "/F1", 9);
  drawText(`${destCity}${destState}`, col2X, metaY - 88, "/F1", 9);

  // Line Items Table Header
  const tableTop = metaY - 118;
  setColor(0.96, 0.95, 0.93); // Champagne warm neutral
  drawRect(margin, tableTop - 18, contentWidth, 22, true, false);

  setColor(0.788, 0.658, 0.415);
  drawLine(margin, tableTop - 18, pageWidth - margin, tableTop - 18, 0.5);

  setColor(0.2, 0.2, 0.2);
  drawText("ITEM DESCRIPTION", margin + 8, tableTop - 12, "/F2", 8);
  drawText("BOTTLE SIZE", margin + 215, tableTop - 12, "/F2", 8);
  drawText("QTY", margin + 325, tableTop - 12, "/F2", 8, "center");
  drawText("UNIT PRICE", margin + 410, tableTop - 12, "/F2", 8, "right");
  drawText("LINE TOTAL", pageWidth - margin - 8, tableTop - 12, "/F2", 8, "right");

  // Table Rows
  let curY = tableTop - 38;
  for (const item of order.items) {
    setColor(0.1, 0.1, 0.1);
    drawText(item.productName, margin + 8, curY, "/F2", 9);

    const sizeDisplay = item.sizeMl > 0 ? `${item.sizeMl}ml Flacon` : item.variantLabel || "Standard Flacon";
    setColor(0.4, 0.4, 0.4);
    drawText(sizeDisplay, margin + 215, curY, "/F1", 8.5);

    setColor(0.1, 0.1, 0.1);
    drawText(String(item.quantity), margin + 325, curY, "/F1", 9, "center");
    drawText(formatNgn(item.unitPriceMinor), margin + 410, curY, "/F1", 9, "right");
    drawText(formatNgn(item.lineTotalMinor), pageWidth - margin - 8, curY, "/F2", 9, "right");

    // Row divider
    setColor(0.92, 0.92, 0.92);
    drawLine(margin, curY - 10, pageWidth - margin, curY - 10, 0.5);

    curY -= 26;
  }

  // Summary Totals Block
  const summaryY = curY - 10;
  const summaryBoxWidth = 230;
  const summaryX = pageWidth - margin - summaryBoxWidth;

  setColor(0.45, 0.45, 0.45);
  drawText("Subtotal:", summaryX + 10, summaryY, "/F1", 9);
  setColor(0.1, 0.1, 0.1);
  drawText(formatNgn(order.subtotalMinor), pageWidth - margin - 10, summaryY, "/F1", 9, "right");

  if (order.discountMinor && order.discountMinor > 0) {
    setColor(0.45, 0.45, 0.45);
    drawText("Discount:", summaryX + 10, summaryY - 16, "/F1", 9);
    setColor(0.1, 0.1, 0.1);
    drawText(`- ${formatNgn(order.discountMinor)}`, pageWidth - margin - 10, summaryY - 16, "/F1", 9, "right");
  }

  // Delivery Service Line
  setColor(0.45, 0.45, 0.45);
  drawText("Delivery Charges:", summaryX + 10, summaryY - 32, "/F1", 9);
  setColor(0.55, 0.4, 0.15);
  drawText("Arranged Separately", pageWidth - margin - 10, summaryY - 32, "/F2", 9, "right");

  // Total Divider
  setColor(0.788, 0.658, 0.415);
  drawLine(summaryX, summaryY - 44, pageWidth - margin, summaryY - 44, 1);

  // Total Amount Paid
  setColor(0.1, 0.1, 0.1);
  drawText("TOTAL AMOUNT PAID:", summaryX + 10, summaryY - 60, "/F2", 10);
  setColor(0.1, 0.1, 0.1);
  drawText(formatNgn(order.totalMinor), pageWidth - margin - 10, summaryY - 60, "/F2", 12, "right");

  // Delivery Arrangement & Policy Disclosure Box
  const noticeY = summaryY - 105;
  setColor(0.975, 0.965, 0.94); // Light champagne fill
  drawRect(margin, noticeY - 45, contentWidth, 52, true, false);

  setColor(0.788, 0.658, 0.415); // Gold border
  drawRect(margin, noticeY - 45, contentWidth, 52, false, true);

  setColor(0.2, 0.18, 0.12);
  drawText("IMPORTANT DELIVERY ARRANGEMENT NOTICE:", margin + 12, noticeY - 12, "/F2", 8.5);

  setColor(0.35, 0.35, 0.35);
  drawText(
    "Delivery charges are arranged separately and are not included in the perfume purchase total shown above.",
    margin + 12,
    noticeY - 26,
    "/F3",
    8.5,
  );
  drawText(
    "To finalize dispatch from our Abuja Atelier and receive waybill details, contact our concierge via WhatsApp.",
    margin + 12,
    noticeY - 38,
    "/F1",
    8,
  );

  // Footer section
  const footerY = 55;
  setColor(0.88, 0.88, 0.88);
  drawLine(margin, footerY + 20, pageWidth - margin, footerY + 20, 0.5);

  setColor(0.15, 0.15, 0.15);
  drawText("Thank you for choosing Solure Scents.", pageWidth / 2, footerY + 6, "/F2", 10, "center");

  setColor(0.5, 0.5, 0.5);
  drawText(
    "Solure Scents Atelier · Abuja, FCT, Nigeria · All Fragrance Rights Reserved",
    pageWidth / 2,
    footerY - 8,
    "/F1",
    7.5,
    "center",
  );

  // Build PDF Stream Content
  const contentStream = streamOps.join("\n");
  const contentBytes = Buffer.from(contentStream, "utf-8");

  // Object Structure
  const objects: string[] = [];

  // Object 1: Catalog
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";

  // Object 2: Pages
  objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";

  // Object 3: Page
  objects[3] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> >>`;

  // Object 4: Contents Stream
  objects[4] = `<< /Length ${contentBytes.length} >>\nstream\n${contentStream}\nendstream`;

  // Object 5: Standard Helvetica Font
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  // Object 6: Helvetica-Bold Font
  objects[6] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  // Object 7: Helvetica-Oblique Font
  objects[7] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>";

  // Assemble full PDF with correct cross-reference offsets
  let pdf = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const offsets: number[] = [0];

  for (let i = 1; i <= 7; i++) {
    offsets[i] = Buffer.byteLength(pdf, "utf-8");
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const startxref = Buffer.byteLength(pdf, "utf-8");
  pdf += "xref\n0 8\n";
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i <= 7; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  return Buffer.from(pdf, "utf-8");
}
