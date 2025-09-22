// Common test utilities and helpers

export const TEST_USER = {
  id: 'user-test-1',
  _id: 'user-test-1',
  name: 'Test User',
  email: 'test@example.com',
  phone: '+919876543210',
};

export const MOCK_STATIONS = [
  { _id: 's1', name: 'Alpha Station' },
  { _id: 's2', name: 'Beta Station' },
  { _id: 's3', name: 'Gamma Station' },
];

export const MOCK_CARDS = [
  { _id: 'c1', cardNumber: 'VM-1234', balance: 25, isPrimary: true, status: 'active' },
  { _id: 'c2', cardNumber: 'VM-5678', balance: 50, isPrimary: false, status: 'active' },
];

export async function seedAuthStorage(page, user = TEST_USER) {
  await page.addInitScript((userData) => {
    try {
      localStorage.setItem('token', 'jwt-test-token-global');
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (e) {
      console.error('Failed to seed auth storage:', e);
    }
  }, user);
}

export async function fillPhone(page, value) {
  const tel = page.locator('input[type="tel"], .PhoneInputInput');
  await tel.first().click();
  await tel.first().fill('');
  await tel.first().type(value);
  await page.waitForTimeout(200); // Allow formatting to complete
}

export async function mockCommonAPIs(page, userId = TEST_USER.id) {
  // Stations
  await page.route('**/api/v1/stations', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_STATIONS),
    })
  );

  // User cards
  await page.route(`**/api/v1/virtualcards/user/${userId}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CARDS),
    })
  );

  // Wallet
  await page.route(`**/api/v1/wallet/${userId}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        wallet: { id: 'w1', balance: 100 },
        transactions: []
      }),
    })
  );

  // Wallet balance
  await page.route(`**/api/v1/wallet/${userId}/balance`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ wallet: { balance: 100 } }),
    })
  );
}

export async function waitForAPICall(page, urlPattern, timeout = 5000) {
  return page.waitForResponse(
    response => response.url().includes(urlPattern) && response.status() === 200,
    { timeout }
  );
}

export async function mockSuccessfulLogin(page) {
  await page.route('**/api/v1/users/login/password', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: TEST_USER, token: 'jwt-test-token' }),
    })
  );
}

export async function mockRegistrationFlow(page) {
  await page.route('**/api/v1/users/request-register-phone-otp', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ otpHash: 'phone-hash' })
    })
  );

  await page.route('**/api/v1/users/verify-phone-otp', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { _id: 'tmp-user-1' } })
    })
  );

  await page.route('**/api/v1/users/request-register-email-otp', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ otpHash: 'email-hash' })
    })
  );

  await page.route('**/api/v1/users/verify-email-otp', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    })
  );

  await page.route('**/api/v1/users/set-password', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Password set successfully' })
    })
  );

  await page.route('**/api/v1/users/register', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    })
  );
}