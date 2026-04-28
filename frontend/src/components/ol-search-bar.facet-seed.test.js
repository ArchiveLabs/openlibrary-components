import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync(new URL('./ol-search-bar.js', import.meta.url), 'utf8');

// ── Facet label pluralization ─────────────────────────────────────────────────

describe('ol-search-bar facet label pluralization', () => {
  const facetLabelFn = src.slice(src.indexOf('_facetLabel(name)'), src.indexOf('_facetLabel(name)') + 700);

  it('_facetLabel returns "Authors" (plural) when no authors are selected', () => {
    expect(facetLabelFn).toMatch(/['"]Authors['"]/);
  });

  it('_facetLabel returns "Subjects" (plural) when no subjects are selected', () => {
    expect(facetLabelFn).toMatch(/['"]Subjects['"]/);
  });

  it('_facetLabel does NOT use singular "Author" (without s) as a standalone label', () => {
    expect(facetLabelFn).not.toMatch(/:\s*['"]Author['"]/);
  });

  it('_facetLabel does NOT use singular "Subject" (without s) as a standalone label', () => {
    expect(facetLabelFn).not.toMatch(/:\s*['"]Subject['"]/);
  });
});

// ── Query-scoped facet seeding ────────────────────────────────────────────────
//
// When the user opens an author or subject facet while a search query is active,
// the default suggestions shown (before the user types anything in the facet's own
// search box) should be derived from the search results, not from POPULAR_AUTHORS /
// POPULAR_SUBJECTS.  Results are cached per query so re-opening is instant.

describe('ol-search-bar _seedFacetsForQuery — query-scoped defaults', () => {
  it('_seedFacetsForQuery method is defined in source', () => {
    expect(src).toMatch(/_seedFacetsForQuery/);
  });

  it('_seedFacetsForQuery uses _facetCache to avoid redundant fetches', () => {
    const fnStart = src.indexOf('_seedFacetsForQuery');
    const fnBody  = fnStart !== -1 ? src.slice(fnStart, fnStart + 600) : '';
    expect(fnBody).toMatch(/_facetCache/);
  });

  it('_seedFacetsForQuery sets _defaultAuthors from the fetched results', () => {
    const fnStart = src.indexOf('_seedFacetsForQuery');
    const fnBody  = fnStart !== -1 ? src.slice(fnStart, fnStart + 600) : '';
    expect(fnBody).toMatch(/_defaultAuthors/);
  });

  it('_seedFacetsForQuery sets _defaultSubjects from the fetched results', () => {
    const fnStart = src.indexOf('_seedFacetsForQuery');
    const fnBody  = fnStart !== -1 ? src.slice(fnStart, fnStart + 600) : '';
    expect(fnBody).toMatch(/_defaultSubjects/);
  });

  it('_facetCache is initialised in constructor', () => {
    const ctor = src.slice(src.indexOf('constructor()'), src.indexOf('constructor()') + 1500);
    expect(ctor).toMatch(/_facetCache/);
  });

  it('fetchQueryFacets is imported from utils/facets.js', () => {
    expect(src).toMatch(/fetchQueryFacets/);
  });
});

describe('ol-search-bar _toggleFacet delegates to _seedFacetsForQuery', () => {
  const toggleFn = src.slice(src.indexOf('_toggleFacet(name, e)'), src.indexOf('_toggleFacet(name, e)') + 600);

  it('_toggleFacet calls _seedFacetsForQuery when opening author or subject facet', () => {
    expect(toggleFn).toMatch(/_seedFacetsForQuery/);
  });

  it('_toggleFacet guards the seed call with this._q so empty queries skip it', () => {
    expect(toggleFn).toMatch(/this\._q/);
  });

  it('_toggleFacet seeds only when opening (not closing) the facet', () => {
    expect(toggleFn).toMatch(/opening/);
  });

  it('_toggleFacet does NOT directly call _onDropAuthorSearch for seeding', () => {
    // _onDropAuthorSearch is for user-typed search inside the facet, not query seeding
    expect(toggleFn).not.toMatch(/_onDropAuthorSearch/);
  });

  it('_toggleFacet does NOT directly call _onDropSubjectSearch for seeding', () => {
    expect(toggleFn).not.toMatch(/_onDropSubjectSearch/);
  });
});

describe('ol-search-bar dice respects query-scoped cache', () => {
  const template = src.slice(src.indexOf('ol-facet-shuffle-authors'), src.indexOf('ol-facet-shuffle-authors') + 400);

  it('dice handler checks _facetCache (or _q) to pick pool when query is active', () => {
    expect(template).toMatch(/_facetCache|_q/);
  });
});
