/**
 * Regression tests for mobile overlay facet dropdown layout stability.
 *
 * Root cause: @media (max-width: 600px) sets overflow-x:auto on .pf-bar, which
 * the CSS spec forces to also set overflow-y:auto, turning .pf-bar into a scroll
 * container. When ol-facet-drop.firstUpdated() focuses its search input, the
 * browser auto-scrolls .pf-bar to bring the input into view — scrolling all facet
 * buttons off-screen (Availability disappears left). The Author facet triggers this
 * most visibly because its search-inline input is focused on open.
 *
 * Fix: :host(.mobile-exp) .pf-bar { overflow: visible; flex-wrap: wrap; } with
 * higher specificity (0,2,0 > 0,1,0) overrides the media block in overlay mode.
 *
 * NOTE: ol-search-bar lives inside ol-header's shadow DOM, not in the light DOM,
 * so all evaluate() helpers traverse: document → ol-header.shadowRoot → ol-search-bar.
 */

import { test, expect } from '@playwright/test';

const MOBILE = { width: 375, height: 812 };

// Facet button order inside .pf-bar: avail(0) lang(1) genre(2) subject(3) author(4) sort(5) cog(6)
const FACET_IDX = { avail: 0, lang: 1, genre: 2, subject: 3, author: 4, sort: 5 };

async function waitForComponents(page) {
  await page.waitForFunction(() =>
    customElements.get('ol-search-bar') !== undefined &&
    customElements.get('ol-header') !== undefined &&
    customElements.get('ol-facet-drop') !== undefined
  );
}

/** Finds ol-search-bar inside ol-header's shadow DOM and clicks its trigger button. */
async function openMobileOverlay(page) {
  await waitForComponents(page);
  await page.evaluate(() => {
    const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
    sb?.shadowRoot?.querySelector('.trigger-btn')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  });
  await page.waitForFunction(() => {
    const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
    return sb?.classList.contains('mobile-exp') === true;
  }, { timeout: 3000 });
}

/** Clicks the nth .pf-btn (0-indexed) inside ol-search-bar's shadow DOM. */
async function clickFacetBtn(page, idx) {
  await page.evaluate((i) => {
    const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
    const btn = [...(sb?.shadowRoot?.querySelectorAll('.pf-btn') ?? [])][i];
    btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  }, idx);
}

/** Returns the BoundingClientRect (as plain object) of the nth .pf-btn, or null. */
async function pfBtnRect(page, idx) {
  return page.evaluate((i) => {
    const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
    const btn = [...(sb?.shadowRoot?.querySelectorAll('.pf-btn') ?? [])][i];
    const r = btn?.getBoundingClientRect();
    return r ? { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height } : null;
  }, idx);
}

// ── Main regression suite ─────────────────────────────────────────────────────

