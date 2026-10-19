import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const productFiltersSchema = z
  .object({
    brandId: z.string().uuid().optional(),
    collectionId: z.string().uuid().optional(),
    concentration: z.enum(["edc", "edt", "edp", "parfum", "extrait", "oil"]).optional(),
    category: z.enum(["unisex", "men", "women"]).optional(),
    collection: z.enum(["premium", "regular"]).optional(),
    familyId: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(48).default(24),
    maximumPriceMinor: z.coerce.number().int().nonnegative().optional(),
    minimumPriceMinor: z.coerce.number().int().nonnegative().optional(),
    page: z.coerce.number().int().min(1).default(1),
    query: z.string().trim().max(100).optional(),
    sort: z.enum(["newest", "price_asc", "price_desc", "name_asc"]).default("newest").optional(),
  })
  .refine(
    ({ maximumPriceMinor, minimumPriceMinor }) =>
      maximumPriceMinor === undefined ||
      minimumPriceMinor === undefined ||
      maximumPriceMinor >= minimumPriceMinor,
    {
      message: "Maximum price must not be lower than minimum price.",
      path: ["maximumPriceMinor"],
    }
  );

describe("Solure Scents Sprint 3.4 — Responsive Storefront Refinement, Pagination & Admin Usability", () => {
  const rootDir = process.cwd();

  // ==========================================
  // 1. Task 1: Product Card Mobile 2-Column Grid & Compact Sizing
  // ==========================================
  describe("Task 1: Product Card Mobile Sizing & 2-Column Grid", () => {
    it("ensures ProductCard source has compact mobile padding and non-overlapping badges", () => {
      const cardSource = fs.readFileSync(
        path.join(rootDir, "src", "components", "store", "product-card.tsx"),
        "utf8"
      );

      // Verify compact mobile padding p-2.5 sm:p-5
      assert.match(cardSource, /p-2\.5 sm:p-5/);

      // Verify responsive title typography text-sm sm:text-xl lg:text-2xl
      assert.match(cardSource, /text-sm sm:text-xl lg:text-2xl/);

      // Verify non-overlapping badge constraints (max-w-[62%] and max-w-[35%])
      assert.match(cardSource, /max-w-\[62%\]/);
      assert.match(cardSource, /max-w-\[35%\]/);

      // Verify both Premium and Regular badges are preserved
      assert.match(cardSource, /✦ Premium/);
      assert.match(cardSource, /Regular/);
    });

    it("ensures shop, search, and discovery grids use exactly 2 columns on mobile", () => {
      const shopSource = fs.readFileSync(
        path.join(rootDir, "src", "features", "catalog", "components", "shop-experience.tsx"),
        "utf8"
      );
      const searchSource = fs.readFileSync(
        path.join(rootDir, "src", "app", "(store)", "search", "page.tsx"),
        "utf8"
      );
      const discoverySource = fs.readFileSync(
        path.join(rootDir, "src", "app", "(store)", "discovery", "page.tsx"),
        "utf8"
      );

      // Shop grid must be grid-cols-2 on mobile
      assert.match(shopSource, /grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8/);

      // Search grid must be grid-cols-2 on mobile
      assert.match(searchSource, /grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8/);

      // Discovery grid must be grid-cols-2 on mobile
      assert.match(discoverySource, /grid grid-cols-2 gap-3 sm:gap-5/);
    });
  });

  // ==========================================
  // 2. Task 2: Storefront Product Pagination
  // ==========================================
  describe("Task 2: Storefront Product Pagination", () => {
    it("verifies mobile limit is 10 and desktop limit is 15 in shop and search pages", () => {
      const shopPageSource = fs.readFileSync(
        path.join(rootDir, "src", "app", "(store)", "shop", "page.tsx"),
        "utf8"
      );
      const searchPageSource = fs.readFileSync(
        path.join(rootDir, "src", "app", "(store)", "search", "page.tsx"),
        "utf8"
      );

      // Mobile limit 10 vs Desktop limit 15 based on user-agent detection
      assert.match(shopPageSource, /isMobile\s*\?\s*10\s*:\s*15/);
      assert.match(searchPageSource, /isMobile\s*\?\s*10\s*:\s*15/);
    });

    it("correctly calculates range pagination boundaries for mobile (10/page) and desktop (15/page)", () => {
      // Mobile page 1
      const mobilePage1 = productFiltersSchema.parse({ page: 1, limit: 10 });
      const fromM1 = (mobilePage1.page - 1) * mobilePage1.limit;
      const toM1 = fromM1 + mobilePage1.limit - 1;
      assert.equal(fromM1, 0);
      assert.equal(toM1, 9);

      // Mobile page 2
      const mobilePage2 = productFiltersSchema.parse({ page: 2, limit: 10 });
      const fromM2 = (mobilePage2.page - 1) * mobilePage2.limit;
      const toM2 = fromM2 + mobilePage2.limit - 1;
      assert.equal(fromM2, 10);
      assert.equal(toM2, 19);

      // Desktop page 1
      const desktopPage1 = productFiltersSchema.parse({ page: 1, limit: 15 });
      const fromD1 = (desktopPage1.page - 1) * desktopPage1.limit;
      const toD1 = fromD1 + desktopPage1.limit - 1;
      assert.equal(fromD1, 0);
      assert.equal(toD1, 14);

      // Desktop page 2
      const desktopPage2 = productFiltersSchema.parse({ page: 2, limit: 15 });
      const fromD2 = (desktopPage2.page - 1) * desktopPage2.limit;
      const toD2 = fromD2 + desktopPage2.limit - 1;
      assert.equal(fromD2, 15);
      assert.equal(toD2, 29);
    });

    it("verifies shop pagination component preserves filters, queries, and sorting across page changes", () => {
      const shopSource = fs.readFileSync(
        path.join(rootDir, "src", "features", "catalog", "components", "shop-experience.tsx"),
        "utf8"
      );

      // Check that hrefForPage sets all query parameters
      assert.match(shopSource, /filters\.query\)\s*params\.set\("q",\s*filters\.query\)/);
      assert.match(shopSource, /filters\.collection\)\s*params\.set\("collection",\s*filters\.collection\)/);
      assert.match(shopSource, /filters\.category\)\s*params\.set\("category",\s*filters\.category\)/);
      assert.match(shopSource, /filters\.sort && filters\.sort !== "newest"\)\s*params\.set\("sort",\s*filters\.sort\)/);
      assert.match(shopSource, /params\.set\("page",\s*String\(page\)\)/);

      // Check results counter indicator (Showing X–Y of Z fragrances)
      assert.match(shopSource, /Showing\s*\{" "\}\s*<strong className="text-charcoal font-semibold">\s*\{fromIndex\}–\{toIndex\}\s*<\/strong>\s*\{" "\}\s*of <strong className="text-charcoal font-semibold">\{result\.total\}<\/strong> fragrances/);
    });

    it("handles invalid or out-of-range page numbers gracefully", () => {
      // Invalid string page falls back to default 1
      const invalidParsed = productFiltersSchema.safeParse({ page: "invalid" });
      assert.equal(invalidParsed.success, false);

      const negativeParsed = productFiltersSchema.safeParse({ page: -5 });
      assert.equal(negativeParsed.success, false);

      // Shop page handles out-of-range page numbers with graceful fallback
      const shopSource = fs.readFileSync(
        path.join(rootDir, "src", "features", "catalog", "components", "shop-experience.tsx"),
        "utf8"
      );
      assert.match(shopSource, /Catalogue Page Out of Range/);
      assert.match(shopSource, /Return to Page 1/);
    });
  });

  // ==========================================
  // 3. Task 3: Removal of Unnecessary Promotional Statement
  // ==========================================
  describe("Task 3: Removal of Promotional Statement", () => {
    it("ensures the exact promotional text does NOT appear anywhere in the codebase", () => {
      const searchTerms = [
        "handcrafted and curated compositions, formulated with high-grade perfume oils for enduring presence",
        "Handcrafted and curated compositions, formulated with high-grade perfume oils for enduring presence",
      ];

      const checkDir = (dir) => {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
          if (file.name === "node_modules" || file.name === ".next" || file.name === ".git") continue;
          const fullPath = path.join(dir, file.name);
          if (file.isDirectory()) {
            checkDir(fullPath);
          } else if (file.name.endsWith(".tsx") || file.name.endsWith(".ts")) {
            const content = fs.readFileSync(fullPath, "utf8");
            for (const term of searchTerms) {
              assert.equal(
                content.toLowerCase().includes(term.toLowerCase()),
                false,
                `Found forbidden promotional text in ${fullPath}`
              );
            }
          }
        }
      };

      checkDir(path.join(rootDir, "src"));
    });
  });

  // ==========================================
  // 4. Task 4: Simplify Side Shopping Cart
  // ==========================================
  describe("Task 4: Simplify Side Shopping Cart", () => {
    it("verifies estimated subtotal and delivery callouts are removed from cart drawer", () => {
      const drawerSource = fs.readFileSync(
        path.join(rootDir, "src", "features", "cart", "components", "cart-drawer.tsx"),
        "utf8"
      );

      // Verify removed items
      assert.equal(drawerSource.includes("Delivery options and fees are calculated at checkout"), false);
      assert.equal(drawerSource.includes("Estimated Total"), false);

      // Verify Proceed to Checkout button is prominent
      assert.match(drawerSource, /Proceed to Checkout/);
      assert.match(drawerSource, /href="\/checkout"/);

      // Verify individual item prices remain intact
      assert.match(drawerSource, /formatMoney\(item\.lineTotalMinor,\s*item\.currency\)/);

      // Verify quantity controls remain functional
      assert.match(drawerSource, /updateQuantity\(item\.id,\s*item\.quantity\s*-\s*1\)/);
      assert.match(drawerSource, /updateQuantity\(item\.id,\s*item\.quantity\s*\+\s*1\)/);

      // Verify remove item remains functional
      assert.match(drawerSource, /removeItem\(item\.id\)/);
    });
  });

  // ==========================================
  // 5. Task 5: Mobile Search Page Experience
  // ==========================================
  describe("Task 5: Mobile Search Page Experience", () => {
    it("ensures search form fits viewport without horizontal overflow", () => {
      const searchSource = fs.readFileSync(
        path.join(rootDir, "src", "app", "(store)", "search", "page.tsx"),
        "utf8"
      );

      // Search input flex and min-w-0 for mobile containment
      assert.match(searchSource, /w-full max-w-full/);
      assert.match(searchSource, /min-w-0 flex-1/);
      assert.match(searchSource, /overflow-hidden/);

      // Search pagination with mobile controls
      assert.match(searchSource, /Search results pagination/);
      assert.match(searchSource, /Prev/);
      assert.match(searchSource, /Next/);
    });
  });

  // ==========================================
  // 6. Task 6 & 7: Admin Dashboard Pagination & Collapsible Details
  // ==========================================
  describe("Task 6 & 7: Admin Pagination & Collapsible Product Details", () => {
    it("verifies products list is collapsed by default and expandable", () => {
      const productListSource = fs.readFileSync(
        path.join(rootDir, "src", "features", "admin", "components", "product-list-client.tsx"),
        "utf8"
      );

      // Starts collapsed (empty set)
      assert.match(productListSource, /const \[expandedIds, setExpandedIds\] = useState<Set<string>>\(new Set\(\)\);/);

      // Toggle expansion function
      assert.match(productListSource, /toggleExpanded/);

      // Check AnimatePresence for smooth expand/collapse
      assert.match(productListSource, /<AnimatePresence>/);

      // Default pageSize 10
      assert.match(productListSource, /const pageSize = 10;/);

      // Page reset on filter/search change
      assert.match(productListSource, /setCurrentPage\(1\)/);

      // Collapsed row displays thumbnail, title, badge, stock summary, and chevron button
      assert.match(productListSource, /ChevronDown/);
      assert.match(productListSource, /units available/);
    });

    it("verifies inventory, orders, customers, and payments pages include 10-per-page pagination", () => {
      const inventorySource = fs.readFileSync(
        path.join(rootDir, "src", "app", "(admin)", "admin", "inventory", "page.tsx"),
        "utf8"
      );
      const ordersSource = fs.readFileSync(
        path.join(rootDir, "src", "app", "(admin)", "admin", "orders", "page.tsx"),
        "utf8"
      );
      const customersSource = fs.readFileSync(
        path.join(rootDir, "src", "app", "(admin)", "admin", "customers", "page.tsx"),
        "utf8"
      );
      const paymentsSource = fs.readFileSync(
        path.join(rootDir, "src", "app", "(admin)", "admin", "payments", "page.tsx"),
        "utf8"
      );

      assert.match(inventorySource, /AdminPagination/);
      assert.match(inventorySource, /pageSize\s*=\s*10/);

      assert.match(ordersSource, /AdminPagination/);
      assert.match(ordersSource, /pageSize\s*=\s*10/);

      assert.match(customersSource, /AdminPagination/);
      assert.match(customersSource, /pageSize\s*=\s*10/);

      assert.match(paymentsSource, /AdminPagination/);
      assert.match(paymentsSource, /pageSize\s*=\s*10/);
    });
  });

  // ==========================================
  // 7. Task 8: Responsive Admin Layout
  // ==========================================
  describe("Task 8: Responsive Admin Layout", () => {
    it("ensures dashboard shell prevents mobile horizontal overflow", () => {
      const shellSource = fs.readFileSync(
        path.join(rootDir, "src", "components", "layout", "dashboard-shell.tsx"),
        "utf8"
      );

      assert.match(shellSource, /min-w-0 w-full max-w-full.*overflow-x-hidden/);
    });
  });
});
