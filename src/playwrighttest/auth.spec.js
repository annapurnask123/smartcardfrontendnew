import { test, expect } from '@playwright/test';
import { TEST_USER, seedAuthStorage, fillPhone, mockSuccessfulLogin, mockRegistrationFlow } from './test-utils.js';

// -------------------- Login Tests --------------------

test('Login: successful login with phone and password', async ({ page }) => {
  await mockSuccessfulLogin(page);

  await page.goto('/login');
  await fillPhone(page, TEST_USER.phone);
  await page.locator('input[type="password"]').fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/home$/);
});

test('Login: handles invalid credentials gracefully', async ({ page }) => {
  await page.route('**/api/v1/users/login/password', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Invalid credentials' }) })
  );

  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  await fillPhone(page, '+919999999999');
  await page.locator('input[type="password"]').fill('wrongpassword');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByText(/invalid.*credential/i)).toBeVisible({ timeout: 10000 });
});

// -------------------- Registration Tests --------------------

test('Registration: complete user registration flow', async ({ page }) => {
  await mockRegistrationFlow(page);

  await page.goto('/register');
  await page.waitForLoadState('networkidle');
  
  await page.waitForSelector('input[name="name"]', { timeout: 10000 });
  await page.locator('input[name="name"]').fill('New User');
  await fillPhone(page, '+919876543210');
  await page.locator('input[name="email"]').fill('newuser@example.com');
  await page.locator('input[type="password"]').fill('password123');
  
  await page.getByRole('button', { name: 'Send OTP' }).click();
  await expect(page.getByText(/OTP sent/i)).toBeVisible();
  
  await page.locator('input[name="otp"]').fill('123456');
  await page.getByRole('button', { name: 'Register' }).click();
  
  await expect(page).toHaveURL(/\/home$/);
});

// -------------------- Navigation Tests --------------------

test('Navigation: unauthenticated user redirected to login', async ({ page }) => {
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
  
  const protectedRoutes = ['/home', '/book', '/cards', '/wallet'];
  
  for (const route of protectedRoutes) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
  }
});