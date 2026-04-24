import { LitElement, html, css } from 'lit';
import {
  SORT_OPTIONS, AVAILABILITY_OPTIONS, LANGUAGE_OPTIONS, GENRE_OPTIONS,
  FICTION_OPTIONS, POPULAR_AUTHORS, POPULAR_SUBJECTS,
  EMPTY_FILTERS, toggleArrayValue, shufflePick, bestEdition,
  getSortLabel, buildChips,
} from '../utils/filters.js';
import './ol-howto-modal.js';

/**
 * Unified search bar used in two modes:
 *
 *   showFacets=true  ("droppable" / header mode)
 *     - owns local filter state (_localFilters)
 *     - chips shown in input row, always visible
 *     - panel opens on focus: facets + autocomplete cards
 *     - ol-search includes { q, filters } so search page can carry them over
 *
 *   showFacets=false (embedded / search-page mode)
 *     - chips passed as prop, shown in input row
 *     - NO panel — just a query input; submit triggers ol-search
 *     - chip × fires ol-chip-remove so the parent updates its state
 */
export class OlSearchBar extends LitElement {
  static properties = {
    q:          { type: String },
    chips:      { type: Array },
    showFacets: { type: Boolean },
    filters:    { type: Object },   // initial/external filter state

    _q:               { state: true },
    _suggestions:     { state: true },
    _open:            { state: true },
    _loading:         { state: true },
    _total:           { state: true },
    _localFilters:    { state: true },
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
    this.filters    = { ...EMPTY_FILTERS };

    this._q             = '';
    this._suggestions   = [];
    this._open          = false;
    this._loading       = false;
    this._total         = 0;
    this._timer         = null;
    this._localFilters  = { ...EMPTY_FILTERS };

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
        if (this._openFacet !== null) {
          this._openFacet = null;
        } else {
          this._open = false;
        }
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
    // In embedded mode the parent owns filter state; keep _localFilters in sync.
    // In droppable mode _localFilters is owned locally and never overwritten by the prop.
    if (!this.showFacets && changed.has('filters') && this.filters) {
      this._localFilters = { ...this.filters };
    }
  }

  // ── Filter helpers ────────────────────────────────────────────
  _hasActiveFilters() {
    const f = this._localFilters;
    // Default 'readable' availability is not a user selection, so don't count it.
    const nonDefaultAvail = f.availability && f.availability !== EMPTY_FILTERS.availability;
    return !!(nonDefaultAvail || f.fictionFilter ||
      f.languages?.length || f.genres?.length ||
      f.authors?.length   || f.subjects?.length);
  }

  // ── Autocomplete ──────────────────────────────────────────────
  _onFocus() {
    // Only open the panel in droppable mode.
    if (this.showFacets) this._open = true;
    this._openFacet = null;
  }

  _onInput(e) {
    this._q = e.target.value;
    if (this.showFacets) this._open = true;
    clearTimeout(this._timer);
    if (this._q.trim().length < 2 && !this._hasActiveFilters()) {
      this._suggestions = [];
      this._loading = false;
      return;
    }
    this._loading = true;
    this._timer = setTimeout(() => this._fetchAutocomplete(), 300);
  }

  async _fetchAutocomplete() {
    const q = this._q.trim();
    const f = this._localFilters;
    try {
      const p = new URLSearchParams({ limit: 5 });
      if (q)               p.set('q', q);
      if (f.availability)  p.set('availability',  f.availability);
      if (f.fictionFilter) p.set('fictionFilter', f.fictionFilter);
      for (const v of f.languages ?? []) p.append('language', v);
      for (const v of f.genres    ?? []) p.append('genres',   v);
      for (const v of f.authors   ?? []) p.append('author',   v);
      for (const v of f.subjects  ?? []) p.append('subjects', v);
      const d = await (await fetch(`/api/search?${p}`)).json();
      this._suggestions = d.docs ?? [];
      this._total       = d.num_found ?? 0;
    } catch {
      this._suggestions = []; this._total = 0;
    } finally {
      this._loading = false;
    }
  }

  _onKeyDown(e) {
    if (e.key === 'Escape') { this._open = false; this._openFacet = null; return; }
    if (e.key === 'Enter')  this._submit();
  }

