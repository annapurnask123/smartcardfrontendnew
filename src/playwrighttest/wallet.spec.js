import { test, expect } from "@playwright/test";
import { TEST_USER, seedAuthStorage } from "./test-utils.js";

// ...existing code...

test("Wallet: show balance and simulate successful recharge", async ({
  page,
}) => {
  await seedAuthStorage(page);

  // Mock wallet fetch and transactions
  await page.route(`**/api/v1/wallet/${TEST_USER.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        wallet: { id: "w1", balance: 100 },
        transactions: [],
      }),
    })
  );
  await page.route(`**/api/v1/wallet/${TEST_USER.id}/transactions**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        transactions: [
          {
            _id: "t1",
            type: "credit",
            amount: 50,
            description: "Wallet recharge",
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    })
  );

  // Mock recharge endpoint
  await page.route(`**/api/v1/wallet/${TEST_USER.id}/recharge`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, newBalance: 150 }),
    })
  );

  await page.goto("/wallet");

  // Use a more specific selector for the balance to avoid strict mode error
  await expect(page.getByText("₹100.00")).toBeVisible();
  await expect(page.getByText("Wallet Balance")).toBeVisible();

  // Test recharge functionality
  await page.getByRole("button", { name: /Recharge/i }).click();
  await page.locator('input[type="number"]').fill("50");
  await page.getByRole("button", { name: /Confirm/i }).click();

  // Verify success message or updated balance
  await expect(page.getByText(/success/i)).toBeVisible();
});

// ...existing code...
test("Wallet: complete Razorpay recharge flow", async ({ page }) => {
  await seedAuthStorage(page);

  // Initial wallet & transactions
  await page.route(`**/api/v1/wallet/${TEST_USER.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        wallet: { id: "w1", balance: 100 },
        transactions: [],
      }),
    })
  );

  await page.route(`**/api/v1/wallet/${TEST_USER.id}/transactions**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ transactions: [] }),
    })
  );

  // Create Razorpay order
  await page.route("**/api/v1/wallet/recharge", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        order_id: "order_1",
        amount: 5000,
        currency: "INR",
        key: "rzp_test",
      }),
    })
  );

  // Payment verification
  await page.route("**/api/v1/payments/verify", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    })
  );

  // Wallet after recharge
  await page.route(`**/api/v1/wallet/${TEST_USER.id}?*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        wallet: { id: "w1", balance: 150 },
        transactions: [],
      }),
    })
  );

  // Stub Razorpay
  await page.addInitScript(() => {
    window.Razorpay = function (opts) {
      this.on = () => {};
      this.open = () => {
        setTimeout(() => {
          opts.handler({
            razorpay_order_id: "order_1",
            razorpay_payment_id: "pay_1",
            razorpay_signature: "sig_1",
          });
        }, 0);
      };
    };
  });

  await page.goto("/wallet");

  // Verify initial state
  await expect(page.getByText("My Wallet")).toBeVisible();
  await expect(page.getByRole("heading", { name: /₹100/i })).toBeVisible();

  // Recharge flow
  await page.getByRole("button", { name: /Recharge.*Wallet/i }).click();
  await page.locator('input[type="number"]').fill("50");
  await page.getByRole("button", { name: /Proceed.*Payment/i }).click();

  // Verify updated balance
  await expect(page.getByRole("heading", { name: /₹150/i })).toBeVisible({
    timeout: 10000,
  });
});
