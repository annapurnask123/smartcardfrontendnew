// E2E tests for Register, Login, Booking, Cards, Wallet, Profile, Notifications, Admin, and more
import { test, expect } from "@playwright/test";

// Common test user used for authenticated pages
const TEST_USER = {
  id: "user-test-1",
  _id: "user-test-1",
  name: "Test User",
  email: "test@example.com",
  phone: "+919876543210",
};

async function seedAuthStorage(page) {
  await page.addInitScript((user) => {
    try {
      localStorage.setItem("token", "test-token");
      localStorage.setItem("user", JSON.stringify(user));
    } catch {}
  }, TEST_USER);
}

// Helper to fill the phone input from react-phone-number-input
async function fillPhone(page, value) {
  const tel = page.locator('input[type="tel"], .PhoneInputInput');
  await tel.first().click();
  await tel.first().fill("");
  await tel.first().type(value);
  await page.waitForTimeout(200); // Allow formatting to complete
}

// -------------------- Register Flow --------------------

test("Register: full OTP flow and redirect to login", async ({ page }) => {
  // Specific API mocks applied below
  await page.route("**/api/v1/users/request-register-phone-otp", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ otpHash: "phone-hash" }),
    })
  );
  await page.route("**/api/v1/users/verify-phone-otp", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: { _id: "tmp-user-1" } }),
    })
  );
  await page.route("**/api/v1/users/request-register-email-otp", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ otpHash: "email-hash" }),
    })
  );
  await page.route("**/api/v1/users/verify-email-otp", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    })
  );
  await page.route("**/api/v1/users/set-password", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "Password set successfully" }),
    })
  );
  await page.route("**/api/v1/users/register", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    })
  );

  await page.goto("/register");

  await fillPhone(page, "+919999988888");
  await page.getByRole("button", { name: "Send OTP" }).click();

  // Verify phone
  await page.getByPlaceholder("Enter OTP").first().fill("123456");
  await page.getByRole("button", { name: "Verify OTP" }).first().click();

  // Email step
  await page
    .locator('label:has-text("Email")')
    .locator("..")
    .locator('input[type="email"]')
    .fill("reg@example.com");
  await page.getByRole("button", { name: "Send OTP" }).click();
  await page.getByPlaceholder("Enter OTP").last().fill("654321");
  await page.getByRole("button", { name: "Verify OTP" }).last().click();

  // Set password
  await page
    .locator('label:has-text("Password")')
    .first()
    .locator("..")
    .locator('input[type="password"]')
    .first()
    .fill("P@ssw0rd!");
  await page
    .locator('label:has-text("Confirm Password")')
    .locator("..")
    .locator('input[type="password"]')
    .fill("P@ssw0rd!");
  await page.getByRole("button", { name: "Set Password" }).click();

  // Complete registration
  await page
    .locator('label:has-text("Full Name")')
    .locator("..")
    .locator('input[type="text"]')
    .fill("Playwright Test");
  await page.getByRole("button", { name: "Complete Registration" }).click();

  // Expect redirect to login
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: /Login/i })).toBeVisible();
});

// -------------------- Login Flow --------------------

test("Login: password login redirects to /home", async ({ page }) => {
  await page.route("**/api/v1/users/login/password", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: TEST_USER, token: "jwt-test-token" }),
    })
  );

  await page.goto("/login");

  await fillPhone(page, TEST_USER.phone);
  await page
    .locator('label:has-text("Password")')
    .locator("..")
    .locator('input[type="password"]')
    .fill("secret");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/\/home$/);
});

// -------------------- Booking Flow --------------------

