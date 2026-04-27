/**
 * ol-search-bar facet dropdown dismissal (issue #21) and submit (issue #22).
 *
 * ol-search-bar lives inside ol-header's shadow DOM, so all page.evaluate()
 * helpers traverse: document → ol-header.shadowRoot → ol-search-bar.
 *
 * TDD note: navigation tests (issue #44) were written BEFORE the _submit()
 * navigation fix so they would fail red and prove the regression, then go
 * green once _buildSearchUrl + cancelable-event logic was added.
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
  await page.evaluate(() => {
    const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
    sb?.shadowRoot?.querySelector('.trigger-btn')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  });

  await page.waitForFunction(() => {
    const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
    return sb?.shadowRoot?.querySelector('.panel') !== null;
  });

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

/** Open the panel and type a query into the panel-input. */
async function openPanelAndType(page, query) {
  await page.evaluate(() => {
    const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
    sb?.shadowRoot?.querySelector('.trigger-btn')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  });
  await page.waitForFunction(() => {
    const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
    return sb?.shadowRoot?.querySelector('.panel-input') !== null;
  });
  await page.evaluate((q) => {
    const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
    const input = sb?.shadowRoot?.querySelector('.panel-input');
    if (input) {
      input.value = q;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, query);
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

// ── Issue #22: submit dispatches ol-search ──

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

    await openPanelAndType(page, 'frankenstein');

    await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      sb?.shadowRoot?.querySelector('.panel .submit')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });

    await page.waitForFunction(() => window.__olSearchFired === true, { timeout: 2000 });
    expect(await page.evaluate(() => window.__olSearchFired)).toBe(true);
  });
});

// ── Issue #44: droppable submit navigates to search URL ──
//
// These tests were written BEFORE the navigation fix was implemented (TDD).
// They failed red until _submit() added URL navigation for showFacets=true mode.

test.describe('droppable submit navigation (issue #44)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    // Intercept any navigation to the OL search page so the test stays on localhost.
    // The route fulfils with a stub so waitForURL() can resolve without hitting the network.
    await page.route('**/search?**', route =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>stub</body></html>' })
    );
    await page.goto('/');
    await waitForCustomElements(page);
    await page.locator('ol-search-bar').waitFor({ state: 'attached' });
  });

  test('clicking the submit button navigates to /search?q=<query>', async ({ page }) => {
    await openPanelAndType(page, 'frankenstein');

    const navPromise = page.waitForURL(/\/search\?.*q=/, { timeout: 4000 });
    await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      sb?.shadowRoot?.querySelector('.panel .submit')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });
    await navPromise;

    expect(page.url()).toMatch(/\/search\?.*q=frankenstein/);
  });

  test('pressing Enter in the panel-input navigates to /search?q=<query>', async ({ page }) => {
    await openPanelAndType(page, 'frankenstein');

    const navPromise = page.waitForURL(/\/search\?.*q=/, { timeout: 4000 });
    // Focus the input then dispatch Enter keydown
    await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      const input = sb?.shadowRoot?.querySelector('.panel-input');
      input?.focus();
      input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    });
    await navPromise;

    expect(page.url()).toMatch(/\/search\?.*q=frankenstein/);
  });

  test('"See all N results" button navigates to /search?q=<query>', async ({ page }) => {
    await openPanelAndType(page, 'frankenstein');

    // Wait for autocomplete to fetch so the "See all" button appears
    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.shadowRoot?.querySelector('.ac-see-all') !== null;
    }, { timeout: 5000 });

    const navPromise = page.waitForURL(/\/search\?.*q=/, { timeout: 4000 });
    await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      sb?.shadowRoot?.querySelector('.ac-see-all')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });
    await navPromise;

    expect(page.url()).toMatch(/\/search\?.*q=frankenstein/);
  });

  test('active filters are included in the navigation URL', async ({ page }) => {
    // Set an availability filter directly on the droppable ol-search-bar's local state,
    // then submit — the resulting URL must include the availability param.
    await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      sb?.shadowRoot?.querySelector('.trigger-btn')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });
    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      return sb?.shadowRoot?.querySelector('.panel-input') !== null;
    });

    // Type a query and set a filter via ol-filter-change event on the component
    await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      const input = sb?.shadowRoot?.querySelector('.panel-input');
      if (input) { input.value = 'frankenstein'; input.dispatchEvent(new Event('input', { bubbles: true })); }
      // Directly mutate _localFilters to simulate a filter selection
      if (sb) sb._localFilters = { ...sb._localFilters, availability: 'readable' };
    });

    const navPromise = page.waitForURL(/\/search\?.*q=/, { timeout: 4000 });
    await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      sb?.shadowRoot?.querySelector('.panel .submit')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });
    await navPromise;

    expect(page.url()).toMatch(/q=frankenstein/);
    expect(page.url()).toMatch(/availability=readable/);
  });

  test('ol-search event is cancelable — calling preventDefault() suppresses navigation', async ({ page }) => {
    // A host that handles ol-search itself can prevent the fallback URL navigation.
    await page.evaluate(() => {
      document.addEventListener('ol-search', e => e.preventDefault(), { once: true });
    });

    await openPanelAndType(page, 'frankenstein');

    await page.evaluate(() => {
      const sb = document.querySelector('ol-header')?.shadowRoot?.querySelector('ol-search-bar');
      sb?.shadowRoot?.querySelector('.panel .submit')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });

    // Wait a beat — if navigation happened despite preventDefault, the URL would change.
    await page.waitForTimeout(800);
    expect(page.url()).not.toMatch(/\/search\?/);
  });
});
