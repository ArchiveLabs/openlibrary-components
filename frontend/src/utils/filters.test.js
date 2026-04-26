import { describe, it, expect } from 'vitest';
import {
  toggleArrayValue,
  shufflePick,
  buildChips,
  buildSearchParams,
  spoofAvailabilityCounts,
  getLangLabel,
  getAvailabilityLabel,
  getGenreLabel,
  getSortLabel,
  getFictionLabel,
  EMPTY_FILTERS,
  DEFAULT_FILTERS,
  AVAILABILITY_OPTIONS,
  FICTION_OPTIONS,
  POPULAR_SUBJECTS,
  POPULAR_AUTHORS,
} from './filters.js';

// ── toggleArrayValue ─────────────────────────────────────────────────────────

describe('toggleArrayValue', () => {
  it('adds a value that is not present', () => {
    expect(toggleArrayValue(['eng'], 'fre')).toEqual(['eng', 'fre']);
  });

  it('removes a value that is present', () => {
    expect(toggleArrayValue(['eng', 'fre'], 'eng')).toEqual(['fre']);
  });

  it('handles an empty array', () => {
    expect(toggleArrayValue([], 'eng')).toEqual(['eng']);
  });

  it('does not mutate the input array', () => {
    const arr = ['eng'];
    toggleArrayValue(arr, 'fre');
    expect(arr).toEqual(['eng']);
  });

  it('removes the last element leaving an empty array', () => {
    expect(toggleArrayValue(['eng'], 'eng')).toEqual([]);
  });
});

// ── shufflePick ──────────────────────────────────────────────────────────────

describe('shufflePick', () => {
  it('returns exactly n items', () => {
    expect(shufflePick(POPULAR_SUBJECTS, 6)).toHaveLength(6);
    expect(shufflePick(POPULAR_AUTHORS, 4)).toHaveLength(4);
  });

  it('returns all items when n >= array length', () => {
    const small = ['a', 'b', 'c'];
    expect(shufflePick(small, 10)).toHaveLength(3);
  });

  it('returns only items from the original array', () => {
    const src = ['x', 'y', 'z'];
    const result = shufflePick(src, 2);
    for (const item of result) {
      expect(src).toContain(item);
    }
  });

  it('does not mutate the source array', () => {
    const src = [...POPULAR_AUTHORS];
    shufflePick(POPULAR_AUTHORS, 6);
    expect(POPULAR_AUTHORS).toEqual(src);
  });

  it('returns 0 items when n is 0', () => {
    expect(shufflePick(POPULAR_SUBJECTS, 0)).toHaveLength(0);
  });

  it('produces no duplicate items', () => {
    const result = shufflePick(POPULAR_SUBJECTS, 10);
    const unique = new Set(result);
    expect(unique.size).toBe(10);
  });
});

// ── label helpers ────────────────────────────────────────────────────────────

describe('getLangLabel', () => {
  it('returns label for known code', () => {
    expect(getLangLabel('eng')).toBe('English');
    expect(getLangLabel('fre')).toBe('French');
    expect(getLangLabel('jpn')).toBe('Japanese');
  });

  it('returns the raw value for an unknown code', () => {
    expect(getLangLabel('xyz')).toBe('xyz');
  });
});

describe('getAvailabilityLabel', () => {
  it('returns label for known value', () => {
    expect(getAvailabilityLabel('readable')).toBe('Readable Books Only');
    expect(getAvailabilityLabel('open')).toBe('Open Access Only');
    expect(getAvailabilityLabel('borrowable')).toBe('Borrowable Only');
    expect(getAvailabilityLabel('')).toBe('Full Card Catalog');
  });

  it('returns raw value for unknown', () => {
    expect(getAvailabilityLabel('unknown')).toBe('unknown');
  });
});

describe('getGenreLabel', () => {
  it('returns label for known value', () => {
    expect(getGenreLabel('mystery')).toBe('Mystery');
    expect(getGenreLabel('science fiction')).toBe('Science Fiction');
  });
});

describe('getSortLabel', () => {
  it('returns label for known value', () => {
    expect(getSortLabel('new')).toBe('Newest first');
    expect(getSortLabel('rating desc')).toBe('Top rated');
  });
});

describe('getFictionLabel', () => {
  it('returns label for known values', () => {
    expect(getFictionLabel('fiction')).toBe('Fiction Only');
    expect(getFictionLabel('nonfiction')).toBe('Nonfiction Only');
  });

  it('returns raw value for unknown', () => {
    expect(getFictionLabel('other')).toBe('other');
  });
});

