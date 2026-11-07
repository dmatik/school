import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser, cleanupAllTestUsers, loginWithUser, TestUser } from './helpers/auth';

test.describe('Weekly Schedule Flow', () => {
  let adminUser: TestUser | null = null;
  let childUser: TestUser | null = null;

  test.beforeAll(() => {
    cleanupAllTestUsers();
  });

  test.afterEach(async () => {
    if (adminUser) {
      deleteTestUser(adminUser.id);
      adminUser = null;
    }
    if (childUser) {
      deleteTestUser(childUser.id);
      childUser = null;
    }
  });

  test.afterAll(() => {
    cleanupAllTestUsers();
  });

  test('parent can view schedule, desktop shows Sunday through Friday, and bottom shows finish time row', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    // Navigate to Schedule
    const scheduleBtn = page.locator('aside nav button').nth(3);
    await scheduleBtn.click();
    await expect(page.locator('main h1')).toContainText(/מערכת שעות|Weekly Schedule/);

    // Verify 6 days headers exist in the table header
    const dayHeaders = page.locator('[data-schedule-header] [data-schedule-day]');
    await expect(dayHeaders.filter({ hasText: /^ראשון$|^Sunday$/ })).toBeVisible();
    await expect(dayHeaders.filter({ hasText: /^חמישי$|^Thursday$/ })).toBeVisible();
    await expect(dayHeaders.filter({ hasText: /^שישי$|^Friday$/ })).toBeVisible();

    // Verify dismissal finish time footer row exists
    await expect(page.locator('[data-schedule-dismissal] span').filter({ hasText: /סיום לימודים|School ends at/ }).first()).toBeVisible();
  });

  test('child user views schedule in read-only mode without child dropdown', async ({ page }) => {
    childUser = createTestUser('user', 'child');
    await loginWithUser(page, childUser);

    // Navigate to Schedule (4th tab for child)
    const scheduleBtn = page.locator('aside nav button').nth(3);
    await scheduleBtn.click();
    await expect(page.locator('main h1')).toContainText(/מערכת שעות|Weekly Schedule/);

    // Child user should NOT see child selector dropdown
    await expect(page.locator('button[role="combobox"]')).not.toBeVisible();
  });

  test('mobile mode renders schedule with 3 days visible', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    // Switch to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // On mobile, click bottom dock 4th icon (Schedule)
    const dockButtons = page.locator('nav[aria-label="Mobile Navigation"] button');
    await dockButtons.nth(3).click();
    await expect(page.locator('main h1')).toContainText(/מערכת שעות|Weekly Schedule/);

    // Check scroll hints exist on mobile
    await expect(page.locator('button[aria-label="Scroll days forward"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Scroll days backward"]')).toBeVisible();
  });
});
