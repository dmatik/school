import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser, cleanupAllTestUsers, TestUser } from './helpers/auth';

test.describe('Authentication Flow', () => {
  let dedicatedUser: TestUser | null = null;

  test.beforeAll(() => {
    cleanupAllTestUsers();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test.afterEach(async () => {
    if (dedicatedUser) {
      deleteTestUser(dedicatedUser.id);
      dedicatedUser = null;
    }
  });

  test.afterAll(() => {
    cleanupAllTestUsers();
  });

  test('displays login form with username, password and submit button (without server URL on co-hosted web)', async ({ page }) => {
    await page.goto('/');

    const usernameInput = page.getByTestId('username-input');
    const passwordInput = page.getByTestId('password-input');
    const submitButton = page.getByTestId('login-submit-button');

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(page.getByTestId('server-url-input')).not.toBeVisible();
  });

  test('shows error notification on invalid credentials', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('username-input').fill('nonexistent_user_123');
    await page.getByTestId('password-input').fill('wrong_password_123');
    await page.getByTestId('login-submit-button').click();

    await expect(page.getByTestId('login-error-box')).toBeVisible();
  });

  test('successfully logs in with dedicated test user and logs out', async ({ page }) => {
    dedicatedUser = createTestUser('admin');

    await page.goto('/');
    await page.getByTestId('username-input').fill(dedicatedUser.username);
    await page.getByTestId('password-input').fill(dedicatedUser.password);
    await page.getByTestId('login-submit-button').click();

    // Should navigate to authenticated shell
    const accountButton = page.getByTestId('sidebar-account-button');
    await expect(accountButton).toBeVisible();

    // Verify localStorage has the auth token
    const token = await page.evaluate(() => localStorage.getItem('school_auth_token'));
    expect(token).toBeTruthy();

    // Navigate to Account screen
    await accountButton.click();

    // Click logout button
    const logoutButton = page.getByTestId('logout-button');
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // Should be returned to the login screen
    await expect(page.getByTestId('username-input')).toBeVisible();
    const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('school_auth_token'));
    expect(tokenAfterLogout).toBeNull();
  });
});
