import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser, cleanupAllTestUsers, loginWithUser, TestUser } from './helpers/auth';

test.describe('Navigation Flow', () => {
  let adminUser: TestUser | null = null;
  let regularUser: TestUser | null = null;

  test.beforeAll(() => {
    cleanupAllTestUsers();
  });

  test.afterEach(async () => {
    if (adminUser) {
      deleteTestUser(adminUser.id);
      adminUser = null;
    }
    if (regularUser) {
      deleteTestUser(regularUser.id);
      regularUser = null;
    }
  });

  test.afterAll(() => {
    cleanupAllTestUsers();
  });

  test('admin user sees Incidents, Homework, and Admin tabs', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    // Default tab should be Incidents
    await expect(page.locator('main h1')).toContainText(/אירועי משמעת|School Incidents/);

    // Click Homework tab
    const homeworkBtn = page.locator('aside nav button').nth(1);
    await homeworkBtn.click();
    await expect(page.locator('main h1')).toContainText(/שיעורי בית|Homework/);

    // Click Admin tab
    const adminBtn = page.locator('aside nav button').nth(2);
    await adminBtn.click();
    await expect(page.locator('main h1, main h2').first()).toContainText(/ניהול מערכת|Administration/);

    // Click Account shortcut
    const accountBtn = page.locator('aside button').first();
    await accountBtn.click();
    await expect(page.locator('main h2').first()).toContainText(/הגדרות חשבון|Account Settings/);
    await expect(page.locator('text=/חיבור למערכת Webtop|Webtop Integration/')).toBeVisible();
  });

  test('regular user does not see Admin tab', async ({ page }) => {
    regularUser = createTestUser('user');
    await loginWithUser(page, regularUser);

    // Nav items count in aside nav should be 2 (Incidents and Homework)
    const navButtons = page.locator('aside nav button');
    await expect(navButtons).toHaveCount(2);
  });
});

