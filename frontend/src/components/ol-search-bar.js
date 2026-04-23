import { LitElement, html, css } from 'lit';
import {
  SORT_OPTIONS, AVAILABILITY_OPTIONS, LANGUAGE_OPTIONS, GENRE_OPTIONS,
  FICTION_OPTIONS, POPULAR_AUTHORS, POPULAR_SUBJECTS,
  EMPTY_FILTERS, toggleArrayValue, shufflePick, bestEdition,
  getSortLabel,
} from '../utils/filters.js';
import './ol-howto-modal.js';

/**
 * Search input + chip pills + autocomplete panel.
 *
 * Props:
 *   q          — controlled query string
 *   chips      — { type, label, value }[]  rendered as colored pills
 *   showFacets — when true, renders a facet filter row inside the open panel
 *   filters    — current filter state object (only read when showFacets=true)
 *
 * Events (bubbles + composed):
 *   ol-search        — { q }
 *   ol-chip-remove   — { type, value }
 *   ol-filter-change — { filter, value }  (only when showFacets=true)
 */
export class OlSearchBar extends LitElement {
  static properties = {
    q:          { type: String },
    chips:      { type: Array },
    showFacets: { type: Boolean },
    noPanel:    { type: Boolean },  // suppress dropdown entirely (results page)
    filters:    { type: Object },

    _q:               { state: true },
    _suggestions:     { state: true },
    _open:            { state: true },
    _loading:         { state: true },
    _total:           { state: true },
    // facet panel state (only active when showFacets=true)
    _openFacet:       { state: true },
    _howtoOpen:       { state: true },
    _langSearch:      { state: true },
    _genreSearch:     { state: true },
    _authorSearch:    { state: true },
    _authorResults:   { state: true },
    _subjectSearch:   { state: true },
    _subjectResults:  { state: true },
    _defaultAuthors:  { state: true },
    _defaultSubjects: { state: true },
  };

