import { LitElement, html, css, nothing } from 'lit';
import {
  POPULAR_AUTHORS, POPULAR_SUBJECTS,
  EMPTY_FILTERS, shufflePick, bestEdition,
  getSortLabel, buildChips,
} from '../utils/filters.js';
import './ol-howto-modal.js';
import './ol-facet-drop.js';

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
    q:           { type: String },
    chips:       { type: Array },
    showFacets:  { type: Boolean },
    filters:     { type: Object },   // initial/external filter state
    apiBase:     { type: String },   // prefix for /api/* calls, default ''
    siteBase:    { type: String },   // prefix for item links, default 'https://openlibrary.org'
    placeholder: { type: String },   // input placeholder text

    _q:               { state: true },
    _suggestions:     { state: true },
    _open:            { state: true },
    _loading:         { state: true },
    _total:           { state: true },
    _localFilters:    { state: true },
    _openFacet:       { state: true },
    _howtoOpen:       { state: true },
    _authorResults:   { state: true },
    _subjectResults:  { state: true },
    _defaultAuthors:  { state: true },
    _defaultSubjects: { state: true },
    _facetsLoading:   { state: true },
    _acFocusIdx:      { state: true },  // keyboard-focused autocomplete result index
  };

  constructor() {
    super();
    this.q           = '';
    this.chips       = [];
    this.showFacets  = false;
    this.filters     = { ...EMPTY_FILTERS };
    this.apiBase     = '';
    this.siteBase    = 'https://openlibrary.org';
    this.placeholder = 'Search books, authors…';

    this._q             = '';
    this._suggestions   = [];
    this._open          = false;
    this._loading       = false;
    this._total         = 0;
    this._timer         = null;
    this._localFilters  = { ...EMPTY_FILTERS };

    this._openFacet       = null;
    this._howtoOpen       = false;
    this._authorResults   = [];
    this._subjectResults  = [];
    this._defaultAuthors  = shufflePick(POPULAR_AUTHORS, 6);
    this._defaultSubjects = shufflePick(POPULAR_SUBJECTS, 6);
    this._facetsLoading   = false;
    this._acFocusIdx      = -1;
    this._authorTimer     = null;
    this._subjectTimer    = null;
    this._acAbort         = null;   // AbortController for in-flight autocomplete fetch
    this._authorAbort     = null;   // AbortController for author search
    this._subjectAbort    = null;   // AbortController for subject search
    this._lastFacetBtn    = null;   // button that opened the current facet dropdown (for focus return)

    this._onDoc = e => {
      const path = e.composedPath();
      if (!path.includes(this)) {
        this._openFacet = null;
        this._open = false;
        this._acFocusIdx = -1;
      } else if (this._openFacet !== null) {
        const inFacetDrop = path.some(el => el?.tagName === 'OL-FACET-DROP');
        const inFacetBtn  = path.some(el => el?.classList?.contains?.('pf-btn'));
        if (!inFacetDrop && !inFacetBtn) this._openFacet = null;
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
    this._acAbort?.abort();
    this._authorAbort?.abort();
    this._subjectAbort?.abort();
    clearTimeout(this._timer);
    clearTimeout(this._authorTimer);
    clearTimeout(this._subjectTimer);
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
    // Return focus to the facet button that opened the dropdown when it closes.
    if (changed.has('_openFacet') && changed.get('_openFacet') !== null && this._openFacet === null) {
      this._lastFacetBtn?.focus();
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
    // Cancel any in-flight request before starting a new one.
    this._acAbort?.abort();
    this._acAbort = new AbortController();
    const { signal } = this._acAbort;

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
      const d = await (await fetch(`${this.apiBase}/api/search?${p}`, { signal })).json();
      this._suggestions = d.docs ?? [];
      this._total       = d.num_found ?? 0;
      this._acFocusIdx  = -1;
    } catch (err) {
      if (err.name !== 'AbortError') {
        this._suggestions = []; this._total = 0; this._acFocusIdx = -1;
      }
    } finally {
      if (!signal.aborted) this._loading = false;
    }
  }

  _clearInput() {
    this._acAbort?.abort();
    clearTimeout(this._timer);
    this._q           = '';
    this._suggestions = [];
    this._total       = 0;
    this._acFocusIdx  = -1;
    this._loading     = false;
    this.shadowRoot?.querySelector('.text-input')?.focus();
  }

  _onKeyDown(e) {
    if (e.key === 'Escape') {
      this._open = false; this._openFacet = null; this._acFocusIdx = -1; return;
    }
    // Arrow navigation through autocomplete results.
    if (this._open && this._suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this._acFocusIdx = Math.min(this._acFocusIdx + 1, this._suggestions.length - 1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this._acFocusIdx = Math.max(this._acFocusIdx - 1, -1);
        return;
      }
      if (e.key === 'Enter' && this._acFocusIdx >= 0) {
        e.preventDefault();
        this.shadowRoot?.querySelectorAll('.ac-row')?.[this._acFocusIdx]?.click();
        return;
      }
    }
    if (e.key === 'Enter') this._submit();
  }

  _submit() {
    if (!this._q.trim() && !this._hasActiveFilters()) return;
    this.dispatchEvent(new CustomEvent('ol-search', {
      detail: { q: this._q.trim(), filters: this._localFilters },
      bubbles: true, composed: true,
    }));
  }

  // ── Clear-all filters ─────────────────────────────────────────
  _clearAllFilters() {
    if (this.showFacets) {
      // Droppable: reset local state and emit a filter-change event for each
      // field that differs from EMPTY_FILTERS.
      const f = this._localFilters;
      const fields = [
        ['availability',  EMPTY_FILTERS.availability],
        ['fictionFilter', EMPTY_FILTERS.fictionFilter],
        ['languages',     EMPTY_FILTERS.languages],
        ['genres',        EMPTY_FILTERS.genres],
        ['authors',       EMPTY_FILTERS.authors],
        ['subjects',      EMPTY_FILTERS.subjects],
        ['sort',          EMPTY_FILTERS.sort],
      ];
      for (const [field, empty] of fields) {
        const cur = f[field];
        const isDiff = Array.isArray(cur)
          ? cur.length > 0
          : cur !== empty;
        if (isDiff) this._emitFilter(field, empty, true);
      }
      this._openFacet = null;
    } else {
      this.dispatchEvent(new CustomEvent('ol-clear-all-filters', {
        bubbles: true, composed: true,
      }));
    }
  }

  // ── Chip handling ─────────────────────────────────────────────
  _handleChipRemove(c) {
    if (this.showFacets) {
      // Droppable: update local state directly.
      const f = this._localFilters;
      if (c.type === 'access')  this._emitFilter('availability',  '');
      else if (c.type === 'fiction') this._emitFilter('fictionFilter', '');
      else if (c.type === 'lang')    this._emitFilter('languages', []);
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
    if (this._openFacet !== name) this._lastFacetBtn = e.currentTarget;
    this._openFacet = this._openFacet === name ? null : name;
  }

  _onDropFacetChange(e) {
    this._emitFilter(e.detail.filter, e.detail.value, e.detail.keepOpen);
  }

  _onDropAuthorSearch(e) {
    clearTimeout(this._authorTimer);
    this._authorAbort?.abort();
    const q = e.detail.q;
    if (q.trim().length < 2) { this._authorResults = []; this._facetsLoading = false; return; }
    this._facetsLoading = true;
    this._authorAbort = new AbortController();
    const { signal } = this._authorAbort;
    this._authorTimer = setTimeout(async () => {
      try {
        const d = await (await fetch(`${this.apiBase}/api/authors/search?q=${encodeURIComponent(q.trim())}&limit=8`, { signal })).json();
        this._authorResults = d.docs ?? [];
      } catch (err) {
        if (err.name !== 'AbortError') this._authorResults = [];
      } finally {
        if (!signal.aborted) this._facetsLoading = false;
      }
    }, 250);
  }

  _onDropSubjectSearch(e) {
    clearTimeout(this._subjectTimer);
    this._subjectAbort?.abort();
    const q = e.detail.q;
    if (q.trim().length < 2) { this._subjectResults = []; this._facetsLoading = false; return; }
    this._facetsLoading = true;
    this._subjectAbort = new AbortController();
    const { signal } = this._subjectAbort;
    this._subjectTimer = setTimeout(async () => {
      try {
        const d = await (await fetch(`${this.apiBase}/api/subjects/search?q=${encodeURIComponent(q.trim())}&limit=8`, { signal })).json();
        this._subjectResults = d.docs ?? [];
      } catch (err) {
        if (err.name !== 'AbortError') this._subjectResults = [];
      } finally {
        if (!signal.aborted) this._facetsLoading = false;
      }
    }, 250);
  }

  // ── Styles ─────────────────────────────────────────────────────
  static styles = css`
    :host { display: block; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }

    .search-outer { position: relative; }

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
      background: hsl(0,0%,98.5%);
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

    /* Clear-all filters button */
    .clear-all-btn {
      flex-shrink:0; margin-left:auto; background:none; border:none;
      cursor:pointer; font-size:11px; font-family:inherit;
      font-weight:500; color:hsl(0,0%,50%);
      padding:2px 8px; border-radius:4px;
      white-space:nowrap; line-height:1.5;
      transition:color .1s, background .1s;
    }
    .clear-all-btn:hover { color:hsl(0,72%,35%); background:hsl(0,72%,96%); }

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
    .pf-caret { font-size:10px; opacity:.5; flex-shrink:0; }
    .pf-sort-icon { font-size:11px; opacity:.7; flex-shrink:0; }

    /* Clear input button */
    .clear-btn {
      flex-shrink:0; background:none; border:none; cursor:pointer;
      padding:2px 4px; color:hsl(0,0%,55%); font-size:16px; line-height:1;
      border-radius:50%; display:inline-flex; align-items:center; justify-content:center;
      transition:color .1s, background .1s;
    }
    .clear-btn:hover { color:hsl(0,0%,20%); background:hsl(0,0%,93%); }

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
    .ac-row:hover, .ac-row.focused { background:hsl(0,0%,97%); }
    .ac-row.focused { outline:2px solid hsl(202,96%,37%); outline-offset:-2px; }
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
                aria-expanded=${this._openFacet === name ? 'true' : 'false'}
                @click=${e => this._toggleFacet(name, e)}>
          ${name === 'sort' ? html`<span class="pf-sort-icon" aria-hidden="true">⇅</span>` : ''}${this._facetLabel(name)}<span class="pf-caret" aria-hidden="true">▾</span>
        </button>
        ${this._openFacet === name ? html`
          <ol-facet-drop
            .name=${name}
            ?right=${right}
            .filters=${this._localFilters}
            .authorResults=${this._authorResults}
            .subjectResults=${this._subjectResults}
            .defaultAuthors=${this._defaultAuthors}
            .defaultSubjects=${this._defaultSubjects}
            .facetsLoading=${this._facetsLoading}
            @ol-facet-change=${this._onDropFacetChange}
            @ol-facet-search-authors=${this._onDropAuthorSearch}
            @ol-facet-search-subjects=${this._onDropSubjectSearch}
            @ol-facet-shuffle-authors=${() => { this._defaultAuthors = shufflePick(POPULAR_AUTHORS, 6); }}
            @ol-facet-shuffle-subjects=${() => { this._defaultSubjects = shufflePick(POPULAR_SUBJECTS, 6); }}
          ></ol-facet-drop>
        ` : ''}
      </div>`;
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
      <div class="search-outer ${this._open ? 'open' : ''}"
           role="search">
        <div class="input-row">
          <div class="input-controls">
            <input class="text-input" type="text" autocomplete="off"
                   placeholder="${this.placeholder}" .value=${this._q}
                   role="combobox"
                   aria-label="${this.placeholder}"
                   aria-expanded=${this._open && this.showFacets ? 'true' : 'false'}
                   aria-autocomplete="list"
                   aria-haspopup="listbox"
                   aria-controls="ac-listbox"
                   aria-activedescendant=${this._acFocusIdx >= 0 ? `ac-opt-${this._acFocusIdx}` : nothing}
                   @focus=${this._onFocus}
                   @input=${this._onInput}
                   @keydown=${this._onKeyDown}>

            ${this._q ? html`
              <button class="clear-btn" aria-label="Clear search"
                      @click=${e => { e.stopPropagation(); this._clearInput(); }}>✕</button>
            ` : ''}

            <button class="submit" @click=${() => this._submit()} aria-label="Search">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
            </button>
            <span class="scan-sep"></span>
            <a class="scan-btn" title="Scan ISBN barcode"
               href="${this.siteBase}/barcodescanner?returnTo=/isbn/$$$"
               target="_blank" rel="noopener"
               @click=${e => e.stopPropagation()}>
              <img src="${this.siteBase}/static/images/icons/barcode_scanner.svg"
                   alt="Scan barcode" width="18" height="18">
            </a>
          </div>
        </div>

        ${!this.showFacets && chips.length ? html`
          <div class="chip-bar">
            ${chipItems}
            ${this._hasActiveFilters() ? html`<button class="clear-all-btn"
                    aria-label="Clear all filters"
                    @click=${e => { e.stopPropagation(); this._clearAllFilters(); }}>Clear all</button>` : ''}
          </div>` : ''}

        ${this.showFacets && this._open ? html`
          <div class="panel">
            ${chips.length ? html`
              <div class="panel-chips">
                ${chipItems}
                ${this._hasActiveFilters() ? html`<button class="clear-all-btn"
                        aria-label="Clear all filters"
                        @click=${e => { e.stopPropagation(); this._clearAllFilters(); }}>Clear all</button>` : ''}
              </div>` : ''}
            ${this._renderFacetBar(!this._loading && !showResults)}

            ${this._loading ? html`<div class="ac-spin" role="status" aria-live="polite">Searching…</div>` : showResults ? html`
              <div class="ac-scroll" id="ac-listbox" role="listbox" aria-label="Search suggestions">
                ${this._suggestions.length === 0
                  ? html`<div class="ac-empty" aria-live="polite">No results</div>`
                  : this._suggestions.map((w, idx) => {
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
                        <a class="ac-row ${this._acFocusIdx === idx ? 'focused' : ''}"
                           id="ac-opt-${idx}"
                           href="${this.siteBase}${linkKey}"
                           target="_blank" rel="noopener"
                           role="option"
                           @click=${() => this._open = false}>
                          ${cover
                            ? html`<img class="ac-cover" src=${cover} alt="" loading="lazy">`
                            : html`<div class="ac-blank">📖</div>`}
                          <div class="ac-body">
                            <div class="ac-title">${ed?.title ?? w.title}</div>
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
                <a class="ac-add-book" href="${this.siteBase}/books/add"
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
            ` : html`<div class="ac-hint-msg" aria-live="polite">Start typing to search, or pick a filter above…</div>`}
          </div>` : ''}
      </div>
    `;
  }
}

customElements.define('ol-search-bar', OlSearchBar);