test("Booking: select stations, see fare, and navigate to payment", async ({
  page,
}) => {
  await seedAuthStorage(page);

  await page.route("**/api/v1/stations", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { _id: "s1", name: "Alpha Station" },
        { _id: "s2", name: "Beta Station" },
      ]),
    })
  );
  await page.route("**/api/v1/tickets/calculate-fare", async (route) => {
    const res = { amount: 50, baseFare: 50 };
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(res),
    });
  });
  await page.route("**/api/v1/tickets/book", async (route) => {
    const res = { ticket: { _id: "t1", amount: 50 } };
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(res),
    });
  });

  await page.route(`**/api/v1/wallet/${TEST_USER.id}/balance`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ wallet: { balance: 100 } }),
    })
  );

  await page.goto("/book");
  await page.waitForLoadState('networkidle');

  // Use more specific selectors to avoid strict mode violations
  await page.locator("select").first().selectOption("s1");
  await page.locator("select").last().selectOption("s2");
  await page.waitForTimeout(500); // Wait for fare calculation

  await expect(page.getByText("Total Fare:")).toBeVisible();

  await page
    .getByRole("button", { name: /Confirm.*Payment/i })
    .click();

  await expect(page).toHaveURL(/\/payment$/);
  await expect(page.getByText(/Complete.*Payment/i)).toBeVisible();
  await expect(page.getByText("₹50")).first().toBeVisible();
});

// -------------------- Cards Page --------------------

test("Cards: list cards, check balance, create new card", async ({ page }) => {
  await seedAuthStorage(page);

  await page.route("**/api/v1/stations", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ _id: "s1", name: "Alpha" }]),
    })
  );

  await page.route(`**/api/v1/virtualcards/user/${TEST_USER.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          _id: "c1",
          cardNumber: "VM-1234",
          balance: 25,
          isPrimary: true,
          status: "active",
        },
      ]),
    })
  );

  await page.route("**/api/v1/virtualcards/c1/balance", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ balance: 25 }),
    })
  );

  await page.route("**/api/v1/virtualcards", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        card: {
          _id: "c2",
          cardNumber: "VM-5678",
          balance: 0,
          isPrimary: false,
          status: "active",
        },
      }),
    })
  );

  await page.route(`**/api/v1/virtualcards/user/${TEST_USER.id}?*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          _id: "c1",
          cardNumber: "VM-1234",
          balance: 25,
          isPrimary: true,
          status: "active",
        },
        {
          _id: "c2",
          cardNumber: "VM-5678",
          balance: 0,
          isPrimary: false,
          status: "active",
        },
      ]),
    })
  );

  await page.goto("/cards");

  await expect(page.getByText("My Cards")).toBeVisible();
  await expect(page.getByText("VM-1234")).toBeVisible();

  await page.getByRole("button", { name: /Check Balance/i }).click();
  await expect(page.getByText(/Card balance:/i)).toBeVisible();

  await page.getByRole("button", { name: /Get New Card/i }).click();

  // Use more specific selector to avoid strict mode violation
  await expect(page.locator('.credit-number, .card-number').filter({ hasText: 'VM-5678' })).toBeVisible();
});

// -------------------- Wallet Page --------------------

test("Wallet: show balance and simulate successful recharge", async ({
  page,
}) => {
  await seedAuthStorage(page);

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

  await page.route(`**/api/v1/wallet/${TEST_USER.id}/recharge`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, newBalance: 150 }),
    })
  );

  await page.goto("/wallet");

  // Use more specific selector to avoid strict mode violation
  await expect(page.getByRole('heading', { name: /₹100/i })).toBeVisible();
  await expect(page.getByText(/Wallet.*Balance/i)).toBeVisible();

  await page.getByRole("button", { name: /Recharge/i }).click();
  await page.locator('input[type="number"]').fill("50");
  await page.getByRole("button", { name: /Confirm/i }).click();

  await expect(page.getByText(/success/i)).toBeVisible();
});

// -------------------- Navigation Tests --------------------

