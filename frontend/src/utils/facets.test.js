/**
 * TDD contract for utils/facets.js — shared author & subject fetch helpers.
 *
 * These tests are written BEFORE the module exists.  They will all fail (red)
 * until facets.js is created, then pass (green) once the implementation is in
 * place.  The goal is to pin the public API so future changes to either
 * ol-search-bar or ol-search-page can be verified against a single source.
 *
 * Design constraints captured here:
 *   - Short queries (< 2 trimmed chars) return [] without fetching
 *   - Results come from d.docs, defaulting to [] on a missing key
 *   - AbortError is swallowed and returns [] (cancelled request is not an error)
 *   - Other fetch errors propagate to the caller
 *   - apiBase is prepended so both components can pass their own prefix
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchAuthorSuggestions, fetchSubjectSuggestions } from './facets.js';

afterEach(() => vi.restoreAllMocks());

// ── Shared helper ──────────────────────────────────────────────────────────────

function mockFetch(docs) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    json: async () => ({ docs }),
  });
}

// ── fetchAuthorSuggestions ────────────────────────────────────────────────────

describe('fetchAuthorSuggestions', () => {
  it('is exported from utils/facets.js', () => {
    expect(typeof fetchAuthorSuggestions).toBe('function');
  });

  it('returns [] without fetching when query is shorter than 2 chars', async () => {
    const spy = mockFetch([]);
    const result = await fetchAuthorSuggestions('a');
    expect(spy).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('returns [] without fetching when query is empty', async () => {
    const spy = mockFetch([]);
    const result = await fetchAuthorSuggestions('');
    expect(spy).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('returns [] without fetching when query is whitespace-only', async () => {
    const spy = mockFetch([]);
    const result = await fetchAuthorSuggestions('  ');
    expect(spy).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('calls /api/authors/search with q and limit=8', async () => {
    const spy = mockFetch([{ name: 'Tolkien' }]);
    await fetchAuthorSuggestions('tolkien');
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/api/authors/search'),
      expect.anything(),
    );
    const url = spy.mock.calls[0][0];
    expect(url).toContain('q=tolkien');
    expect(url).toContain('limit=8');
  });

  it('prepends apiBase to the request URL', async () => {
    const spy = mockFetch([]);
    await fetchAuthorSuggestions('tolkien', { apiBase: 'https://example.com' });
    expect(spy.mock.calls[0][0]).toMatch(/^https:\/\/example\.com/);
  });

  it('passes the AbortSignal to fetch', async () => {
    const spy = mockFetch([]);
    const ctrl = new AbortController();
    await fetchAuthorSuggestions('tolkien', { signal: ctrl.signal });
    expect(spy.mock.calls[0][1]).toMatchObject({ signal: ctrl.signal });
  });

  it('returns the docs array from the response', async () => {
    const docs = [{ name: 'J.R.R. Tolkien' }, { name: 'Simon Tolkien' }];
    mockFetch(docs);
    const result = await fetchAuthorSuggestions('tolkien');
    expect(result).toEqual(docs);
  });

  it('returns [] when the response has no docs key', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ json: async () => ({}) });
    const result = await fetchAuthorSuggestions('tolkien');
    expect(result).toEqual([]);
  });

  it('swallows AbortError and returns []', async () => {
    const err = new DOMException('aborted', 'AbortError');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(err);
    const result = await fetchAuthorSuggestions('tolkien');
    expect(result).toEqual([]);
  });

  it('re-throws non-abort errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network failure'));
    await expect(fetchAuthorSuggestions('tolkien')).rejects.toThrow('network failure');
  });

  it('URL-encodes the query', async () => {
    const spy = mockFetch([]);
    await fetchAuthorSuggestions('García Márquez');
    const url = spy.mock.calls[0][0];
    expect(url).toContain(encodeURIComponent('García Márquez'));
  });
});

// ── fetchSubjectSuggestions ───────────────────────────────────────────────────

describe('fetchSubjectSuggestions', () => {
  it('is exported from utils/facets.js', () => {
    expect(typeof fetchSubjectSuggestions).toBe('function');
  });

  it('returns [] without fetching when query is shorter than 2 chars', async () => {
    const spy = mockFetch([]);
    const result = await fetchSubjectSuggestions('x');
    expect(spy).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('calls /api/subjects/search with q and limit=8', async () => {
    const spy = mockFetch([{ name: 'cooking' }]);
    await fetchSubjectSuggestions('cooking');
    const url = spy.mock.calls[0][0];
    expect(url).toContain('/api/subjects/search');
    expect(url).toContain('q=cooking');
    expect(url).toContain('limit=8');
  });

  it('prepends apiBase to the request URL', async () => {
    const spy = mockFetch([]);
    await fetchSubjectSuggestions('cooking', { apiBase: 'https://example.com' });
    expect(spy.mock.calls[0][0]).toMatch(/^https:\/\/example\.com/);
  });

  it('passes the AbortSignal to fetch', async () => {
    const spy = mockFetch([]);
    const ctrl = new AbortController();
    await fetchSubjectSuggestions('cooking', { signal: ctrl.signal });
    expect(spy.mock.calls[0][1]).toMatchObject({ signal: ctrl.signal });
  });

  it('returns the docs array from the response', async () => {
    const docs = [{ name: 'cooking' }, { name: 'cookbooks' }];
    mockFetch(docs);
    const result = await fetchSubjectSuggestions('cook');
    expect(result).toEqual(docs);
  });

  it('returns [] when the response has no docs key', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ json: async () => ({}) });
    const result = await fetchSubjectSuggestions('cooking');
    expect(result).toEqual([]);
  });

  it('swallows AbortError and returns []', async () => {
    const err = new DOMException('aborted', 'AbortError');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(err);
    const result = await fetchSubjectSuggestions('cooking');
    expect(result).toEqual([]);
  });

  it('re-throws non-abort errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network failure'));
    await expect(fetchSubjectSuggestions('cooking')).rejects.toThrow('network failure');
  });
});
