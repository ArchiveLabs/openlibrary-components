import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dir, 'ol-search-page.js'), 'utf8');

// ── Static properties contract ────────────────────────────────────────────────

describe('ol-search-page filter consolidation — static properties', () => {
  it('declares _filters as a single reactive state property', () => {
    expect(src).toMatch(/_filters\s*:\s*\{\s*state\s*:\s*true\s*\}/);
  });

  it('does not declare _sort as an individual reactive property', () => {
    expect(src).not.toMatch(/_sort\s*:\s*\{\s*state\s*:\s*true\s*\}/);
  });

  it('does not declare _availability as an individual reactive property', () => {
    expect(src).not.toMatch(/_availability\s*:\s*\{\s*state\s*:\s*true\s*\}/);
  });

  it('does not declare _fictionFilter as an individual reactive property', () => {
    expect(src).not.toMatch(/_fictionFilter\s*:\s*\{\s*state\s*:\s*true\s*\}/);
  });

  it('does not declare _languages as an individual reactive property', () => {
    expect(src).not.toMatch(/_languages\s*:\s*\{\s*state\s*:\s*true\s*\}/);
  });

  it('does not declare _genres as an individual reactive property', () => {
    expect(src).not.toMatch(/_genres\s*:\s*\{\s*state\s*:\s*true\s*\}/);
  });

  it('does not declare _authors as an individual reactive property', () => {
    expect(src).not.toMatch(/_authors\s*:\s*\{\s*state\s*:\s*true\s*\}/);
  });

  it('does not declare _subjects as an individual reactive property', () => {
    expect(src).not.toMatch(/_subjects\s*:\s*\{\s*state\s*:\s*true\s*\}/);
  });
});

// ── Constructor contract ───────────────────────────────────────────────────────

describe('ol-search-page filter consolidation — constructor', () => {
  it('initialises _filters from DEFAULT_FILTERS in constructor', () => {
    const ctor = src.slice(src.indexOf('constructor()'), src.indexOf('constructor()') + 600);
    expect(ctor).toMatch(/this\._filters\s*=\s*\{\s*\.\.\.DEFAULT_FILTERS\s*\}/);
  });

  it('constructor does not assign this._sort individually', () => {
    const ctor = src.slice(src.indexOf('constructor()'), src.indexOf('constructor()') + 600);
    expect(ctor).not.toMatch(/this\._sort\s*=/);
  });

  it('constructor does not assign this._availability individually', () => {
    const ctor = src.slice(src.indexOf('constructor()'), src.indexOf('constructor()') + 600);
    expect(ctor).not.toMatch(/this\._availability\s*=/);
  });
});

// ── No getter contract ────────────────────────────────────────────────────────

describe('ol-search-page filter consolidation — no computed getters', () => {
  it('does not have a get _filters() computed getter (it is now reactive state)', () => {
    expect(src).not.toMatch(/get\s+_filters\s*\(\s*\)/);
  });

  it('does not have a get _chips() computed getter', () => {
    expect(src).not.toMatch(/get\s+_chips\s*\(\s*\)/);
  });
});

// ── Mutation patterns ─────────────────────────────────────────────────────────

describe('ol-search-page filter consolidation — mutation via spread', () => {
  it('_onFilterChange uses computed property spread: { ...this._filters, [filter]: value }', () => {
    const fn = src.slice(src.lastIndexOf('_onFilterChange(e)'), src.lastIndexOf('_onFilterChange(e)') + 300);
    expect(fn).toMatch(/\{\s*\.\.\.\s*this\._filters\s*,\s*\[filter\]\s*:\s*value\s*\}/);
  });

  it('_rfApply uses computed property spread: { ...this._filters, [filter]: value }', () => {
    const fn = src.slice(src.indexOf('_rfApply('), src.indexOf('_rfApply(') + 200);
    expect(fn).toMatch(/\{\s*\.\.\.\s*this\._filters\s*,\s*\[filter\]\s*:\s*value\s*\}/);
  });

  it('_onClearAllFilters resets _filters using DEFAULT_FILTERS spread', () => {
    const fn = src.slice(src.indexOf('_onClearAllFilters() {'), src.indexOf('_onClearAllFilters() {') + 200);
    expect(fn).toMatch(/this\._filters\s*=\s*\{\s*\.\.\.DEFAULT_FILTERS\s*\}/);
  });
});

// ── updated() contract ────────────────────────────────────────────────────────

describe('ol-search-page filter consolidation — updated() watches _filters', () => {
  it('updated() checks changed.has("_filters") not individual filter props', () => {
    const fn = src.slice(src.indexOf('updated(changed)'), src.indexOf('updated(changed)') + 300);
    expect(fn).toMatch(/changed\.has\s*\(\s*['"]_filters['"]\s*\)/);
  });

  it('updated() does not check changed.has("_sort")', () => {
    const fn = src.slice(src.indexOf('updated(changed)'), src.indexOf('updated(changed)') + 300);
    expect(fn).not.toMatch(/changed\.has\s*\(\s*['"]_sort['"]\s*\)/);
  });
});

// ── buildChips inline call ────────────────────────────────────────────────────

describe('ol-search-page filter consolidation — buildChips called inline', () => {
  it('render passes buildChips(this._filters) to ol-search-bar chips prop', () => {
    const renderFn = src.slice(src.lastIndexOf('render()'), src.lastIndexOf('render()') + 1200);
    expect(renderFn).toMatch(/buildChips\s*\(\s*this\._filters\s*\)/);
  });

  it('updated() dispatches ol-app-state with buildChips(this._filters) for chips', () => {
    const fn = src.slice(src.indexOf('updated(changed)'), src.indexOf('updated(changed)') + 300);
    expect(fn).toMatch(/buildChips\s*\(\s*this\._filters\s*\)/);
  });
});
