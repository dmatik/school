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
    await expect(page.getByTestId('schedule-edit-fab')).not.toBeVisible();
  });

  test('mobile mode renders schedule with scroll hints and aligned header/dismissal columns', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    await page.setViewportSize({ width: 375, height: 667 });

    await page.getByTestId('dock-tab-schedule').click();
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

    await page.getByTestId('dock-tab-admin').click();
    await expect(page.getByTestId('mobile-header-title')).toContainText(/ניהול מערכת|Administration/);

    await page.getByTestId('add-user-fab').click();

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

  test('floating round action button renders on page away from sidebar, has 50x50 size, and toggles edit mode to V', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    await page.getByTestId('sidebar-tab-schedule').click();
    await expect(page.getByTestId('desktop-page-header').filter({ hasText: /מערכת שעות|Weekly Schedule/ })).toBeVisible();

    const fab = page.getByTestId('schedule-edit-fab');
    await expect(fab).toBeVisible();

    const box = await fab.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(Math.round(box.width)).toBe(50);
      expect(Math.round(box.height)).toBe(50);
    }

    const aside = page.getByTestId('desktop-sidebar');
    const asideBox = await aside.boundingBox();
    expect(asideBox).not.toBeNull();
    if (box && asideBox) {
      // In RTL desktop (default), sidebar is on the right (x > 0); in LTR, on the left
      if (asideBox.x > 0) {
        expect(box.x + box.width).toBeLessThanOrEqual(asideBox.x);
      } else {
        expect(box.x).toBeGreaterThanOrEqual(asideBox.x + asideBox.width);
      }
    }

    // Click floating Edit button -> turns into V checkmark button with no Cancel button
    await fab.click();
    await expect(page.getByRole('button', { name: /סיום עריכה|Finish editing/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /בטל שינויים|Cancel editing/ })).not.toBeVisible();

    // Click finish button -> exits edit mode
    await page.getByRole('button', { name: /סיום עריכה|Finish editing/ }).click();
    await expect(page.getByRole('button', { name: /הפעל מצב עריכה|Enable edit mode/ })).toBeVisible();
  });

  test('exams page renders floating 50x50 Add Exam button away from sidebar for parent', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    await page.getByTestId('sidebar-tab-exams').click();
    await expect(page.getByTestId('desktop-page-header').filter({ hasText: /מבחנים|Exams/ })).toBeVisible();

    const addFab = page.getByTestId('add-exam-fab');
    await expect(addFab).toBeVisible();

    const box = await addFab.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(Math.round(box.width)).toBe(50);
      expect(Math.round(box.height)).toBe(50);
    }

    const aside = page.getByTestId('desktop-sidebar');
    const asideBox = await aside.boundingBox();
    expect(asideBox).not.toBeNull();
    if (box && asideBox) {
      if (asideBox.x > 0) {
        expect(box.x + box.width).toBeLessThanOrEqual(asideBox.x);
      } else {
        expect(box.x).toBeGreaterThanOrEqual(asideBox.x + asideBox.width);
      }
    }
  });

  test('in Hebrew RTL desktop mode, floating button renders on bottom-left of the page away from sidebar', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    // Ensure Hebrew language is selected
    await page.evaluate(() => {
      localStorage.setItem('school_lang', 'he');
    });
    await page.reload();

    await page.getByTestId('sidebar-tab-exams').click();
    await expect(page.getByTestId('desktop-page-header').filter({ hasText: 'מבחנים' })).toBeVisible();

    const addFab = page.getByTestId('add-exam-fab');
    await expect(addFab).toBeVisible();

    const box = await addFab.boundingBox();
    const asideBox = await page.getByTestId('desktop-sidebar').boundingBox();
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

  test('share button renders in filter row and opens landscape PDF in a new tab on mobile viewport', async ({ page }) => {
    adminUser = createTestUser('admin');
    await loginWithUser(page, adminUser);

    await page.setViewportSize({ width: 375, height: 667 });

    await page.getByTestId('dock-tab-schedule').click();
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