test("Navigation: authenticated user can access all protected routes", async ({
  page,
}) => {
  await seedAuthStorage(page);

  await page.route("**/api/v1/stations", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    })
  );
  await page.route(`**/api/v1/virtualcards/user/${TEST_USER.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    })
  );
  await page.route(`**/api/v1/wallet/${TEST_USER.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ wallet: { balance: 0 }, transactions: [] }),
    })
  );

  const routes = ["/home", "/book", "/cards", "/wallet"];

  for (const route of routes) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(route + "$"));
  }
});

test("Navigation: unauthenticated user redirected to login", async ({
  page,
}) => {
  // Clear any existing auth - handle security errors gracefully
  await page.context().clearCookies();
  try {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch (error) {
    // Ignore security errors when clearing storage
    console.log('Storage clear failed (expected in some contexts):', error.message);
  }

  const protectedRoutes = ["/home", "/book", "/cards", "/wallet"];

  for (const route of protectedRoutes) {
    await page.goto(route);
    // Wait a bit for potential redirects
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/login$/);
  }
});

// -------------------- Registration Tests --------------------

test("Registration: complete user registration flow", async ({ page }) => {
  await page.route("**/api/v1/users/send-otp", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    })
  );

  await page.route("**/api/v1/users/register", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "new_user", phone: "+919876543210", name: "New User" },
        token: "new_token",
      }),
    })
  );

  await page.goto("/register");
  await page.waitForLoadState('networkidle');

  // Wait for form elements to be available
  await page.waitForSelector('input[name="name"]', { timeout: 10000 });
  await page.locator('input[name="name"]').fill("New User");
  await fillPhone(page, "+919876543210");
  await page.locator('input[name="email"]').fill("newuser@example.com");
  await page.locator('input[type="password"]').fill("password123");

  await page.getByRole("button", { name: "Send OTP" }).click();
  await expect(page.getByText(/OTP sent/i)).toBeVisible();

  await page.locator('input[name="otp"]').fill("123456");
  await page.getByRole("button", { name: "Register" }).click();

  await expect(page).toHaveURL(/\/home$/);
});

// -------------------- Card Recharge Tests --------------------

test("Card Recharge: recharge card with wallet balance", async ({ page }) => {
  await seedAuthStorage(page);

  await page.route(`**/api/v1/virtualcards/user/${TEST_USER.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          _id: "c1",
          cardNumber: "VM-1234",
          balance: 25,
          isPrimary: true,
          status: "active",
        },
      ]),
    })
  );

  await page.route(`**/api/v1/wallet/${TEST_USER.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ wallet: { balance: 100 }, transactions: [] }),
    })
  );

  await page.route("**/api/v1/virtualcards/c1/recharge", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, newBalance: 75 }),
    })
  );

  await page.goto("/cards");

  await page
    .getByRole("button", { name: /Recharge/i })
    .first()
    .click();
  await page.locator('input[type="number"]').fill("50");
  await page.getByRole("button", { name: /Confirm Recharge/i }).click();

  await expect(page.getByText(/recharge successful/i)).toBeVisible();
});

// -------------------- Journey Tracking Tests --------------------

test("Journey: start and end journey with card tap", async ({ page }) => {
  await seedAuthStorage(page);

  await page.route("**/api/v1/stations", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { _id: "s1", name: "Central Station" },
        { _id: "s2", name: "Airport Station" },
      ]),
    })
  );

  await page.route(`**/api/v1/journeys/user/${TEST_USER.id}/active`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ journey: null }),
    })
  );

  await page.route("**/api/v1/journeys/start", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        journey: {
          _id: "j1",
          startStation: "s1",
          startTime: new Date().toISOString(),
        },
      }),
    })
  );

  await page.route("**/api/v1/journeys/j1/end", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        journey: { _id: "j1", endStation: "s2", fare: 25, status: "completed" },
      }),
    })
  );

  await page.goto("/journey");

  await page.locator('select[name="station"]').selectOption("s1");
  await page.getByRole("button", { name: /Tap In/i }).click();
  await expect(page.getByText(/Journey started/i)).toBeVisible();

  await page.locator('select[name="endStation"]').selectOption("s2");
  await page.getByRole("button", { name: /Tap Out/i }).click();
  await expect(page.getByText(/Journey completed/i)).toBeVisible();
  await expect(page.getByText("₹25")).toBeVisible();
});

