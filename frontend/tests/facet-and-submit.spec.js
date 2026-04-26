/**
 * ol-search-bar facet dropdown dismissal (issue #21) and submit (issue #22).
 *
 * ol-search-bar lives inside ol-header's shadow DOM, so all page.evaluate()
 * helpers traverse: document → ol-header.shadowRoot → ol-search-bar.
 */

import { test, expect } from '@playwright/test';

async function waitForCustomElements(page) {
  await page.waitForFunction(() =>
    customElements.get('ol-search-bar') !== undefined &&
    customElements.get('ol-facet-drop') !== undefined
  );
}

/** Open the search panel then click the first facet button. */
async function openPanelAndFacet(page) {
  // Click the trigger button (droppable/header mode — the panel lives here)
  await page.evaluate(() => {
    const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
    sb?.shadowRoot?.querySelector('.trigger-btn')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  });

  await page.waitForFunction(() => {
    const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
    return sb?.shadowRoot?.querySelector('.panel') !== null;
  });

  // Click the first facet button (Availability)
  await page.evaluate(() => {
    const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
    sb?.shadowRoot?.querySelector('.pf-btn')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  });

  await page.waitForFunction(() => {
    const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
    return sb?.shadowRoot?.querySelector('ol-facet-drop') !== null;
  }, { timeout: 3000 });
}

// ── Issue #21: clicking panel chips / background while facet is open should dismiss it ──

test.describe('facet dropdown dismissal (issue #21)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await waitForCustomElements(page);
    await page.locator('ol-search-bar').waitFor({ state: 'attached' });
  });

  test('clicking .panel-chips closes an open facet dropdown', async ({ page }) => {
    await openPanelAndFacet(page);

    const openBefore = await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.shadowRoot?.querySelector('ol-facet-drop') !== null;
    });
    expect(openBefore).toBe(true);

    // Click panel-chips — inside ol-search-bar but outside ol-facet-drop
    await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      sb?.shadowRoot?.querySelector('.panel-chips')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });

    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.shadowRoot?.querySelector('ol-facet-drop') === null;
    }, { timeout: 2000 });

    const gone = await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.shadowRoot?.querySelector('ol-facet-drop') === null;
    });
    expect(gone).toBe(true);
  });

  test('clicking inside ol-facet-drop keeps it open', async ({ page }) => {
    await openPanelAndFacet(page);

    await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      const drop = sb?.shadowRoot?.querySelector('ol-facet-drop');
      drop?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });

    await page.waitForTimeout(200);

    const stillOpen = await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.shadowRoot?.querySelector('ol-facet-drop') !== null;
    });
    expect(stillOpen).toBe(true);
  });
});

// ── Issue #22: clicking the submit button fires ol-search event ──

test.describe('submit button (issue #22)', () => {
  test('clicking the magnifying glass dispatches an ol-search event', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await waitForCustomElements(page);
    await page.locator('ol-search-bar').waitFor({ state: 'attached' });

    await page.evaluate(() => {
      window.__olSearchFired = false;
      document.addEventListener('ol-search', () => { window.__olSearchFired = true; }, { once: true });
    });

    // Open the panel, then type into the panel-input
    await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      sb?.shadowRoot?.querySelector('.trigger-btn')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });
    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.shadowRoot?.querySelector('.panel-input') !== null;
    });

    await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      const input = sb?.shadowRoot?.querySelector('.panel-input');
      if (input) {
        input.value = 'frankenstein';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Click the submit button inside the panel
    await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      sb?.shadowRoot?.querySelector('.panel .submit')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });

    await page.waitForFunction(() => window.__olSearchFired === true, { timeout: 2000 });

    const fired = await page.evaluate(() => window.__olSearchFired);
    expect(fired).toBe(true);
  });
});
