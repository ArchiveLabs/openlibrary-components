import { LitElement, html, css } from 'lit';

// ── Module-level facets cache (keyed by query string) ─────────────────────────
const _facetsCache = new Map();

async function loadFacets(q) {
  const key = (q || '').trim().toLowerCase();
  if (!key) return {};
  if (_facetsCache.has(key)) return _facetsCache.get(key);
  try {
    const resp = await fetch(`/api/search/facets?q=${encodeURIComponent(q)}`);
    const data = await resp.json();
    const facets = data?.sidebar?.searchFacets?.facets ?? {};
    _facetsCache.set(key, facets);
    return facets;
  } catch {
    _facetsCache.set(key, {});
    return {};
  }
}

// ── Static data ───────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: '',           label: 'Relevance' },
  { value: 'editions',   label: 'Most Editions' },
  { value: 'old',        label: 'First Published' },
  { value: 'new',        label: 'Most Recent' },
  { value: 'rating',     label: 'Top Rated' },
  { value: 'readinglog', label: 'Reading Log' },
  { value: 'trending',   label: 'Trending' },
  { value: 'random',     label: 'Random' },
];

const ACCESS_OPTIONS = [
  { value: 'no_ebook',      label: 'Catalog',    desc: 'In catalog only' },
  { value: 'public',        label: 'Readable',   desc: 'Free to read online' },
  { value: 'printdisabled', label: 'Open',       desc: 'Print-disabled access' },
  { value: 'borrowable',    label: 'Borrowable', desc: 'Borrow from digital library' },
];

const LANGUAGES = [
  { code: 'eng', label: 'English' },   { code: 'spa', label: 'Spanish' },
  { code: 'fre', label: 'French' },    { code: 'ger', label: 'German' },
  { code: 'ita', label: 'Italian' },   { code: 'por', label: 'Portuguese' },
  { code: 'pol', label: 'Polish' },    { code: 'rus', label: 'Russian' },
  { code: 'chi', label: 'Chinese' },   { code: 'jpn', label: 'Japanese' },
  { code: 'ara', label: 'Arabic' },    { code: 'dut', label: 'Dutch' },
  { code: 'swe', label: 'Swedish' },   { code: 'nor', label: 'Norwegian' },
  { code: 'dan', label: 'Danish' },    { code: 'fin', label: 'Finnish' },
  { code: 'tur', label: 'Turkish' },   { code: 'kor', label: 'Korean' },
  { code: 'heb', label: 'Hebrew' },    { code: 'lat', label: 'Latin' },
];

const GENRES = [
  'Action','Adventure','Comedy','Crime','Drama','Erotica',
  'Fantasy','Historical','Horror','Humor','LGBTQ+','Literary',
  'Mystery','Mythology','Romance','Satire','Science Fiction',
  'Thriller','Tragedy','Western',
];

// ── Component ─────────────────────────────────────────────────────────────────
export class OlSearchBar extends LitElement {
  static properties = {
    facetQ:   { type: String, attribute: 'facet-q' },
    initialQ: { type: String, attribute: 'initial-q' },
    _q:               { state: true },
    _sort:            { state: true },
    _access:          { state: true },
    _language:        { state: true },
    _genres:          { state: true },
    _author:          { state: true },
    _subjects:        { state: true },
    _openFacet:       { state: true },
    _langSearch:      { state: true },
    _genreSearch:     { state: true },
    _authorSearch:    { state: true },
    _subjectSearch:   { state: true },
    _authorResults:   { state: true },
    _subjectResults:  { state: true },
    _facetData:       { state: true },
    _facetsLoading:   { state: true },
  };