test("Journey: view journey history", async ({ page }) => {
  await seedAuthStorage(page);

  await page.route(`**/api/v1/journeys/user/${TEST_USER.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        journeys: [
          {
            _id: "j1",
            startStation: { name: "Central Station" },
            endStation: { name: "Airport Station" },
            startTime: "2024-01-15T10:00:00Z",
            endTime: "2024-01-15T10:30:00Z",
            fare: 25,
            status: "completed",
          },
        ],
      }),
    })
  );

  await page.goto("/journey-history");
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole("heading", { name: /Journey History/i })).toBeVisible();
  await expect(page.getByText("Central Station")).toBeVisible();
  await expect(page.getByText("Airport Station")).toBeVisible();
  await expect(page.getByText("₹25")).first().toBeVisible();
});

// -------------------- Plans Management Tests --------------------

test("Plans: view and purchase travel plans", async ({ page }) => {
  await seedAuthStorage(page);

  await page.route("**/api/v1/plans", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        plans: [
          {
            _id: "p1",
            name: "Daily Pass",
            price: 100,
            validity: 1,
            type: "daily",
          },
          {
            _id: "p2",
            name: "Weekly Pass",
            price: 500,
            validity: 7,
            type: "weekly",
          },
          {
            _id: "p3",
            name: "Monthly Pass",
            price: 1500,
            validity: 30,
            type: "monthly",
          },
        ],
      }),
    })
  );

  await page.route(`**/api/v1/plans/user/${TEST_USER.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ plans: [] }),
    })
  );

  await page.route("**/api/v1/plans/p1/purchase", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        plan: { _id: "up1", planId: "p1", expiresAt: "2024-01-16T23:59:59Z" },
      }),
    })
  );

  await page.goto("/plans");

  await expect(page.getByRole("heading", { name: /Travel.*Plans/i })).toBeVisible();
  await expect(page.getByText("Daily Pass")).toBeVisible();
  await expect(page.getByText("₹100")).toBeVisible();

  await page.getByRole("button", { name: /Purchase Daily Pass/i }).click();
  await page.getByRole("button", { name: /Confirm Purchase/i }).click();

  await expect(page.getByText(/plan purchased successfully/i)).toBeVisible();
});

