import { LitElement, html, css } from 'lit';
import './ol-search-bar.js';
import './ol-book-card.js';
import './ol-facet-drop.js';
import './ol-howto-modal.js';
import './ol-search-hint.js';
import {
  POPULAR_AUTHORS, POPULAR_SUBJECTS,
  EMPTY_FILTERS, buildChips, buildSearchParams, shufflePick,
  getSortLabel,
} from '../utils/filters.js';
import { fetchAuthorSuggestions, fetchSubjectSuggestions } from '../utils/facets.js';

const LIMIT = 20;

const SHOWCASE_BOOKS = [
  { olid: 'OL27448W',   title: 'The Lord of the Rings',        href: 'https://openlibrary.org/works/OL27448W' },
  { olid: 'OL1168007W', title: '1984',                         href: 'https://openlibrary.org/works/OL1168007W' },
  { olid: 'OL66554W',   title: 'Pride and Prejudice',          href: 'https://openlibrary.org/works/OL66554W' },
  { olid: 'OL59788W',   title: 'Dune',                         href: 'https://openlibrary.org/works/OL59788W' },
  { olid: 'OL450907W',  title: 'To Kill a Mockingbird',        href: 'https://openlibrary.org/works/OL450907W' },
  { olid: 'OL468431W',  title: 'The Great Gatsby',             href: 'https://openlibrary.org/works/OL468431W' },
  { olid: 'OL80638W',   title: "The Hitchhiker's Guide",       href: 'https://openlibrary.org/works/OL80638W' },
  { olid: 'OL893223W',  title: 'Brave New World',              href: 'https://openlibrary.org/works/OL893223W' },
  { olid: 'OL76689W',   title: 'The Hobbit',                   href: 'https://openlibrary.org/works/OL76689W' },
  { olid: 'OL483391W',  title: 'Crime and Punishment',         href: 'https://openlibrary.org/works/OL483391W' },
  { olid: 'OL258596W',  title: 'Jane Eyre',                    href: 'https://openlibrary.org/works/OL258596W' },
  { olid: 'OL262320W',  title: 'Don Quixote',                  href: 'https://openlibrary.org/works/OL262320W' },
];

// Module-level cache keyed by lowercase query string.
const _facetsCache = new Map();

