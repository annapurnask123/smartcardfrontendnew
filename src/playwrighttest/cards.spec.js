import { test, expect } from '@playwright/test';
import { TEST_USER, seedAuthStorage, mockCommonAPIs, MOCK_CARDS } from './test-utils.js';

test('Cards: list cards, check balance, create new card', async ({ page }) => {
  await seedAuthStorage(page);
  await mockCommonAPIs(page);

  // Check balance endpoint
  await page.route('**/api/v1/virtualcards/c1/balance', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ balance: 25 }) })
  );

  // Create new card
  await page.route('**/api/v1/virtualcards', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ card: { _id: 'c3', cardNumber: 'VM-9999', balance: 0, isPrimary: false, status: 'active' } }),
    })
  );

  // Refetch cards after creation
  await page.route(`**/api/v1/virtualcards/user/${TEST_USER.id}?*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        ...MOCK_CARDS,
        { _id: 'c3', cardNumber: 'VM-9999', balance: 0, isPrimary: false, status: 'active' }
      ]),
    })
  );

  await page.goto('/cards');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('My Cards')).toBeVisible();
  await expect(page.getByText('VM-1234')).toBeVisible();

  // Check balance
  await page.getByRole('button', { name: /Check Balance/i }).click();
  await expect(page.getByText(/Card balance:/i)).toBeVisible();

  // Create a new card
  await page.getByRole('button', { name: /Get New Card/i }).click();
  // Use more specific selector to avoid strict mode violation
  await expect(page.locator('.credit-number, .card-number').filter({ hasText: 'VM-9999' })).toBeVisible();
});

test('Card Recharge: recharge card with wallet balance', async ({ page }) => {
  await seedAuthStorage(page);
  await mockCommonAPIs(page);

  // Mock card recharge
  await page.route('**/api/v1/virtualcards/c1/recharge', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, newBalance: 75 })
    })
  );

  await page.goto('/cards');
  await page.waitForLoadState('networkidle');
  
  await page.waitForSelector('button:has-text("Recharge")', { timeout: 10000 });
  await page.getByRole('button', { name: /Recharge/i }).first().click();
  await page.waitForSelector('input[type="number"]', { timeout: 10000 });
  await page.locator('input[type="number"]').fill('50');
  await page.waitForSelector('button:has-text("Confirm")', { timeout: 10000 });
  await page.getByRole('button', { name: /Confirm.*Recharge/i }).click();
  
  await expect(page.getByText(/recharge.*successful/i)).toBeVisible({ timeout: 10000 });
});

test('Card Recharge: handles insufficient wallet balance', async ({ page }) => {
  await seedAuthStorage(page);
  await mockCommonAPIs(page);

  await page.route('**/api/v1/virtualcards/c1/recharge', (route) =>
    route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Insufficient wallet balance' }) })
  );

  await page.goto('/cards');
  await page.waitForLoadState('networkidle');
  
  await page.waitForSelector('button:has-text("Recharge")', { timeout: 10000 });
  await page.getByRole('button', { name: /Recharge/i }).first().click();
  await page.waitForSelector('input[type="number"]', { timeout: 10000 });
  await page.locator('input[type="number"]').fill('200');
  await page.waitForSelector('button:has-text("Confirm")', { timeout: 10000 });
  await page.getByRole('button', { name: /Confirm.*Recharge/i }).click();

  await expect(page.getByText(/insufficient.*balance/i)).toBeVisible({ timeout: 10000 });
});