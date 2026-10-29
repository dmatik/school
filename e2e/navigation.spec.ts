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

  test('admin user sees Homework, Incidents, Settings, and Admin tabs', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    // Default tab should be Homework
    await expect(page.locator('main h1')).toContainText(/שיעורי בית|Homework/);

    // Click Incidents tab
    const incidentsBtn = page.locator('aside nav button').nth(1);
    await incidentsBtn.click();
    await expect(page.locator('main h1')).toContainText(/אירועי משמעת|School Incidents/);

    // Click Settings tab (3rd tab, before Admin)
    const settingsBtn = page.locator('aside nav button').nth(2);
    await settingsBtn.click();
    await expect(page.locator('main h1, main h2').first()).toContainText(/הגדרות|Settings/);
    await expect(page.locator('text=/חיבור למערכת Webtop|Webtop Integration/')).toBeVisible();

    // Click Admin tab (4th tab)
    const adminBtn = page.locator('aside nav button').nth(3);
    await adminBtn.click();
    await expect(page.locator('main h1, main h2').first()).toContainText(/ניהול מערכת|Administration/);

    // Click Account shortcut
    const accountBtn = page.locator('aside button').first();
    await accountBtn.click();
    await expect(page.locator('main h2').first()).toContainText(/הגדרות חשבון|Account Settings/);
    await expect(page.locator('text=/חיבור למערכת Webtop|Webtop Integration/')).not.toBeVisible();
  });

  test('regular user sees Homework, Incidents, and Settings tabs but not Admin tab', async ({ page }) => {
    regularUser = createTestUser('user');
    await loginWithUser(page, regularUser);

    // Nav items count in aside nav should be 3 (Homework, Incidents, Settings)
    const navButtons = page.locator('aside nav button');
    await expect(navButtons).toHaveCount(3);

    // Click Settings tab
    const settingsBtn = navButtons.nth(2);
    await settingsBtn.click();
    await expect(page.locator('main h1, main h2').first()).toContainText(/הגדרות|Settings/);
    await expect(page.locator('text=/חיבור למערכת Webtop|Webtop Integration/')).toBeVisible();
  });
});

