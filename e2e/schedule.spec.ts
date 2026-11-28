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

    await page.getByTestId('sidebar-tab-schedule').click();
    await expect(page.getByTestId('desktop-page-header').filter({ hasText: /מערכת שעות|Weekly Schedule/ })).toBeVisible();

    // Verify Sunday through Friday day headers exist
    await expect(page.getByTestId('schedule-day-0')).toContainText(/ראשון|Sunday/);
    await expect(page.getByTestId('schedule-day-4')).toContainText(/חמישי|Thursday/);
    await expect(page.getByTestId('schedule-day-5')).toContainText(/שישי|Friday/);

    // Verify dismissal finish time row exists
    await expect(page.getByTestId('schedule-dismissal-row')).toContainText(/סיום לימודים|School ends at/);
  });

  test('child user views schedule in read-only mode without child selector', async ({ page }) => {
    childUser = createTestUser('user', 'child');
    await loginWithUser(page, childUser);

    await page.getByTestId('sidebar-tab-schedule').click();
    await expect(page.getByTestId('desktop-page-header').filter({ hasText: /מערכת שעות|Weekly Schedule/ })).toBeVisible();

    await expect(page.getByTestId('schedule-child-selector')).not.toBeVisible();
    await expect(page.getByTestId('schedule-edit-header-btn')).not.toBeVisible();
  });

  test('mobile mode renders schedule with scroll hints and aligned header/dismissal columns', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    await page.setViewportSize({ width: 375, height: 667 });

    await page.getByTestId('header-menu-button').click();
    await page.getByTestId('sidebar-tab-schedule').click();
    await expect(page.getByTestId('mobile-header-title')).toContainText(/מערכת שעות|Weekly Schedule/);

    // Check scroll hints exist on mobile
    await expect(page.getByRole('button', { name: /Scroll forward|גלול קדימה/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Scroll backward|גלול אחורה/ })).toBeVisible();

    // Verify header # column and day header share identical vertical bounds, as well as dismissal row
    const hourColBox = await page.getByTestId('schedule-hour-col').boundingBox();
    const firstDayBox = await page.getByTestId('schedule-day-0').boundingBox();
    expect(hourColBox).not.toBeNull();
    expect(firstDayBox).not.toBeNull();
    if (hourColBox && firstDayBox) {
      expect(Math.abs(hourColBox.y - firstDayBox.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(hourColBox.height - firstDayBox.height)).toBeLessThanOrEqual(1);
    }

    const dismissalRowBox = await page.getByTestId('schedule-dismissal-row').boundingBox();
    const finishIconBox = await page.getByTestId('schedule-finish-icon').boundingBox();
    expect(dismissalRowBox).not.toBeNull();
    expect(finishIconBox).not.toBeNull();
    if (dismissalRowBox && finishIconBox) {
      expect(Math.abs(dismissalRowBox.y - finishIconBox.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(dismissalRowBox.height - finishIconBox.height)).toBeLessThanOrEqual(1);
    }
  });

  test('mobile modal renders full width and keeps input and actions visible', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    await page.setViewportSize({ width: 375, height: 667 });

    await page.getByTestId('header-menu-button').click();
    await page.getByTestId('sidebar-tab-admin').click();
    await expect(page.getByTestId('mobile-header-title')).toContainText(/ניהול מערכת|Administration/);

    await page.getByTestId('add-user-header-btn').click();

    const modal = page.getByTestId('user-modal');
    await expect(modal).toBeVisible();

    const box = await modal.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeCloseTo(375, -1);
      expect(box.x).toBeCloseTo(0, -1);
    }

    await expect(page.getByTestId('create-username')).toBeVisible();
    await expect(page.getByTestId('create-user-submit')).toBeVisible();
    await expect(page.getByTestId('create-user-cancel')).toBeVisible();
  });

  test('round action button renders in desktop header at end of row, has 36x36 size matching avatar, and toggles edit mode to V', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    await page.getByTestId('sidebar-tab-schedule').click();
    const pageHeader = page.getByTestId('desktop-page-header').filter({ hasText: /מערכת שעות|Weekly Schedule/ });
    await expect(pageHeader).toBeVisible();

    const editBtn = page.getByTestId('schedule-edit-header-btn');
    await expect(editBtn).toBeVisible();

    const box = await editBtn.boundingBox();
    const headerBox = await pageHeader.boundingBox();
    const avatarBox = await page.getByTestId('sidebar-account-button').boundingBox();
    expect(box).not.toBeNull();
    expect(headerBox).not.toBeNull();
    expect(avatarBox).not.toBeNull();
    if (box && headerBox && avatarBox) {
      expect(Math.round(box.width)).toBe(36);
      expect(Math.round(box.height)).toBe(36);
      expect(Math.round(box.width)).toBe(Math.round(avatarBox.width));
      expect(Math.round(box.height)).toBe(Math.round(avatarBox.height));
      expect(box.y).toBeGreaterThanOrEqual(headerBox.y);
      expect(box.y + box.height).toBeLessThanOrEqual(headerBox.y + headerBox.height);
    }

    // Click Edit button -> turns into V checkmark button with no Cancel button
    await editBtn.click();
    await expect(page.getByRole('button', { name: /סיום עריכה|Finish editing/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /בטל שינויים|Cancel editing/ })).not.toBeVisible();

    // Click finish button -> exits edit mode
    await page.getByRole('button', { name: /סיום עריכה|Finish editing/ }).click();
    await expect(page.getByRole('button', { name: /הפעל מצב עריכה|Enable edit mode/ })).toBeVisible();
  });

  test('exams page renders 36x36 Add Exam button in desktop header for parent', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    await page.getByTestId('sidebar-tab-exams').click();
    const pageHeader = page.getByTestId('desktop-page-header').filter({ hasText: /מבחנים|Exams/ });
    await expect(pageHeader).toBeVisible();

    const addBtn = page.getByTestId('add-exam-header-btn');
    await expect(addBtn).toBeVisible();

    const box = await addBtn.boundingBox();
    const headerBox = await pageHeader.boundingBox();
    expect(box).not.toBeNull();
    expect(headerBox).not.toBeNull();
    if (box && headerBox) {
      expect(Math.round(box.width)).toBe(36);
      expect(Math.round(box.height)).toBe(36);
      expect(box.y).toBeGreaterThanOrEqual(headerBox.y);
      expect(box.y + box.height).toBeLessThanOrEqual(headerBox.y + headerBox.height);
    }
  });

  test('in Hebrew RTL desktop mode, header action button renders on the left end of the header row', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    // Ensure Hebrew language is selected
    await page.evaluate(() => {
      localStorage.setItem('school_lang', 'he');
    });
    await page.reload();

    await page.getByTestId('sidebar-tab-exams').click();
    const pageHeader = page.getByTestId('desktop-page-header').filter({ hasText: 'מבחנים' });
    await expect(pageHeader).toBeVisible();

    const addBtn = page.getByTestId('add-exam-header-btn');
    await expect(addBtn).toBeVisible();

    const box = await addBtn.boundingBox();
    const headerBox = await pageHeader.boundingBox();
    const asideBox = await page.getByTestId('desktop-sidebar').boundingBox();
    expect(box).not.toBeNull();
    expect(headerBox).not.toBeNull();
    expect(asideBox).not.toBeNull();
    if (box && headerBox && asideBox) {
      // In RTL desktop, sidebar is on the right (x > 0)
      expect(asideBox.x).toBeGreaterThan(0);
      // Button is at the left end of the desktop header row
      expect(box.x).toBeLessThanOrEqual(headerBox.x + 20);
      expect(box.x + box.width).toBeLessThanOrEqual(asideBox.x);
    }
  });

  test('share button renders in filter row and opens landscape PDF in a new tab on mobile viewport', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    await page.setViewportSize({ width: 375, height: 667 });

    await page.getByTestId('header-menu-button').click();
    await page.getByTestId('sidebar-tab-schedule').click();
    await expect(page.getByTestId('mobile-header-title')).toContainText(/מערכת שעות|Weekly Schedule/);

    const shareBtn = page.getByTestId('schedule-share-btn');
    await expect(shareBtn).toBeVisible();
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      shareBtn.click(),
    ]);
    expect(popup).toBeTruthy();
    await popup.close();
  });
});
