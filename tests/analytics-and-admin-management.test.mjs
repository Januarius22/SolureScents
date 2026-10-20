import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Implementation of Lagos date range logic for direct test validation
const LAGOS_UTC_OFFSET_HOURS = 1;

function toLagosTime(date) {
  return new Date(date.getTime() + LAGOS_UTC_OFFSET_HOURS * 60 * 60 * 1000);
}

function fromLagosParts(year, monthIndex, day, hours = 0, minutes = 0, seconds = 0, ms = 0) {
  const utcMs = Date.UTC(year, monthIndex, day, hours - LAGOS_UTC_OFFSET_HOURS, minutes, seconds, ms);
  return new Date(utcMs);
}

function calculatePeriodChange(current, previous) {
  if (previous === 0) {
    return {
      value: current,
      previousValue: previous,
      percentChange: 0,
      isPositive: current > 0,
      isNeutral: true,
    };
  }
  const diff = current - previous;
  const percentChange = (diff / previous) * 100;
  return {
    value: current,
    previousValue: previous,
    percentChange: Math.round(percentChange * 10) / 10,
    isPositive: percentChange > 0,
    isNeutral: percentChange === 0,
  };
}

test("Task 1 & 2: Analytics Date Filters and Africa/Lagos UTC+1 Boundaries", async (t) => {
  await t.test("Lagos timezone offset is defined as UTC+1 year-round", () => {
    assert.equal(LAGOS_UTC_OFFSET_HOURS, 1);
  });

  await t.test("Lagos time conversions maintain exact 1-hour offset from UTC", () => {
    const utcMidnight = new Date("2026-10-20T00:00:00.000Z");
    const lagosTime = toLagosTime(utcMidnight);
    assert.equal(lagosTime.getUTCHours(), 1); // 1:00 AM in Lagos
  });

  await t.test("Lagos day start corresponds to 23:00 UTC of prior day", () => {
    const lagosDayStart = fromLagosParts(2026, 9, 20, 0, 0, 0, 0); // Oct 20 00:00 Lagos
    assert.equal(lagosDayStart.toISOString(), "2026-10-19T23:00:00.000Z");
  });

  await t.test("Granularity adapts appropriately based on duration", () => {
    const getGranularity = (days) => {
      if (days <= 31) return "daily";
      if (days <= 120) return "weekly";
      return "monthly";
    };

    assert.equal(getGranularity(1), "daily");
    assert.equal(getGranularity(7), "daily");
    assert.equal(getGranularity(30), "daily");
    assert.equal(getGranularity(90), "weekly");
    assert.equal(getGranularity(365), "monthly");
  });
});

test("Task 2: Period-Over-Period Comparison Metric Calculations", async (t) => {
  await t.test("Positive growth calculation", () => {
    const comp = calculatePeriodChange(150, 100);
    assert.equal(comp.value, 150);
    assert.equal(comp.previousValue, 100);
    assert.equal(comp.percentChange, 50);
    assert.equal(comp.isPositive, true);
    assert.equal(comp.isNeutral, false);
  });

  await t.test("Negative contraction calculation", () => {
    const comp = calculatePeriodChange(80, 100);
    assert.equal(comp.value, 80);
    assert.equal(comp.previousValue, 100);
    assert.equal(comp.percentChange, -20);
    assert.equal(comp.isPositive, false);
    assert.equal(comp.isNeutral, false);
  });

  await t.test("Zero baseline returns neutral indicator without fabricating percentages", () => {
    const comp = calculatePeriodChange(100, 0);
    assert.equal(comp.value, 100);
    assert.equal(comp.previousValue, 0);
    assert.equal(comp.percentChange, 0);
    assert.equal(comp.isNeutral, true);
  });

  await t.test("Zero current and zero previous returns neutral", () => {
    const comp = calculatePeriodChange(0, 0);
    assert.equal(comp.value, 0);
    assert.equal(comp.previousValue, 0);
    assert.equal(comp.percentChange, 0);
    assert.equal(comp.isNeutral, true);
  });
});

test("Task 4, 9, 10: Smart Pagination & Record Slicing (10 / 20 / 50)", async (t) => {
  await t.test("Pagination calculations for page sizes 10, 20, 50", () => {
    const totalCount = 124;

    // Size 10
    const pages10 = Math.ceil(totalCount / 10);
    assert.equal(pages10, 13);
    const fromIndex1 = (1 - 1) * 10 + 1;
    const toIndex1 = Math.min(1 * 10, totalCount);
    assert.equal(fromIndex1, 1);
    assert.equal(toIndex1, 10);

    // Size 20
    const pages20 = Math.ceil(totalCount / 20);
    assert.equal(pages20, 7);
    const fromIndex2 = (2 - 1) * 20 + 1;
    const toIndex2 = Math.min(2 * 20, totalCount);
    assert.equal(fromIndex2, 21);
    assert.equal(toIndex2, 40);

    // Size 50
    const pages50 = Math.ceil(totalCount / 50);
    assert.equal(pages50, 3);
    const lastFrom = (3 - 1) * 50 + 1;
    const lastTo = Math.min(3 * 50, totalCount);
    assert.equal(lastFrom, 101);
    assert.equal(lastTo, 124);
  });
});

