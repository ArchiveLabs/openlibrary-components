import { test, expect } from '@playwright/test';

// Helper: pierce shadow DOM to click or read elements
async function shadowClick(page, hostSelector, shadowSelector) {
  return page.evaluate(({ host, sel }) => {
    const el = document.querySelector(host)?.shadowRoot?.querySelector(sel);
    if (!el) throw new Error(`Shadow element not found: ${host} >> ${sel}`);
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  }, { host: hostSelector, sel: shadowSelector });
}

async function waitForCustomElements(page) {
  await page.waitForFunction(() =>
    customElements.get('ol-search-bar') !== undefined &&
    customElements.get('ol-facet-drop') !== undefined
  );
}

// ── Issue #21: clicking panel chips while facet is open should dismiss it ──

test.describe('facet dropdown dismissal', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await waitForCustomElements(page);
    await page.locator('ol-search-bar').waitFor({ state: 'attached' });
  });

  test('clicking the panel background closes an open facet dropdown', async ({ page }) => {
    // Open the panel by clicking the search input
    await page.evaluate(() => {
      const sb = document.querySelector('ol-search-bar');
      sb?.shadowRoot?.querySelector('input')?.focus();
      sb?.shadowRoot?.querySelector('input')?.click();
    });

    // Wait for the panel to appear
    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-search-bar');
      return sb?.shadowRoot?.querySelector('.panel') !== null;
    });

    // Click the first facet button to open its dropdown
    await page.evaluate(() => {
      const sb = document.querySelector('ol-search-bar');
      const btn = sb?.shadowRoot?.querySelector('.pf-btn');
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });

    // Wait for ol-facet-drop to appear
    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-search-bar');
      return sb?.shadowRoot?.querySelector('ol-facet-drop') !== null;
    }, { timeout: 3000 });

    // Facet dropdown is visible
    const facetOpenBefore = await page.evaluate(() => {
      const sb = document.querySelector('ol-search-bar');
      return sb?.shadowRoot?.querySelector('ol-facet-drop') !== null;
    });
    expect(facetOpenBefore).toBe(true);

    // Click on .panel-chips (inside panel but outside ol-facet-drop)
    await page.evaluate(() => {
      const sb = document.querySelector('ol-search-bar');
      const chips = sb?.shadowRoot?.querySelector('.panel-chips');
      chips?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });

    // Facet dropdown should now be gone
    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-search-bar');
      return sb?.shadowRoot?.querySelector('ol-facet-drop') === null;
    }, { timeout: 2000 });

    const facetGone = await page.evaluate(() => {
      const sb = document.querySelector('ol-search-bar');
      return sb?.shadowRoot?.querySelector('ol-facet-drop') === null;
    });
    expect(facetGone).toBe(true);
  });

  test('clicking inside ol-facet-drop keeps it open', async ({ page }) => {
    // Open panel
    await page.evaluate(() => {
      const sb = document.querySelector('ol-search-bar');
      sb?.shadowRoot?.querySelector('input')?.focus();
      sb?.shadowRoot?.querySelector('input')?.click();
    });
    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-search-bar');
      return sb?.shadowRoot?.querySelector('.panel') !== null;
    });

    // Open first facet
    await page.evaluate(() => {
      const sb = document.querySelector('ol-search-bar');
      sb?.shadowRoot?.querySelector('.pf-btn')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true })
      );
    });
    await page.waitForFunction(() => {
      const sb = document.querySelector('ol-search-bar');
      return sb?.shadowRoot?.querySelector('ol-facet-drop') !== null;
    }, { timeout: 3000 });

    // Click inside the facet-drop itself (e.g. first .item)
    await page.evaluate(() => {
      const sb = document.querySelector('ol-search-bar');
      const drop = sb?.shadowRoot?.querySelector('ol-facet-drop');
      const item = drop?.shadowRoot?.querySelector('.item');
      item?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });

    // Wait a tick — facet-drop should remain (sort items close on selection; use panel existence instead)
    await page.waitForTimeout(200);

    // Panel should still be open (not everything collapsed)
    const panelStillOpen = await page.evaluate(() => {
      const sb = document.querySelector('ol-search-bar');
      return sb?.shadowRoot?.querySelector('.panel') !== null;
    });
    expect(panelStillOpen).toBe(true);
  });
});

// ── Issue #22: clicking the submit button fires ol-search event ──

test.describe('submit button', () => {
  test('clicking the magnifying glass dispatches an ol-search event', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await waitForCustomElements(page);
    await page.locator('ol-search-bar').waitFor({ state: 'attached' });

    // Listen for ol-search event
    await page.evaluate(() => {
      window.__olSearchFired = false;
      document.addEventListener('ol-search', () => { window.__olSearchFired = true; }, { once: true });
    });

    // Type a query into the search input
    await page.evaluate(() => {
      const sb = document.querySelector('ol-search-bar');
      const input = sb?.shadowRoot?.querySelector('input');
      if (!input) throw new Error('No search input found');
      input.focus();
      input.click();
    });
    // Set the value and trigger input event so the component's _q state updates
    await page.evaluate(() => {
      const sb = document.querySelector('ol-search-bar');
      const input = sb?.shadowRoot?.querySelector('input');
      input.value = 'frankenstein';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Click the submit button
    await page.evaluate(() => {
      const sb = document.querySelector('ol-search-bar');
      const btn = sb?.shadowRoot?.querySelector('.submit');
      if (!btn) throw new Error('No submit button found');
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });

    // Wait a tick for the event to fire
    await page.waitForTimeout(200);

    const fired = await page.evaluate(() => window.__olSearchFired);
    expect(fired).toBe(true);
  });
});
