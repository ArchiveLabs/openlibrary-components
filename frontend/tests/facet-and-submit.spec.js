import { test, expect } from '@playwright/test';

async function waitForCustomElements(page) {
  await page.waitForFunction(() =>
    customElements.get('ol-search-bar') !== undefined &&
    customElements.get('ol-facet-drop') !== undefined
  );
}

async function openPanelAndFacet(page) {
  // Open the search panel
  await page.evaluate(() => {
    const sb = document.querySelector('ol-search-bar');
    sb?.shadowRoot?.querySelector('input')?.focus();
    sb?.shadowRoot?.querySelector('input')?.click();
  });
  await page.waitForFunction(() => {
    const sb = document.querySelector('ol-search-bar');
    return sb?.shadowRoot?.querySelector('.panel') !== null;
  });

  // Open the first facet dropdown
  await page.evaluate(() => {
    const sb = document.querySelector('ol-search-bar');
    sb?.shadowRoot?.querySelector('.pf-btn')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true })
    );
  });

  // Wait for ol-facet-drop to appear
  await page.waitForFunction(() => {
    const sb = document.querySelector('ol-search-bar');
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

    // Confirm facet-drop is open
    const openBefore = await page.evaluate(() =>
      document.querySelector('ol-search-bar')?.shadowRoot?.querySelector('ol-facet-drop') !== null
    );
    expect(openBefore).toBe(true);

    // Click panel-chips — inside ol-search-bar but outside ol-facet-drop
    await page.evaluate(() => {
      const sb = document.querySelector('ol-search-bar');
      sb?.shadowRoot?.querySelector('.panel-chips')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true })
      );
    });

    // Facet-drop should be removed from the DOM
    await page.waitForFunction(() =>
      document.querySelector('ol-search-bar')?.shadowRoot?.querySelector('ol-facet-drop') === null,
      { timeout: 2000 }
    );

    const gone = await page.evaluate(() =>
      document.querySelector('ol-search-bar')?.shadowRoot?.querySelector('ol-facet-drop') === null
    );
    expect(gone).toBe(true);
  });

  test('clicking inside ol-facet-drop keeps it open', async ({ page }) => {
    await openPanelAndFacet(page);

    // Click the ol-facet-drop host itself — no interactive child triggered,
    // but composed path includes OL-FACET-DROP so _onDoc guard preserves it
    await page.evaluate(() => {
      const sb = document.querySelector('ol-search-bar');
      const drop = sb?.shadowRoot?.querySelector('ol-facet-drop');
      drop?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });

    // Brief settle
    await page.waitForTimeout(200);

    // ol-facet-drop must still be present
    const stillOpen = await page.evaluate(() =>
      document.querySelector('ol-search-bar')?.shadowRoot?.querySelector('ol-facet-drop') !== null
    );
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

    // Arm the listener before interacting
    await page.evaluate(() => {
      window.__olSearchFired = false;
      document.addEventListener('ol-search', () => { window.__olSearchFired = true; }, { once: true });
    });

    // Focus input and set query value
    await page.evaluate(() => {
      const sb = document.querySelector('ol-search-bar');
      const input = sb?.shadowRoot?.querySelector('input');
      input?.focus();
      input?.click();
      if (input) {
        input.value = 'frankenstein';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Click the submit button
    await page.evaluate(() => {
      const sb = document.querySelector('ol-search-bar');
      sb?.shadowRoot?.querySelector('.submit')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true })
      );
    });

    // Wait deterministically for the event rather than a fixed timeout
    await page.waitForFunction(() => window.__olSearchFired === true, { timeout: 2000 });

    const fired = await page.evaluate(() => window.__olSearchFired);
    expect(fired).toBe(true);
  });
});
