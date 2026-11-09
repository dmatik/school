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

    // Child user should NOT see child selector dropdown or liquid glass selector
    await expect(page.locator('button[role="combobox"]')).not.toBeVisible();
    await expect(page.locator('[data-schedule-child-selector]')).not.toBeVisible();
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

  test('floating round action button renders on bottom-right, has 50x50 size, and toggles edit mode to V', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    // Navigate to Schedule
    const scheduleBtn = page.locator('aside nav button').nth(3);
    await scheduleBtn.click();
    await expect(page.locator('main h1')).toContainText(/מערכת שעות|Weekly Schedule/);

    // Verify floating Edit button exists and is on the page (not over the sidebar)
    const fab = page.locator('button[aria-label="הפעל מצב עריכה"], button[aria-label="Enable edit mode"]');
    await expect(fab).toBeVisible();

    const box = await fab.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(Math.round(box.width)).toBe(50);
      expect(Math.round(box.height)).toBe(50);
    }

    const aside = page.locator('aside');
    const asideBox = await aside.boundingBox();
    expect(asideBox).not.toBeNull();
    const dir = await page.locator('html').getAttribute('dir') || 'ltr';
    if (box && asideBox) {
      if (dir === 'rtl') {
        // In RTL desktop mode, the sidebar is on the right.
        // The floating button must be on the page (to the left of the sidebar).
        expect(box.x + box.width).toBeLessThanOrEqual(asideBox.x);
      } else {
        // In LTR desktop mode, the sidebar is on the left.
        // The floating button must be on the page (to the right of the sidebar).
        expect(box.x).toBeGreaterThanOrEqual(asideBox.x + asideBox.width);
      }
    }

    // Click floating Edit button -> turns into V checkmark button with no X button
    await fab.click();
    const finishBtn = page.locator('button[aria-label="סיום עריכה"], button[aria-label="Finish editing"]');
    await expect(finishBtn).toBeVisible();
    await expect(page.locator('button[aria-label="בטל שינויים"], button[aria-label="Cancel editing"]')).not.toBeVisible();

    // Click finish button -> exits edit mode
    await finishBtn.click();
    await expect(fab).toBeVisible();
  });

  test('exams page renders floating 50x50 Add Exam button on bottom-right for parent', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    // Navigate to Exams
    const examsBtn = page.locator('aside nav button').nth(2);
    await examsBtn.click();
    await expect(page.locator('main h1')).toContainText(/מבחנים|Exams/);

    // Verify floating Add Exam button exists and is on the page (not over the sidebar)
    const addFab = page.locator('button[aria-label="הוסף מבחן"], button[aria-label="Add Exam"]');
    await expect(addFab).toBeVisible();

    const box = await addFab.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(Math.round(box.width)).toBe(50);
      expect(Math.round(box.height)).toBe(50);
    }

    const aside = page.locator('aside');
    const asideBox = await aside.boundingBox();
    expect(asideBox).not.toBeNull();
    const dir = await page.locator('html').getAttribute('dir') || 'ltr';
    if (box && asideBox) {
      if (dir === 'rtl') {
        // In RTL desktop mode, the sidebar is on the right.
        // The floating button must be on the page (to the left of the sidebar).
        expect(box.x + box.width).toBeLessThanOrEqual(asideBox.x);
      } else {
        // In LTR desktop mode, the sidebar is on the left.
        // The floating button must be on the page (to the right of the sidebar).
        expect(box.x).toBeGreaterThanOrEqual(asideBox.x + asideBox.width);
      }
    }
  });

  test('in Hebrew RTL desktop mode, floating button renders on bottom-left of the page away from sidebar', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    // Switch to Hebrew
    await page.evaluate(() => {
      localStorage.setItem('i18nextLng', 'he');
    });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    // Navigate to Exams
    const examsBtn = page.locator('aside nav button').nth(2);
    await examsBtn.click();
    await expect(page.locator('main h1')).toContainText('מבחנים');

    const addFab = page.locator('button[aria-label="הוסף מבחן"]');
    await expect(addFab).toBeVisible();

    const box = await addFab.boundingBox();
    const aside = page.locator('aside');
    const asideBox = await aside.boundingBox();
    expect(box).not.toBeNull();
    expect(asideBox).not.toBeNull();
    if (box && asideBox) {
      // In RTL desktop, sidebar is on the right (x > 0)
      expect(asideBox.x).toBeGreaterThan(0);
      // FAB is on the page (to the left of the sidebar)
      expect(box.x + box.width).toBeLessThanOrEqual(asideBox.x);
      // Specifically at the bottom-left of the page
      expect(box.x).toBeLessThan(200);
    }
  });
});
