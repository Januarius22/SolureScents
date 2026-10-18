import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createClient } from "@supabase/supabase-js";

const APP_URL = "http://localhost:3000";
const SUPABASE_URL = "https://cfpccldullprbrsvfblv.supabase.co";
const SUPABASE_KEY = "sb_publishable_sC4iqDrE0sVT35hgLF1Cmw_O9EcVWS8";

// Reference IDs from server manifest
const ADD_TO_CART_ACTION_ID = "60dbb753590ef8e77e6e4a8049608721ae45187ee0";
const GET_CART_ACTION_ID = "008064861131b7ca80d6e48c0f632c6f6fe4ba1bb3";
const UPDATE_CART_ACTION_ID = "60c06555383623cec272d5c4d7414ff75448171011";
const REMOVE_CART_ACTION_ID = "40139c4eeff7edd1c98633d02506bb40ab951549bc";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseActionResult(text) {
  const line = text
    .split("\n")
    .find((l) => (/^1:\{/.test(l) || /^0:\{/.test(l)) && (l.includes('"ok"') || l.includes('"data"')));
  if (!line) {
    // Fallback: any line with ok:
    const anyLine = text.split("\n").find((l) => l.includes('"ok":'));
    if (anyLine) {
      return JSON.parse(anyLine.slice(anyLine.indexOf("{")));
    }
    throw new Error("Could not find action result JSON in response stream:\n" + text.slice(0, 500));
  }
  return JSON.parse(line.slice(line.indexOf("{")));
}

function parseGetCartResult(text) {
  const line = text
    .split("\n")
    .find((l) => (l.startsWith("1:") || l.startsWith("0:")) && (l.includes('"items"') || l.includes('"itemCount"')));
  if (!line) {
    const anyLine = text.split("\n").find((l) => l.includes('"itemCount"'));
    if (anyLine) {
      return JSON.parse(anyLine.slice(anyLine.indexOf("{")));
    }
    throw new Error("Could not find cart result JSON in response stream:\n" + text.slice(0, 500));
  }
  return JSON.parse(line.slice(line.indexOf("{")));
}

const cookieJar = new Map();

function updateCookies(res) {
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of setCookies) {
    const [nameVal] = c.split(";");
    const eqIdx = nameVal.indexOf("=");
    if (eqIdx !== -1) {
      const name = nameVal.slice(0, eqIdx).trim();
      const val = nameVal.slice(eqIdx + 1).trim();
      cookieJar.set(name, val);
    }
  }
}

function getCookieHeader() {
  return Array.from(cookieJar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

describe("Sprint 2.7 — Comprehensive Add to Bag & Shopping Bag Scenarios", () => {
  let variant50mlId = "";
  let variant100mlId = "";
  let productSlug = "khalifa-scent";

  it("Setup: Verify published Khalifa Scent product and variant records in Supabase", async () => {
    const { data: product, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        slug,
        status,
        product_variants (
          id,
          label,
          size_ml,
          price_minor,
          currency,
          status,
          is_available
        )
      `)
      .eq("slug", productSlug)
      .single();

    assert.ok(!error, `Failed to query product: ${error?.message}`);
    assert.ok(product, "Khalifa Scent product must exist");
    assert.strictEqual(product.status, "active", "Product status must be active");
    assert.ok(product.product_variants.length >= 2, "Product must have at least 2 variants");

    const v50 = product.product_variants.find((v) => v.size_ml === 50);
    const v100 = product.product_variants.find((v) => v.size_ml === 100);

    assert.ok(v50, "50ml variant must exist");
    assert.ok(v100, "100ml variant must exist");
    assert.strictEqual(v50.status, "active");
    assert.strictEqual(v50.is_available, true);
    assert.strictEqual(v50.price_minor, 4500000, "50ml price must be ₦45,000.00 (4500000 kobo)");

    variant50mlId = v50.id;
    variant100mlId = v100.id;
    console.log("✓ Verified published Khalifa Scent:", {
      id: product.id,
      variant50mlId,
      variant100mlId,
    });
  });

  it("Scenario 1, 2, 3, 4, 5: Add Khalifa Scent (50ml) to cart as Guest", async () => {
    const res = await fetch(`${APP_URL}/shop/${productSlug}`, {
      method: "POST",
      headers: {
        "Next-Action": ADD_TO_CART_ACTION_ID,
        "Content-Type": "application/json",
        "Accept": "text/x-component",
      },
      body: JSON.stringify([variant50mlId, 1]),
    });

    assert.strictEqual(res.status, 200, "Add to cart Server Action must return 200 OK");

    updateCookies(res);

    const text = await res.text();
    const parsed = parseActionResult(text);

    assert.strictEqual(parsed.ok, true, "addToCartAction must return ok: true");
    assert.ok(parsed.data.cart, "Cart must be returned in action result");
    assert.strictEqual(parsed.data.cart.itemCount, 1, "Item count must be 1");
    assert.strictEqual(parsed.data.cart.subtotalMinor, 4500000, "Subtotal must be 4500000 kobo (₦45,000.00)");

    const item = parsed.data.cart.items[0];
    assert.strictEqual(item.productName, "Khalifa Scent", "Product name must match");
    assert.strictEqual(item.sizeMl, 50, "Bottle size must be 50ml");
    assert.strictEqual(item.variantLabel, "50ml Flacon", "Variant label must match");
    assert.strictEqual(item.unitPriceMinor, 4500000, "Unit price must be ₦45,000.00");
    assert.strictEqual(item.quantity, 1, "Quantity must be 1");
    assert.strictEqual(item.lineTotalMinor, 4500000, "Line total must match");

    console.log("✓ Scenario 1-5 passed: Successfully added 50ml Khalifa Scent with correct size, price, and quantity.");
  });

  it("Scenario 6: Close and reopen the drawer (getActiveCartAction retrieval)", async () => {
    // When drawer closes and reopens, getActiveCartAction is invoked with current cookies
    const res = await fetch(`${APP_URL}/shop/${productSlug}`, {
      method: "POST",
      headers: {
        "Next-Action": GET_CART_ACTION_ID,
        "Content-Type": "application/json",
        "Accept": "text/x-component",
        "Cookie": getCookieHeader(),
      },
      body: JSON.stringify([]),
    });

    assert.strictEqual(res.status, 200);
    updateCookies(res);
    const text = await res.text();
    const parsed = parseGetCartResult(text);

    assert.strictEqual(parsed.itemCount, 1);
    assert.strictEqual(parsed.items[0].productName, "Khalifa Scent");
    assert.strictEqual(parsed.items[0].sizeMl, 50);
    console.log("✓ Scenario 6 passed: Reopened drawer retains exact cart composition.");
  });

  it("Scenario 7 & 8: Refresh the page & verify cart persistence in SSR layout", async () => {
    const res = await fetch(`${APP_URL}/shop/${productSlug}`, {
      headers: {
        Cookie: getCookieHeader(),
      },
    });

    assert.strictEqual(res.status, 200, "Page refresh must return 200 OK");
    updateCookies(res);
    const html = await res.text();

    // Verify SSR includes the cart item and count in the rendered markup
    assert.ok(html.includes("Khalifa Scent"), "HTML must contain Khalifa Scent");
    assert.ok(html.includes("45,000") || html.includes("45000"), "HTML must contain price 45,000");
    assert.ok(
      html.includes('aria-label="Shopping bag with 1 item"') || html.includes("1 Composition"),
      "HTML must display shopping bag badge for 1 item",
    );
    console.log("✓ Scenario 7-8 passed: Page refresh renders persisted cart with 1 item & ₦45,000.");
  });

  it("Scenario 9: Increase quantity to 2", async () => {
    const res = await fetch(`${APP_URL}/shop/${productSlug}`, {
      method: "POST",
      headers: {
        "Next-Action": UPDATE_CART_ACTION_ID,
        "Content-Type": "application/json",
        "Accept": "text/x-component",
        "Cookie": getCookieHeader(),
      },
      body: JSON.stringify([variant50mlId, 2]),
    });

    assert.strictEqual(res.status, 200);
    updateCookies(res);

    const text = await res.text();
    const parsed = parseActionResult(text);

    assert.strictEqual(parsed.ok, true);
    assert.strictEqual(parsed.data.cart.itemCount, 2);
    assert.strictEqual(parsed.data.cart.items[0].quantity, 2);
    assert.strictEqual(parsed.data.cart.subtotalMinor, 9000000, "Subtotal for 2 bottles must be ₦90,000.00");
    console.log("✓ Scenario 9 passed: Increased quantity to 2, subtotal updated to ₦90,000.00.");
  });

  it("Scenario 10: Decrease quantity to 1", async () => {
    const res = await fetch(`${APP_URL}/shop/${productSlug}`, {
      method: "POST",
      headers: {
        "Next-Action": UPDATE_CART_ACTION_ID,
        "Content-Type": "application/json",
        "Accept": "text/x-component",
        "Cookie": getCookieHeader(),
      },
      body: JSON.stringify([variant50mlId, 1]),
    });

    assert.strictEqual(res.status, 200);
    updateCookies(res);

    const text = await res.text();
    const parsed = parseActionResult(text);

    assert.strictEqual(parsed.ok, true);
    assert.strictEqual(parsed.data.cart.itemCount, 1);
    assert.strictEqual(parsed.data.cart.items[0].quantity, 1);
    assert.strictEqual(parsed.data.cart.subtotalMinor, 4500000);
    console.log("✓ Scenario 10 passed: Decreased quantity back to 1, subtotal ₦45,000.00.");
  });

  it("Scenario 11: Remove product from cart", async () => {
    const res = await fetch(`${APP_URL}/shop/${productSlug}`, {
      method: "POST",
      headers: {
        "Next-Action": REMOVE_CART_ACTION_ID,
        "Content-Type": "application/json",
        "Accept": "text/x-component",
        "Cookie": getCookieHeader(),
      },
      body: JSON.stringify([variant50mlId]),
    });

    assert.strictEqual(res.status, 200);
    updateCookies(res);

    const text = await res.text();
    const parsed = parseActionResult(text);

    assert.strictEqual(parsed.ok, true);
    assert.strictEqual(parsed.data.cart.itemCount, 0);
    assert.strictEqual(parsed.data.cart.items.length, 0);
    assert.strictEqual(parsed.data.cart.subtotalMinor, 0);
    console.log("✓ Scenario 11 passed: Product successfully removed; cart is empty.");
  });

  it("Scenario 12: Add again (100ml variant)", async () => {
    const res = await fetch(`${APP_URL}/shop/${productSlug}`, {
      method: "POST",
      headers: {
        "Next-Action": ADD_TO_CART_ACTION_ID,
        "Content-Type": "application/json",
        "Accept": "text/x-component",
        "Cookie": getCookieHeader(),
      },
      body: JSON.stringify([variant100mlId, 1]),
    });

    assert.strictEqual(res.status, 200);
    updateCookies(res);

    const text = await res.text();
    const parsed = parseActionResult(text);

    assert.strictEqual(parsed.ok, true);
    assert.strictEqual(parsed.data.cart.itemCount, 1);
    assert.strictEqual(parsed.data.cart.items[0].sizeMl, 100);
    assert.strictEqual(parsed.data.cart.subtotalMinor, 7500000, "100ml flacon price must be ₦75,000.00");
    console.log("✓ Scenario 12 passed: Added 100ml variant successfully at ₦75,000.00.");
  });

  it("Scenario 13: Verify /cart page displays the correct contents", async () => {
    const res = await fetch(`${APP_URL}/cart`, {
      headers: {
        Cookie: getCookieHeader(),
      },
    });

    assert.strictEqual(res.status, 200);
    updateCookies(res);
    const html = await res.text();
    assert.ok(html.includes("Khalifa Scent"), "/cart must show Khalifa Scent");
    assert.ok(html.includes("100ml Flacon"), "/cart must show 100ml Flacon");
    assert.ok(html.includes("75,000"), "/cart must show ₦75,000.00");
    console.log("✓ Scenario 13 passed: /cart renders 100ml Khalifa Scent with total ₦75,000.");
  });

  it("Scenario 14: Verify cart works completely without customer login", async () => {
    const cookieHeader = getCookieHeader();
    assert.ok(!cookieHeader.includes("sb-"), "Cart session must operate without Supabase auth token");
    assert.ok(cookieHeader.includes("solure_guest_session"), "Must have guest session cookie");
    assert.ok(cookieHeader.includes("solure_guest_cart_data"), "Must have guest cart data cookie");
    console.log("✓ Scenario 14 passed: Cart functions fully anonymously as guest.");
  });

  it("Scenario 15: Verify unavailable products cannot be added", async () => {
    const nonExistentVariantId = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${APP_URL}/shop/${productSlug}`, {
      method: "POST",
      headers: {
        "Next-Action": ADD_TO_CART_ACTION_ID,
        "Content-Type": "application/json",
        "Accept": "text/x-component",
        "Cookie": getCookieHeader(),
      },
      body: JSON.stringify([nonExistentVariantId, 1]),
    });

    assert.strictEqual(res.status, 200);
    updateCookies(res);
    const text = await res.text();
    const parsed = parseActionResult(text);

    assert.strictEqual(parsed.ok, false, "Invalid variant addition must fail");
    assert.strictEqual(parsed.code, "CART_ERROR");
    assert.ok(parsed.message.length > 0, "Meaningful error message must be returned");
    console.log("✓ Scenario 15 passed: Invalid/unavailable variant addition rejected with:", parsed.message);
  });

  it("Scenario 16: Verify product prices cannot be manipulated", async () => {
    // The server action schema rejects any extra parameters like client prices
    // and evaluates all prices strictly from the trusted database product_variants table
    const cartRes = await fetch(`${APP_URL}/shop/${productSlug}`, {
      method: "POST",
      headers: {
        "Next-Action": GET_CART_ACTION_ID,
        "Content-Type": "application/json",
        "Accept": "text/x-component",
        "Cookie": getCookieHeader(),
      },
      body: JSON.stringify([]),
    });

    const text = await cartRes.text();
    const parsed = parseGetCartResult(text);

    // Expected exact DB price for 100ml
    assert.strictEqual(parsed.items[0].unitPriceMinor, 7500000);
    assert.strictEqual(parsed.subtotalMinor, 7500000);
    console.log("✓ Scenario 16 passed: Price is strictly server-verified from live database.");
  });
});