// ── FICTION_OPTIONS ───────────────────────────────────────────────────────────

describe('FICTION_OPTIONS', () => {
  it('has exactly two options: fiction and nonfiction', () => {
    const values = FICTION_OPTIONS.map(o => o.value);
    expect(values).toContain('fiction');
    expect(values).toContain('nonfiction');
    expect(FICTION_OPTIONS).toHaveLength(2);
  });
});

// ── AVAILABILITY_OPTIONS ──────────────────────────────────────────────────────

describe('AVAILABILITY_OPTIONS', () => {
  it('includes readable, empty-string, borrowable, open', () => {
    const values = AVAILABILITY_OPTIONS.map(o => o.value);
    expect(values).toContain('readable');
    expect(values).toContain('');
    expect(values).toContain('borrowable');
    expect(values).toContain('open');
  });

  it('each option has a staticCount string', () => {
    for (const opt of AVAILABILITY_OPTIONS) {
      expect(typeof opt.staticCount).toBe('string');
    }
  });

  it('Full Card Catalog has fraction 1.0', () => {
    const full = AVAILABILITY_OPTIONS.find(o => o.value === '');
    expect(full.fraction).toBe(1.0);
  });
});

// ── EMPTY_FILTERS ─────────────────────────────────────────────────────────────

describe('EMPTY_FILTERS', () => {
  it('defaults availability to readable', () => {
    expect(EMPTY_FILTERS.availability).toBe('readable');
  });

  it('defaults fictionFilter to empty string', () => {
    expect(EMPTY_FILTERS.fictionFilter).toBe('');
  });
});

// ── buildChips ────────────────────────────────────────────────────────────────

describe('buildChips', () => {
  it('returns a readable-availability chip for EMPTY_FILTERS', () => {
    const chips = buildChips(EMPTY_FILTERS);
    expect(chips).toHaveLength(1);
    expect(chips[0]).toEqual({
      type: 'access', label: 'Readable Books Only', value: 'readable',
    });
  });

  it('builds an availability chip with correct label (no type prefix)', () => {
    const chips = buildChips({ ...EMPTY_FILTERS, availability: 'open' });
    const chip = chips.find(c => c.type === 'access');
    expect(chip).toEqual({ type: 'access', label: 'Open Access Only', value: 'open' });
  });

  it('returns no access chip when availability is empty string', () => {
    const chips = buildChips({ ...EMPTY_FILTERS, availability: '' });
    expect(chips.find(c => c.type === 'access')).toBeUndefined();
  });

  it('builds a fiction chip for fictionFilter=fiction', () => {
    const chips = buildChips({ ...EMPTY_FILTERS, fictionFilter: 'fiction' });
    const chip = chips.find(c => c.type === 'fiction');
    expect(chip).toEqual({ type: 'fiction', label: 'fiction only', value: 'fiction' });
  });

  it('builds a nonfiction chip for fictionFilter=nonfiction', () => {
    const chips = buildChips({ ...EMPTY_FILTERS, fictionFilter: 'nonfiction' });
    const chip = chips.find(c => c.type === 'fiction');
    expect(chip).toEqual({ type: 'fiction', label: 'nonfiction only', value: 'nonfiction' });
  });

  it('builds one combined chip for multiple selected languages (OR display)', () => {
    const chips = buildChips({ ...EMPTY_FILTERS, languages: ['eng', 'spa'] });
    const langChips = chips.filter(c => c.type === 'lang');
    expect(langChips).toHaveLength(1);
    expect(langChips[0]).toEqual({
      type:  'lang',
      label: 'language: English OR Spanish',
      value: null,
    });
  });

  it('builds a single language chip with no OR when only one language is selected', () => {
    const chips = buildChips({ ...EMPTY_FILTERS, languages: ['eng'] });
    const langChips = chips.filter(c => c.type === 'lang');
    expect(langChips).toHaveLength(1);
    expect(langChips[0]).toEqual({
      type:  'lang',
      label: 'language: English',
      value: null,
    });
  });

  it('uses raw language code for unknown language', () => {
    const chips = buildChips({ ...EMPTY_FILTERS, languages: ['xyz'] });
    const chip = chips.find(c => c.type === 'lang');
    expect(chip.label).toBe('language: xyz');
    expect(chip.value).toBeNull();
  });

  it('builds one chip per selected genre', () => {
    const chips = buildChips({ ...EMPTY_FILTERS, genres: ['mystery', 'fantasy'] });
    const genreChips = chips.filter(c => c.type === 'genre');
    expect(genreChips[0]).toEqual({ type: 'genre', label: 'genre: Mystery',  value: 'mystery' });
    expect(genreChips[1]).toEqual({ type: 'genre', label: 'genre: Fantasy',  value: 'fantasy' });
  });

  it('builds one chip per author', () => {
    const chips = buildChips({ ...EMPTY_FILTERS, authors: ['Hemingway', 'Fitzgerald'] });
    const authorChips = chips.filter(c => c.type === 'author');
    expect(authorChips[0]).toEqual({ type: 'author', label: 'author: Hemingway',   value: 'Hemingway' });
    expect(authorChips[1]).toEqual({ type: 'author', label: 'author: Fitzgerald',  value: 'Fitzgerald' });
  });

  it('builds one chip per subject', () => {
    const chips = buildChips({ ...EMPTY_FILTERS, subjects: ['Cheese', 'Cats'] });
    const subjChips = chips.filter(c => c.type === 'subject');
    expect(subjChips[0]).toEqual({ type: 'subject', label: 'subject: Cheese', value: 'Cheese' });
    expect(subjChips[1]).toEqual({ type: 'subject', label: 'subject: Cats',   value: 'Cats' });
  });

  it('does not include a chip for an empty sort', () => {
    const chips = buildChips({ ...EMPTY_FILTERS, sort: '' });
    expect(chips.find(c => c.type === 'sort')).toBeUndefined();
  });

  it('outputs chips in order: availability, fictionFilter, language, genre, author, subject', () => {
    const chips = buildChips({
      sort:          'new',
      availability:  'open',
      fictionFilter: 'fiction',
      languages:     ['eng'],
      genres:        ['mystery'],
      authors:       ['Hemingway'],
      subjects:      ['War'],
    });
    expect(chips.map(c => c.type)).toEqual(['access', 'fiction', 'lang', 'genre', 'author', 'subject']);
  });

  it('omits fictionFilter chip when fictionFilter is empty string', () => {
    const chips = buildChips({ ...EMPTY_FILTERS, fictionFilter: '' });
    expect(chips.find(c => c.type === 'fiction')).toBeUndefined();
  });

  it('handles undefined arrays gracefully', () => {
    expect(() => buildChips({ ...EMPTY_FILTERS, languages: undefined })).not.toThrow();
  });
});