  _submit() {
    if (!this._q.trim() && !this._hasActiveFilters()) return;
    this.dispatchEvent(new CustomEvent('ol-search', {
      detail: { q: this._q.trim(), filters: this._localFilters },
      bubbles: true, composed: true,
    }));
  }

  // ── Chip handling ─────────────────────────────────────────────
  _handleChipRemove(c) {
    if (this.showFacets) {
      // Droppable: update local state directly.
      const f = this._localFilters;
      if (c.type === 'access')  this._emitFilter('availability',  '');
      else if (c.type === 'fiction') this._emitFilter('fictionFilter', '');
      else if (c.type === 'lang')    this._emitFilter('languages', (f.languages ?? []).filter(v => v !== c.value));
      else if (c.type === 'genre')   this._emitFilter('genres',    (f.genres    ?? []).filter(v => v !== c.value));
      else if (c.type === 'author')  this._emitFilter('authors',   (f.authors   ?? []).filter(v => v !== c.value));
      else if (c.type === 'subject') this._emitFilter('subjects',  (f.subjects  ?? []).filter(v => v !== c.value));
    } else {
      this.dispatchEvent(new CustomEvent('ol-chip-remove', {
        detail: { type: c.type, value: c.value }, bubbles: true, composed: true,
      }));
    }
  }