test("Plans: view active plans", async ({ page }) => {
  await seedAuthStorage(page);

  await page.route(`**/api/v1/plans/user/${TEST_USER.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        plans: [
          {
            _id: "up1",
            plan: { name: "Daily Pass", type: "daily" },
            purchasedAt: "2024-01-15T10:00:00Z",
            expiresAt: "2024-01-16T23:59:59Z",
            status: "active",
          },
        ],
      }),
    })
  );

  await page.goto("/my-plans");
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole("heading", { name: /My Plans/i })).toBeVisible();
  await expect(page.getByText("Daily Pass")).toBeVisible();
  // Use more specific selector to avoid strict mode violation
  await expect(page.locator('.badge').filter({ hasText: 'Active' }).first()).toBeVisible();
});

// -------------------- Error Handling Tests --------------------

test("Login: handles invalid credentials gracefully", async ({ page }) => {
  await page.route("**/api/v1/users/login/password", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Invalid credentials" }),
    })
  );

  await page.goto("/login");
  await page.waitForLoadState('networkidle');
  
  await fillPhone(page, "+919999999999");
  await page.locator('input[type="password"]').fill("wrongpassword");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByText(/invalid.*credential/i)).toBeVisible({ timeout: 10000 });
});

test("Booking: handles API errors during fare calculation", async ({
  page,
}) => {
  await seedAuthStorage(page);

  await page.route("**/api/v1/stations", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { _id: "s1", name: "Station A" },
        { _id: "s2", name: "Station B" },
      ]),
    })
  );
  await page.route("**/api/v1/tickets/calculate-fare", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Service unavailable" }),
    })
  );

  await page.goto("/book");
  await page.waitForLoadState('networkidle');
  
  // Wait for selects to be populated
  await page.waitForSelector('select option[value="s1"]', { timeout: 10000 });
  await page.locator("select").first().selectOption("s1");
  await page.waitForSelector('select option[value="s2"]', { timeout: 10000 });
  await page.locator("select").last().selectOption("s2");

  await expect(page.getByText(/error.*unavailable/i)).toBeVisible({ timeout: 10000 });
});

test("Card Recharge: handles insufficient wallet balance", async ({ page }) => {
  await seedAuthStorage(page);

  await page.route(`**/api/v1/virtualcards/user/${TEST_USER.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ _id: "c1", cardNumber: "VM-1234", balance: 25 }]),
    })
  );

  await page.route("**/api/v1/virtualcards/c1/recharge", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "Insufficient wallet balance" }),
    })
  );

  await page.goto("/cards");
  await page.waitForLoadState('networkidle');
  
  await page.waitForSelector('button:has-text("Recharge")', { timeout: 10000 });
  await page
    .getByRole("button", { name: /Recharge/i })
    .first()
    .click();
  await page.waitForSelector('input[type="number"]', { timeout: 10000 });
  await page.locator('input[type="number"]').fill("200");
  await page.waitForSelector('button:has-text("Confirm")', { timeout: 10000 });
  await page.getByRole("button", { name: /Confirm.*Recharge/i }).click();

  await expect(page.getByText(/insufficient.*balance/i)).toBeVisible({ timeout: 10000 });
});

// -------------------- Profile Page Tests --------------------

test("Profile: view and update user profile", async ({ page }) => {
  await seedAuthStorage(page);

  await page.route(`**/api/v1/users/${TEST_USER.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: TEST_USER }),
    })
  );

  await page.route(`**/api/v1/users/${TEST_USER.id}/update`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        user: { ...TEST_USER, name: "Updated User" },
      }),
    })
  );

  await page.goto("/profile");
  await page.waitForLoadState('networkidle');
  
  await expect(page.getByText(TEST_USER.name).first()).toBeVisible();

  await page.waitForSelector('input[name="name"]', { timeout: 10000 });
  await page.locator('input[name="name"]').fill("Updated User");
  await page.getByRole("button", { name: /Save.*Changes/i }).click();

  await expect(page.getByText(/profile.*updated/i)).toBeVisible({ timeout: 10000 });
  await expect(page.getByDisplayValue("Updated User")).toBeVisible();
});

// -------------------- Logout Flow --------------------

test("Logout: user is logged out and redirected to login", async ({ page }) => {
  await seedAuthStorage(page);

  // Mock stations API for home page
  await page.route("**/api/v1/stations", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    })
  );

  await page.goto("/home");
  await page.waitForLoadState('networkidle');
  
  await expect(page.getByRole("heading", { name: /Home/i })).toBeVisible();

  await page.getByRole("button", { name: /Logout/i }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Login")).toBeVisible();
});

// -------------------- Notification Tests --------------------

test("Notifications: show and mark notifications as read", async ({ page }) => {
  await seedAuthStorage(page);

  await page.route(`**/api/v1/notifications/user/${TEST_USER.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        notifications: [
          { _id: "n1", message: "Welcome!", read: false },
          { _id: "n2", message: "Your card was recharged.", read: false },
        ],
      }),
    })
  );

  await page.route(`**/api/v1/notifications/n1/read`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    })
  );

  await page.goto("/notifications");
  await page.waitForLoadState('networkidle');
  
  await expect(page.getByText("Welcome!")).toBeVisible();
  await expect(page.getByText("Your card was recharged.")).toBeVisible();

  await page.waitForSelector('button:has-text("Mark as read")', { timeout: 10000 });
  await page
    .getByRole("button", { name: /Mark.*read/i })
    .first()
    .click();
  await expect(page.getByText(/marked.*read/i)).toBeVisible({ timeout: 10000 });
});