// ── buildSearchParams ─────────────────────────────────────────────────────────

describe('buildSearchParams', () => {
  it('sets q, page, and limit', () => {
    const p = buildSearchParams('cats', { ...EMPTY_FILTERS, availability: '' }, 1, 20);
    expect(p.get('q')).toBe('cats');
    expect(p.get('page')).toBe('1');
    expect(p.get('limit')).toBe('20');
  });

  it('omits q when empty string', () => {
    const p = buildSearchParams('', { ...EMPTY_FILTERS, availability: '' }, 1, 20);
    expect(p.has('q')).toBe(false);
  });

  it('sets sort when present', () => {
    const p = buildSearchParams('test', { ...EMPTY_FILTERS, sort: 'new' }, 1, 20);
    expect(p.get('sort')).toBe('new');
  });

  it('omits sort when empty string', () => {
    const p = buildSearchParams('test', { ...EMPTY_FILTERS, sort: '' }, 1, 20);
    expect(p.has('sort')).toBe(false);
  });

  it('sets availability=readable by default', () => {
    const p = buildSearchParams('test', EMPTY_FILTERS, 1, 20);
    expect(p.get('availability')).toBe('readable');
  });

  it('sets availability when present', () => {
    const p = buildSearchParams('test', { ...EMPTY_FILTERS, availability: 'open' }, 1, 20);
    expect(p.get('availability')).toBe('open');
  });

  it('omits availability when empty string (Full Card Catalog)', () => {
    const p = buildSearchParams('test', { ...EMPTY_FILTERS, availability: '' }, 1, 20);
    expect(p.has('availability')).toBe(false);
  });

  it('sets fictionFilter when present', () => {
    const p = buildSearchParams('test', { ...EMPTY_FILTERS, fictionFilter: 'fiction' }, 1, 20);
    expect(p.get('fictionFilter')).toBe('fiction');
  });

  it('omits fictionFilter when empty string', () => {
    const p = buildSearchParams('test', { ...EMPTY_FILTERS, fictionFilter: '' }, 1, 20);
    expect(p.has('fictionFilter')).toBe(false);
  });

  it('appends multiple language params (OR semantics on backend)', () => {
    const p = buildSearchParams('test', { ...EMPTY_FILTERS, languages: ['eng', 'fre'] }, 1, 20);
    expect(p.getAll('language')).toEqual(['eng', 'fre']);
  });

  it('appends multiple author params', () => {
    const p = buildSearchParams('test', { ...EMPTY_FILTERS, authors: ['Hemingway', 'Fitzgerald'] }, 1, 20);
    expect(p.getAll('author')).toEqual(['Hemingway', 'Fitzgerald']);
  });

  it('appends multiple subject params', () => {
    const p = buildSearchParams('test', { ...EMPTY_FILTERS, subjects: ['Cheese', 'Cats'] }, 1, 20);
    expect(p.getAll('subjects')).toEqual(['Cheese', 'Cats']);
  });

  it('appends multiple genre params', () => {
    const p = buildSearchParams('test', { ...EMPTY_FILTERS, genres: ['mystery', 'fantasy'] }, 1, 20);
    expect(p.getAll('genres')).toEqual(['mystery', 'fantasy']);
  });

  it('handles page 2', () => {
    const p = buildSearchParams('test', EMPTY_FILTERS, 2, 20);
    expect(p.get('page')).toBe('2');
  });

  it('handles custom limit', () => {
    const p = buildSearchParams('test', EMPTY_FILTERS, 1, 50);
    expect(p.get('limit')).toBe('50');
  });
});