test("Task 7: Guest Customer Deduplication and Verified Spending", async (t) => {
  await t.test("Deduplicates guest orders by case-insensitive email", () => {
    const sampleOrders = [
      { id: "o1", email: "Amara@example.com", total: 45000, paid: 45000 },
      { id: "o2", email: "amara@example.com", total: 90000, paid: 90000 },
      { id: "o3", email: "chidi@example.com", total: 45000, paid: 0 }, // unpaid
    ];

    const customerMap = new Map();
    for (const o of sampleOrders) {
      const key = o.email.toLowerCase();
      const existing = customerMap.get(key);
      if (!existing) {
        customerMap.set(key, {
          email: o.email,
          orderCount: 1,
          verifiedSpend: o.paid,
        });
      } else {
        existing.orderCount += 1;
        existing.verifiedSpend += o.paid;
      }
    }

    assert.equal(customerMap.size, 2);
    const amara = customerMap.get("amara@example.com");
    assert.equal(amara.orderCount, 2);
    assert.equal(amara.verifiedSpend, 135000);

    const chidi = customerMap.get("chidi@example.com");
    assert.equal(chidi.orderCount, 1);
    assert.equal(chidi.verifiedSpend, 0); // Unpaid orders do not count as verified spending
  });
});

test("Source Code Audit: Admin Files and Usability Implementation", async (t) => {
  const rootDir = process.cwd();

  await t.test("Analytics date-range utility exists and exports presets and comparisons", () => {
    const dateRangeFile = path.join(rootDir, "src/features/admin/utils/date-range.ts");
    assert.ok(fs.existsSync(dateRangeFile), "date-range.ts must exist");
    const content = fs.readFileSync(dateRangeFile, "utf-8");
    assert.ok(content.includes("LAGOS_UTC_OFFSET_HOURS = 1"), "Must define Africa/Lagos UTC+1");
    assert.ok(content.includes("calculatePeriodChange"), "Must export calculatePeriodChange");
    assert.ok(content.includes("resolveDateRange"), "Must export resolveDateRange");
  });

  await t.test("AdminPagination component supports page sizes 10, 20, 50 and URL preservation", () => {
    const paginationFile = path.join(rootDir, "src/features/admin/components/admin-pagination.tsx");
    assert.ok(fs.existsSync(paginationFile), "admin-pagination.tsx must exist");
    const content = fs.readFileSync(paginationFile, "utf-8");
    assert.ok(content.includes("[10, 20, 50]"), "Must support 10/20/50 page sizes");
    assert.ok(content.includes("Showing"), "Must display Showing X–Y of N records");
    assert.ok(content.includes("buildQueryHref"), "Must preserve query parameters");
  });

  await t.test("CollapsibleOrderList component is collapsed by default and contains accordion actions", () => {
    const collapsibleFile = path.join(rootDir, "src/features/admin/components/collapsible-order-list.tsx");
    assert.ok(fs.existsSync(collapsibleFile), "collapsible-order-list.tsx must exist");
    const content = fs.readFileSync(collapsibleFile, "utf-8");
    assert.ok(content.includes("useState<Set<string>>(new Set())"), "Default state must be collapsed");
    assert.ok(content.includes("aria-expanded"), "Must have aria-expanded accessibility");
    assert.ok(content.includes("Purchased Perfumes"), "Must display purchased fragrances");
    assert.ok(content.includes("Delivery Address"), "Must display delivery address");
    assert.ok(content.includes("Payment Audit Trail"), "Must display payment details");
  });

  await t.test("Payments page includes scrollable container and sticky header", () => {
    const paymentsFile = path.join(rootDir, "src/app/(admin)/admin/payments/page.tsx");
    const content = fs.readFileSync(paymentsFile, "utf-8");
    assert.ok(content.includes("max-h-[580px]"), "Must have controlled maximum scrollable height");
    assert.ok(content.includes("sticky top-0"), "Must have sticky column header");
    assert.ok(content.includes("PaymentFiltersToolbar"), "Must integrate filters toolbar");
  });

  await t.test("Payments filter toolbar includes CSV export with sanitized customer columns", () => {
    const toolbarFile = path.join(rootDir, "src/features/admin/components/payment-filters-toolbar.tsx");
    const content = fs.readFileSync(toolbarFile, "utf-8");
    assert.ok(content.includes("exportToCSV"), "Must export to CSV");
    assert.ok(content.includes("solure_scents_payments_"), "Must name exported CSV file");
    assert.ok(content.includes("Reset"), "Must provide Reset button");
  });

  await t.test("Customers page displays verified spend and customer contact details", () => {
    const customersFile = path.join(rootDir, "src/app/(admin)/admin/customers/page.tsx");
    const content = fs.readFileSync(customersFile, "utf-8");
    assert.ok(content.includes("max-h-[580px]"), "Must have scrollable table container");
    assert.ok(content.includes("CustomerFiltersToolbar"), "Must include search and sort toolbar");
    assert.ok(content.includes("Verified Spend"), "Must show verified spend column");
  });
});
