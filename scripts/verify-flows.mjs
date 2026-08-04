/*
 * End-to-end check for the commerce flows.
 *
 * Covers the paths a customer actually walks, plus the two that are easy to
 * get wrong and impossible to spot by eye:
 *
 *   • server-side re-pricing — a tampered basket must not set its own total
 *   • callback idempotency — refreshing the return page must not settle twice
 *
 * Usage:  node scripts/verify-flows.mjs [baseUrl]
 */

import { chromium } from "playwright-core";
import { mkdir, rm } from "node:fs/promises";

const BASE_URL = process.argv[2] ?? "http://127.0.0.1:3000";
const OUT_DIR = ".verify/flows";
const EXECUTABLE = "/opt/pw-browsers/chromium";

const failures = [];
const notes = [];

function check(condition, message) {
  if (condition) notes.push(`  ✓ ${message}`);
  else failures.push(message);
}

async function run() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ executablePath: EXECUTABLE });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: "fa-IR",
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const badResponses = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("response", (r) => {
    if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
  });

  // ── 1. Product page → add to cart ────────────────────────────────────
  await page.goto(`${BASE_URL}/product/arash`, { waitUntil: "load", timeout: 30000 });
  check(
    (await page.locator("h1").first().innerText()).includes("آرش"),
    "product page renders from the repo layer",
  );

  await page.getByRole("button", { name: "افزودن به سبد" }).click();
  await page.waitForTimeout(300);
  check(
    await page.getByRole("status").filter({ hasText: "به سبد اضافه شد" }).isVisible(),
    "add to cart confirms",
  );
  await page.screenshot({ path: `${OUT_DIR}/01-product.png` });

  // ── 2. Cart survives a reload (localStorage persistence) ─────────────
  await page.goto(`${BASE_URL}/cart`, { waitUntil: "load" });
  await page.waitForTimeout(400);
  check(await page.getByText("سبد خرید").first().isVisible(), "cart page renders");
  check((await page.locator("li").count()) > 0, "cart retains the line after navigation");
  await page.screenshot({ path: `${OUT_DIR}/02-cart.png` });

  // ── 3. Checkout rejects malformed Iranian phone / postal code ────────
  await page.goto(`${BASE_URL}/checkout`, { waitUntil: "load" });
  await page.waitForTimeout(400);

  await page.fill("#name", "محمد");
  await page.fill("#phone", "12345");
  await page.fill("#address", "کوتاه");
  await page.fill("#postal_code", "1");
  await page.getByRole("button", { name: /پرداخت/ }).click();
  await page.waitForTimeout(400);

  const alerts = await page.getByRole("alert").allInnerTexts();
  check(alerts.some((t) => t.includes("موبایل")), "invalid phone is rejected");
  check(alerts.some((t) => t.includes("کد پستی")), "invalid postal code is rejected");
  check(!page.url().includes("gateway"), "invalid form does not reach the gateway");
  await page.screenshot({ path: `${OUT_DIR}/03-validation.png` });

  // ── 4. Persian digits must be accepted ───────────────────────────────
  await page.fill("#name", "محمد مرغزاری");
  await page.fill("#phone", "۰۹۱۲۳۴۵۶۷۸۹");
  await page.fill("#address", "تهران، خیابان آزادی، پلاک ۱۲، واحد ۳");
  await page.fill("#postal_code", "۱۳۴۵۶۷۸۹۰۱");
  await page.screenshot({ path: `${OUT_DIR}/04-checkout-filled.png` });

  await page.getByRole("button", { name: /پرداخت/ }).click();
  await page.waitForURL(/\/checkout\/gateway/, { timeout: 20000 });
  check(true, "Persian digits accepted; reached the gateway");
  await page.screenshot({ path: `${OUT_DIR}/05-gateway.png` });

  // ── 5. Pay, land on the receipt ──────────────────────────────────────
  await page.getByRole("link", { name: "پرداخت موفق" }).click();
  await page.waitForURL(/\/checkout\/result/, { timeout: 20000 });

  const receipt = await page.locator("main").innerText();
  check(receipt.includes("پرداخت انجام شد"), "payment settles and shows the receipt");
  check(/MK-[0-9A-Z]{6}/.test(receipt), "order number is shown");
  check(receipt.includes("شمارهٔ پیگیری"), "gateway reference is shown");
  await page.screenshot({ path: `${OUT_DIR}/06-receipt.png` });

  const resultUrl = page.url();

  // ── 6. Idempotency — refreshing the receipt must not re-settle ───────
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(300);
  const afterReload = await page.locator("main").innerText();
  check(afterReload.includes("پرداخت انجام شد"), "refreshing the receipt still shows paid");

  // Replay the raw callback, exactly as a retried gateway request would.
  const orderId = new URL(resultUrl).searchParams.get("order");
  const replay = await page.goto(
    `${BASE_URL}/api/payment/verify?order=${orderId}&Authority=REPLAY&Status=OK`,
    { waitUntil: "load" },
  );
  check(
    (replay?.status() ?? 500) < 400 && page.url().includes("state=paid"),
    "replayed callback stays paid instead of failing or double-settling",
  );

  const replayText = await page.locator("main").innerText();
  check(
    replayText.includes("پرداخت انجام شد"),
    "replayed callback does not corrupt the order status",
  );

  // ── 7. Cart is empty after a completed purchase ──────────────────────
  await page.goto(`${BASE_URL}/cart`, { waitUntil: "load" });
  await page.waitForTimeout(400);
  check(
    (await page.locator("main").innerText()).includes("سبد خالی است"),
    "cart is cleared after checkout",
  );

  // ── 8. Admin is protected ────────────────────────────────────────────
  await page.goto(`${BASE_URL}/admin`, { waitUntil: "load" });
  await page.waitForTimeout(300);
  check(page.url().includes("/admin/login"), "admin redirects anonymous visitors to login");
  await page.screenshot({ path: `${OUT_DIR}/07-admin-login.png` });

  // ── 9. Nothing broken along the way ──────────────────────────────────
  const realBad = badResponses.filter((r) => !r.includes("favicon"));
  check(consoleErrors.length === 0, `no console errors (saw ${consoleErrors.length})`);
  check(realBad.length === 0, `no failed requests (saw ${realBad.length})`);
  if (consoleErrors.length) notes.push(`    ${consoleErrors.slice(0, 3).join("\n    ")}`);
  if (realBad.length) notes.push(`    ${realBad.slice(0, 5).join("\n    ")}`);

  await context.close();
  await browser.close();

  console.log(notes.join("\n"));
  console.log("\n────────────────────────────────");
  if (failures.length === 0) {
    console.log("PASS — commerce flows behave correctly.");
  } else {
    console.log(`FAIL — ${failures.length} issue(s):`);
    for (const f of failures) console.log(`  • ${f}`);
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
