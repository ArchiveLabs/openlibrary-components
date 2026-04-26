// Shared fetch helpers for author and subject typeahead suggestions.
// Both ol-search-bar and ol-search-page used to contain verbatim copies of
// this logic; this module is the single source of truth.
//
// Callers are responsible for debouncing and managing loading state.
// AbortError (from a cancelled request) is swallowed and returns [].
// All other errors are re-thrown so the caller can decide how to handle them.

/**
 * @param {string} q       - Raw query string (trimmed internally; < 2 chars → [])
 * @param {{ signal?: AbortSignal, apiBase?: string }} [opts]
 * @returns {Promise<object[]>}
 */
export async function fetchAuthorSuggestions(q, { signal, apiBase = '' } = {}) {
  if (q.trim().length < 2) return [];
  try {
    const url = `${apiBase}/api/authors/search?q=${encodeURIComponent(q.trim())}&limit=8`;
    const d = await (await fetch(url, { signal })).json();
    return d.docs ?? [];
  } catch (err) {
    if (err.name === 'AbortError') return [];
    throw err;
  }
}

/**
 * @param {string} q       - Raw query string (trimmed internally; < 2 chars → [])
 * @param {{ signal?: AbortSignal, apiBase?: string }} [opts]
 * @returns {Promise<object[]>}
 */
export async function fetchSubjectSuggestions(q, { signal, apiBase = '' } = {}) {
  if (q.trim().length < 2) return [];
  try {
    const url = `${apiBase}/api/subjects/search?q=${encodeURIComponent(q.trim())}&limit=8`;
    const d = await (await fetch(url, { signal })).json();
    return d.docs ?? [];
  } catch (err) {
    if (err.name === 'AbortError') return [];
    throw err;
  }
}
