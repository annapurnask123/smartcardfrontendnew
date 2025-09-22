import { chromium } from '@playwright/test';
import { TEST_USER, fillPhone } from './test-utils.js';

async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Mock successful login
  await page.route('**/api/v1/users/login/password', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ 
        user: TEST_USER, 
        token: 'jwt-test-token-global' 
      }),
    })
  );

  try {
    await page.goto('http://localhost:5173/login');
    await fillPhone(page, TEST_USER.phone);
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Wait for successful login
    await page.waitForURL(/\/home$/, { timeout: 10000 });
    
    // Save authentication state
    await context.storageState({ path: 'src/playwrighttest/auth-state.json' });
    console.log('✓ Global authentication setup completed');
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;