  // ── Facets ────────────────────────────────────────────────────
  _emitFilter(filter, value, keepOpen = false) {
    this._localFilters = { ...this._localFilters, [filter]: value };
    this.dispatchEvent(new CustomEvent('ol-filter-change', {
      detail: { filter, value }, bubbles: true, composed: true,
    }));
    if (!keepOpen) this._openFacet = null;
    // Refresh autocomplete with updated filters.
    this._open = true;
    clearTimeout(this._timer);
    this._loading = true;
    this._timer = setTimeout(() => this._fetchAutocomplete(), 150);
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

    .search-outer { position: relative; z-index: 10; }

    /* Input row: text input + submit + scanner */
    .input-row {
      display: flex; align-items: center;
      background: white; border: 1.5px solid hsl(0,0%,78%); border-radius: 8px;
      padding: 6px 8px; transition: border-color .15s, box-shadow .15s;
      cursor: text;
    }
    .input-row:focus-within {
      border-color: hsl(202,96%,37%);
      box-shadow: 0 0 0 3px hsla(202,96%,37%,.12);
    }
    .search-outer.open .input-row {
      background: white;
      border-color: hsl(202,96%,37%);
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
      box-shadow: 0 0 0 3px hsla(202,96%,37%,.12);
    }

    /* Chip bar — separate row below input (search-page) or first row in panel (droppable) */
    .chip-bar {
      display: flex; flex-wrap: wrap; gap: 4px;
      padding: 6px 2px 0;
    }
    .panel-chips {
      display: flex; flex-wrap: wrap; gap: 4px;
      padding: 8px 14px 6px;
      border-bottom: 1px solid hsl(0,0%,90%);
      background: hsl(0,0%,99.5%);
    }

    /* Chips */
    .chip {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 7px 2px 9px; border-radius: 9999px;
      font-size: 12px; font-weight: 500; border: 1px solid; white-space: nowrap; line-height: 1.5;
      flex-shrink: 0;
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
      flex:1; min-width:80px; border:none; outline:none;
      font-size:14px; font-family:inherit; color:hsl(0,0%,15%);
      background:white; padding:2px 4px;
      -webkit-appearance:none; appearance:none;
    }
    .text-input::placeholder { color:hsl(0,0%,52%); }

    .input-controls {
      display:flex; align-items:center; flex:1; gap:5px;
    }

    .submit {
      flex-shrink:0; margin-left:auto;
      background:hsl(202,96%,37%); color:white; border:none;
      border-radius:6px; padding:6px 14px; font-size:13px;
      font-weight:500; font-family:inherit; cursor:pointer;
      display:inline-flex; align-items:center; gap:5px;
      white-space:nowrap; transition:background .12s;
    }
    .submit:hover { background:hsl(202,96%,28%); }

    .scan-sep { width:1px; height:20px; background:hsl(0,0%,82%); flex-shrink:0; margin:0 2px; }
    .scan-btn {
      flex-shrink:0; padding:5px 7px; border:1px solid hsl(0,0%,84%); border-radius:6px;
      background:white; cursor:pointer; display:inline-flex; align-items:center;
      transition:background .1s, border-color .1s;
    }
    .scan-btn:hover { background:hsl(0,0%,96%); border-color:hsl(0,0%,70%); }
    .scan-btn img { display:block; width:18px; height:18px; }

    /* Panel (droppable mode only) */
    .panel {
      position:absolute; top:calc(100% - 1.5px); left:0; right:0;
      background:white;
      border:1.5px solid hsl(202,96%,37%);
      border-top:none;
      border-radius:0 0 8px 8px;
      box-shadow:0 12px 32px rgba(0,0,0,.16);
      z-index:500; overflow:visible;
    }

    /* Facet bar */
    .pf-bar {
      display:flex; border-bottom:1px solid hsl(0,0%,90%);
      background:hsl(0,0%,98.5%);
    }
    .pf-bar--round { border-radius: 0 0 9px 9px; }
    .pf-wrap { flex:1; position:relative; display:flex; }
    .pf-wrap + .pf-wrap { border-left:1px solid hsl(0,0%,90%); }
    .pf-wrap--cog { flex:0 0 38px; }
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

    /* Facet dropdown */
    .pf-drop {
      position:absolute; top:calc(100% + 2px); left:0;
      min-width:210px; background:white;
      border:1px solid hsl(0,0%,82%); border-radius:8px;
      box-shadow:0 6px 20px rgba(0,0,0,.14);
      z-index:700; overflow:hidden;
    }
    .pf-drop.right { left:auto; right:0; }
    .pf-drop--avail { min-width:300px; }
    .pf-drop--avail .pf-item { padding:10px 14px; align-items:flex-start; }
    .pf-drop--avail .pf-drop-scroll { max-height:none; }

    /* GitHub-style search input inside dropdown */
    .pf-search-wrap {
      position:relative; border-bottom:1px solid hsl(0,0%,90%);
    }
    .pf-search-icon {
      position:absolute; left:10px; top:50%; transform:translateY(-50%);
      color:hsl(0,0%,58%); pointer-events:none;
    }
    .pf-search {
      border:none; padding:8px 12px 8px 30px;
      font-size:12px; font-family:inherit; width:100%;
      box-sizing:border-box; outline:none; color:hsl(0,0%,15%); background:transparent;
    }
    .pf-search::placeholder { color:hsl(0,0%,58%); }

    /* Search row with dice button (author/subject) */
    .pf-search-row {
      position:relative; display:flex; align-items:stretch;
      border-bottom:1px solid hsl(0,0%,90%);
    }
    .pf-search-inline {
      flex:1; border:none; padding:8px 12px 8px 30px; font-size:12px;
      font-family:inherit; outline:none; color:hsl(0,0%,15%); background:transparent;
    }
    .pf-search-inline::placeholder { color:hsl(0,0%,58%); }
    .pf-dice {
      padding:4px 9px; border:none; border-left:1px solid hsl(0,0%,90%);
      background:transparent; cursor:pointer; font-size:15px; flex-shrink:0; line-height:1;
    }
    .pf-dice:hover { background:hsl(0,0%,96%); }
    .pf-dice-icon { display:inline-block; transition:transform .2s; }
    .pf-dice:hover .pf-dice-icon { transform:rotate(120deg); }

    /* GitHub-style section headers */
    .pf-section-hdr {
      padding:5px 12px 4px; font-size:11px; font-weight:600; color:hsl(0,0%,40%);
      background:hsl(0,0%,98%); border-bottom:1px solid hsl(0,0%,93%);
      letter-spacing:0.03em; text-transform:uppercase;
    }
    .pf-section-sep { height:1px; background:hsl(0,0%,90%); }

    .pf-drop-scroll { max-height:220px; overflow-y:auto; }

    /* Fiction/Nonfiction pinned section */
    .pf-fiction-section { background:hsl(270,20%,97%); padding:2px 0; }
    .pf-fiction-sep { height:1px; background:hsl(0,0%,88%); }

    /* Availability body */
    .pf-avail-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; }
    .pf-avail-sub { font-size:11px; color:hsl(0,0%,55%); font-weight:normal; line-height:1.35; }
    .pf-avail-sub a { color:hsl(202,96%,37%); text-decoration:none; }
    .pf-avail-sub a:hover { text-decoration:underline; }

