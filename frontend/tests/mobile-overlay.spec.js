/**
 * ol-search-bar mobile overlay tests (issue #23).
 *
 * ol-search-bar lives inside ol-header's shadow DOM, so all page.evaluate()
 * helpers traverse: document → ol-header.shadowRoot → ol-search-bar.
 * Playwright's page.locator() pierces shadow DOM automatically; native
 * document.querySelector() does not.
 */

import { test, expect } from '@playwright/test';

async function waitForSearchBar(page) {
  await page.waitForFunction(() => customElements.get('ol-search-bar') !== undefined);
  await page.locator('ol-search-bar').waitFor({ state: 'attached' });
}

/** Click the trigger button to open the search panel / mobile overlay. */
async function openSearch(page) {
  await page.evaluate(() => {
    const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
    sb?.shadowRoot?.querySelector('.trigger-btn')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  });
}

// ── Issue #23: full-screen mobile overlay ────────────────────────

test.describe('mobile full-screen overlay (issue #23)', () => {
  test('focusing search input on mobile adds mobile-exp class to host', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await waitForSearchBar(page);

    await openSearch(page);

    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.classList.contains('mobile-exp') === true;
    }, { timeout: 2000 });

    const hasMobileExp = await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.classList.contains('mobile-exp') ?? false;
    });
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
    await openSearch(page);

    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.classList.contains('mobile-exp') === true;
    }, { timeout: 2000 });

    const { position, width, height } = await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
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
    await openSearch(page);

    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.classList.contains('mobile-exp') === true;
    }, { timeout: 2000 });

    await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      sb?.shadowRoot?.querySelector('.mob-back-btn')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });

    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.classList.contains('mobile-exp') === false;
    }, { timeout: 2000 });

    const dismissed = await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return !sb?.classList.contains('mobile-exp');
    });
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
    await openSearch(page);

    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.classList.contains('mobile-exp') === true;
    }, { timeout: 2000 });

    await page.keyboard.press('Escape');

    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.classList.contains('mobile-exp') === false;
    }, { timeout: 2000 });

    const dismissed = await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return !sb?.classList.contains('mobile-exp');
    });
    expect(dismissed).toBe(true);
  });
});

// ── Body scroll lock (issue #44) ──────────────────────────────────────────────
//
// Written BEFORE the documentElement scroll-lock fix so they fail red first.
// The previous fix locked document.body but not document.documentElement;
// many browsers/frameworks scroll <html>, so the page behind the overlay
// remained scrollable and a full-page scrollbar appeared.

test.describe('mobile overlay — body scroll lock', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await waitForSearchBar(page);
  });

  test('document.body and documentElement have overflow:hidden while overlay is open', async ({ page }) => {
    await openSearch(page);

    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.classList.contains('mobile-exp') === true;
    }, { timeout: 2000 });

    const overflow = await page.evaluate(() => ({
      body: getComputedStyle(document.body).overflow,
      html: getComputedStyle(document.documentElement).overflow,
    }));

    expect(overflow.body).toBe('hidden');
    expect(overflow.html).toBe('hidden');
  });

  test('body and documentElement overflow is restored after overlay closes', async ({ page }) => {
    await openSearch(page);

    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.classList.contains('mobile-exp') === true;
    }, { timeout: 2000 });

    // Close via back button
    await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      sb?.shadowRoot?.querySelector('.mob-back-btn')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });

    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.classList.contains('mobile-exp') === false;
    }, { timeout: 2000 });

    const overflow = await page.evaluate(() => ({
      body: document.body.style.overflow,
      html: document.documentElement.style.overflow,
    }));

    expect(overflow.body).toBe('');
    expect(overflow.html).toBe('');
  });
});

test.describe('desktop — no overlay regression', () => {
  test('clicking search trigger on desktop does NOT add mobile-exp class', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await waitForSearchBar(page);
    await openSearch(page);

    // Give Lit time to update
    await page.waitForTimeout(300);

    const hasMobileExp = await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.classList.contains('mobile-exp') ?? false;
    });
    expect(hasMobileExp).toBe(false);
  });
});

// ── Desktop droppable — body scroll lock ─────────────────────────────────────
//
// Written BEFORE the fix that extended scroll locking from mobile-only to all
// droppable modes.  These tests fail red on the old code and go green once
// updated() gates the lock on _open && showFacets instead of _mobileExpanded.

test.describe('desktop droppable — body scroll lock', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await waitForSearchBar(page);
  });

  test('body and documentElement have overflow:hidden while droppable panel is open', async ({ page }) => {
    await openSearch(page);

    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?._open === true;
    }, { timeout: 2000 });

    const overflow = await page.evaluate(() => ({
      body: getComputedStyle(document.body).overflow,
      html: getComputedStyle(document.documentElement).overflow,
    }));

    expect(overflow.body).toBe('hidden');
    expect(overflow.html).toBe('hidden');
  });

  test('body and documentElement overflow is restored after panel closes', async ({ page }) => {
    await openSearch(page);

    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?._open === true;
    }, { timeout: 2000 });

    await page.keyboard.press('Escape');

    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?._open === false;
    }, { timeout: 2000 });

    const overflow = await page.evaluate(() => ({
      body: document.body.style.overflow,
      html: document.documentElement.style.overflow,
    }));

    expect(overflow.body).toBe('');
    expect(overflow.html).toBe('');
  });
});
