import { test } from '@playwright/test';

test('debug overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.waitForTimeout(1000);

  const info = await page.evaluate(() => {
    function checkEl(el, path) {
      const rect = el.getBoundingClientRect();
      const results = [];
      if (rect.right > 376) {
        results.push({
          path,
          tag: el.tagName,
          class: el.className?.toString?.() || '',
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        });
      }
      if (el.shadowRoot) {
        el.shadowRoot.querySelectorAll('*').forEach(child => {
          results.push(...checkEl(child, path + ' >> shadow >> ' + child.tagName + '.' + (child.className?.toString?.() || '')));
        });
      }
      return results;
    }

    const all = [];
    document.querySelectorAll('*').forEach(el => all.push(...checkEl(el, el.tagName)));

    // Check ol-search-bar inside ol-header shadow DOM
    const header = document.querySelector('ol-header');
    const searchBar = header?.shadowRoot?.querySelector('ol-search-bar');
    const searchBarInner = searchBar?.shadowRoot?.querySelector('.bar, .input-row, .container');

    return {
      scrollWidth: document.documentElement.scrollWidth,
      overflowing: all.slice(0, 20),
      searchBarRect: searchBar ? { width: searchBar.getBoundingClientRect().width, right: searchBar.getBoundingClientRect().right } : null,
      searchBarInnerWidth: searchBarInner ? { class: searchBarInner.className, width: getComputedStyle(searchBarInner).width, minWidth: getComputedStyle(searchBarInner).minWidth } : null,
    };
  });
  console.log(JSON.stringify(info, null, 2));
});
