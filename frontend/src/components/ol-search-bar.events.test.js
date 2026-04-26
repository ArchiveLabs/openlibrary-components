/**
 * Static-analysis contract for ol-search-bar public event API.
 *
 * Both embedded (showFacets=false) and droppable (showFacets=true) modes must
 * fire the same events with the same payload shapes so hosts don't need mode-
 * specific listeners.
 */

import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

const searchBarSrc  = readFileSync(new URL('./ol-search-bar.js',  import.meta.url), 'utf8');
const searchPageSrc = readFileSync(new URL('./ol-search-page.js', import.meta.url), 'utf8');

describe('ol-search-bar event API — unified ol-filter-change', () => {
  it('ol-search-bar source does not dispatch ol-chip-remove', () => {
    expect(searchBarSrc).not.toMatch(/ol-chip-remove/);
  });

  it('ol-search-page source does not listen for ol-chip-remove', () => {
    expect(searchPageSrc).not.toMatch(/ol-chip-remove/);
  });

  it('ol-search-bar dispatches ol-filter-change in _handleChipRemove', () => {
    const chipRemoveFn = searchBarSrc.slice(
      searchBarSrc.indexOf('_handleChipRemove'),
      searchBarSrc.indexOf('_handleChipRemove') + 1500,
    );
    expect(chipRemoveFn).toMatch(/ol-filter-change/);
  });

  it('ol-search-page _onFilterChange handles all seven filter fields', () => {
    const handler = searchPageSrc.slice(
      searchPageSrc.lastIndexOf('_onFilterChange'),
      searchPageSrc.lastIndexOf('_onFilterChange') + 800,
    );
    for (const field of ['sort', 'availability', 'fictionFilter', 'languages', 'genres', 'authors', 'subjects']) {
      expect(handler).toContain(`'${field}'`);
    }
  });
});
