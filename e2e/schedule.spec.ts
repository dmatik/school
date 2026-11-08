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
    await expect(dayHeaders.filter({ hasText: /ראשון|Sunday/ })).toBeVisible();
    await expect(dayHeaders.filter({ hasText: /חמישי|Thursday/ })).toBeVisible();
    await expect(dayHeaders.filter({ hasText: /שישי|Friday/ })).toBeVisible();

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
    await expect(page.locator('button[aria-label="Scroll forward"], button[aria-label="גלול קדימה"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Scroll backward"], button[aria-label="גלול אחורה"]')).toBeVisible();
  });

  test('mobile modal renders full screen and keeps input and actions visible', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    // Switch to mobile viewport (iPhone dimensions)
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to Admin tab on mobile
    const dockButtons = page.locator('nav[aria-label="Mobile Navigation"] button');
    // Admin is the last tab (6th) for adminUser
    await dockButtons.last().click();
    await expect(page.locator('main h2').first()).toContainText(/ניהול מערכת|Administration/);

    // Click "Add User" button on mobile
    const addUserBtn = page.locator('button:has-text("הוספת משתמש"), button:has-text("Add User")').first();
    await addUserBtn.click();

    // Modal dialog should appear
    const dialogContent = page.locator('[role="dialog"]');
    await expect(dialogContent).toBeVisible();

    // Verify modal dialog fills entire width on mobile
    const box = await dialogContent.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeCloseTo(375, -1);
      expect(box.x).toBeCloseTo(0, -1);
    }

    // Verify editable input and action buttons are visible
    const usernameInput = dialogContent.locator('#create-username');
    await expect(usernameInput).toBeVisible();
    await expect(dialogContent.locator('button[type="submit"]')).toBeVisible();
    await expect(dialogContent.locator('button:has-text("ביטול"), button:has-text("Cancel")')).toBeVisible();
  });
});
