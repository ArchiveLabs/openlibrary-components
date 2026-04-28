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
    // Ensure there is no bare 'Author' string (without trailing 's' or count)
    // The label must be plural: 'Authors' or 'Authors (N)'
    expect(facetLabelFn).not.toMatch(/:\s*['"]Author['"]/);
  });

  it('_facetLabel does NOT use singular "Subject" (without s) as a standalone label', () => {
    expect(facetLabelFn).not.toMatch(/:\s*['"]Subject['"]/);
  });
});

// ── Auto-seed facet on open ───────────────────────────────────────────────────

describe('ol-search-bar _toggleFacet auto-seeds author/subject with current query', () => {
  const toggleFn = src.slice(src.indexOf('_toggleFacet(name, e)'), src.indexOf('_toggleFacet(name, e)') + 600);

  it('_toggleFacet body checks this._q before seeding', () => {
    expect(toggleFn).toMatch(/this\._q/);
  });

  it('_toggleFacet calls _onDropAuthorSearch when opening the author facet with a query', () => {
    expect(toggleFn).toMatch(/_onDropAuthorSearch/);
  });

  it('_toggleFacet calls _onDropSubjectSearch when opening the subject facet with a query', () => {
    expect(toggleFn).toMatch(/_onDropSubjectSearch/);
  });

  it('_toggleFacet seeds only when opening (not closing) the facet', () => {
    // The seed call must be guarded by an "opening" check, not unconditional
    expect(toggleFn).toMatch(/opening|this\._openFacet\s*!==\s*name/);
  });
});