  constructor() {
    super();
    this.q          = '';
    this.chips      = [];
    this.showFacets = false;
    this.noPanel    = false;
    this.filters    = { ...EMPTY_FILTERS };

    this._q             = '';
    this._suggestions   = [];
    this._open          = false;
    this._loading       = false;
    this._total         = 0;
    this._timer         = null;

    this._openFacet      = null;
    this._howtoOpen      = false;
    this._langSearch     = '';
    this._genreSearch    = '';
    this._authorSearch   = '';
    this._authorResults  = [];
    this._subjectSearch  = '';
    this._subjectResults = [];
    this._defaultAuthors  = shufflePick(POPULAR_AUTHORS, 6);
    this._defaultSubjects = shufflePick(POPULAR_SUBJECTS, 6);
    this._authorTimer    = null;
    this._subjectTimer   = null;

    this._onDoc = e => {
      if (!e.composedPath().includes(this)) {
        this._open = false;
        this._openFacet = null;
      }
    };
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._onDoc);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._onDoc);
  }

  updated(changed) {
    if (changed.has('q') && this.q != null && this.q !== this._q) {
      this._q = this.q;
    }
  }

  // ── Autocomplete ──────────────────────────────────────────────
  _onFocus() { if (!this.noPanel) this._open = true; }

  _onInput(e) {
    this._q = e.target.value;
    this._open = true;
    clearTimeout(this._timer);
    if (this._q.trim().length < 2) {
      this._suggestions = [];
      this._loading = false;
      return;
    }
    this._loading = true;
    this._timer = setTimeout(async () => {
      try {
        // availability=readable forces OL to populate editions.docs via inner-hit
        // query, so bestEdition() can return a readable edition link instead of
        // falling back to the work URL.
        const p = new URLSearchParams({
          q: this._q.trim(), limit: 5, availability: 'readable',
          fields: 'key,title,author_name,cover_i,first_publish_year,ratings_average,ebook_access,editions.key,editions.cover_i,editions.ebook_access',
        });
        const d = await (await fetch(`/api/search?${p}`)).json();
        this._suggestions = d.docs ?? [];
        this._total       = d.num_found ?? 0;
      } catch {
        this._suggestions = []; this._total = 0;
      } finally {
        this._loading = false;
      }
    }, 300);
  }

  _onKeyDown(e) {
    if (e.key === 'Escape') { this._open = false; this._openFacet = null; return; }
    if (e.key === 'Enter')  this._submit();
  }

  _submit() {
    this._open = false;
    this._openFacet = null;
    if (!this._q.trim()) return;
    this.dispatchEvent(new CustomEvent('ol-search', {
      detail: { q: this._q.trim() }, bubbles: true, composed: true,
    }));
  }

  _removeChip(type, value) {
    this.dispatchEvent(new CustomEvent('ol-chip-remove', {
      detail: { type, value }, bubbles: true, composed: true,
    }));
  }

  // ── Facets ────────────────────────────────────────────────────
  _emitFilter(filter, value) {
    this.dispatchEvent(new CustomEvent('ol-filter-change', {
      detail: { filter, value }, bubbles: true, composed: true,
    }));
    this._openFacet = null;
  }

  _toggleFacet(name, e) {
    e.stopPropagation();
    this._openFacet = this._openFacet === name ? null : name;
  }

  _onAuthorSearch(e) {
    this._authorSearch = e.target.value;
    clearTimeout(this._authorTimer);
    if (this._authorSearch.trim().length < 2) { this._authorResults = []; return; }
    this._authorTimer = setTimeout(async () => {
      const d = await (await fetch(`/api/authors/search?q=${encodeURIComponent(this._authorSearch.trim())}&limit=8`)).json();
      this._authorResults = d.docs ?? [];
    }, 250);
  }

  _onSubjectSearch(e) {
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
    :host { display: block; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }

    /* Outer wrapper — the position root for the dropdown panel */
    .search-outer { position: relative; z-index: 10; }

    /* Input row — only the text input + submit + scanner */
    .input-row {
      display: flex; align-items: center; flex-wrap: nowrap; gap: 5px;
      background: white; border: 1.5px solid hsl(0,0%,78%); border-radius: 8px;
      padding: 6px 8px; transition: border-color .15s, box-shadow .15s;
    }
    .input-row:focus-within {
      border-color: hsl(202,96%,37%);
      box-shadow: 0 0 0 3px hsla(202,96%,37%,.12);
    }
    .input-row.panel-open {
      border-color: hsl(202,96%,37%);
      box-shadow: 0 0 0 3px hsla(202,96%,37%,.12);
    }

    /* Chip bar — always visible when chips are present, sits below the input */
    .chip-bar {
      display: flex; flex-wrap: wrap; gap: 5px; padding: 5px 2px 2px;
    }

    /* Chips */
    .chip {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 7px 2px 9px; border-radius: 9999px;
      font-size: 12px; font-weight: 500; border: 1px solid; white-space: nowrap; line-height: 1.5;
    }
    .chip-access   { background:hsl(142,50%,91%); color:hsl(142,50%,22%); border-color:hsl(142,50%,72%); }
    .chip-fiction  { background:hsl(270,45%,92%); color:hsl(270,45%,30%); border-color:hsl(270,45%,76%); }
    .chip-lang     { background:hsl(217,70%,92%); color:hsl(217,70%,28%); border-color:hsl(217,70%,76%); }
    .chip-genre    { background:hsl(270,35%,93%); color:hsl(270,35%,32%); border-color:hsl(270,35%,78%); }
    .chip-author   { background:hsl(25,80%,92%);  color:hsl(25,80%,28%);  border-color:hsl(25,80%,72%); }
    .chip-subject  { background:hsl(340,60%,92%); color:hsl(340,60%,28%); border-color:hsl(340,60%,76%); }
    .chip-x {
      background:none; border:none; cursor:pointer;
      padding:0 1px; font-size:15px; line-height:1; opacity:.5;
    }
    .chip-x:hover { opacity:1; }

    /* Text input */
    .text-input {
      flex:1; min-width:120px; border:none; outline:none;
      font-size:14px; font-family:inherit; color:hsl(0,0%,15%);
      background:transparent; padding:2px 4px;
    }
    .text-input::placeholder { color:hsl(0,0%,52%); }

    /* Input + submit + scanner grouped so they never split across lines */
    .input-controls {
      display:flex; align-items:center; flex:1; min-width:160px; gap:5px;
    }

    /* Submit button */
    .submit {
      flex-shrink:0; margin-left:auto;
      background:hsl(202,96%,37%); color:white; border:none;
      border-radius:6px; padding:6px 14px; font-size:13px;
      font-weight:500; font-family:inherit; cursor:pointer;
      display:inline-flex; align-items:center; gap:5px;
      white-space:nowrap; transition:background .12s;
    }
    .submit:hover { background:hsl(202,96%,28%); }

    /* Barcode scanner button */
    .scan-sep { width:1px; height:20px; background:hsl(0,0%,82%); flex-shrink:0; margin:0 2px; }
    .scan-btn {
      flex-shrink:0; padding:5px 7px; border:1px solid hsl(0,0%,84%); border-radius:6px;
      background:white; cursor:pointer; display:inline-flex; align-items:center;
      transition:background .1s, border-color .1s;
    }
    .scan-btn:hover { background:hsl(0,0%,96%); border-color:hsl(0,0%,70%); }
    .scan-btn img { display:block; width:18px; height:18px; }

    /* Panel — floating box below the search-outer wrapper */
    .panel {
      position:absolute; top:calc(100% + 3px); left:0; right:0;
      background:white;
      border:1.5px solid hsl(202,96%,37%);
      border-radius:8px;
      box-shadow:0 8px 28px rgba(0,0,0,.14), 0 0 0 3px hsla(202,96%,37%,.12);
      z-index:500; overflow:visible;
    }

    /* Facet bar inside panel */
    .pf-bar {
      display:flex; border-bottom:1px solid hsl(0,0%,90%);
      background:hsl(0,0%,98.5%);
    }
    .pf-bar--round { border-radius: 0 0 9px 9px; }
    .pf-wrap { flex:1; position:relative; display:flex; }
    .pf-wrap + .pf-wrap { border-left:1px solid hsl(0,0%,90%); }
    /* Cog column is narrower than facet columns */
    .pf-wrap--cog { flex:0 0 38px; }
    /* Corner facets must mirror the panel's border-radius */
    .pf-wrap--first { border-bottom-left-radius:9px; }
    .pf-wrap--first .pf-btn { border-bottom-left-radius:9px; }
    .pf-wrap--last  { border-bottom-right-radius:9px; }
    .pf-wrap--last  .pf-btn { border-bottom-right-radius:9px; }
    .pf-btn {
      flex:1; padding:7px 4px; border:none; background:transparent;
      font-size:11px; font-family:inherit; color:hsl(0,0%,35%);
      cursor:pointer; display:flex; align-items:center; justify-content:center;
      gap:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      transition:background .08s;
    }
    .pf-btn:hover  { background:hsl(0,0%,95%); color:hsl(202,96%,28%); }
    .pf-btn.active { color:hsl(202,96%,28%); font-weight:600; }
    .pf-caret { font-size:8px; opacity:.5; flex-shrink:0; }

    /* Dropdown from facet bar */
    .pf-drop {
      position:absolute; top:calc(100% + 2px); left:0;
      min-width:200px; background:white;
      border:1px solid hsl(0,0%,82%); border-radius:8px;
      box-shadow:0 6px 20px rgba(0,0,0,.14);
      z-index:700; overflow:hidden;
    }
    .pf-drop.right { left:auto; right:0; }
    .pf-drop-scroll { max-height:240px; overflow-y:auto; }
    .pf-search {
      border:none; border-bottom:1px solid hsl(0,0%,90%);
      padding:8px 12px; font-size:12px; font-family:inherit;
      width:100%; box-sizing:border-box; outline:none; color:hsl(0,0%,15%);
    }
    .pf-search::placeholder { color:hsl(0,0%,58%); }

    /* Search row with dice button (author/subject) */
    .pf-search-row {
      display:flex; align-items:stretch; border-bottom:1px solid hsl(0,0%,90%);
    }
    .pf-search-inline {
      flex:1; border:none; padding:8px 12px; font-size:12px;
      font-family:inherit; outline:none; color:hsl(0,0%,15%); background:transparent;
    }
    .pf-search-inline::placeholder { color:hsl(0,0%,58%); }
    .pf-dice {
      padding:4px 9px; border:none; border-left:1px solid hsl(0,0%,90%);
      background:transparent; cursor:pointer; font-size:15px; flex-shrink:0;
      line-height:1;
    }
    .pf-dice:hover { background:hsl(0,0%,96%); }
    .pf-dice-icon { display:inline-block; transition:transform .2s; }
    .pf-dice:hover .pf-dice-icon { transform:rotate(120deg); }

    /* Fiction/Nonfiction pinned section in genre dropdown */
    .pf-fiction-section { background:hsl(270,20%,97%); padding:2px 0; }
    .pf-fiction-sep { height:1px; background:hsl(0,0%,88%); }

    /* Availability item body — stacks label + sub vertically */
    .pf-avail-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; }
    .pf-avail-sub {
      font-size:11px; color:hsl(0,0%,55%); font-weight:normal; line-height:1.35;
    }
    .pf-avail-sub a { color:hsl(202,96%,37%); text-decoration:none; }
    .pf-avail-sub a:hover { text-decoration:underline; }

    .pf-item {
      display:flex; align-items:center; gap:8px;
      padding:7px 12px; font-size:12px; font-family:inherit;
      color:hsl(0,0%,20%); cursor:pointer; border:none;
      background:transparent; width:100%; text-align:left;
      transition:background .07s;
    }
    .pf-item:hover { background:hsl(202,96%,96%); color:hsl(202,96%,28%); }
    .pf-item.selected { font-weight:600; color:hsl(202,96%,28%); }
    .pf-item input[type="checkbox"], .pf-item input[type="radio"] {
      accent-color:hsl(202,96%,37%); flex-shrink:0; cursor:pointer;
    }
    .pf-count { margin-left:auto; font-size:11px; color:hsl(0,0%,55%); }
    .pf-empty { padding:10px 12px; font-size:12px; color:hsl(0,0%,55%); text-align:center; }
    .pf-hint { padding:6px 12px; font-size:11px; color:hsl(0,0%,55%); font-style:italic; }

    /* Autocomplete results */
    .ac-scroll { max-height:280px; overflow-y:auto; }
    .ac-spin, .ac-hint-msg, .ac-empty {
      padding:16px; text-align:center; font-size:13px; color:hsl(0,0%,55%);
    }
    .ac-row {
      display:flex; align-items:center; gap:12px; padding:10px 14px;
      text-decoration:none; border-bottom:1px solid hsl(0,0%,94%);
      transition:background .1s; cursor:pointer; color:inherit;
    }
    .ac-row:hover { background:hsl(0,0%,97%); }
    .ac-row:last-of-type { border-bottom:none; }
    .ac-cover {
      width:36px; height:54px; object-fit:cover; border-radius:3px;
      background:hsl(0,0%,90%); flex-shrink:0; display:block;
      box-shadow:1px 1px 3px rgba(0,0,0,.15);
    }
    .ac-blank {
      width:36px; height:54px; flex-shrink:0; border-radius:3px;
      background:hsl(48,20%,88%); display:flex;
      align-items:center; justify-content:center; font-size:18px;
    }
    .ac-body { flex:1; min-width:0; text-align:left; }
    .ac-title {
      font-family:Georgia,serif; font-size:14px; font-weight:600;
      color:hsl(202,96%,22%); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .ac-author { font-size:12px; color:hsl(0,0%,45%); margin-top:2px; }
    .ac-year   { font-size:11px; color:hsl(0,0%,58%); }
    .ac-meta   { display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0; }
    .ac-badge  { font-size:10px; font-weight:600; padding:2px 6px; border-radius:3px; white-space:nowrap; }
    .ac-badge--readable { background:hsl(142,50%,91%); color:hsl(142,50%,22%); }
    .ac-badge--catalog  { background:hsl(0,0%,92%); color:hsl(0,0%,42%); }
    .ac-star   { font-size:11px; color:hsl(40,80%,38%); white-space:nowrap; }
    .ac-foot {
      display:flex; align-items:center; justify-content:space-between;
      padding:10px 14px; border-top:1px solid hsl(0,0%,92%);
    }
    .ac-add-book {
      font-size:12px; color:hsl(202,96%,37%); text-decoration:none;
      font-weight:500; padding:5px 10px; border-radius:5px;
      border:1px solid hsl(202,96%,80%); transition:background .1s; white-space:nowrap;
    }
    .ac-add-book:hover { background:hsl(202,96%,96%); }
    .ac-see-all {
      background:hsl(202,96%,37%); color:white; border:none;
      border-radius:6px; padding:7px 18px; font-size:13px;
      font-weight:500; font-family:inherit; cursor:pointer;
      white-space:nowrap; transition:background .12s;
    }
    .ac-see-all:hover { background:hsl(202,96%,28%); }
  `;

  // ── Facet panel helpers ───────────────────────────────────────
  _facetLabel(name) {
    const f = this.filters;
    switch (name) {
      case 'sort':   return f.sort ? getSortLabel(f.sort) : 'Sort by';
      case 'avail':  return 'Availability';
      case 'lang':   return f.languages?.length ? `Language (${f.languages.length})` : 'Language';
      case 'genre': {
        const total = (f.genres?.length ?? 0) + (f.fictionFilter ? 1 : 0);
        return total ? `Genre (${total})` : 'Genre';
      }
      case 'author': return f.authors?.length   ? `Author (${f.authors.length})`   : 'Author';
      case 'subject':return f.subjects?.length  ? `Subject (${f.subjects.length})` : 'Subject';
    }
  }

  _isFacetActive(name) {
    const f = this.filters;
    switch (name) {
      case 'sort':   return !!f.sort;
      case 'avail':  return !!f.availability;
      case 'lang':   return f.languages?.length > 0;
      case 'genre':  return (f.genres?.length > 0) || !!f.fictionFilter;
      case 'author': return f.authors?.length > 0;
      case 'subject':return f.subjects?.length > 0;
    }
  }

  _renderFacetBtn(name, right = false, extraClass = '') {
    return html`
      <div class="pf-wrap ${extraClass}">
        <button class="pf-btn ${this._isFacetActive(name) ? 'active' : ''}"
                @click=${e => this._toggleFacet(name, e)}>
          ${this._facetLabel(name)}<span class="pf-caret">▾</span>
        </button>
        ${this._openFacet === name ? this._renderDrop(name, right) : ''}
      </div>`;
  }

  _renderDrop(name, right = false) {
    const f = this.filters;
    const cls = `pf-drop${right ? ' right' : ''}`;

    if (name === 'sort') {
      return html`<div class="${cls}"><div class="pf-drop-scroll">
        ${SORT_OPTIONS.map(o => html`
          <button class="pf-item ${f.sort === o.value ? 'selected' : ''}"
                  @click=${() => this._emitFilter('sort', o.value)}>
            <input type="radio" .checked=${f.sort === o.value} readonly> ${o.label}
          </button>`)}
      </div></div>`;
    }

    if (name === 'avail') {
      return html`<div class="${cls}">
        <div class="pf-drop-scroll">
          ${AVAILABILITY_OPTIONS.map(o => html`
            <button class="pf-item ${f.availability === o.value ? 'selected' : ''}"
                    @click=${() => this._emitFilter('availability', o.value)}>
              <input type="radio" .checked=${f.availability === o.value} readonly>
              <span class="pf-avail-body">
                <span>${o.label}</span>
                <span class="pf-avail-sub">
                  ${(o.subParts ?? []).map(p => p.href
                    ? html`<a href=${p.href} target="_blank" rel="noopener"
                               @click=${e => e.stopPropagation()}>${p.text}</a>`
                    : p.text)}
                </span>
              </span>
              <span class="pf-count">${o.staticCount}</span>
            </button>`)}
        </div>
      </div>`;
    }

    if (name === 'lang') {
      const visible = LANGUAGE_OPTIONS.filter(o =>
        !this._langSearch || o.label.toLowerCase().includes(this._langSearch.toLowerCase()));
      return html`<div class="${cls}">
        <input class="pf-search" placeholder="Search languages…" .value=${this._langSearch}
               @input=${e => { this._langSearch = e.target.value; }}
               @click=${e => e.stopPropagation()}>
        <div class="pf-drop-scroll">
          ${visible.length === 0 ? html`<div class="pf-empty">No languages found</div>` : ''}
          ${visible.map(o => {
            const checked = (f.languages ?? []).includes(o.value);
            return html`<button class="pf-item ${checked ? 'selected' : ''}"
                @click=${() => this._emitFilter('languages', toggleArrayValue(f.languages ?? [], o.value))}>
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
        <input class="pf-search" placeholder="Search genres…" .value=${this._genreSearch}
               @input=${e => { this._genreSearch = e.target.value; }}
               @click=${e => e.stopPropagation()}>
        <div class="pf-fiction-section">
          ${FICTION_OPTIONS.map(o => html`
            <button class="pf-item ${f.fictionFilter === o.value ? 'selected' : ''}"
                    @click=${() => this._emitFilter('fictionFilter', f.fictionFilter === o.value ? '' : o.value)}>
              <input type="checkbox" .checked=${f.fictionFilter === o.value} readonly> ${o.label}
            </button>`)}
        </div>
        <div class="pf-fiction-sep"></div>
        <div class="pf-drop-scroll">
          ${visible.length === 0 ? html`<div class="pf-empty">No genres found</div>` : ''}
          ${visible.map(o => {
            const checked = (f.genres ?? []).includes(o.value);
            return html`<button class="pf-item ${checked ? 'selected' : ''}"
                @click=${() => this._emitFilter('genres', toggleArrayValue(f.genres ?? [], o.value))}>
              <input type="checkbox" .checked=${checked} readonly> ${o.label}
            </button>`;
          })}
        </div>
      </div>`;
    }

    if (name === 'author') {
      const searching = this._authorSearch.trim().length >= 2;
      const showDefaults = !searching && this._authorResults.length === 0;
      return html`<div class="${cls}">
        <div class="pf-search-row">
          <input class="pf-search-inline" placeholder="Search authors…" .value=${this._authorSearch}
                 @input=${this._onAuthorSearch} @click=${e => e.stopPropagation()}>
          <button class="pf-dice" title="Shuffle suggestions"
                  @click=${e => { e.stopPropagation(); this._defaultAuthors = shufflePick(POPULAR_AUTHORS, 6); }}><span class="pf-dice-icon">🎲</span></button>
        </div>
        <div class="pf-drop-scroll">
          ${showDefaults ? html`<div class="pf-hint">Suggested authors</div>` : ''}
          ${showDefaults
            ? this._defaultAuthors.map(name => {
                const checked = (f.authors ?? []).includes(name);
                return html`<button class="pf-item ${checked ? 'selected' : ''}"
                    @click=${() => this._emitFilter('authors', toggleArrayValue(f.authors ?? [], name))}>
                  <input type="checkbox" .checked=${checked} readonly> ${name}
                </button>`;
              })
            : ''}
          ${searching && this._authorResults.length === 0
            ? html`<div class="pf-empty">No authors found</div>` : ''}
          ${searching
            ? this._authorResults.map(a => {
                const checked = (f.authors ?? []).includes(a.name);
                return html`<button class="pf-item ${checked ? 'selected' : ''}"
                    @click=${() => this._emitFilter('authors', toggleArrayValue(f.authors ?? [], a.name))}>
                  <input type="checkbox" .checked=${checked} readonly>
                  ${a.name}
                  ${a.work_count ? html`<span class="pf-count">${a.work_count.toLocaleString()}</span>` : ''}
                </button>`;
              })
            : ''}
        </div>
      </div>`;
    }

    if (name === 'subject') {
      const searching = this._subjectSearch.trim().length >= 2;
      const showDefaults = !searching && this._subjectResults.length === 0;
      return html`<div class="${cls}">
        <div class="pf-search-row">
          <input class="pf-search-inline" placeholder="Search subjects…" .value=${this._subjectSearch}
                 @input=${this._onSubjectSearch} @click=${e => e.stopPropagation()}>
          <button class="pf-dice" title="Shuffle suggestions"
                  @click=${e => { e.stopPropagation(); this._defaultSubjects = shufflePick(POPULAR_SUBJECTS, 6); }}><span class="pf-dice-icon">🎲</span></button>
        </div>
        <div class="pf-drop-scroll">
          ${showDefaults ? html`<div class="pf-hint">Suggested subjects</div>` : ''}
          ${showDefaults
            ? this._defaultSubjects.map(name => {
                const checked = (f.subjects ?? []).includes(name);
                return html`<button class="pf-item ${checked ? 'selected' : ''}"
                    @click=${() => this._emitFilter('subjects', toggleArrayValue(f.subjects ?? [], name))}>
                  <input type="checkbox" .checked=${checked} readonly> ${name}
                </button>`;
              })
            : ''}
          ${searching && this._subjectResults.length === 0
            ? html`<div class="pf-empty">No subjects found</div>` : ''}
          ${searching
            ? this._subjectResults.map(s => {
                const checked = (f.subjects ?? []).includes(s.name);
                return html`<button class="pf-item ${checked ? 'selected' : ''}"
                    @click=${() => this._emitFilter('subjects', toggleArrayValue(f.subjects ?? [], s.name))}>
                  <input type="checkbox" .checked=${checked} readonly>
                  ${s.name}
                  ${s.work_count ? html`<span class="pf-count">${s.work_count.toLocaleString()}</span>` : ''}
                </button>`;
              })
            : ''}
        </div>
      </div>`;
    }
  }

  _renderFacetBar(roundBottom = false) {
    return html`
      <div class="pf-bar ${roundBottom ? 'pf-bar--round' : ''}">
        ${this._renderFacetBtn('avail',  false, 'pf-wrap--first')}
        ${this._renderFacetBtn('lang')}
        ${this._renderFacetBtn('genre')}
        ${this._renderFacetBtn('author')}
        ${this._renderFacetBtn('subject')}
        <div class="pf-wrap pf-wrap--cog">
          <button class="pf-btn" title="Search help"
                  @click=${e => { e.stopPropagation(); this._howtoOpen = true; }}>⚙️</button>
        </div>
        ${this._renderFacetBtn('sort', true, 'pf-wrap--last')}
      </div>
      <ol-howto-modal .open=${this._howtoOpen} @close=${() => this._howtoOpen = false}></ol-howto-modal>`;
  }

  // ── Render ────────────────────────────────────────────────────
  render() {
    const q = this._q.trim();
    const showResults = q.length >= 2;

    const chips = this.chips ?? [];

    return html`
      <div class="search-outer">
      <div class="input-row ${this._open ? 'panel-open' : ''}">
        <div class="input-controls">
          <input class="text-input" type="search" autocomplete="off"
                 placeholder="Search books, authors…" .value=${this._q}
                 @focus=${this._onFocus}
                 @input=${this._onInput}
                 @keydown=${this._onKeyDown}>

          <button class="submit" @click=${this._submit} aria-label="Search">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
          </button>
          <span class="scan-sep"></span>
          <a class="scan-btn" title="Scan ISBN barcode"
             href="https://openlibrary.org/barcodescanner?returnTo=/isbn/$$$"
             target="_blank" rel="noopener"
             @click=${e => e.stopPropagation()}>
            <img src="https://openlibrary.org/static/images/icons/barcode_scanner.svg"
                 alt="Scan barcode" width="18" height="18">
          </a>
        </div>
      </div>

      ${chips.length ? html`
        <div class="chip-bar">
          ${chips.map(c => html`
            <span class="chip chip-${c.type}">
              ${c.label}
              <button class="chip-x" @click=${() => this._removeChip(c.type, c.value)}>×</button>
            </span>`)}
        </div>` : ''}

      ${this._open ? html`
        <div class="panel">
          ${this.showFacets ? this._renderFacetBar(!this._loading && !showResults) : ''}

          ${this._loading ? html`<div class="ac-spin">Searching…</div>` : showResults ? html`
            <div class="ac-scroll">
              ${this._suggestions.length === 0
                ? html`<div class="ac-empty">No results</div>`
                : this._suggestions.map(w => {
                    const ed = bestEdition(w.editions);
                    const coverId = ed?.cover_i ?? w.cover_i;
                    const linkKey = ed?.key ?? w.key;
                    const access  = ed?.ebook_access ?? w.ebook_access;
                    const cover = coverId
                      ? `https://covers.openlibrary.org/b/id/${coverId}-S.jpg` : null;
                    const isReadable = access === 'public' || access === 'borrowable';
                    return html`
                      <a class="ac-row" href="https://openlibrary.org${linkKey}"
                         target="_blank" rel="noopener"
                         @click=${() => this._open = false}>
                        ${cover
                          ? html`<img class="ac-cover" src=${cover} alt="" loading="lazy">`
                          : html`<div class="ac-blank">📖</div>`}
                        <div class="ac-body">
                          <div class="ac-title">${w.title}</div>
                          <div class="ac-author">${(w.author_name ?? []).slice(0,2).join(', ')}</div>
                          ${w.first_publish_year ? html`<div class="ac-year">${w.first_publish_year}</div>` : ''}
                        </div>
                        <div class="ac-meta">
                          <span class="ac-badge ${isReadable ? 'ac-badge--readable' : 'ac-badge--catalog'}">
                            ${isReadable ? 'Readable' : 'Catalog'}
                          </span>
                          ${w.ratings_average
                            ? html`<span class="ac-star">★ ${w.ratings_average.toFixed(1)}</span>`
                            : ''}
                        </div>
                      </a>`;})}
            </div>
            <div class="ac-foot">
              <a class="ac-add-book" href="https://openlibrary.org/books/add"
                 target="_blank" rel="noopener"
                 @click=${e => e.stopPropagation()}>+ Add Book</a>
              <button class="ac-see-all" @click=${() => {
                this._open = false;
                if (!q) return;
                this.dispatchEvent(new CustomEvent('ol-search', {
                  detail: { q }, bubbles: true, composed: true,
                }));
              }}>See all ${this._total.toLocaleString()} results →</button>
            </div>
          ` : this.showFacets ? '' : html`<div class="ac-hint-msg">Start typing to search books…</div>`}
        </div>` : ''}
      </div>
    `;
  }
}

customElements.define('ol-search-bar', OlSearchBar);
