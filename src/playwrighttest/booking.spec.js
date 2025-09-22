import { test, expect } from '@playwright/test';
import { TEST_USER, seedAuthStorage, mockCommonAPIs } from './test-utils.js';

test('Booking: complete ticket booking flow', async ({ page }) => {
  await seedAuthStorage(page);
  await mockCommonAPIs(page);

  // Mock fare calculation
  await page.route('**/api/v1/tickets/calculate-fare', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ fare: 50, distance: 10 }),
    })
  );

  // Mock ticket booking
  await page.route('**/api/v1/tickets/book', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ticket: { _id: 't1', fare: 50 } }),
    })
  );

  await page.goto('/book');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: /Book Ticket/i })).toBeVisible();

  // Wait for selects to be populated and select stations
  await page.waitForSelector('select option[value="s1"]', { timeout: 10000 });
  await page.locator('select').first().selectOption('s1');
  await page.waitForSelector('select option[value="s2"]', { timeout: 10000 });
  await page.locator('select').last().selectOption('s2');
  await page.waitForTimeout(500); // Wait for fare calculation

  // Verify fare calculation
  await expect(page.getByText('₹50')).first().toBeVisible();

  // Proceed to booking
  await page.getByRole('button', { name: /Confirm.*Payment/i }).click();

  // Land on payment page
  await expect(page).toHaveURL(/\/payment$/);
  await expect(page.getByText(/Complete.*Payment/i)).toBeVisible();
  await expect(page.getByText('₹50')).first().toBeVisible();
});

test('Booking: handles API errors during fare calculation', async ({ page }) => {
  await seedAuthStorage(page);
  await mockCommonAPIs(page);

  await page.route('**/api/v1/tickets/calculate-fare', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Service unavailable' }) })
  );

  await page.goto('/book');
  await page.waitForLoadState('networkidle');
  
  // Wait for selects to be populated
  await page.waitForSelector('select option[value="s1"]', { timeout: 10000 });
  await page.locator('select').first().selectOption('s1');
  await page.waitForSelector('select option[value="s2"]', { timeout: 10000 });
  await page.locator('select').last().selectOption('s2');

  await expect(page.getByText(/error.*unavailable/i)).toBeVisible({ timeout: 10000 });
});