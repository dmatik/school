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

  test('admin user sees Homework, Incidents, Exams, Schedule, Settings, and Admin tabs', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    // Default tab should be Homework
    await expect(page.locator('main h1')).toContainText(/שיעורי בית|Homework/);

    // Click Incidents tab (2nd tab)
    const incidentsBtn = page.locator('aside nav button').nth(1);
    await incidentsBtn.click();
    await expect(page.locator('main h1')).toContainText(/אירועי משמעת|School Incidents/);

    // Click Exams tab (3rd tab)
    const examsBtn = page.locator('aside nav button').nth(2);
    await examsBtn.click();
    await expect(page.locator('main h1')).toContainText(/מבחנים|Exams/);

    // Click Schedule tab (4th tab)
    const scheduleBtn = page.locator('aside nav button').nth(3);
    await scheduleBtn.click();
    await expect(page.locator('main h1')).toContainText(/מערכת שעות|Weekly Schedule/);

    // Click Settings tab (5th tab)
    const settingsBtn = page.locator('aside nav button').nth(4);
    await settingsBtn.click();
    await expect(page.locator('main h1, main h2').first()).toContainText(/הגדרות|Settings/);
    await expect(page.locator('text=/חיבור למערכת Webtop|Webtop Integration/')).toBeVisible();

    // Click Admin tab (6th tab)
    const adminBtn = page.locator('aside nav button').nth(5);
    await adminBtn.click();
    await expect(page.locator('main h1, main h2').first()).toContainText(/ניהול מערכת|Administration/);

    // Click Account shortcut
    const accountBtn = page.locator('aside button').first();
    await accountBtn.click();
    await expect(page.locator('main h2').first()).toContainText(/הגדרות חשבון|Account Settings/);
    await expect(page.locator('text=/חיבור למערכת Webtop|Webtop Integration/')).not.toBeVisible();
  });

  test('regular user sees Homework, Incidents, Exams, Schedule, and Settings tabs but not Admin tab', async ({ page }) => {
    regularUser = createTestUser('user');
    await loginWithUser(page, regularUser);

    // Nav items count in aside nav should be 5 (Homework, Incidents, Exams, Schedule, Settings)
    const navButtons = page.locator('aside nav button');
    await expect(navButtons).toHaveCount(5);

    // Click Schedule tab (4th tab)
    const scheduleBtn = navButtons.nth(3);
    await scheduleBtn.click();
    await expect(page.locator('main h1')).toContainText(/מערכת שעות|Weekly Schedule/);

    // Click Settings tab (5th tab)
    const settingsBtn = navButtons.nth(4);
    await settingsBtn.click();
    await expect(page.locator('main h1, main h2').first()).toContainText(/הגדרות|Settings/);
    await expect(page.locator('text=/חיבור למערכת Webtop|Webtop Integration/')).toBeVisible();
  });

  test('child user sees Homework, Incidents, Exams, Schedule, and Settings, can use Settings without Webtop config, and does not see Admin tab', async ({ page }) => {
    regularUser = createTestUser('user', 'child');
    await loginWithUser(page, regularUser);

    // Nav items count in aside nav should be 5 (Homework, Incidents, Exams, Schedule, Settings)
    const navButtons = page.locator('aside nav button');
    await expect(navButtons).toHaveCount(5);

    // Click Schedule tab (4th tab)
    const scheduleBtn = navButtons.nth(3);
    await scheduleBtn.click();
    await expect(page.locator('main h1')).toContainText(/מערכת שעות|Weekly Schedule/);

    // Click Settings tab (5th tab)
    const settingsBtn = navButtons.nth(4);
    await settingsBtn.click();
    await expect(page.locator('main h1, main h2').first()).toContainText(/הגדרות|Settings/);

    // Appearance & Language settings must be visible
    await expect(page.locator('text=/תצוגה ושפה|Appearance & Language/')).toBeVisible();
    await expect(page.locator('[data-settings-language-selector]')).toBeVisible();
    await expect(page.locator('[data-settings-theme-selector]')).toBeVisible();

    // Webtop configuration part must NOT be visible to child
    await expect(page.locator('text=/חיבור למערכת Webtop|Webtop Integration/')).not.toBeVisible();

    // Admin should not be present
    await expect(page.locator('aside nav').getByText(/ניהול מערכת|Administration/)).not.toBeVisible();

    // Webtop Sync button remains available in aside footer
    const syncBtn = page.locator('aside').getByRole('button', { name: /סנכרון|Sync/ });
    await expect(syncBtn).toBeVisible();
  });
});