  constructor() {
    super();
    this.facetQ   = '';
    this.initialQ = '';
    this._q             = '';
    this._sort          = '';
    this._access        = null;
    this._language      = null;
    this._genres        = [];
    this._author        = null;
    this._subjects      = [];
    this._openFacet     = null;
    this._langSearch    = '';
    this._genreSearch   = '';
    this._authorSearch  = '';
    this._subjectSearch = '';
    this._authorResults  = [];
    this._subjectResults = [];
    this._facetData      = null;
    this._facetsLoading  = false;
    this._authorTimer    = null;
    this._subjectTimer   = null;
    this._onDocClick = (e) => {
      if (!e.composedPath().some(el => el?.classList?.contains('fw'))) {
        this._openFacet = null;
      }
    };
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._onDocClick);
    if (this.initialQ) this._q = this.initialQ;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._onDocClick);
  }

  updated(changed) {
    if (changed.has('facetQ') && this.facetQ !== changed.get('facetQ')) {
      this._facetData = null; // invalidate suggestions on new query
    }
  }

  // ── Emit ───────────────────────────────────────────────────────
  _emit() {
    this.dispatchEvent(new CustomEvent('ol-search', {
      detail: {
        q:            this._q,
        sort:         this._sort || undefined,
        ebook_access: this._access,
        language:     this._language?.code ?? null,
        subjects:     [...this._genres, ...this._subjects],
        author:       this._author,
      },
      bubbles: true,
      composed: true,
    }));
  }

  // ── Facet panel open/close ─────────────────────────────────────
  async _toggle(name) {
    if (this._openFacet === name) { this._openFacet = null; return; }
    this._openFacet = name;
    if ((name === 'author' || name === 'subject') && !this._facetData) {
      const q = this.facetQ || this._q;
      if (q) {
        this._facetsLoading = true;
        this._facetData = await loadFacets(q);
        this._facetsLoading = false;
      }
    }
  }

  // ── Filter setters ─────────────────────────────────────────────
  _setSort(val) {
    this._sort = val;
    this._openFacet = null;
    this._emit();
  }

  _setAccess(val) {
    this._access = this._access === val ? null : val;
    this._openFacet = null;
    this._emit();
  }

  _setLanguage(lang) {
    this._language = this._language?.code === lang.code ? null : lang;
    this._openFacet = null;
    this._emit();
  }

  _toggleGenre(g) {
    this._genres = this._genres.includes(g)
      ? this._genres.filter(x => x !== g)
      : [...this._genres, g];
    this._emit();
  }

  _setAuthor(name) {
    this._author = name || null;
    this._authorSearch = name || '';
    this._openFacet = null;
    this._emit();
  }

  _toggleSubject(s) {
    this._subjects = this._subjects.includes(s)
      ? this._subjects.filter(x => x !== s)
      : [...this._subjects, s];
    this._emit();
  }

  _clearFilter(type) {
    if (type === 'sort')     this._sort     = '';
    if (type === 'access')   this._access   = null;
    if (type === 'language') this._language = null;
    if (type === 'genre')    this._genres   = [];
    if (type === 'author')   { this._author = null; this._authorSearch = ''; this._authorResults = []; }
    if (type === 'subject')  { this._subjects = []; this._subjectSearch = ''; this._subjectResults = []; }
    this._emit();
  }

  // ── Debounced remote searches ──────────────────────────────────
  _onAuthorInput(e) {
    this._authorSearch = e.target.value;
    clearTimeout(this._authorTimer);
    if (!this._authorSearch.trim()) { this._authorResults = []; return; }
    this._authorTimer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/authors/search?q=${encodeURIComponent(this._authorSearch)}&limit=8`);
        const d = await r.json();
        this._authorResults = d.docs ?? [];
      } catch { this._authorResults = []; }
    }, 250);
  }

  _onSubjectInput(e) {
    this._subjectSearch = e.target.value;
    clearTimeout(this._subjectTimer);
    if (!this._subjectSearch.trim()) { this._subjectResults = []; return; }
    this._subjectTimer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/subjects/search?q=${encodeURIComponent(this._subjectSearch)}&limit=8`);
        const d = await r.json();
        this._subjectResults = d.docs ?? [];
      } catch { this._subjectResults = []; }
    }, 250);
  }

  // ── Chips ──────────────────────────────────────────────────────
  _chips() {
    const out = [];
    if (this._access) {
      const opt = ACCESS_OPTIONS.find(a => a.value === this._access);
      out.push(html`<span class="chip chip-access">access:${opt?.label ?? this._access}
        <button class="chip-x" @click=${() => this._clearFilter('access')}>×</button></span>`);
    }
    if (this._language) {
      out.push(html`<span class="chip chip-lang">lang:${this._language.label}
        <button class="chip-x" @click=${() => this._clearFilter('language')}>×</button></span>`);
    }
    for (const g of this._genres) {
      out.push(html`<span class="chip chip-genre">genre:${g}
        <button class="chip-x" @click=${() => this._toggleGenre(g)}>×</button></span>`);
    }
    if (this._author) {
      out.push(html`<span class="chip chip-author">author:${this._author}
        <button class="chip-x" @click=${() => this._clearFilter('author')}>×</button></span>`);
    }
    for (const s of this._subjects) {
      out.push(html`<span class="chip chip-subject">subject:${s}
        <button class="chip-x" @click=${() => this._toggleSubject(s)}>×</button></span>`);
    }
    return out;
  }

  // ── Facet button label helpers ─────────────────────────────────
  _btnLabel(staticLabel, value) {
    if (!value) return html`${staticLabel} <span class="chv">▾</span>`;
    return html`
      <span class="bl">${staticLabel}</span>
      <span class="bsep">|</span>
      <span class="bv">${value}</span>
      <span class="chv">▾</span>`;
  }

  // ── Dropdown panels ────────────────────────────────────────────
  _sortPanel() {
    const cur = SORT_OPTIONS.find(o => o.value === this._sort) ?? SORT_OPTIONS[0];
    return html`
      <div class="dd">
        <div class="dd-list">
          ${SORT_OPTIONS.map(opt => html`
            <button class="dd-item ${this._sort === opt.value ? 'sel' : ''}"
                    @click=${() => this._setSort(opt.value)}>
              ${opt.label}
              ${this._sort === opt.value ? html`<span class="dd-check">✓</span>` : ''}
            </button>`)}
        </div>
      </div>`;
  }

  _accessPanel() {
    return html`
      <div class="dd">
        <div class="dd-list">
          ${ACCESS_OPTIONS.map(opt => html`
            <label class="dd-item ${this._access === opt.value ? 'sel' : ''}">
              <input type="radio" name="access" .checked=${this._access === opt.value}
                     @change=${() => this._setAccess(opt.value)}>
              <span>${opt.label}<small class="dd-meta"> — ${opt.desc}</small></span>
            </label>`)}
        </div>
        ${this._access ? html`<div class="dd-foot">
          <button class="dd-clear" @click=${() => this._setAccess(null)}>Clear</button>
        </div>` : ''}
      </div>`;
  }

  _languagePanel() {
    const list = LANGUAGES.filter(l =>
      l.label.toLowerCase().includes(this._langSearch.toLowerCase()));
    return html`
      <div class="dd">
        <div class="dd-srch">
          <input type="text" placeholder="Search languages…"
                 .value=${this._langSearch}
                 @input=${e => this._langSearch = e.target.value}>
        </div>
        <div class="dd-list">
          ${list.map(lang => html`
            <label class="dd-item ${this._language?.code === lang.code ? 'sel' : ''}">
              <input type="radio" name="lang" .checked=${this._language?.code === lang.code}
                     @change=${() => this._setLanguage(lang)}>
              ${lang.label}
            </label>`)}
        </div>
        ${this._language ? html`<div class="dd-foot">
          <button class="dd-clear" @click=${() => this._clearFilter('language')}>Clear</button>
        </div>` : ''}
      </div>`;
  }

  _genrePanel() {
    const list = GENRES.filter(g =>
      g.toLowerCase().includes(this._genreSearch.toLowerCase()));
    return html`
      <div class="dd">
        <div class="dd-srch">
          <input type="text" placeholder="Search genres…"
                 .value=${this._genreSearch}
                 @input=${e => this._genreSearch = e.target.value}>
        </div>
        <div class="dd-list">
          ${list.map(genre => html`
            <label class="dd-item ${this._genres.includes(genre) ? 'sel' : ''}">
              <input type="checkbox" .checked=${this._genres.includes(genre)}
                     @change=${() => this._toggleGenre(genre)}>
              ${genre}
            </label>`)}
        </div>
        ${this._genres.length ? html`<div class="dd-foot">
          <button class="dd-clear" @click=${() => { this._genres = []; this._emit(); }}>Clear all</button>
        </div>` : ''}
      </div>`;
  }

  _authorPanel() {
    const suggested = this._facetData?.author_key ?? [];
    const showSearch = this._authorSearch.length > 0;
    const displayList = showSearch ? this._authorResults : suggested;
    return html`
      <div class="dd wide">
        <div class="dd-srch">
          <input type="text" placeholder="Search authors…" autofocus
                 .value=${this._authorSearch}
                 @input=${this._onAuthorInput}
                 @keydown=${e => e.key === 'Enter' && this._setAuthor(this._authorSearch)}>
        </div>
        <div class="dd-list">
          ${this._facetsLoading ? html`<div class="dd-hint">Loading suggestions…</div>` : ''}
          ${!this._facetsLoading && !showSearch && suggested.length === 0 && !this._author
            ? html`<div class="dd-hint">Type a name to search authors</div>` : ''}
          ${!this._facetsLoading && !showSearch && suggested.length > 0
            ? html`<div class="dd-group-label">Suggested for this search</div>` : ''}
          ${displayList.map(a => {
            const name = a.name ?? a.author_name ?? '';
            const count = a.count ?? a.work_count ?? null;
            return html`
              <button class="dd-item ${this._author === name ? 'sel' : ''}"
                      @click=${() => this._setAuthor(name)}>
                <span class="dd-item-main">${name}</span>
                ${count ? html`<span class="dd-count">${count.toLocaleString()} works</span>` : ''}
                ${this._author === name ? html`<span class="dd-check">✓</span>` : ''}
              </button>`; })}
        </div>
        ${this._author ? html`<div class="dd-foot">
          <button class="dd-clear" @click=${() => this._clearFilter('author')}>Clear</button>
        </div>` : ''}
      </div>`;
  }

  _subjectPanel() {
    const suggested = this._facetData?.subject_facet ?? [];
    const showSearch = this._subjectSearch.length > 0;
    const displayList = showSearch ? this._subjectResults : suggested;
    return html`
      <div class="dd wide">
        <div class="dd-srch">
          <input type="text" placeholder="Search subjects…"
                 .value=${this._subjectSearch}
                 @input=${this._onSubjectInput}>
        </div>
        <div class="dd-list">
          ${this._facetsLoading ? html`<div class="dd-hint">Loading suggestions…</div>` : ''}
          ${!this._facetsLoading && !showSearch && suggested.length === 0 && this._subjects.length === 0
            ? html`<div class="dd-hint">Type to search subjects</div>` : ''}
          ${!this._facetsLoading && !showSearch && suggested.length > 0
            ? html`<div class="dd-group-label">Suggested for this search</div>` : ''}
          ${displayList.map(s => {
            const name = s.subject ?? s.name ?? '';
            const count = s.count ?? s.work_count ?? null;
            const sel = this._subjects.includes(name);
            return html`
              <label class="dd-item ${sel ? 'sel' : ''}">
                <input type="checkbox" .checked=${sel} @change=${() => this._toggleSubject(name)}>
                <span class="dd-item-main">${name}</span>
                ${count ? html`<span class="dd-count">${count.toLocaleString()}</span>` : ''}
              </label>`; })}
          ${showSearch && this._subjectResults.length === 0
            ? html`<div class="dd-hint">No subjects found</div>` : ''}
        </div>
        ${this._subjects.length ? html`<div class="dd-foot">
          <button class="dd-clear" @click=${() => { this._subjects = []; this._emit(); }}>Clear all</button>
        </div>` : ''}
      </div>`;
  }

  // ── Styles ─────────────────────────────────────────────────────
  static styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    /* ── Search input row ──────────────────────────────────────── */
    .input-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 5px;
      background: white;
      border: 1.5px solid hsl(0, 0%, 78%);
      border-radius: 8px;
      padding: 6px 8px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .input-row:focus-within {
      border-color: hsl(202, 96%, 37%);
      box-shadow: 0 0 0 3px hsla(202, 96%, 37%, 0.12);
    }

    /* ── Chips ─────────────────────────────────────────────────── */
    .chip {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 7px 2px 9px; border-radius: 9999px;
      font-size: 12px; font-weight: 500; border: 1px solid;
      white-space: nowrap; line-height: 1.5;
    }
    .chip-access  { background: hsl(142,50%,91%); color: hsl(142,50%,22%); border-color: hsl(142,50%,72%); }
    .chip-lang    { background: hsl(217,70%,92%); color: hsl(217,70%,28%); border-color: hsl(217,70%,76%); }
    .chip-genre   { background: hsl(270,45%,92%); color: hsl(270,45%,30%); border-color: hsl(270,45%,76%); }
    .chip-author  { background: hsl(25,80%,92%);  color: hsl(25,80%,28%);  border-color: hsl(25,80%,72%);  }
    .chip-subject { background: hsl(340,60%,92%); color: hsl(340,60%,28%); border-color: hsl(340,60%,76%); }
    .chip-x {
      background: none; border: none; cursor: pointer;
      padding: 0 1px; font-size: 15px; line-height: 1; opacity: 0.5;
    }
    .chip-x:hover { opacity: 1; }

    /* ── Text input ────────────────────────────────────────────── */
    .text-input {
      flex: 1; min-width: 120px; border: none; outline: none;
      font-size: 14px; font-family: inherit; color: hsl(0,0%,15%);
      background: transparent; padding: 2px 4px;
    }
    .text-input::placeholder { color: hsl(0,0%,52%); }

    /* ── Submit button ─────────────────────────────────────────── */
    .submit {
      flex-shrink: 0; margin-left: auto;
      background: hsl(202,96%,37%); color: white;
      border: none; border-radius: 6px; padding: 6px 14px;
      font-size: 13px; font-weight: 500; font-family: inherit;
      cursor: pointer; display: inline-flex; align-items: center;
      gap: 5px; white-space: nowrap; transition: background 0.12s;
    }
    .submit:hover { background: hsl(202,96%,28%); }

    /* ── Facet bar (GitHub-style button group) ─────────────────── */
    .facet-bar {
      display: flex;
      align-items: stretch;
      margin-top: 8px;
      border-radius: 7px;
      /* Overflow visible so dropdowns escape; visual grouping via collapsed borders on .fw */
    }

    /* Each facet wrapper: relative container + collapsed-border button-group technique */
    .fw {
      position: relative;
      display: flex;
    }
    .fw + .fw { margin-left: -1px; } /* collapse adjacent borders */
    .fw:first-child .fb { border-radius: 6px 0 0 6px; }
    .fw:last-child  .fb { border-radius: 0 6px 6px 0; }

    /* Facet button */
    .fb {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 6px 11px; height: 100%;
      border: 1px solid hsl(0,0%,80%);
      background: white;
      font-size: 12px; font-family: inherit; font-weight: 400;
      color: hsl(0,0%,28%); cursor: pointer; white-space: nowrap;
      transition: background 0.1s, border-color 0.1s, z-index 0s;
      position: relative; z-index: 1;
    }
    .fb:hover { background: hsl(0,0%,97%); border-color: hsl(0,0%,68%); z-index: 2; }
    .fb.open  { background: hsl(202,96%,97%); border-color: hsl(202,96%,55%); z-index: 3; color: hsl(202,96%,25%); }
    .fb.set   { color: hsl(202,96%,25%); }

    /* Label parts inside each button */
    .bl  { color: hsl(0,0%,45%); font-weight: 400; }
    .bsep { color: hsl(0,0%,70%); margin: 0 2px; }
    .bv  { color: hsl(0,0%,18%); font-weight: 500; }
    .chv { font-size: 9px; opacity: 0.55; margin-left: 1px; }

    /* More / cog button */
    .fb-more {
      border-radius: 0 6px 6px 0 !important;
      padding: 6px 10px;
      font-size: 15px;
      color: hsl(0,0%,50%);
    }
    .fb-more:hover { color: hsl(0,0%,20%); }

    /* ── Dropdown ──────────────────────────────────────────────── */
    .dd {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      background: white;
      border: 1px solid hsl(0,0%,82%);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.11);
      z-index: 300;
      min-width: 190px;
      overflow: hidden;
    }
    .dd.wide { min-width: 240px; }

    .dd-srch {
      padding: 8px 10px;
      border-bottom: 1px solid hsl(0,0%,93%);
    }
    .dd-srch input {
      width: 100%; border: 1px solid hsl(0,0%,82%); border-radius: 5px;
      padding: 5px 8px; font-size: 12px; font-family: inherit;
      outline: none; box-sizing: border-box;
    }
    .dd-srch input:focus { border-color: hsl(202,96%,37%); }

    .dd-list { max-height: 230px; overflow-y: auto; padding: 4px 0; }

    .dd-item {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 7px 14px;
      border: none; background: none; text-align: left;
      font-size: 13px; font-family: inherit; color: hsl(0,0%,20%);
      cursor: pointer; transition: background 0.1s;
    }
    .dd-item:hover { background: hsl(0,0%,96%); }
    .dd-item.sel   { background: hsl(202,96%,96%); color: hsl(202,96%,25%); font-weight: 500; }
    .dd-item input[type="checkbox"],
    .dd-item input[type="radio"] {
      accent-color: hsl(202,96%,37%); cursor: pointer; flex-shrink: 0;
    }
    .dd-item-main { flex: 1; }
    .dd-count { font-size: 11px; color: hsl(0,0%,55%); white-space: nowrap; }
    .dd-check { margin-left: auto; color: hsl(202,96%,37%); font-size: 12px; }
    .dd-meta  { font-weight: 400; color: hsl(0,0%,50%); font-size: 11px; }

    .dd-group-label {
      padding: 6px 14px 3px; font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.06em; color: hsl(0,0%,50%);
    }
    .dd-hint {
      padding: 10px 14px; font-size: 12px; color: hsl(0,0%,52%); font-style: italic;
    }

    .dd-foot {
      padding: 6px 10px 8px;
      border-top: 1px solid hsl(0,0%,93%);
    }
    .dd-clear {
      width: 100%; padding: 5px; border: 1px solid hsl(0,0%,80%);
      border-radius: 5px; background: none; font-size: 12px;
      cursor: pointer; color: hsl(0,0%,45%); font-family: inherit;
      text-align: center; transition: all 0.12s;
    }
    .dd-clear:hover { background: hsl(0,0%,96%); border-color: hsl(0,0%,60%); }
  `;

  // ── Render ──────────────────────────────────────────────────────
  render() {
    const { _sort, _access, _language, _genres, _author, _subjects, _openFacet } = this;
    const sortLabel = SORT_OPTIONS.find(o => o.value === _sort)?.label ?? 'Relevance';
    const accessLabel = ACCESS_OPTIONS.find(a => a.value === _access)?.label;
    const genreCount = _genres.length;
    const subjectCount = _subjects.length;

    return html`
      <!-- Search input with chips -->
      <div class="input-row">
        ${this._chips()}
        <input class="text-input" type="search" autocomplete="off"
               placeholder="Search books, authors…"
               .value=${this._q}
               @input=${e => this._q = e.target.value}
               @keydown=${e => { if (e.key === 'Enter') { this._openFacet = null; this._emit(); } }}>
        <button class="submit" @click=${() => { this._openFacet = null; this._emit(); }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
          </svg>
          Search
        </button>
      </div>

      <!-- Facet bar -->
      <div class="facet-bar">

        <!-- Sort by -->
        <div class="fw">
          <button class="fb ${_openFacet === 'sort' ? 'open' : ''} ${_sort ? 'set' : ''}"
                  @click=${() => this._toggle('sort')}>
            ${this._btnLabel('Sort by', _sort ? sortLabel : null)}
          </button>
          ${_openFacet === 'sort' ? this._sortPanel() : ''}
        </div>

        <!-- Access -->
        <div class="fw">
          <button class="fb ${_openFacet === 'access' ? 'open' : ''} ${_access ? 'set' : ''}"
                  @click=${() => this._toggle('access')}>
            ${this._btnLabel('Access', accessLabel ?? null)}
          </button>
          ${_openFacet === 'access' ? this._accessPanel() : ''}
        </div>

        <!-- Language -->
        <div class="fw">
          <button class="fb ${_openFacet === 'language' ? 'open' : ''} ${_language ? 'set' : ''}"
                  @click=${() => this._toggle('language')}>
            ${this._btnLabel('Language', _language?.label ?? null)}
          </button>
          ${_openFacet === 'language' ? this._languagePanel() : ''}
        </div>

        <!-- Genre -->
        <div class="fw">
          <button class="fb ${_openFacet === 'genre' ? 'open' : ''} ${genreCount ? 'set' : ''}"
                  @click=${() => this._toggle('genre')}>
            ${this._btnLabel('Genre', genreCount ? `${genreCount} selected` : null)}
          </button>
          ${_openFacet === 'genre' ? this._genrePanel() : ''}
        </div>

        <!-- Author (lazy) -->
        <div class="fw">
          <button class="fb ${_openFacet === 'author' ? 'open' : ''} ${_author ? 'set' : ''}"
                  @click=${() => this._toggle('author')}>
            ${this._btnLabel('Author', _author ?? null)}
          </button>
          ${_openFacet === 'author' ? this._authorPanel() : ''}
        </div>

        <!-- Subject (lazy) -->
        <div class="fw">
          <button class="fb ${_openFacet === 'subject' ? 'open' : ''} ${subjectCount ? 'set' : ''}"
                  @click=${() => this._toggle('subject')}>
            ${this._btnLabel('Subject', subjectCount ? `${subjectCount} selected` : null)}
          </button>
          ${_openFacet === 'subject' ? this._subjectPanel() : ''}
        </div>

        <!-- More (stub) -->
        <div class="fw">
          <button class="fb fb-more ${_openFacet === 'more' ? 'open' : ''}"
                  title="More filters (coming soon)" aria-label="More filters"
                  @click=${() => this._toggle('more')}>⚙️</button>
        </div>

      </div>
    `;
  }
}

customElements.define('ol-search-bar', OlSearchBar);
