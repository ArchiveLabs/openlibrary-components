import { LitElement, html, css } from 'lit';
import './ol-search-bar.js';
import './ol-book-card.js';
import './ol-howto-modal.js';
import './ol-search-hint.js';
import {
  SORT_OPTIONS, AVAILABILITY_OPTIONS, LANGUAGE_OPTIONS, GENRE_OPTIONS,
  FICTION_OPTIONS, POPULAR_AUTHORS, POPULAR_SUBJECTS,
  EMPTY_FILTERS, toggleArrayValue, buildChips, buildSearchParams, shufflePick,
  getSortLabel,
} from '../utils/filters.js';

const LIMIT = 20;

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
    _langSearch:      { state: true },
    _genreSearch:     { state: true },
    _authorSearch:    { state: true },
    _authorResults:   { state: true },
    _subjectSearch:   { state: true },
    _subjectResults:  { state: true },
    _facetsLoading:   { state: true },
    _defaultAuthors:  { state: true },
    _defaultSubjects: { state: true },
    _hint:            { state: true },
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
    this._langSearch      = '';
    this._genreSearch     = '';
    this._authorSearch    = '';
    this._authorResults   = [];
    this._subjectSearch   = '';
    this._subjectResults  = [];
    this._facetsLoading   = false;
    this._defaultAuthors  = shufflePick(POPULAR_AUTHORS, 6);
    this._defaultSubjects = shufflePick(POPULAR_SUBJECTS, 6);
    this._hint            = null;
    this._authorTimer     = null;
    this._subjectTimer    = null;

    this._onDoc = e => {
      if (!e.composedPath().includes(this)) this._openFacet = null;
    };
    this._globalSearch = e => this._onSearch(e);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._onDoc);
    window.addEventListener('ol-search', this._globalSearch);
    const q = new URLSearchParams(location.search).get('q');
    if (q) { this._lastQ = q; this._runSearch(1); }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._onDoc);
    window.removeEventListener('ol-search', this._globalSearch);
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
      case 'lang':    this._languages     = this._languages.filter(v => v !== value); break;
      case 'genre':   this._genres        = this._genres.filter(v => v !== value); break;
      case 'author':  this._authors       = this._authors.filter(v => v !== value); break;
      case 'subject': this._subjects      = this._subjects.filter(v => v !== value); break;
    }
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
        if (data && !this._authorSearch) {
          const facets = data?.sidebar?.searchFacets?.facets ?? {};
          this._authorResults = (facets.author_key ?? []).slice(0, 10)
            .map(f => ({ name: f.name, work_count: f.count }));
        }
      }
      if (name === 'subject' && !this._subjectResults.length) {
        this._facetsLoading = true;
        const data = await loadFacets(this._lastQ);
        this._facetsLoading = false;
        if (data && !this._subjectSearch) {
          const facets = data?.sidebar?.searchFacets?.facets ?? {};
          this._subjectResults = (facets.subject_facet ?? []).slice(0, 10)
            .map(f => ({ name: f.name, work_count: f.count }));
        }
      }
    }
  }

  _rfApply(filter, value) {
    this._openFacet = null;
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

  _onRFAuthorSearch(e) {
    this._authorSearch = e.target.value;
    clearTimeout(this._authorTimer);
    if (this._authorSearch.trim().length < 2) { this._authorResults = []; return; }
    this._authorTimer = setTimeout(async () => {
      const d = await (await fetch(`/api/authors/search?q=${encodeURIComponent(this._authorSearch.trim())}&limit=8`)).json();
      this._authorResults = d.docs ?? [];
    }, 250);
  }

  _onRFSubjectSearch(e) {
    this._subjectSearch = e.target.value;
    clearTimeout(this._subjectTimer);
    if (this._subjectSearch.trim().length < 2) { this._subjectResults = []; return; }
    this._subjectTimer = setTimeout(async () => {
      const d = await (await fetch(`/api/subjects/search?q=${encodeURIComponent(this._subjectSearch.trim())}&limit=8`)).json();
      this._subjectResults = d.docs ?? [];
    }, 250);
  }

  // ── Styles ─────────────────────────────────────────────────────
  static styles = css`
    :host { display:block; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }

    /* Hero */
    .hero { text-align:center; padding:60px 16px 40px; }
    .hero h1 { font-family:Georgia,serif; font-size:30px; color:hsl(202,96%,28%); margin:0 0 8px; }
    .hero p  { color:hsl(0,0%,45%); margin:0 0 32px; font-size:15px; }
    .hero .sw { max-width:640px; margin:0 auto; }

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

    /* Dropdown from results filter bar */
    .rf-drop {
      position:absolute; top:calc(100% + 2px); left:0;
      min-width:210px; background:white;
      border:1px solid hsl(0,0%,82%); border-radius:8px;
      box-shadow:0 6px 24px rgba(0,0,0,.13);
      z-index:600; overflow:hidden;
    }
    .rf-drop.right { left:auto; right:0; }
    .rf-drop-scroll { max-height:260px; overflow-y:auto; }
    .rf-search {
      border:none; border-bottom:1px solid hsl(0,0%,90%);
      padding:8px 12px; font-size:12px; font-family:inherit;
      width:100%; box-sizing:border-box; outline:none; color:hsl(0,0%,15%);
    }
    .rf-search::placeholder { color:hsl(0,0%,58%); }

    /* Search row with dice in rf drops */
    .rf-search-row { display:flex; align-items:stretch; border-bottom:1px solid hsl(0,0%,90%); }
    .rf-search-inline {
      flex:1; border:none; padding:8px 12px; font-size:12px;
      font-family:inherit; outline:none; color:hsl(0,0%,15%); background:transparent;
    }
    .rf-search-inline::placeholder { color:hsl(0,0%,58%); }
    .rf-dice {
      padding:4px 9px; border:none; border-left:1px solid hsl(0,0%,90%);
      background:transparent; cursor:pointer; font-size:15px; flex-shrink:0;
      line-height:1;
    }
    .rf-dice:hover { background:hsl(0,0%,96%); }
    .rf-dice-icon { display:inline-block; transition:transform .2s; }
    .rf-dice:hover .rf-dice-icon { transform:rotate(120deg); }

    /* Fiction pinned section in genre dropdown */
    .rf-fiction-section { background:hsl(270,20%,97%); padding:2px 0; }
    .rf-fiction-sep { height:1px; background:hsl(0,0%,88%); }

    /* Availability item body — stacks label + sub vertically */
    .rf-avail-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; }
    .rf-avail-sub {
      font-size:11px; color:hsl(0,0%,55%); font-weight:normal; line-height:1.35;
    }
    .rf-avail-sub a { color:hsl(202,96%,37%); text-decoration:none; }
    .rf-avail-sub a:hover { text-decoration:underline; }

    .rf-item {
      display:flex; align-items:center; gap:8px;
      padding:7px 12px; font-size:13px; font-family:inherit;
      color:hsl(0,0%,20%); cursor:pointer; border:none;
      background:transparent; width:100%; text-align:left;
      transition:background .07s;
    }
    .rf-item:hover { background:hsl(202,96%,96%); color:hsl(202,96%,28%); }
    .rf-item.selected { font-weight:600; color:hsl(202,96%,28%); }
    .rf-item input[type="checkbox"],
    .rf-item input[type="radio"] { accent-color:hsl(202,96%,37%); flex-shrink:0; cursor:pointer; }
    .rf-count-badge { margin-left:auto; font-size:11px; color:hsl(0,0%,50%); }
    .rf-empty { padding:10px 12px; font-size:12px; color:hsl(0,0%,55%); text-align:center; }
    .rf-hint  { padding:6px 12px; font-size:11px; color:hsl(0,0%,55%); font-style:italic; }

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
        ${this._openFacet === name ? this._renderRFDrop(name, right) : ''}
      </div>`;
  }

  _renderRFDrop(name, right = false) {
    const cls = `rf-drop${right ? ' right' : ''}`;
    if (name === 'sort') {
      return html`<div class="${cls}"><div class="rf-drop-scroll">
        ${SORT_OPTIONS.map(o => html`
          <button class="rf-item ${this._sort === o.value ? 'selected' : ''}"
                  @click=${() => this._rfApply('sort', o.value)}>
            <input type="radio" .checked=${this._sort === o.value} readonly> ${o.label}
          </button>`)}
      </div></div>`;
    }

    if (name === 'avail') {
      return html`<div class="${cls}">
        <div class="rf-drop-scroll">
          ${AVAILABILITY_OPTIONS.map(o => html`
            <button class="rf-item ${this._availability === o.value ? 'selected' : ''}"
                    @click=${() => this._rfApply('availability', o.value)}>
              <input type="radio" .checked=${this._availability === o.value} readonly>
              <span class="rf-avail-body">
                <span>${o.label}</span>
                <span class="rf-avail-sub">
                  ${(o.subParts ?? []).map(p => p.href
                    ? html`<a href=${p.href} target="_blank" rel="noopener"
                               @click=${e => e.stopPropagation()}>${p.text}</a>`
                    : p.text)}
                </span>
              </span>
              <span class="rf-count-badge">${o.staticCount}</span>
            </button>`)}
        </div>
      </div>`;
    }

    if (name === 'lang') {
      const visible = LANGUAGE_OPTIONS.filter(o =>
        !this._langSearch || o.label.toLowerCase().includes(this._langSearch.toLowerCase()));
      return html`<div class="${cls}">
        <input class="rf-search" placeholder="Search languages…" .value=${this._langSearch}
               @input=${e => this._langSearch = e.target.value}
               @click=${e => e.stopPropagation()}>
        <div class="rf-drop-scroll">
          ${visible.length === 0 ? html`<div class="rf-empty">No languages found</div>` : ''}
          ${visible.map(o => {
            const checked = this._languages.includes(o.value);
            return html`<button class="rf-item ${checked ? 'selected' : ''}"
                @click=${() => this._rfApply('languages', toggleArrayValue(this._languages, o.value))}>
              <input type="checkbox" .checked=${checked} readonly> ${o.label}
            </button>`;
          })}
        </div>
      </div>`;
    }

    if (name === 'genre') {
      const visible = GENRE_OPTIONS.filter(o =>
        !this._genreSearch || o.label.toLowerCase().includes(this._genreSearch.toLowerCase()));
      return html`<div class="${cls}">
        <!-- Pinned Fiction / Nonfiction -->
        <div class="rf-fiction-section">
          ${FICTION_OPTIONS.map(o => html`
            <button class="rf-item ${this._fictionFilter === o.value ? 'selected' : ''}"
                    @click=${() => this._rfApply('fictionFilter', this._fictionFilter === o.value ? '' : o.value)}>
              <input type="checkbox" .checked=${this._fictionFilter === o.value} readonly>
              ${o.label}
            </button>`)}
        </div>
        <div class="rf-fiction-sep"></div>
        <input class="rf-search" placeholder="Search genres…" .value=${this._genreSearch}
               @input=${e => this._genreSearch = e.target.value}
               @click=${e => e.stopPropagation()}>
        <div class="rf-drop-scroll">
          ${visible.length === 0 ? html`<div class="rf-empty">No genres found</div>` : ''}
          ${visible.map(o => {
            const checked = this._genres.includes(o.value);
            return html`<button class="rf-item ${checked ? 'selected' : ''}"
                @click=${() => this._rfApply('genres', toggleArrayValue(this._genres, o.value))}>
              <input type="checkbox" .checked=${checked} readonly> ${o.label}
            </button>`;
          })}
        </div>
      </div>`;
    }

    if (name === 'author') {
      const searching = this._authorSearch.trim().length >= 2;
      const showDefaults = !searching && this._authorResults.length === 0 && !this._facetsLoading;
      return html`<div class="${cls}">
        <div class="rf-search-row">
          <input class="rf-search-inline" placeholder="Search authors…" .value=${this._authorSearch}
                 @input=${this._onRFAuthorSearch} @click=${e => e.stopPropagation()}>
          <button class="rf-dice" title="Shuffle suggestions"
                  @click=${e => { e.stopPropagation(); this._defaultAuthors = shufflePick(POPULAR_AUTHORS, 6); }}><span class="rf-dice-icon">🎲</span></button>
        </div>
        <div class="rf-drop-scroll">
          ${this._facetsLoading ? html`<div class="rf-empty">Loading…</div>` : ''}
          ${showDefaults ? html`<div class="rf-hint">Suggested authors</div>` : ''}
          ${showDefaults
            ? this._defaultAuthors.map(name => {
                const checked = this._authors.includes(name);
                return html`<button class="rf-item ${checked ? 'selected' : ''}"
                    @click=${() => this._rfApply('authors', toggleArrayValue(this._authors, name))}>
                  <input type="checkbox" .checked=${checked} readonly> ${name}
                </button>`;
              })
            : ''}
          ${searching && !this._authorResults.length && !this._facetsLoading
            ? html`<div class="rf-empty">No authors found</div>` : ''}
          ${!showDefaults && !this._facetsLoading
            ? this._authorResults.map(a => {
                const checked = this._authors.includes(a.name);
                return html`<button class="rf-item ${checked ? 'selected' : ''}"
                    @click=${() => this._rfApply('authors', toggleArrayValue(this._authors, a.name))}>
                  <input type="checkbox" .checked=${checked} readonly>
                  ${a.name}
                  ${a.work_count ? html`<span class="rf-count-badge">${a.work_count.toLocaleString()}</span>` : ''}
                </button>`;
              })
            : ''}
        </div>
      </div>`;
    }

    if (name === 'subject') {
      const searching = this._subjectSearch.trim().length >= 2;
      const showDefaults = !searching && this._subjectResults.length === 0 && !this._facetsLoading;
      return html`<div class="${cls}">
        <div class="rf-search-row">
          <input class="rf-search-inline" placeholder="Search subjects…" .value=${this._subjectSearch}
                 @input=${this._onRFSubjectSearch} @click=${e => e.stopPropagation()}>
          <button class="rf-dice" title="Shuffle suggestions"
                  @click=${e => { e.stopPropagation(); this._defaultSubjects = shufflePick(POPULAR_SUBJECTS, 6); }}><span class="rf-dice-icon">🎲</span></button>
        </div>
        <div class="rf-drop-scroll">
          ${this._facetsLoading ? html`<div class="rf-empty">Loading…</div>` : ''}
          ${showDefaults ? html`<div class="rf-hint">Suggested subjects</div>` : ''}
          ${showDefaults
            ? this._defaultSubjects.map(name => {
                const checked = this._subjects.includes(name);
                return html`<button class="rf-item ${checked ? 'selected' : ''}"
                    @click=${() => this._rfApply('subjects', toggleArrayValue(this._subjects, name))}>
                  <input type="checkbox" .checked=${checked} readonly> ${name}
                </button>`;
              })
            : ''}
          ${searching && !this._subjectResults.length && !this._facetsLoading
            ? html`<div class="rf-empty">No subjects found</div>` : ''}
          ${!showDefaults && !this._facetsLoading
            ? this._subjectResults.map(s => {
                const checked = this._subjects.includes(s.name);
                return html`<button class="rf-item ${checked ? 'selected' : ''}"
                    @click=${() => this._rfApply('subjects', toggleArrayValue(this._subjects, s.name))}>
                  <input type="checkbox" .checked=${checked} readonly>
                  ${s.name}
                  ${s.work_count ? html`<span class="rf-count-badge">${s.work_count.toLocaleString()}</span>` : ''}
                </button>`;
              })
            : ''}
        </div>
      </div>`;
    }
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
        <div class="hero">
          <h1>Find your next book</h1>
          <p>Search 25+ million books from the Open Library catalog.</p>
          <div class="sw">
            <ol-search-bar
              .showFacets=${true}
              .filters=${this._filters}
              .chips=${this._chips}
              @ol-search=${this._onSearch}
              @ol-filter-change=${this._onFilterChange}
              @ol-chip-remove=${this._onChipRemove}
            ></ol-search-bar>
          </div>
        </div>`;
    }

    return html`
      <div class="results-wrap">
        <ol-search-bar
          .q=${this._lastQ ?? ''}
          .chips=${this._chips}
          @ol-search=${this._onSearch}
          @ol-chip-remove=${this._onChipRemove}
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