// ── spoofAvailabilityCounts ───────────────────────────────────────────────────

describe('spoofAvailabilityCounts', () => {
  it('returns a count for every availability option', () => {
    const counts = spoofAvailabilityCounts(1000);
    for (const opt of AVAILABILITY_OPTIONS) {
      expect(counts).toHaveProperty(opt.value);
      expect(typeof counts[opt.value]).toBe('number');
    }
  });

  it('Full Card Catalog count equals numFound (fraction 1.0)', () => {
    expect(spoofAvailabilityCounts(5000)['']).toBe(5000);
  });

  it('all counts are 0 when numFound is 0', () => {
    const counts = spoofAvailabilityCounts(0);
    for (const v of Object.values(counts)) expect(v).toBe(0);
  });

  it('counts are rounded integers', () => {
    const counts = spoofAvailabilityCounts(3);
    for (const v of Object.values(counts)) {
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('sub-category counts are less than or equal to total', () => {
    const counts = spoofAvailabilityCounts(10000);
    expect(counts['readable']).toBeLessThanOrEqual(counts['']);
    expect(counts['open']).toBeLessThanOrEqual(counts['readable']);
    expect(counts['borrowable']).toBeLessThanOrEqual(counts['readable']);
  });
});

// ── DEFAULT_FILTERS (renamed from EMPTY_FILTERS) ──────────────────────────────
// These tests are written BEFORE the rename and will fail (red) until
// DEFAULT_FILTERS is exported from filters.js.  They pin three things:
//   1. The export exists under the new name
//   2. The non-empty default (availability:'readable') is preserved
//   3. EMPTY_FILTERS is kept as a re-export alias so existing callers don't break

describe('DEFAULT_FILTERS', () => {
  it('is exported from filters.js', () => {
    expect(DEFAULT_FILTERS).toBeDefined();
  });

  it('has availability set to "readable" — the non-empty default that made EMPTY_FILTERS a misnomer', () => {
    expect(DEFAULT_FILTERS.availability).toBe('readable');
  });

  it('has fictionFilter as empty string', () => {
    expect(DEFAULT_FILTERS.fictionFilter).toBe('');
  });

  it('has empty arrays for languages, genres, authors, subjects', () => {
    expect(DEFAULT_FILTERS.languages).toEqual([]);
    expect(DEFAULT_FILTERS.genres).toEqual([]);
    expect(DEFAULT_FILTERS.authors).toEqual([]);
    expect(DEFAULT_FILTERS.subjects).toEqual([]);
  });

  it('has sort as empty string', () => {
    expect(DEFAULT_FILTERS.sort).toBe('');
  });

  it('has the same shape and values as EMPTY_FILTERS (backward-compat alias)', () => {
    expect(DEFAULT_FILTERS).toEqual(EMPTY_FILTERS);
  });

  it('EMPTY_FILTERS is still exported so existing import sites do not break', () => {
    expect(EMPTY_FILTERS).toBeDefined();
  });
});
