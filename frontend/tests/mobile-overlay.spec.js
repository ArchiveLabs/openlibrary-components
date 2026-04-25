import { test, expect } from '@playwright/test';

async function waitForSearchBar(page) {
  await page.waitForFunction(() => customElements.get('ol-search-bar') !== undefined);
  await page.locator('ol-search-bar').waitFor({ state: 'attached' });
}

async function focusSearchInput(page) {
  await page.evaluate(() => {
    const sb = document.querySelector('ol-search-bar');
    sb?.shadowRoot?.querySelector('input')?.focus();
    sb?.shadowRoot?.querySelector('input')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true })
    );
  });
}

// ── Issue #23: full-screen mobile overlay ────────────────────────

test.describe('mobile full-screen overlay (issue #23)', () => {
  test('focusing search input on mobile adds mobile-exp class to host', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await waitForSearchBar(page);

    await focusSearchInput(page);

    // Wait for the class to appear
    await page.waitForFunction(() =>
      document.querySelector('ol-search-bar')?.classList.contains('mobile-exp'),
      { timeout: 2000 }
    );

    const hasMobileExp = await page.evaluate(() =>
      document.querySelector('ol-search-bar')?.classList.contains('mobile-exp')
    );
    expect(hasMobileExp).toBe(true);

    await page.screenshot({
      path: 'tests/screenshots/mobile-overlay-open.png',
      fullPage: false,
    });
  });

  test('mobile-exp host has position:fixed covering the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await waitForSearchBar(page);
    await focusSearchInput(page);

    await page.waitForFunction(() =>
      document.querySelector('ol-search-bar')?.classList.contains('mobile-exp'),
      { timeout: 2000 }
    );

    const { position, width, height } = await page.evaluate(() => {
      const sb = document.querySelector('ol-search-bar');
      const style = getComputedStyle(sb);
      const box = sb.getBoundingClientRect();
      return { position: style.position, width: box.width, height: box.height };
    });

    expect(position).toBe('fixed');
    expect(width).toBeLessThanOrEqual(375);
    expect(height).toBeGreaterThan(600);
  });

  test('back button dismisses the overlay', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await waitForSearchBar(page);
    await focusSearchInput(page);

    await page.waitForFunction(() =>
      document.querySelector('ol-search-bar')?.classList.contains('mobile-exp'),
      { timeout: 2000 }
    );

    // Click the back button inside the shadow DOM
    await page.evaluate(() => {
      const sb = document.querySelector('ol-search-bar');
      const btn = sb?.shadowRoot?.querySelector('.mob-back-btn');
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });

    await page.waitForFunction(() =>
      !document.querySelector('ol-search-bar')?.classList.contains('mobile-exp'),
      { timeout: 2000 }
    );

    const dismissed = await page.evaluate(() =>
      !document.querySelector('ol-search-bar')?.classList.contains('mobile-exp')
    );
    expect(dismissed).toBe(true);

    await page.screenshot({
      path: 'tests/screenshots/mobile-overlay-dismissed.png',
      fullPage: false,
    });
  });

  test('Escape key dismisses the overlay', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await waitForSearchBar(page);
    await focusSearchInput(page);

    await page.waitForFunction(() =>
      document.querySelector('ol-search-bar')?.classList.contains('mobile-exp'),
      { timeout: 2000 }
    );

    await page.keyboard.press('Escape');

    await page.waitForFunction(() =>
      !document.querySelector('ol-search-bar')?.classList.contains('mobile-exp'),
      { timeout: 2000 }
    );

    const dismissed = await page.evaluate(() =>
      !document.querySelector('ol-search-bar')?.classList.contains('mobile-exp')
    );
    expect(dismissed).toBe(true);
  });
});

test.describe('desktop — no overlay regression', () => {
  test('focusing search input on desktop does NOT add mobile-exp class', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await waitForSearchBar(page);
    await focusSearchInput(page);

    // Give it time to settle — the class should NOT appear
    await page.waitForTimeout(300);

    const hasMobileExp = await page.evaluate(() =>
      document.querySelector('ol-search-bar')?.classList.contains('mobile-exp')
    );
    expect(hasMobileExp).toBe(false);
  });
});