test.describe('mobile overlay — Author facet layout stability', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/');
  });

  test('Availability button stays on-screen after Author dropdown opens', async ({ page }) => {
    await openMobileOverlay(page);

    // Baseline: Availability button must already be visible
    const availBefore = await pfBtnRect(page, FACET_IDX.avail);
    expect(availBefore).not.toBeNull();
    expect(availBefore.top).toBeGreaterThanOrEqual(0);
    expect(availBefore.height).toBeGreaterThan(0);

    // Open Author facet
    await clickFacetBtn(page, FACET_IDX.author);
    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.shadowRoot?.querySelector('ol-facet-drop') !== null;
    }, { timeout: 2000 });

    // Allow focus + scroll events to fully settle
    await page.waitForTimeout(300);

    await page.screenshot({ path: 'tests/screenshots/mobile-author-facet-open.png' });

    const availAfter = await pfBtnRect(page, FACET_IDX.avail);
    expect(availAfter).not.toBeNull();

    // Availability button must still be within the visible viewport
    expect(availAfter.top).toBeGreaterThanOrEqual(0);
    expect(availAfter.bottom).toBeGreaterThan(0);
    expect(availAfter.bottom).toBeLessThanOrEqual(MOBILE.height);
    expect(availAfter.height).toBeGreaterThan(0);

    // Must not have shifted vertically — the Author dropdown opens below the bar
    expect(Math.abs(availAfter.top - availBefore.top)).toBeLessThan(8);
  });

  test('.pf-bar is not a scroll container inside the mobile overlay', async ({ page }) => {
    await openMobileOverlay(page);

    const overflow = await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      const bar = sb?.shadowRoot?.querySelector('.pf-bar');
      if (!bar) return null;
      const cs = getComputedStyle(bar);
      return { x: cs.overflowX, y: cs.overflowY };
    });

    expect(overflow).not.toBeNull();
    // 'auto' or 'scroll' would create a scroll container that clips position:absolute children
    expect(overflow.x).not.toBe('auto');
    expect(overflow.x).not.toBe('scroll');
    expect(overflow.y).not.toBe('auto');
    expect(overflow.y).not.toBe('scroll');
  });

  test('ol-facet-drop for Author is not clipped — has meaningful visible height', async ({ page }) => {
    await openMobileOverlay(page);
    await clickFacetBtn(page, FACET_IDX.author);

    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.shadowRoot?.querySelector('ol-facet-drop') !== null;
    }, { timeout: 2000 });

    await page.waitForTimeout(300);

    const dropRect = await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      const drop = sb?.shadowRoot?.querySelector('ol-facet-drop');
      const r = drop?.getBoundingClientRect();
      return r ? { top: r.top, bottom: r.bottom, height: r.height } : null;
    });

    expect(dropRect).not.toBeNull();
    // Dropdown must have real content height — if clipped, height would be ~0
    expect(dropRect.height).toBeGreaterThan(50);
    // Must be inside (or near) the viewport vertically
    expect(dropRect.bottom).toBeGreaterThan(0);

    await page.screenshot({ path: 'tests/screenshots/mobile-author-drop-visible.png' });
  });

  test('first-half facets open left-aligned; second-half facets open right-aligned', async ({ page }) => {
    await openMobileOverlay(page);

    // Facet order: avail(0) lang(1) genre(2) | subject(3) author(4) sort(5)
    // Mid = floor((6-1)/2) = 2, so indices 0-2 → left-aligned, 3-5 → right-aligned.
    const leftFacets  = [FACET_IDX.avail, FACET_IDX.lang, FACET_IDX.genre];
    const rightFacets = [FACET_IDX.subject, FACET_IDX.author, FACET_IDX.sort];

    for (const idx of leftFacets) {
      await clickFacetBtn(page, idx);
      await page.waitForFunction(() => {
        const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
        return sb?.shadowRoot?.querySelector('ol-facet-drop') !== null;
      }, { timeout: 2000 });

      // ol-facet-drop must NOT have the [right] attribute
      const hasRight = await page.evaluate(() => {
        const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
        return sb?.shadowRoot?.querySelector('ol-facet-drop')?.hasAttribute('right') ?? null;
      });
      expect(hasRight).toBe(false);

      // Close it before opening the next
      await clickFacetBtn(page, idx);
      await page.waitForFunction(() => {
        const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
        return sb?.shadowRoot?.querySelector('ol-facet-drop') === null;
      }, { timeout: 1000 });
    }

    for (const idx of rightFacets) {
      await clickFacetBtn(page, idx);
      await page.waitForFunction(() => {
        const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
        return sb?.shadowRoot?.querySelector('ol-facet-drop') !== null;
      }, { timeout: 2000 });

      // ol-facet-drop MUST have the [right] attribute
      const hasRight = await page.evaluate(() => {
        const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
        return sb?.shadowRoot?.querySelector('ol-facet-drop')?.hasAttribute('right') ?? null;
      });
      expect(hasRight).toBe(true);

      await clickFacetBtn(page, idx);
      await page.waitForFunction(() => {
        const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
        return sb?.shadowRoot?.querySelector('ol-facet-drop') === null;
      }, { timeout: 1000 });
    }
  });

  test('other facets remain visible and not displaced when Author is open', async ({ page }) => {
    await openMobileOverlay(page);

    // Capture all non-cog facet button rects before opening Author
    const rectsBefore = await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      const btns = [...(sb?.shadowRoot?.querySelectorAll('.pf-btn') ?? [])].slice(0, 6);
      return btns.map(b => {
        const r = b.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, left: r.left, height: r.height };
      });
    });

    await clickFacetBtn(page, FACET_IDX.author);
    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.shadowRoot?.querySelector('ol-facet-drop') !== null;
    }, { timeout: 2000 });
    await page.waitForTimeout(300);

    const rectsAfter = await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      const btns = [...(sb?.shadowRoot?.querySelectorAll('.pf-btn') ?? [])].slice(0, 6);
      return btns.map(b => {
        const r = b.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, left: r.left, height: r.height };
      });
    });

    // Every facet button must still be on-screen and must not have shifted vertically
    for (let i = 0; i < rectsBefore.length; i++) {
      expect(rectsAfter[i].height).toBeGreaterThan(0);        // not collapsed/clipped
      expect(rectsAfter[i].top).toBeGreaterThanOrEqual(0);    // still on screen
      expect(Math.abs(rectsAfter[i].top - rectsBefore[i].top)).toBeLessThan(8);  // no layout shift
    }
  });
});
