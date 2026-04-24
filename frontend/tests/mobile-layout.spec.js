import { test, expect } from '@playwright/test';

const MOBILE = { width: 375, height: 812 };
const DESKTOP = { width: 1440, height: 900 };

test.describe('Mobile layout (375px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE);
  });

  test('topbar is hidden on mobile', async ({ page }) => {
    await page.goto('/');
    const topbar = page.locator('ol-topbar');
    await expect(topbar).toHaveCount(1);
    await expect(topbar).toBeHidden();
    await page.screenshot({ path: 'tests/screenshots/mobile-homepage.png', fullPage: false });
  });

  test('header fits within 375px viewport', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('ol-header');
    await expect(header).toBeVisible();
    const box = await header.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width).toBeLessThanOrEqual(375);
    await page.screenshot({ path: 'tests/screenshots/mobile-header.png', clip: { x: 0, y: 0, width: 375, height: 80 } });
  });

  test('cover grid does not overflow horizontally', async ({ page }) => {
    await page.goto('/');
    // Wait for page to settle deterministically
    await page.waitForLoadState('networkidle');
    // Also wait for the cover grid to be in the DOM
    await page.locator('ol-search-page').waitFor({ state: 'attached' });
    // Check no horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(375);
    await page.screenshot({ path: 'tests/screenshots/mobile-cover-grid.png', fullPage: false });
  });
});

test.describe('Desktop layout (1440px) — regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP);
  });

  test('topbar is visible on desktop', async ({ page }) => {
    await page.goto('/');
    const topbar = page.locator('ol-topbar');
    await expect(topbar).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/desktop-homepage.png', fullPage: false });
  });

  test('header shows nav on desktop', async ({ page }) => {
    await page.goto('/');
    // Wait for ol-header to be defined and upgraded
    await page.waitForFunction(() => customElements.get('ol-header') !== undefined);
    await page.locator('ol-header').waitFor({ state: 'attached' });
    // Nav links should be visible on desktop — check via evaluating computed style
    // ol-header uses shadow DOM, so we evaluate inside it
    const navVisible = await page.evaluate(() => {
      const header = document.querySelector('ol-header');
      const nav = header?.shadowRoot?.querySelector('nav');
      if (!nav) return false;
      return getComputedStyle(nav).display !== 'none';
    });
    expect(navVisible).toBe(true);
    await page.screenshot({ path: 'tests/screenshots/desktop-header.png', clip: { x: 0, y: 0, width: 1440, height: 80 } });
  });
});