async function loadFacets(q) {
  const key = (q || '').toLowerCase().trim();
  if (_facetsCache.has(key)) return _facetsCache.get(key);
  try {
    const res = await fetch(`/api/search/facets?q=${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const data = await res.json();
    _facetsCache.set(key, data);
    return data;
  } catch { return null; }
}

export class OlSearchPage extends LitElement {
  static properties = {
    // Results
    _results:   { state: true },
    _numFound:  { state: true },
    _loading:   { state: true },
    _error:     { state: true },
    _page:      { state: true },
    _lastQ:     { state: true },

    // Filters (canonical state)
    _sort:          { state: true },
    _availability:  { state: true },
    _fictionFilter: { state: true },
    _languages:     { state: true },
    _genres:        { state: true },
    _authors:       { state: true },
    _subjects:      { state: true },

    // Results filter bar UI state
    _openFacet:       { state: true },
    _howtoOpen:       { state: true },
    _authorResults:   { state: true },
    _subjectResults:  { state: true },
    _facetsLoading:   { state: true },
    _defaultAuthors:  { state: true },
    _defaultSubjects: { state: true },
    _hint:            { state: true },
    _showcaseBooks:   { state: true },
  };

  constructor() {
    super();
    this._results   = [];
    this._numFound  = 0;
    this._loading   = false;
    this._error     = null;
    this._page      = 1;
    this._lastQ     = null;

    this._sort          = EMPTY_FILTERS.sort;
    this._availability  = EMPTY_FILTERS.availability;
    this._fictionFilter = EMPTY_FILTERS.fictionFilter;
    this._languages     = [...EMPTY_FILTERS.languages];
    this._genres        = [...EMPTY_FILTERS.genres];
    this._authors       = [...EMPTY_FILTERS.authors];
    this._subjects      = [...EMPTY_FILTERS.subjects];

    this._openFacet       = null;
    this._howtoOpen       = false;
    this._authorResults   = [];
    this._subjectResults  = [];
    this._facetsLoading   = false;
    this._defaultAuthors  = shufflePick(POPULAR_AUTHORS, 6);
    this._defaultSubjects = shufflePick(POPULAR_SUBJECTS, 6);
    this._hint            = null;
    this._showcaseBooks   = shufflePick(SHOWCASE_BOOKS, 4);
    this._authorTimer     = null;
    this._subjectTimer    = null;

    this._onDoc = e => {
      if (!e.composedPath().includes(this)) this._openFacet = null;
    };
    this._globalSearch         = e => this._onSearch(e);
    this._globalFilterChange   = e => this._onFilterChange(e);
    this._globalChipRemove     = e => this._onChipRemove(e);
    this._globalClearAllFilters = () => this._onClearAllFilters();
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._onDoc);
    // Events from ol-search-bar are bubbles+composed — they reach this host naturally.
    // Using this (not window) prevents accidental coupling with other page scripts.
    this.addEventListener('ol-search',            this._globalSearch);
    this.addEventListener('ol-filter-change',     this._globalFilterChange);
    this.addEventListener('ol-chip-remove',       this._globalChipRemove);
    this.addEventListener('ol-clear-all-filters', this._globalClearAllFilters);
    const q = new URLSearchParams(location.search).get('q');
    if (q) { this._lastQ = q; this._runSearch(1); }
  }

  async firstUpdated() {
    // b/olid/ is indexed by edition OLID, not work OLID — fetch numeric cover IDs instead
    const updated = await Promise.all(
      this._showcaseBooks.map(async b => {
        try {
          const d = await (await fetch(`https://openlibrary.org/works/${b.olid}.json`)).json();
          const coverId = d.covers?.[0] ?? null;
          return coverId ? { ...b, coverId } : b;
        } catch { return b; }
      })
    );
    this._showcaseBooks = updated;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._onDoc);
    this.removeEventListener('ol-search',            this._globalSearch);
    this.removeEventListener('ol-filter-change',     this._globalFilterChange);
    this.removeEventListener('ol-chip-remove',       this._globalChipRemove);
    this.removeEventListener('ol-clear-all-filters', this._globalClearAllFilters);
  }

  updated(changed) {
    const broadcast = ['_lastQ', '_sort', '_availability', '_fictionFilter', '_languages', '_genres', '_authors', '_subjects'];
    if (broadcast.some(k => changed.has(k))) {
      window.dispatchEvent(new CustomEvent('ol-app-state', {
        detail: { hasQuery: this._lastQ !== null, filters: this._filters, chips: this._chips },
      }));
    }
  }

  // ── Computed helpers ──────────────────────────────────────────
  get _chips() {
    return buildChips({
      availability:  this._availability,
      fictionFilter: this._fictionFilter,
      languages:     this._languages,
      genres:        this._genres,
      authors:       this._authors,
      subjects:      this._subjects,
    });
  }

  get _filters() {
    return {
      sort:          this._sort,
      availability:  this._availability,
      fictionFilter: this._fictionFilter,
      languages:     this._languages,
      genres:        this._genres,
      authors:       this._authors,
      subjects:      this._subjects,
    };
  }

  // ── Search ────────────────────────────────────────────────────
  _onSearch(e) {
    this._lastQ = e.detail?.q ?? '';
    // When transitioning from droppable → search page, carry over any filters
    // the user set in the droppable so the results match what was shown in autocomplete.
    const f = e.detail?.filters;
    if (f) {
      this._sort          = f.sort          ?? EMPTY_FILTERS.sort;
      this._availability  = f.availability  ?? EMPTY_FILTERS.availability;
      this._fictionFilter = f.fictionFilter ?? EMPTY_FILTERS.fictionFilter;
      this._languages     = [...(f.languages ?? [])];
      this._genres        = [...(f.genres    ?? [])];
      this._authors       = [...(f.authors   ?? [])];
      this._subjects      = [...(f.subjects  ?? [])];
    }
    const url = new URL(location.href);
    url.searchParams.set('q', this._lastQ);
    history.replaceState({}, '', url.toString());
    this._runSearch(1);
  }

  _runSearch(page) {
    this._page = page;
    this._fetch();
  }

  async _fetch() {
    this._results  = [];
    this._numFound = 0;
    this._error    = null;
    this._loading  = true;
    try {
      const p = buildSearchParams(this._lastQ ?? '', this._filters, this._page, LIMIT);
      const res = await fetch(`/api/search?${p}`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      this._results  = data.docs ?? [];
      this._numFound = data.num_found ?? 0;
      this._hint = this._computeHint(this._lastQ ?? '', this._filters, this._numFound);
    } catch (err) {
      this._error = err.message;
    } finally {
      this._loading = false;
    }
  }

  /**
   * Derive a contextual hint for the current search, or return null for none.
   * Add cases here as new hint types are needed; each must have a unique `key`
   * so dismissals are stored independently in localStorage.
   *
   * @param {string}  q        — raw query string
   * @param {object}  filters  — current filter state
   * @param {number}  numFound — result count from OL
   * @returns {{ key, message, actions? }|null}
   */
  // eslint-disable-next-line no-unused-vars
  _computeHint(q, filters, numFound) {
    // No hints active yet — return null to keep the hint bar hidden.
    // Future example:
    // if (numFound < 5 && q.split(' ').length > 3) {
    //   return {
    //     key: 'fulltext-suggest',
    //     message: 'Fewer results than expected? Try searching inside the text of books.',
    //     actions: [{ label: 'Search inside books', href: `https://openlibrary.org/search/inside?q=${encodeURIComponent(q)}` }],
    //   };
    // }
    return null;
  }

  _paginate(delta) {
    const next = this._page + delta;
    if (next < 1) return;
    this._runSearch(next);
    this.shadowRoot?.querySelector('ol-search-bar')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Filter changes from ol-search-bar (hero) ──────────────────
  _onFilterChange(e) {
    const { filter, value } = e.detail;
    switch (filter) {
      case 'sort':          this._sort          = value; break;
      case 'availability':  this._availability  = value; break;
      case 'fictionFilter': this._fictionFilter = value; break;
      case 'languages':     this._languages     = value; break;
      case 'genres':        this._genres        = value; break;
      case 'authors':       this._authors       = value; break;
      case 'subjects':      this._subjects      = value; break;
    }
    if (this._lastQ !== null) this._runSearch(1);
  }

  // ── Chip removal ──────────────────────────────────────────────
  _onChipRemove(e) {
    const { type, value } = e.detail;
    switch (type) {
      case 'access':  this._availability  = ''; break;
      case 'fiction': this._fictionFilter = ''; break;
      case 'lang':    this._languages     = []; break;
      case 'genre':   this._genres        = this._genres.filter(v => v !== value); break;
      case 'author':  this._authors       = this._authors.filter(v => v !== value); break;
      case 'subject': this._subjects      = this._subjects.filter(v => v !== value); break;
    }
    if (this._lastQ !== null) this._runSearch(1);
  }

  // ── Clear all filters ─────────────────────────────────────────
  _onClearAllFilters() {
    this._sort          = EMPTY_FILTERS.sort;
    this._availability  = EMPTY_FILTERS.availability;
    this._fictionFilter = EMPTY_FILTERS.fictionFilter;
    this._languages     = [...EMPTY_FILTERS.languages];
    this._genres        = [...EMPTY_FILTERS.genres];
    this._authors       = [...EMPTY_FILTERS.authors];
    this._subjects      = [...EMPTY_FILTERS.subjects];
    if (this._lastQ !== null) this._runSearch(1);
  }

  // ── Results filter bar ─────────────────────────────────────────
  async _toggleFacet(name, e) {
    e.stopPropagation();
    if (this._openFacet === name) { this._openFacet = null; return; }
    this._openFacet = name;
    // Auto-populate author/subject from facets API when there's an active query
    if ((name === 'author' || name === 'subject') && this._lastQ) {
      if (name === 'author' && !this._authorResults.length) {
        this._facetsLoading = true;
        const data = await loadFacets(this._lastQ);
        this._facetsLoading = false;
        if (data) {
          const facets = data?.sidebar?.searchFacets?.facets ?? {};
          this._authorResults = (facets.author_key ?? []).slice(0, 10)
            .map(f => ({ name: f.name, work_count: f.count }));
        }
      }
      if (name === 'subject' && !this._subjectResults.length) {
        this._facetsLoading = true;
        const data = await loadFacets(this._lastQ);
        this._facetsLoading = false;
        if (data) {
          const facets = data?.sidebar?.searchFacets?.facets ?? {};
          this._subjectResults = (facets.subject_facet ?? []).slice(0, 10)
            .map(f => ({ name: f.name, work_count: f.count }));
        }
      }
    }
  }

  _rfApply(filter, value, keepOpen = false) {
    if (!keepOpen) this._openFacet = null;
    switch (filter) {
      case 'sort':          this._sort          = value; break;
      case 'availability':  this._availability  = value; break;
      case 'fictionFilter': this._fictionFilter = value; break;
      case 'languages':     this._languages     = value; break;
      case 'genres':        this._genres        = value; break;
      case 'authors':       this._authors       = value; break;
      case 'subjects':      this._subjects      = value; break;
    }
    this._runSearch(1);
  }

  _onRFDropFacetChange(e) {
    this._rfApply(e.detail.filter, e.detail.value, e.detail.keepOpen);
  }

  _onRFDropAuthorSearch(e) {
    clearTimeout(this._authorTimer);
    const q = e.detail.q;
    if (q.trim().length < 2) { this._authorResults = []; return; }
    this._authorTimer = setTimeout(async () => {
      try {
        this._authorResults = await fetchAuthorSuggestions(q);
      } catch {
        this._authorResults = [];
      }
    }, 250);
  }

  _onRFDropSubjectSearch(e) {
    clearTimeout(this._subjectTimer);
    const q = e.detail.q;
    if (q.trim().length < 2) { this._subjectResults = []; return; }
    this._subjectTimer = setTimeout(async () => {
      try {
        this._subjectResults = await fetchSubjectSuggestions(q);
      } catch {
        this._subjectResults = [];
      }
    }, 250);
  }

  // ── Styles ─────────────────────────────────────────────────────
  static styles = css`
    :host { display:block; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }

    /* Homepage book cover showcase */
    .cover-grid {
      display:flex; gap:24px; justify-content:center; align-items:flex-end;
      padding:80px 20px 70px;
    }
    .cover-item { text-decoration:none; transition:transform .2s; }
    .cover-item:hover { transform:translateY(-8px) rotate(1.5deg); }
    .cover-item img {
      display:block; width:100px; height:150px; object-fit:cover;
      border-radius:4px; box-shadow:3px 5px 16px rgba(0,0,0,.3);
    }

    /* Results layout */
    .results-wrap { display:flex; flex-direction:column; gap:8px; }

    /* Results card */
    .results-body {
      background:white; border-radius:10px;
      border:1px solid hsl(48,15%,74%); min-height:120px;
      overflow:visible;
    }

    /* Filter bar inside results-body */
    .rf-bar {
      display:flex; align-items:stretch; border-bottom:1px solid hsl(0,0%,92%);
      min-height:40px; overflow:visible;
    }
    .rf-count {
      display:flex; align-items:center; padding:0 16px;
      font-size:13px; color:hsl(0,0%,40%); white-space:nowrap;
      border-right:1px solid hsl(0,0%,90%); flex-shrink:0;
    }
    .rf-wrap { flex:1; position:relative; display:flex; }
    .rf-wrap + .rf-wrap { border-left:1px solid hsl(0,0%,90%); }
    /* Cog column is narrower */
    .rf-wrap--cog { flex:0 0 40px; }
    .rf-btn {
      flex:1; padding:0 8px; border:none; background:transparent;
      font-size:12px; font-family:inherit; color:hsl(0,0%,30%);
      cursor:pointer; display:flex; align-items:center; justify-content:center;
      gap:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      transition:background .08s;
    }
    .rf-btn:hover  { background:hsl(0,0%,97%); color:hsl(202,96%,28%); }
    .rf-btn.active { color:hsl(202,96%,28%); font-weight:600; }
    .rf-caret { font-size:8px; opacity:.5; flex-shrink:0; }

    /* Book list area */
    .results-inner { padding:0 20px; }

    .loading, .no-results {
      padding:48px 0; text-align:center; color:hsl(0,0%,50%); font-size:14px;
    }
    .error-msg {
      margin:20px 0; padding:12px 16px;
      background:hsl(0,72%,96%); border:1px solid hsl(0,72%,85%);
      border-radius:6px; color:hsl(0,72%,35%); font-size:13px;
    }

    /* Pagination */
    .pagination {
      display:flex; align-items:center; gap:12px; justify-content:center;
      padding:16px 0 20px; border-top:1px solid hsl(0,0%,93%); margin-top:4px;
    }
    .page-btn {
      padding:6px 16px; border:1px solid hsl(0,0%,78%); border-radius:6px;
      background:white; font-size:13px; font-family:inherit; cursor:pointer;
      color:hsl(0,0%,28%); transition:all .12s;
    }
    .page-btn:hover:not(:disabled) { border-color:hsl(202,96%,37%); color:hsl(202,96%,28%); }
    .page-btn:disabled { opacity:.35; cursor:default; }
    .page-info { font-size:13px; color:hsl(0,0%,45%); }

    @media (max-width: 600px) {
      .cover-grid { gap: 10px; padding: 32px 0 28px; }
      .cover-item img { width: 70px; height: 105px; }
      .rf-bar { overflow-x: auto; scrollbar-width: none; flex-wrap: nowrap; }
      .rf-bar::-webkit-scrollbar { display: none; }
      .rf-count { min-width: 60px; padding: 0 10px; font-size: 12px; }
      .rf-btn { min-width: 72px; font-size: 11px; }
    }
  `;

  // ── Results filter bar render ─────────────────────────────────

  _rfLabel(name) {
    switch (name) {
      case 'sort':   return this._sort ? getSortLabel(this._sort) : 'Sort by';
      case 'avail':  return 'Availability';
      case 'lang':   return this._languages.length ? `Language (${this._languages.length})` : 'Language';
      case 'genre': {
        const total = this._genres.length + (this._fictionFilter ? 1 : 0);
        return total ? `Genre (${total})` : 'Genre';
      }
      case 'author': return this._authors.length  ? `Author (${this._authors.length})`  : 'Author';
      case 'subject':return this._subjects.length ? `Subject (${this._subjects.length})`: 'Subject';
    }
  }

  _rfActive(name) {
    switch (name) {
      case 'sort':   return !!this._sort;
      case 'avail':  return !!this._availability;
      case 'lang':   return this._languages.length > 0;
      case 'genre':  return this._genres.length > 0 || !!this._fictionFilter;
      case 'author': return this._authors.length > 0;
      case 'subject':return this._subjects.length > 0;
    }
  }

  _renderRFBtn(name, right = false) {
    return html`
      <div class="rf-wrap">
        <button class="rf-btn ${this._rfActive(name) ? 'active' : ''}"
                @click=${e => this._toggleFacet(name, e)}>
          ${this._rfLabel(name)}<span class="rf-caret">▾</span>
        </button>
        ${this._openFacet === name ? html`
          <ol-facet-drop
            .name=${name}
            ?right=${right}
            .filters=${this._filters}
            .authorResults=${this._authorResults}
            .subjectResults=${this._subjectResults}
            .defaultAuthors=${this._defaultAuthors}
            .defaultSubjects=${this._defaultSubjects}
            .facetsLoading=${this._facetsLoading}
            @ol-facet-change=${this._onRFDropFacetChange}
            @ol-facet-search-authors=${this._onRFDropAuthorSearch}
            @ol-facet-search-subjects=${this._onRFDropSubjectSearch}
            @ol-facet-shuffle-authors=${() => { this._defaultAuthors = shufflePick(POPULAR_AUTHORS, 6); }}
            @ol-facet-shuffle-subjects=${() => { this._defaultSubjects = shufflePick(POPULAR_SUBJECTS, 6); }}
          ></ol-facet-drop>
        ` : ''}
      </div>`;
  }

  _renderFilterBar() {
    const countLabel = this._loading
      ? 'Searching…'
      : `${this._numFound.toLocaleString()} result${this._numFound === 1 ? '' : 's'}`;

    return html`
      <div class="rf-bar">
        <span class="rf-count">${countLabel}</span>
        ${this._renderRFBtn('avail')}
        ${this._renderRFBtn('lang')}
        ${this._renderRFBtn('genre')}
        ${this._renderRFBtn('author')}
        ${this._renderRFBtn('subject')}
        <div class="rf-wrap rf-wrap--cog">
          <button class="rf-btn" title="Search help"
                  @click=${e => { e.stopPropagation(); this._howtoOpen = true; }}>⚙️</button>
        </div>
        ${this._renderRFBtn('sort', true)}
      </div>
      <ol-howto-modal .open=${this._howtoOpen} @close=${() => this._howtoOpen = false}></ol-howto-modal>`;
  }

  // ── Main render ───────────────────────────────────────────────
  render() {
    const hasQuery   = this._lastQ !== null;
    const hasResults = this._results.length > 0;
    const hasPrev    = this._page > 1;
    const hasNext    = this._numFound > this._page * LIMIT;

    if (!hasQuery) {
      return html`
        <div class="cover-grid">
          ${this._showcaseBooks.map(b => html`
            <a class="cover-item" href=${b.href} target="_blank" rel="noopener" title=${b.title}>
              <img src="${b.coverId
                  ? `https://covers.openlibrary.org/b/id/${b.coverId}-M.jpg`
                  : `https://covers.openlibrary.org/b/olid/${b.olid}-M.jpg`}"
                   alt=${b.title} loading="lazy">
            </a>`)}
        </div>`;
    }

    return html`
      <div class="results-wrap">
        <ol-search-bar
          .q=${this._lastQ ?? ''}
          .chips=${this._chips}
          .filters=${this._filters}
        ></ol-search-bar>

        <div class="results-body">
          ${this._renderFilterBar()}
          <ol-search-hint .hint=${this._hint}></ol-search-hint>

          <div class="results-inner">
            ${this._loading ? html`<div class="loading">Searching…</div>` : ''}

            ${!this._loading && this._error ? html`
              <div class="error-msg">Search error: ${this._error}</div>` : ''}

            ${!this._loading && !this._error && !hasResults ? html`
              <div class="no-results">No results found — try adjusting your search or filters.</div>` : ''}

            <div>${this._results.map(w => html`<ol-book-card .work=${w}></ol-book-card>`)}</div>

            ${!this._loading && hasResults ? html`
              <div class="pagination">
                <button class="page-btn" ?disabled=${!hasPrev}
                        @click=${() => this._paginate(-1)}>← Previous</button>
                <span class="page-info">Page ${this._page}</span>
                <button class="page-btn" ?disabled=${!hasNext}
                        @click=${() => this._paginate(1)}>Next →</button>
              </div>` : ''}
          </div>
        </div>
      </div>`;
  }
}

customElements.define('ol-search-page', OlSearchPage);