    .pf-item {
      display:flex; align-items:center; gap:8px;
      padding:7px 12px; font-size:12px; font-family:inherit;
      color:hsl(0,0%,20%); cursor:pointer; border:none;
      background:transparent; width:100%; text-align:left; transition:background .07s;
    }
    .pf-item:hover { background:hsl(202,96%,96%); color:hsl(202,96%,28%); }
    .pf-item.selected { background:hsl(202,96%,97%); font-weight:600; color:hsl(202,96%,28%); }
    .pf-item input[type="checkbox"], .pf-item input[type="radio"] {
      accent-color:hsl(202,96%,37%); flex-shrink:0; cursor:pointer;
    }
    .pf-count { margin-left:auto; font-size:11px; color:hsl(0,0%,55%); }
    .pf-empty { padding:10px 12px; font-size:12px; color:hsl(0,0%,55%); text-align:center; }
    .pf-hint { padding:6px 12px; font-size:11px; color:hsl(0,0%,55%); font-style:italic; }

    /* Sticky footer + destructive clear button */
    .pf-drop-footer {
      border-top:1px solid hsl(0,0%,90%); background:white;
      padding:5px 10px; display:flex; justify-content:flex-end;
    }
    .pf-clear {
      font-size:11px; color:hsl(0,72%,38%); background:none; border:none;
      cursor:pointer; padding:3px 8px; border-radius:4px; font-family:inherit;
      font-weight:500; transition:background .1s;
    }
    .pf-clear:hover { background:hsl(0,72%,95%); }

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

