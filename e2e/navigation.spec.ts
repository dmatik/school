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
    await expect(page.locator('main h1, main h2').first()).toContainText(/הגדרות חשבון|Account Settings/);
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

  test('mobile view displays centered page title in mobile header, hides in-page title headers, has floating Add User button on Admin and bottom Logout on Account', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    // Switch to mobile viewport (iPhone 13 dimensions)
    await page.setViewportSize({ width: 390, height: 844 });

    // Mobile header should display the Homework title
    const mobileHeader = page.locator('header.md\\:hidden');
    await expect(mobileHeader).toBeVisible();
    await expect(mobileHeader.locator('h1')).toContainText(/שיעורי בית|Homework/);

    // In-page header with data-page-title should be hidden on mobile
    await expect(page.locator('main [data-page-title]')).not.toBeVisible();

    const headerBox = await mobileHeader.boundingBox();
    const hwFirst = await page.locator('main input[type="search"]').boundingBox();
    // Verify compact gap below header on mobile (< 15px instead of previous 31px+)
    if (headerBox && hwFirst) {
      const gap = hwFirst.y - (headerBox.y + headerBox.height);
      expect(gap).toBeLessThan(15);
      expect(gap).toBeGreaterThanOrEqual(0);
    }

    // Click Incidents tab in mobile dock
    const incidentsMobileBtn = page.locator('nav[aria-label="Mobile Navigation"] button').nth(1);
    await incidentsMobileBtn.click();
    await expect(mobileHeader.locator('h1')).toContainText(/אירועי משמעת|School Incidents/);
    await expect(page.locator('main [data-page-title]')).not.toBeVisible();

    // Click Admin tab in mobile dock (last button)
    const adminMobileBtn = page.locator('nav[aria-label="Mobile Navigation"] button').last();
    await adminMobileBtn.click();
    await expect(mobileHeader.locator('h1')).toContainText(/ניהול מערכת|Administration/);
    await expect(page.locator('main [data-page-title]')).not.toBeVisible();

    // Floating round Add User button should be visible on AdminPage
    const floatingAddUserBtn = page.locator('button[aria-label="הוספת משתמש"], button[aria-label="Add User"]').first();
    await expect(floatingAddUserBtn).toBeVisible();
    await floatingAddUserBtn.click();
    // Modal should open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    // Close modal
    await page.keyboard.press('Escape');

    // Click user avatar in mobile header to go to Account page
    const avatarBtn = mobileHeader.locator('button').first();
    await avatarBtn.click();
    await expect(mobileHeader.locator('h1')).toContainText(/הגדרות חשבון|Account Settings/);
    await expect(page.locator('main [data-page-title]')).not.toBeVisible();

    // Logout button should be at the bottom of the Account page
    const logoutBtn = page.locator('button', { hasText: /התנתק|Sign Out/ });
    await expect(logoutBtn).toBeVisible();
  });
});

