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

    const expectDesktopTitle = (pattern: RegExp) =>
      expect(page.getByTestId('desktop-page-header').filter({ hasText: pattern })).toBeVisible();

    // Default tab should be Homework
    await expectDesktopTitle(/שיעורי בית|Homework/);

    // Incidents
    await page.getByTestId('sidebar-tab-incidents').click();
    await expectDesktopTitle(/אירועי משמעת|School Incidents/);

    // Exams
    await page.getByTestId('sidebar-tab-exams').click();
    await expectDesktopTitle(/מבחנים|Exams/);

    // Schedule
    await page.getByTestId('sidebar-tab-schedule').click();
    await expectDesktopTitle(/מערכת שעות|Weekly Schedule/);

    // Settings
    await page.getByTestId('sidebar-tab-settings').click();
    await expectDesktopTitle(/הגדרות|Settings/);
    await expect(page.getByTestId('settings-webtop-card')).toBeVisible();

    // Admin
    await page.getByTestId('sidebar-tab-admin').click();
    await expectDesktopTitle(/ניהול מערכת|Administration/);

    // Account shortcut
    await page.getByTestId('sidebar-account-button').click();
    await expectDesktopTitle(/הגדרות חשבון|Account Settings/);
    await expect(page.getByTestId('logout-button')).toBeVisible();
  });

  test('regular user sees Homework, Incidents, Exams, Schedule, and Settings tabs but not Admin tab', async ({ page }) => {
    regularUser = createTestUser('user');
    await loginWithUser(page, regularUser);

    const expectDesktopTitle = (pattern: RegExp) =>
      expect(page.getByTestId('desktop-page-header').filter({ hasText: pattern })).toBeVisible();

    await expect(page.getByTestId('sidebar-tab-homework')).toBeVisible();
    await expect(page.getByTestId('sidebar-tab-incidents')).toBeVisible();
    await expect(page.getByTestId('sidebar-tab-exams')).toBeVisible();
    await expect(page.getByTestId('sidebar-tab-schedule')).toBeVisible();
    await expect(page.getByTestId('sidebar-tab-settings')).toBeVisible();
    await expect(page.getByTestId('sidebar-tab-admin')).not.toBeVisible();

    await page.getByTestId('sidebar-tab-schedule').click();
    await expectDesktopTitle(/מערכת שעות|Weekly Schedule/);

    await page.getByTestId('sidebar-tab-settings').click();
    await expectDesktopTitle(/הגדרות|Settings/);
    await expect(page.getByTestId('settings-webtop-card')).toBeVisible();
  });

  test('child user sees Homework, Incidents, Exams, Schedule, and Settings, can use Settings without Webtop config, and does not see Admin tab', async ({ page }) => {
    regularUser = createTestUser('user', 'child');
    await loginWithUser(page, regularUser);

    const expectDesktopTitle = (pattern: RegExp) =>
      expect(page.getByTestId('desktop-page-header').filter({ hasText: pattern })).toBeVisible();

    await expect(page.getByTestId('sidebar-tab-homework')).toBeVisible();
    await expect(page.getByTestId('sidebar-tab-settings')).toBeVisible();
    await expect(page.getByTestId('sidebar-tab-admin')).not.toBeVisible();

    await page.getByTestId('sidebar-tab-schedule').click();
    await expectDesktopTitle(/מערכת שעות|Weekly Schedule/);

    await page.getByTestId('sidebar-tab-settings').click();
    await expectDesktopTitle(/הגדרות|Settings/);

    // Appearance & Language settings must be visible
    await expect(page.getByTestId('settings-language-selector')).toBeVisible();
    await expect(page.getByTestId('settings-theme-selector')).toBeVisible();

    // Webtop configuration card must NOT be visible to child
    await expect(page.getByTestId('settings-webtop-card')).not.toBeVisible();

    // Webtop Sync button remains available in sidebar footer
    await expect(page.getByTestId('sidebar-sync-button')).toBeVisible();
  });

  test('mobile view displays centered page title in mobile header, hides desktop headers, has floating Add User button on Admin and bottom Logout on Account', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    // Switch to mobile viewport (iPhone 13 dimensions)
    await page.setViewportSize({ width: 390, height: 844 });

    const mobileHeader = page.getByTestId('mobile-header');
    const mobileTitle = page.getByTestId('mobile-header-title');
    await expect(mobileHeader).toBeVisible();
    await expect(mobileTitle).toContainText(/שיעורי בית|Homework/);
    await expect(page.getByTestId('desktop-page-header')).not.toBeVisible();

    // Incidents tab in mobile dock
    await page.getByTestId('dock-tab-incidents').click();
    await expect(mobileTitle).toContainText(/אירועי משמעת|School Incidents/);
    await expect(page.getByTestId('desktop-page-header')).not.toBeVisible();

    // Admin tab in mobile dock
    await page.getByTestId('dock-tab-admin').click();
    await expect(mobileTitle).toContainText(/ניהול מערכת|Administration/);
    await expect(page.getByTestId('desktop-page-header')).not.toBeVisible();

    // Floating round Add User button should be visible on Admin
    const floatingAddUserBtn = page.getByTestId('add-user-fab');
    await expect(floatingAddUserBtn).toBeVisible();
    await floatingAddUserBtn.click();
    await expect(page.getByTestId('user-modal')).toBeVisible();
    await page.getByTestId('create-user-cancel').click();

    // Click user avatar in mobile header to go to Account page
    await page.getByTestId('header-account-button').click();
    await expect(mobileTitle).toContainText(/הגדרות חשבון|Account Settings/);
    await expect(page.getByTestId('desktop-page-header')).not.toBeVisible();

    // Logout button should be visible on Account screen
    await expect(page.getByTestId('logout-button')).toBeVisible();
  });
});
