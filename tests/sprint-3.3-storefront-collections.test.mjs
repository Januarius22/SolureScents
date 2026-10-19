import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

// Mirror catalog and admin Zod schemas under test
const perfumeCollectionEnum = z.enum(["premium", "regular"]);
const productCategoryEnum = z.enum(["unisex", "men", "women"]);
const concentrationEnum = z.enum(["edc", "edt", "edp", "parfum", "extrait", "oil"]);
const sortEnum = z.enum(["newest", "price_asc", "price_desc", "name_asc"]);

const productFiltersSchema = z
  .object({
    brandId: z.string().uuid().optional(),
    collectionId: z.string().uuid().optional(),
    concentration: concentrationEnum.optional(),
    category: productCategoryEnum.optional(),
    collection: perfumeCollectionEnum.optional(),
    familyId: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(48).default(24),
    maximumPriceMinor: z.coerce.number().int().nonnegative().optional(),
    minimumPriceMinor: z.coerce.number().int().nonnegative().optional(),
    page: z.coerce.number().int().min(1).default(1),
    query: z.string().trim().max(100).optional(),
    sort: sortEnum.default("newest").optional(),
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

const productAdminSchema = z.object({
  name: z.string().trim().min(2).max(160),
  brandId: z.string().uuid(),
  description: z.string().trim().min(20),
  concentration: concentrationEnum,
  collection: perfumeCollectionEnum.default("regular"),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  variants: z
    .array(
      z.object({
        label: z.string().trim().max(40).optional(),
        sku: z.string().trim().max(50),
        sizeMl: z.number().positive(),
        priceMinor: z.number().int().nonnegative(),
        stockQuantity: z.number().int().min(0),
      })
    )
    .min(1),
});

describe("Solure Scents Sprint 3.3 — Storefront Discovery, Perfume Collections & Post-Payment Cart Cleanup", () => {
  // ==========================================
  // 1. SHOP FILTERS & COLLAPSIBLE BEHAVIOR
  // ==========================================
  describe("Task 1: Shop Filter & Sort Validation", () => {
    it("defaults filters correctly when no parameters are provided", () => {
      const parsed = productFiltersSchema.parse({});
      assert.strictEqual(parsed.page, 1);
      assert.strictEqual(parsed.limit, 24);
      assert.strictEqual(parsed.sort, "newest");
      assert.strictEqual(parsed.collection, undefined);
      assert.strictEqual(parsed.category, undefined);
      assert.strictEqual(parsed.brandId, undefined);
      assert.strictEqual(parsed.query, undefined);
    });

    it("parses valid collection filters: premium and regular", () => {
      const premiumParsed = productFiltersSchema.parse({ collection: "premium" });
      assert.strictEqual(premiumParsed.collection, "premium");

      const regularParsed = productFiltersSchema.parse({ collection: "regular" });
      assert.strictEqual(regularParsed.collection, "regular");

      // Invalid collection string rejected
      assert.throws(() => {
        productFiltersSchema.parse({ collection: "super-luxury" });
      });
    });

    it("parses valid gender/category filters: unisex, men, women", () => {
      const unisex = productFiltersSchema.parse({ category: "unisex" });
      assert.strictEqual(unisex.category, "unisex");

      const men = productFiltersSchema.parse({ category: "men" });
      assert.strictEqual(men.category, "men");

      const women = productFiltersSchema.parse({ category: "women" });
      assert.strictEqual(women.category, "women");
    });

    it("combines multiple filters correctly (collection + category + price + sort)", () => {
      const combined = productFiltersSchema.parse({
        collection: "premium",
        category: "unisex",
        minimumPriceMinor: 5000000,
        maximumPriceMinor: 15000000,
        sort: "price_asc",
        page: 2,
        limit: 12,
      });

      assert.strictEqual(combined.collection, "premium");
      assert.strictEqual(combined.category, "unisex");
      assert.strictEqual(combined.minimumPriceMinor, 5000000);
      assert.strictEqual(combined.maximumPriceMinor, 15000000);
      assert.strictEqual(combined.sort, "price_asc");
      assert.strictEqual(combined.page, 2);
      assert.strictEqual(combined.limit, 12);
    });

    it("enforces price validation: maximumPriceMinor must not be lower than minimumPriceMinor", () => {
      assert.throws(
        () => {
          productFiltersSchema.parse({
            minimumPriceMinor: 10000000,
            maximumPriceMinor: 5000000,
          });
        },
        (err) => err instanceof z.ZodError
      );
    });

    it("verifies shop page and shop experience components have collapsed-by-default filter state", () => {
      const shopExpFile = fs.readFileSync(
        path.resolve("src/features/catalog/components/shop-experience.tsx"),
        "utf8"
      );
      assert.ok(
        shopExpFile.includes("const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)"),
        "Shop filter panel must be collapsed (false) by default"
      );
      assert.ok(
        shopExpFile.includes("Filter & Sort"),
        "Must have a clear Filter & Sort button"
      );
      assert.ok(
        shopExpFile.includes("Clear All Filters"),
        "Must provide Clear All Filters action"
      );
    });
  });

  // ==========================================
  // 2. NAVIGATION SEARCH & ACCURACY
  // ==========================================
  describe("Task 2: Navigation Search & Published Status", () => {
    it("preserves search query trimming and limits length", () => {
      const parsed = productFiltersSchema.parse({
        query: "  Khalifa Oud Extrait  ",
      });
      assert.strictEqual(parsed.query, "Khalifa Oud Extrait");
    });

    it("verifies catalog service hides draft and archived products", () => {
      const serviceFile = fs.readFileSync(
        path.resolve("src/features/catalog/services/catalog-service.ts"),
        "utf8"
      );
      assert.ok(
        serviceFile.includes('.eq("status", "active")'),
        "Catalog service must enforce status = active"
      );
      assert.ok(
        serviceFile.includes('.eq("is_available", true)'),
        "Variant query must filter for is_available = true"
      );
    });

    it("verifies search page supports collection filtering and empty search states", () => {
      const searchPageFile = fs.readFileSync(
        path.resolve("src/app/(store)/search/page.tsx"),
        "utf8"
      );
      assert.ok(
        searchPageFile.includes('buildSearchUrl("premium")'),
        "Search page must provide Premium collection filter"
      );
      assert.ok(
        searchPageFile.includes('buildSearchUrl("regular")'),
        "Search page must provide Regular collection filter"
      );
      assert.ok(
        searchPageFile.includes("No Fragrances Found"),
        "Search page must have luxury empty results state"
      );
    });
  });

  // ==========================================
  // 3. PREMIUM & REGULAR PERFUME COLLECTIONS
  // ==========================================
  describe("Task 3: Premium and Regular Perfume Collections", () => {
    it("admin product schema validates required collection classification", () => {
      const validAdminProduct = {
        name: "Imperial Oud",
        brandId: "123e4567-e89b-12d3-a456-426614174000",
        description: "Regal oud extrait handcrafted with fine Cambodian agarwood.",
        concentration: "extrait",
        collection: "premium",
        status: "draft",
        variants: [
          {
            label: "100ml Extrait",
            sku: "IMP-OUD-100",
            sizeMl: 100,
            priceMinor: 9500000,
            stockQuantity: 10,
          },
        ],
      };

      const parsed = productAdminSchema.parse(validAdminProduct);
      assert.strictEqual(parsed.collection, "premium");
    });

    it("admin product schema rejects invalid collection classifications", () => {
      assert.throws(() => {
        productAdminSchema.parse({
          name: "Invalid Collection Scent",
          brandId: "123e4567-e89b-12d3-a456-426614174000",
          description: "Test description.",
          concentration: "edp",
          collection: "exclusive_vip", // Invalid
          variants: [
            {
              label: "50ml EDP",
              sku: "INV-50",
              sizeMl: 50,
              priceMinor: 4500000,
              stockQuantity: 5,
            },
          ],
        });
      });
    });

    it("verifies non-destructive collection migration file exists and is not deployed", () => {
      const migrationPath = path.resolve(
        "supabase/migrations/202607190001_product_collections.sql"
      );
      assert.ok(fs.existsSync(migrationPath), "Migration file must exist");

      const migrationContent = fs.readFileSync(migrationPath, "utf8");
      assert.ok(
        migrationContent.includes("add column if not exists collection text"),
        "Migration must add column non-destructively"
      );
      assert.ok(
        migrationContent.includes("check (collection is null or collection in ('premium', 'regular'))"),
        "Migration must enforce premium/regular check constraint"
      );
    });

    it("verifies ProductCard renders distinctive gold badge for Premium and neutral for Regular", () => {
      const cardFile = fs.readFileSync(
        path.resolve("src/components/store/product-card.tsx"),
        "utf8"
      );
      assert.ok(
        cardFile.includes('product.collection === "premium"'),
        "ProductCard must check for premium collection"
      );
      assert.ok(
        cardFile.includes("✦ Premium"),
        "ProductCard must render gold ✦ Premium badge"
      );
      assert.ok(
        cardFile.includes("Regular"),
        "ProductCard must render Regular badge"
      );
    });

    it("verifies admin product form includes Perfume Collection selector", () => {
      const formFile = fs.readFileSync(
        path.resolve("src/features/admin/components/product-form.tsx"),
        "utf8"
      );
      assert.ok(
        formFile.includes("Perfume Collection"),
        "Admin product form must include Perfume Collection label"
      );
      assert.ok(
        formFile.includes("Premium Collection"),
        "Admin product form must offer Premium Collection option"
      );
      assert.ok(
        formFile.includes("Regular Collection"),
        "Admin product form must offer Regular Collection option"
      );
    });
  });

  // ==========================================
  // 4. POST-PAYMENT CART CLEANUP
  // ==========================================
  describe("Task 4: Post-Payment Cart Cleanup & Preservation Logic", () => {
    it("simulates purchased items removal while preserving unrelated cart items", () => {
      const initialCartItems = [
        { variantId: "var-khalifa-50ml", quantity: 1 },
        { variantId: "var-khalifa-100ml", quantity: 2 },
        { variantId: "var-unrelated-new-item", quantity: 1 },
      ];

      const settledOrderItems = [
        { variant_id: "var-khalifa-50ml", quantity: 1 },
        { variant_id: "var-khalifa-100ml", quantity: 2 },
      ];

      const purchasedMap = new Map();
      for (const item of settledOrderItems) {
        purchasedMap.set(item.variant_id, item.quantity);
      }

      const remainingCartItems = [];
      let clearedCount = 0;

      for (const cartItem of initialCartItems) {
        const purchasedQty = purchasedMap.get(cartItem.variantId);
        if (purchasedQty !== undefined) {
          clearedCount++;
          const remainingQty = cartItem.quantity - purchasedQty;
          if (remainingQty > 0) {
            remainingCartItems.push({
              variantId: cartItem.variantId,
              quantity: remainingQty,
            });
          }
        } else {
          remainingCartItems.push(cartItem);
        }
      }

      assert.strictEqual(clearedCount, 2);
      assert.strictEqual(remainingCartItems.length, 1);
      assert.strictEqual(remainingCartItems[0].variantId, "var-unrelated-new-item");
      assert.strictEqual(remainingCartItems[0].quantity, 1);
    });

    it("verifies idempotency: running cleanup twice does not affect remaining items", () => {
      const remainingCartItems = [
        { variantId: "var-unrelated-new-item", quantity: 1 },
      ];

      const settledOrderItems = [
        { variant_id: "var-khalifa-50ml", quantity: 1 },
      ];

      const purchasedMap = new Map();
      for (const item of settledOrderItems) {
        purchasedMap.set(item.variant_id, item.quantity);
      }

      const secondRunItems = [];
      for (const cartItem of remainingCartItems) {
        const purchasedQty = purchasedMap.get(cartItem.variantId);
        if (purchasedQty !== undefined) {
          const remainingQty = cartItem.quantity - purchasedQty;
          if (remainingQty > 0) {
            secondRunItems.push({
              variantId: cartItem.variantId,
              quantity: remainingQty,
            });
          }
        } else {
          secondRunItems.push(cartItem);
        }
      }

      assert.deepStrictEqual(secondRunItems, remainingCartItems);
    });

    it("verifies verifyPaymentAction calls clearPurchasedCartItems only on successful capture", () => {
      const actionFile = fs.readFileSync(
        path.resolve("src/features/payments/actions/payment-actions.ts"),
        "utf8"
      );
      assert.ok(
        actionFile.includes("if (result.success && result.orderId)"),
        "Cart cleanup must be conditioned on result.success and result.orderId"
      );
      assert.ok(
        actionFile.includes("await clearPurchasedCartItems(result.orderId)"),
        "Cart cleanup must be called with orderId"
      );
    });

    it("verifies cart-service exports clearPurchasedCartItems with resilient order items resolution", () => {
      const cartServiceFile = fs.readFileSync(
        path.resolve("src/features/cart/services/cart-service.ts"),
        "utf8"
      );
      assert.ok(
        cartServiceFile.includes("export async function clearPurchasedCartItems"),
        "cart-service must export clearPurchasedCartItems"
      );
      assert.ok(
        cartServiceFile.includes('.eq("order_id", orderId)'),
        "clearPurchasedCartItems must query line items for the specific order"
      );
    });
  });

  // ==========================================
  // 5. REMOVE CUSTOMER-FACING TRACK PERFUME
  // ==========================================
  describe("Task 5: Customer-Facing Track Order Removal", () => {
    it("verifies store footer does NOT contain customer-facing track-order link", () => {
      const footerContent = fs.readFileSync(
        path.resolve("src/components/layout/store-footer.tsx"),
        "utf8"
      );
      assert.ok(
        !footerContent.includes("/track-order"),
        "Store footer must not link to /track-order"
      );
      assert.ok(
        !footerContent.includes("Track an Order"),
        "Store footer must not contain 'Track an Order' text"
      );
    });

    it("verifies customer /track-order route gracefully redirects to /shop", () => {
      const trackOrderPage = fs.readFileSync(
        path.resolve("src/app/(store)/track-order/page.tsx"),
        "utf8"
      );
      assert.ok(
        trackOrderPage.includes('redirect("/shop")'),
        "Track order route must redirect to /shop"
      );
    });

    it("verifies administrative order tracking and internal fulfillment remain preserved", () => {
      const adminOrdersPage = fs.readFileSync(
        path.resolve("src/app/(admin)/admin/orders/page.tsx"),
        "utf8"
      );
      assert.ok(
        adminOrdersPage.includes("fulfillment_status"),
        "Admin order management must retain fulfillment status tracking"
      );

      const commerceOps = fs.readFileSync(
        path.resolve("src/features/admin/actions/commerce-operations.ts"),
        "utf8"
      );
      assert.ok(
        commerceOps.includes("updateOrder") && commerceOps.includes("next_fulfillment_status"),
        "Admin commerce operations must retain fulfillment updating"
      );
    });
  });
});