// -------------------- Admin: View All Users (if admin feature exists) --------------------

test("Admin: view all users (admin only)", async ({ page }) => {
  const ADMIN_USER = { ...TEST_USER, role: "admin" };
  await page.addInitScript((user) => {
    localStorage.setItem("token", "admin-token");
    localStorage.setItem("user", JSON.stringify(user));
  }, ADMIN_USER);

  await page.route("**/api/v1/users", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        users: [
          { _id: "user1", name: "User One", email: "one@example.com" },
          { _id: "user2", name: "User Two", email: "two@example.com" },
        ],
      }),
    })
  );

  await page.goto("/admin/users");
  await expect(page.getByText("User One")).toBeVisible();
  await expect(page.getByText("User Two")).toBeVisible();
});

// -------------------- Booking: Cancel Ticket --------------------

test("Booking: cancel a booked ticket", async ({ page }) => {
  await seedAuthStorage(page);

  await page.route(`**/api/v1/tickets/user/${TEST_USER.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        tickets: [
          {
            _id: "t1",
            amount: 50,
            status: "booked",
            from: "Alpha",
            to: "Beta",
          },
        ],
      }),
    })
  );

  await page.route("**/api/v1/tickets/t1/cancel", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    })
  );

  await page.goto("/my-tickets");
  await expect(page.getByText("Alpha")).toBeVisible();
  await expect(page.getByText("Beta")).toBeVisible();

  await page.getByRole("button", { name: /Cancel/i }).click();
  await expect(page.getByText(/ticket cancelled/i)).toBeVisible();
});

// -------------------- Wallet: View Transaction History --------------------

test("Wallet: view transaction history", async ({ page }) => {
  await seedAuthStorage(page);

  await page.route(`**/api/v1/wallet/${TEST_USER.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        wallet: { id: "w1", balance: 200 },
        transactions: [
          {
            _id: "t1",
            type: "credit",
            amount: 100,
            description: "Recharge",
            createdAt: new Date().toISOString(),
          },
          {
            _id: "t2",
            type: "debit",
            amount: 50,
            description: "Ticket purchase",
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    })
  );

  await page.goto("/wallet");
  await page.waitForLoadState('networkidle');
  
  await expect(page.getByRole("heading", { name: /₹200/i })).toBeVisible();
  // Use more specific selector to avoid strict mode violation
  await expect(page.locator('.fw-bold').filter({ hasText: 'Recharge' })).toBeVisible();
  await expect(page.getByText("Ticket purchase")).toBeVisible();
});

// -------------------- Cards: Set Primary Card --------------------

test("Cards: set a card as primary", async ({ page }) => {
  await seedAuthStorage(page);

  await page.route(`**/api/v1/virtualcards/user/${TEST_USER.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          _id: "c1",
          cardNumber: "VM-1234",
          balance: 25,
          isPrimary: false,
          status: "active",
        },
        {
          _id: "c2",
          cardNumber: "VM-5678",
          balance: 100,
          isPrimary: true,
          status: "active",
        },
      ]),
    })
  );

  await page.route("**/api/v1/virtualcards/c1/set-primary", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    })
  );

  await page.goto("/cards");
  await page.waitForLoadState('networkidle');
  
  await expect(page.getByText("VM-1234")).toBeVisible();
  await expect(page.getByText("VM-5678")).toBeVisible();

  await page.waitForSelector('button:has-text("Set as Primary")', { timeout: 10000 });
  await page
    .getByRole("button", { name: /Set.*Primary/i })
    .first()
    .click();
  await expect(page.getByText(/primary.*card.*updated/i)).toBeVisible({ timeout: 10000 });
});