    @media (max-width: 600px) {
      .panel { left: -4px; right: -4px; }
      .pf-bar { overflow-x: auto; scrollbar-width: none; flex-wrap: nowrap; }
      .pf-bar::-webkit-scrollbar { display: none; }
      .pf-btn { font-size: 10px; padding: 7px 3px; }
      .pf-drop, .pf-drop.right { left: 0; right: auto; max-width: calc(100vw - 32px); }
      .pf-drop--avail { min-width: min(300px, calc(100vw - 32px)); }
      .submit { padding: 6px 10px; }
      .ac-scroll { max-height: 220px; }
    }
  `;

  // ── Facet label / active helpers ──────────────────────────────
  _facetLabel(name) {
    const f = this._localFilters;
    switch (name) {
      case 'sort':    return getSortLabel(f.sort ?? '');   // always shows current sort
      case 'avail':   return 'Availability';
      case 'lang':    return f.languages?.length  ? `Language (${f.languages.length})`  : 'Language';
      case 'genre': {
        const total = (f.genres?.length ?? 0) + (f.fictionFilter ? 1 : 0);
        return total ? `Genre (${total})` : 'Genre';
      }
      case 'author':  return f.authors?.length    ? `Author (${f.authors.length})`    : 'Author';
      case 'subject': return f.subjects?.length   ? `Subject (${f.subjects.length})`  : 'Subject';
    }
  }

  _isFacetActive(name) {
    const f = this._localFilters;
    switch (name) {
      case 'sort':    return !!f.sort;
      case 'avail':   return !!f.availability;
      case 'lang':    return f.languages?.length  > 0;
      case 'genre':   return (f.genres?.length > 0) || !!f.fictionFilter;
      case 'author':  return f.authors?.length    > 0;
      case 'subject': return f.subjects?.length   > 0;
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

  // ── Facet dropdown renderers ──────────────────────────────────
  _renderDrop(name, right = false) {
    const f = this._localFilters;
    const cls = `pf-drop${right ? ' right' : ''}`;

    if (name === 'sort') {
      return html`<div class="${cls}">
        <div class="pf-section-hdr">Sort by</div>
        <div class="pf-drop-scroll">
          ${SORT_OPTIONS.map(o => html`
            <button class="pf-item ${f.sort === o.value ? 'selected' : ''}"
                    @click=${() => this._emitFilter('sort', o.value)}>
              <input type="radio" .checked=${f.sort === o.value} readonly> ${o.label}
            </button>`)}
        </div>
      </div>`;
    }

    if (name === 'avail') {
      return html`<div class="${cls} pf-drop--avail">
        <div class="pf-section-hdr">Availability</div>
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
      const selected  = f.languages ?? [];
      const selOpts   = LANGUAGE_OPTIONS.filter(o => selected.includes(o.value));
      const unselVisible = LANGUAGE_OPTIONS.filter(o =>
        !selected.includes(o.value) &&
        (!this._langSearch || o.label.toLowerCase().includes(this._langSearch.toLowerCase()))
      );
      return html`<div class="${cls}">
        <div class="pf-search-wrap">
          <svg class="pf-search-icon" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
          </svg>
          <input class="pf-search" placeholder="Filter languages…" .value=${this._langSearch}
                 @input=${e => { this._langSearch = e.target.value; }}
                 @click=${e => e.stopPropagation()}>
        </div>
        ${selOpts.length ? html`
          <div class="pf-section-hdr">Selected</div>
          ${selOpts.map(o => html`
            <button class="pf-item selected"
                @click=${() => this._emitFilter('languages', toggleArrayValue(selected, o.value), true)}>
              <input type="checkbox" .checked=${true} readonly> ${o.label}
            </button>`)}
          <div class="pf-section-sep"></div>
        ` : ''}
        <div class="pf-section-hdr">${selOpts.length ? 'Suggestions' : 'Languages'}</div>
        <div class="pf-drop-scroll">
          ${unselVisible.length === 0 ? html`<div class="pf-empty">${this._langSearch ? 'No matches' : 'All selected'}</div>` : ''}
          ${unselVisible.map(o => html`
            <button class="pf-item"
                @click=${() => this._emitFilter('languages', toggleArrayValue(selected, o.value), true)}>
              <input type="checkbox" .checked=${false} readonly> ${o.label}
            </button>`)}
        </div>
        ${selected.length ? html`
          <div class="pf-drop-footer">
            <button class="pf-clear" @click=${e => { e.stopPropagation(); this._emitFilter('languages', []); }}>Clear selections</button>
          </div>` : ''}
      </div>`;
    }

    if (name === 'genre') {
      const selectedGenres = f.genres ?? [];
      const selGenreOpts   = GENRE_OPTIONS.filter(o => selectedGenres.includes(o.value));
      const unselVisible   = GENRE_OPTIONS.filter(o =>
        !selectedGenres.includes(o.value) &&
        (!this._genreSearch || o.label.toLowerCase().includes(this._genreSearch.toLowerCase()))
      );
      const hasAnySelection = selectedGenres.length > 0 || !!f.fictionFilter;

      return html`<div class="${cls}">
        <div class="pf-search-wrap">
          <svg class="pf-search-icon" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
          </svg>
          <input class="pf-search" placeholder="Filter genres…" .value=${this._genreSearch}
                 @input=${e => { this._genreSearch = e.target.value; }}
                 @click=${e => e.stopPropagation()}>
        </div>
        <div class="pf-fiction-section">
          ${FICTION_OPTIONS.map(o => html`
            <button class="pf-item ${f.fictionFilter === o.value ? 'selected' : ''}"
                    @click=${() => this._emitFilter('fictionFilter', f.fictionFilter === o.value ? '' : o.value, true)}>
              <input type="checkbox" .checked=${f.fictionFilter === o.value} readonly> ${o.label}
            </button>`)}
        </div>
        <div class="pf-fiction-sep"></div>
        ${selGenreOpts.length ? html`
          <div class="pf-section-hdr">Selected</div>
          ${selGenreOpts.map(o => html`
            <button class="pf-item selected"
                @click=${() => this._emitFilter('genres', toggleArrayValue(selectedGenres, o.value), true)}>
              <input type="checkbox" .checked=${true} readonly> ${o.label}
            </button>`)}
          <div class="pf-section-sep"></div>
        ` : ''}
        <div class="pf-section-hdr">${selGenreOpts.length ? 'Suggestions' : 'Genres'}</div>
        <div class="pf-drop-scroll">
          ${unselVisible.length === 0 ? html`<div class="pf-empty">${this._genreSearch ? 'No matches' : 'All selected'}</div>` : ''}
          ${unselVisible.map(o => html`
            <button class="pf-item"
                @click=${() => this._emitFilter('genres', toggleArrayValue(selectedGenres, o.value), true)}>
              <input type="checkbox" .checked=${false} readonly> ${o.label}
            </button>`)}
        </div>
        ${hasAnySelection ? html`
          <div class="pf-drop-footer">
            <button class="pf-clear" @click=${e => {
              e.stopPropagation();
              this._emitFilter('genres', []);
              this._emitFilter('fictionFilter', '', true);
            }}>Clear selections</button>
          </div>` : ''}
      </div>`;
    }

    if (name === 'author') {
      const searching       = this._authorSearch.trim().length >= 2;
      const selectedAuthors = f.authors ?? [];
      const suggestions     = searching ? this._authorResults : this._defaultAuthors;
      const unselSuggestions = suggestions.map(a => typeof a === 'string' ? { name: a } : a)
        .filter(a => !selectedAuthors.includes(a.name));

      return html`<div class="${cls}">
        <div class="pf-search-row">
          <svg class="pf-search-icon" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
          </svg>
          <input class="pf-search-inline" placeholder="Search authors…" .value=${this._authorSearch}
                 @input=${this._onAuthorSearch} @click=${e => e.stopPropagation()}>
          <button class="pf-dice" title="Shuffle suggestions"
                  @click=${e => { e.stopPropagation(); this._defaultAuthors = shufflePick(POPULAR_AUTHORS, 6); }}>
            <span class="pf-dice-icon">🎲</span></button>
        </div>
        ${selectedAuthors.length ? html`
          <div class="pf-section-hdr">Selected</div>
          ${selectedAuthors.map(name => html`
            <button class="pf-item selected"
                @click=${() => this._emitFilter('authors', toggleArrayValue(selectedAuthors, name), true)}>
              <input type="checkbox" .checked=${true} readonly> ${name}
            </button>`)}
          <div class="pf-section-sep"></div>
        ` : ''}
        <div class="pf-section-hdr">${selectedAuthors.length ? 'Suggestions' : 'Authors'}</div>
        <div class="pf-drop-scroll">
          ${searching && this._authorResults.length === 0 ? html`<div class="pf-empty">No authors found</div>` : ''}
          ${unselSuggestions.map(a => html`
            <button class="pf-item"
                @click=${() => this._emitFilter('authors', toggleArrayValue(selectedAuthors, a.name), true)}>
              <input type="checkbox" .checked=${false} readonly>
              ${a.name}
              ${a.work_count ? html`<span class="pf-count">${a.work_count.toLocaleString()}</span>` : ''}
            </button>`)}
        </div>
        ${selectedAuthors.length ? html`
          <div class="pf-drop-footer">
            <button class="pf-clear" @click=${e => { e.stopPropagation(); this._emitFilter('authors', []); }}>Clear selections</button>
          </div>` : ''}
      </div>`;
    }

    if (name === 'subject') {
      const searching        = this._subjectSearch.trim().length >= 2;
      const selectedSubjects = f.subjects ?? [];
      const suggestions      = searching ? this._subjectResults : this._defaultSubjects;
      const unselSuggestions  = suggestions.map(s => typeof s === 'string' ? { name: s } : s)
        .filter(s => !selectedSubjects.includes(s.name));

      return html`<div class="${cls}">
        <div class="pf-search-row">
          <svg class="pf-search-icon" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
          </svg>
          <input class="pf-search-inline" placeholder="Search subjects…" .value=${this._subjectSearch}
                 @input=${this._onSubjectSearch} @click=${e => e.stopPropagation()}>
          <button class="pf-dice" title="Shuffle suggestions"
                  @click=${e => { e.stopPropagation(); this._defaultSubjects = shufflePick(POPULAR_SUBJECTS, 6); }}>
            <span class="pf-dice-icon">🎲</span></button>
        </div>
        ${selectedSubjects.length ? html`
          <div class="pf-section-hdr">Selected</div>
          ${selectedSubjects.map(name => html`
            <button class="pf-item selected"
                @click=${() => this._emitFilter('subjects', toggleArrayValue(selectedSubjects, name), true)}>
              <input type="checkbox" .checked=${true} readonly> ${name}
            </button>`)}
          <div class="pf-section-sep"></div>
        ` : ''}
        <div class="pf-section-hdr">${selectedSubjects.length ? 'Suggestions' : 'Subjects'}</div>
        <div class="pf-drop-scroll">
          ${searching && this._subjectResults.length === 0 ? html`<div class="pf-empty">No subjects found</div>` : ''}
          ${unselSuggestions.map(s => html`
            <button class="pf-item"
                @click=${() => this._emitFilter('subjects', toggleArrayValue(selectedSubjects, s.name), true)}>
              <input type="checkbox" .checked=${false} readonly>
              ${s.name}
              ${s.work_count ? html`<span class="pf-count">${s.work_count.toLocaleString()}</span>` : ''}
            </button>`)}
        </div>
        ${selectedSubjects.length ? html`
          <div class="pf-drop-footer">
            <button class="pf-clear" @click=${e => { e.stopPropagation(); this._emitFilter('subjects', []); }}>Clear selections</button>
          </div>` : ''}
      </div>`;
    }
  }

  // Order: avail → lang → genre → subject → author → sort → cog
  _renderFacetBar(roundBottom = false) {
    return html`
      <div class="pf-bar ${roundBottom ? 'pf-bar--round' : ''}">
        ${this._renderFacetBtn('avail',  false, 'pf-wrap--first')}
        ${this._renderFacetBtn('lang')}
        ${this._renderFacetBtn('genre')}
        ${this._renderFacetBtn('subject')}
        ${this._renderFacetBtn('author')}
        ${this._renderFacetBtn('sort', true)}
        <div class="pf-wrap pf-wrap--cog pf-wrap--last">
          <button class="pf-btn" title="Search help"
                  @click=${e => { e.stopPropagation(); this._howtoOpen = true; }}>⚙️</button>
        </div>
      </div>
      <ol-howto-modal .open=${this._howtoOpen} @close=${() => this._howtoOpen = false}></ol-howto-modal>`;
  }

  // ── Render ────────────────────────────────────────────────────
  render() {
    const q = this._q.trim();
    const showResults = q.length >= 2 || this._hasActiveFilters();

    // Droppable: derive chips from local filter state.
    // Embedded: use chips prop passed in by the parent.
    const chips = this.showFacets
      ? buildChips(this._localFilters)
      : (this.chips ?? []);

    const chipItems = chips.map(c => html`
      <span class="chip chip-${c.type}">
        ${c.label}
        <button class="chip-x"
                @click=${e => { e.stopPropagation(); this._handleChipRemove(c); }}>×</button>
      </span>`);

    return html`
      <div class="search-outer ${this._open ? 'open' : ''}">
        <div class="input-row">
          <div class="input-controls">
            <input class="text-input" type="text" autocomplete="off"
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

        ${!this.showFacets && chips.length ? html`<div class="chip-bar">${chipItems}</div>` : ''}

        ${this.showFacets && this._open ? html`
          <div class="panel">
            ${chips.length ? html`<div class="panel-chips">${chipItems}</div>` : ''}
            ${this._renderFacetBar(!this._loading && !showResults)}

            ${this._loading ? html`<div class="ac-spin">Searching…</div>` : showResults ? html`
              <div class="ac-scroll">
                ${this._suggestions.length === 0
                  ? html`<div class="ac-empty">No results</div>`
                  : this._suggestions.map(w => {
                      const ed = bestEdition(w.editions);
                      const coverId = ed?.cover_i ?? w.cover_i;
                      const edOlid  = ed?.key?.split('/').pop();
                      const wOlid   = w.key?.split('/').pop();
                      const linkKey = ed?.key ?? w.key;
                      const access  = ed?.ebook_access ?? w.ebook_access;
                      const cover = edOlid  ? `https://covers.openlibrary.org/b/olid/${edOlid}-S.jpg`
                                  : coverId ? `https://covers.openlibrary.org/b/id/${coverId}-S.jpg`
                                  : wOlid   ? `https://covers.openlibrary.org/b/olid/${wOlid}-S.jpg`
                                  : null;
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
                  if (!q && !this._hasActiveFilters()) return;
                  this.dispatchEvent(new CustomEvent('ol-search', {
                    detail: { q, filters: this._localFilters }, bubbles: true, composed: true,
                  }));
                }}>See all ${this._total.toLocaleString()} results →</button>
              </div>
            ` : html`<div class="ac-hint-msg">Start typing to search, or pick a filter above…</div>`}
          </div>` : ''}
      </div>
    `;
  }
}

customElements.define('ol-search-bar', OlSearchBar);
