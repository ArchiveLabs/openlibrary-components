import { LitElement, html, css } from 'lit';

const ACCESS_OPTIONS = [
  { value: 'no_ebook',       label: 'Catalog',    desc: 'In catalog, no ebook' },
  { value: 'public',         label: 'Readable',   desc: 'Free to read online' },
  { value: 'printdisabled',  label: 'Open',        desc: 'Print-disabled access' },
  { value: 'borrowable',     label: 'Borrowable', desc: 'Borrow from digital library' },
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
  'Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Erotica',
  'Fantasy', 'Historical', 'Horror', 'Humor', 'LGBTQ+', 'Literary',
  'Mystery', 'Mythology', 'Romance', 'Satire', 'Science Fiction',
  'Thriller', 'Tragedy', 'Western',
];

export class OlSearchBar extends LitElement {
  static properties = {
    initialQ: { type: String, attribute: 'initial-q' },
    _q:           { state: true },
    _access:      { state: true },
    _language:    { state: true },
    _genres:      { state: true },
    _author:      { state: true },
    _openFacet:   { state: true },
    _langSearch:  { state: true },
    _genreSearch: { state: true },
    _authorDraft: { state: true },
  };

  constructor() {
    super();
    this.initialQ    = '';
    this._q          = '';
    this._access     = null;
    this._language   = null;
    this._genres     = [];
    this._author     = null;
    this._openFacet  = null;
    this._langSearch = '';
    this._genreSearch = '';
    this._authorDraft = '';
    this._closeDropdown = (e) => {
      if (!e.composedPath().some(el => el.classList?.contains('facet-wrap'))) {
        this._openFacet = null;
      }
    };
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._closeDropdown);
    if (this.initialQ) this._q = this.initialQ;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._closeDropdown);
  }

  static styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    /* ── Search input row ─────────────────────────────────────── */
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

    /* ── Chips ────────────────────────────────────────────────── */
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 8px 2px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid;
      white-space: nowrap;
      line-height: 1.5;
    }
    .chip-access  { background: hsl(142, 50%, 91%); color: hsl(142, 50%, 22%); border-color: hsl(142, 50%, 72%); }
    .chip-lang    { background: hsl(217, 70%, 92%); color: hsl(217, 70%, 28%); border-color: hsl(217, 70%, 76%); }
    .chip-genre   { background: hsl(270, 45%, 92%); color: hsl(270, 45%, 30%); border-color: hsl(270, 45%, 76%); }
    .chip-author  { background: hsl(25, 80%, 92%);  color: hsl(25, 80%, 28%);  border-color: hsl(25, 80%, 72%);  }
    .chip-x {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0 1px;
      font-size: 15px;
      line-height: 1;
      opacity: 0.5;
      font-family: inherit;
    }
    .chip-x:hover { opacity: 1; }

    /* ── Text input ───────────────────────────────────────────── */
    .text-input {
      flex: 1;
      min-width: 120px;
      border: none;
      outline: none;
      font-size: 14px;
      font-family: inherit;
      color: hsl(0, 0%, 15%);
      background: transparent;
      padding: 2px 4px;
    }
    .text-input::placeholder { color: hsl(0, 0%, 52%); }

    /* ── Submit button ────────────────────────────────────────── */
    .submit {
      flex-shrink: 0;
      background: hsl(202, 96%, 37%);
      color: white;
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: background 0.12s;
      margin-left: auto;
      white-space: nowrap;
    }
    .submit:hover { background: hsl(202, 96%, 28%); }

    /* ── Facet bar ────────────────────────────────────────────── */
    .facet-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    .facet-wrap { position: relative; }
    .facet-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid hsl(0, 0%, 78%);
      background: white;
      font-size: 12px;
      font-weight: 500;
      color: hsl(0, 0%, 32%);
      cursor: pointer;
      font-family: inherit;
      transition: all 0.12s;
      white-space: nowrap;
    }
    .facet-btn:hover  { border-color: hsl(202, 96%, 55%); color: hsl(202, 96%, 28%); background: hsl(202, 96%, 97%); }
    .facet-btn.active { border-color: hsl(202, 96%, 37%); color: hsl(202, 96%, 28%); background: hsl(202, 96%, 95%); }
    .facet-btn.set    { border-color: hsl(202, 96%, 60%); background: hsl(202, 96%, 95%); color: hsl(202, 96%, 25%); }
    .chevron { font-size: 9px; opacity: 0.6; }
    .more-btn {
      margin-left: auto;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 16px;
      padding: 3px 8px;
      border-radius: 6px;
      opacity: 0.45;
      transition: opacity 0.12s, background 0.12s;
    }
    .more-btn:hover { opacity: 0.85; background: hsl(0, 0%, 93%); }

    /* ── Dropdown ─────────────────────────────────────────────── */
    .dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      background: white;
      border: 1px solid hsl(0, 0%, 82%);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.11);
      z-index: 200;
      min-width: 200px;
      max-width: 280px;
      overflow: hidden;
    }
    .dd-search {
      padding: 8px 10px;
      border-bottom: 1px solid hsl(0, 0%, 92%);
    }
    .dd-search input {
      width: 100%;
      border: 1px solid hsl(0, 0%, 82%);
      border-radius: 5px;
      padding: 5px 8px;
      font-size: 12px;
      font-family: inherit;
      outline: none;
      box-sizing: border-box;
    }
    .dd-search input:focus { border-color: hsl(202, 96%, 37%); }
    .dd-list {
      max-height: 230px;
      overflow-y: auto;
      padding: 4px 0;
    }
    .dd-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 14px;
      cursor: pointer;
      font-size: 13px;
      color: hsl(0, 0%, 20%);
      transition: background 0.1s;
    }
    .dd-item:hover    { background: hsl(0, 0%, 96%); }
    .dd-item.selected { background: hsl(202, 96%, 96%); color: hsl(202, 96%, 25%); font-weight: 500; }
    .dd-item input[type="checkbox"],
    .dd-item input[type="radio"] {
      accent-color: hsl(202, 96%, 37%);
      cursor: pointer;
      flex-shrink: 0;
    }
    .dd-hint {
      padding: 10px 14px;
      font-size: 12px;
      color: hsl(0, 0%, 52%);
      font-style: italic;
    }
    .dd-footer {
      padding: 6px 10px 8px;
      border-top: 1px solid hsl(0, 0%, 92%);
    }
    .dd-clear {
      width: 100%;
      padding: 5px;
      border: 1px solid hsl(0, 0%, 80%);
      border-radius: 5px;
      background: none;
      font-size: 12px;
      cursor: pointer;
      color: hsl(0, 0%, 45%);
      font-family: inherit;
      text-align: center;
      transition: all 0.12s;
    }
    .dd-clear:hover { background: hsl(0, 0%, 96%); border-color: hsl(0, 0%, 60%); }
    .dd-confirm {
      width: 100%;
      padding: 5px;
      border: 1.5px solid hsl(202, 96%, 37%);
      border-radius: 5px;
      background: none;
      font-size: 12px;
      cursor: pointer;
      color: hsl(202, 96%, 28%);
      font-family: inherit;
      font-weight: 500;
      text-align: center;
      transition: all 0.12s;
      margin-top: 4px;
    }
    .dd-confirm:hover { background: hsl(202, 96%, 95%); }
  `;

  // ── Emit ──────────────────────────────────────────────────────
  _emit() {
    this.dispatchEvent(new CustomEvent('ol-search', {
      detail: {
        q:            this._q,
        ebook_access: this._access,
        language:     this._language?.code ?? null,
        subjects:     [...this._genres],
        author:       this._author,
      },
      bubbles: true,
      composed: true,
    }));
  }

  // ── Input handlers ────────────────────────────────────────────
  _onKey(e) {
    if (e.key === 'Enter') { this._openFacet = null; this._emit(); }
  }

  // ── Filter setters ────────────────────────────────────────────
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

  _toggleGenre(genre) {
    this._genres = this._genres.includes(genre)
      ? this._genres.filter(g => g !== genre)
      : [...this._genres, genre];
    this._emit();
  }

  _applyAuthor() {
    this._author = this._authorDraft.trim() || null;
    this._openFacet = null;
    this._emit();
  }

  _clearFilter(type) {
    if (type === 'access')   this._access   = null;
    if (type === 'language') this._language = null;
    if (type === 'genre')    this._genres   = [];
    if (type === 'author')   { this._author = null; this._authorDraft = ''; }
    this._emit();
  }

  // ── Chips ─────────────────────────────────────────────────────
  _chips() {
    const chips = [];
    if (this._access) {
      const opt = ACCESS_OPTIONS.find(a => a.value === this._access);
      chips.push(html`
        <span class="chip chip-access">
          access:${opt?.label ?? this._access}
          <button class="chip-x" @click=${() => this._clearFilter('access')} aria-label="Remove">×</button>
        </span>`);
    }
    if (this._language) {
      chips.push(html`
        <span class="chip chip-lang">
          lang:${this._language.label}
          <button class="chip-x" @click=${() => this._clearFilter('language')} aria-label="Remove">×</button>
        </span>`);
    }
    for (const g of this._genres) {
      chips.push(html`
        <span class="chip chip-genre">
          genre:${g}
          <button class="chip-x" @click=${() => this._toggleGenre(g)} aria-label="Remove">×</button>
        </span>`);
    }
    if (this._author) {
      chips.push(html`
        <span class="chip chip-author">
          author:${this._author}
          <button class="chip-x" @click=${() => this._clearFilter('author')} aria-label="Remove">×</button>
        </span>`);
    }
    return chips;
  }

  // ── Dropdowns ─────────────────────────────────────────────────
  _accessDropdown() {
    return html`
      <div class="dropdown">
        <div class="dd-list">
          ${ACCESS_OPTIONS.map(opt => html`
            <label class="dd-item ${this._access === opt.value ? 'selected' : ''}">
              <input type="radio" name="access" .checked=${this._access === opt.value}
                     @change=${() => this._setAccess(opt.value)}>
              <span>${opt.label} <small style="opacity:.6">${opt.desc}</small></span>
            </label>`)}
        </div>
        ${this._access ? html`
          <div class="dd-footer">
            <button class="dd-clear" @click=${() => this._setAccess(null)}>Clear</button>
          </div>` : ''}
      </div>`;
  }

  _langDropdown() {
    const list = LANGUAGES.filter(l =>
      l.label.toLowerCase().includes(this._langSearch.toLowerCase()));
    return html`
      <div class="dropdown">
        <div class="dd-search">
          <input type="text" placeholder="Search languages…"
                 .value=${this._langSearch}
                 @input=${e => this._langSearch = e.target.value}>
        </div>
        <div class="dd-list">
          ${list.map(lang => html`
            <label class="dd-item ${this._language?.code === lang.code ? 'selected' : ''}">
              <input type="radio" name="lang" .checked=${this._language?.code === lang.code}
                     @change=${() => this._setLanguage(lang)}>
              ${lang.label}
            </label>`)}
        </div>
        ${this._language ? html`
          <div class="dd-footer">
            <button class="dd-clear" @click=${() => this._setLanguage(this._language)}>Clear</button>
          </div>` : ''}
      </div>`;
  }

  _genreDropdown() {
    const list = GENRES.filter(g =>
      g.toLowerCase().includes(this._genreSearch.toLowerCase()));
    return html`
      <div class="dropdown">
        <div class="dd-search">
          <input type="text" placeholder="Search genres…"
                 .value=${this._genreSearch}
                 @input=${e => this._genreSearch = e.target.value}>
        </div>
        <div class="dd-list">
          ${list.map(genre => html`
            <label class="dd-item ${this._genres.includes(genre) ? 'selected' : ''}">
              <input type="checkbox" .checked=${this._genres.includes(genre)}
                     @change=${() => this._toggleGenre(genre)}>
              ${genre}
            </label>`)}
        </div>
        ${this._genres.length ? html`
          <div class="dd-footer">
            <button class="dd-clear" @click=${() => { this._genres = []; this._emit(); }}>Clear all</button>
          </div>` : ''}
      </div>`;
  }

  _authorDropdown() {
    return html`
      <div class="dropdown">
        <div class="dd-search">
          <input
            type="text"
            placeholder="Author name…"
            .value=${this._authorDraft}
            @input=${e => this._authorDraft = e.target.value}
            @keydown=${e => e.key === 'Enter' && this._applyAuthor()}
            autofocus
          >
        </div>
        <div class="dd-list">
          ${this._author ? html`<div class="dd-item selected">✓ ${this._author}</div>` : ''}
          ${!this._authorDraft && !this._author
            ? html`<div class="dd-hint">Type a name and press Enter or click Apply</div>`
            : ''}
        </div>
        <div class="dd-footer">
          ${this._authorDraft ? html`
            <button class="dd-confirm" @click=${this._applyAuthor}>Apply "${this._authorDraft}"</button>` : ''}
          ${this._author ? html`
            <button class="dd-clear" @click=${() => this._clearFilter('author')}>Clear</button>` : ''}
        </div>
      </div>`;
  }

  // ── Render ────────────────────────────────────────────────────
  render() {
    const { _access, _language, _genres, _author, _openFacet } = this;
    return html`
      <div class="input-row">
        ${this._chips()}
        <input
          class="text-input"
          type="search"
          placeholder="Search books, authors…"
          autocomplete="off"
          .value=${this._q}
          @input=${e => this._q = e.target.value}
          @keydown=${this._onKey}
        >
        <button class="submit" @click=${() => { this._openFacet = null; this._emit(); }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
          </svg>
          Search
        </button>
      </div>

      <div class="facet-bar">
        <div class="facet-wrap">
          <button class="facet-btn ${_openFacet === 'access' ? 'active' : ''} ${_access ? 'set' : ''}"
                  @click=${() => this._openFacet = _openFacet === 'access' ? null : 'access'}>
            Access <span class="chevron">▾</span>
          </button>
          ${_openFacet === 'access' ? this._accessDropdown() : ''}
        </div>

        <div class="facet-wrap">
          <button class="facet-btn ${_openFacet === 'language' ? 'active' : ''} ${_language ? 'set' : ''}"
                  @click=${() => this._openFacet = _openFacet === 'language' ? null : 'language'}>
            Language <span class="chevron">▾</span>
          </button>
          ${_openFacet === 'language' ? this._langDropdown() : ''}
        </div>

        <div class="facet-wrap">
          <button class="facet-btn ${_openFacet === 'genre' ? 'active' : ''} ${_genres.length ? 'set' : ''}"
                  @click=${() => this._openFacet = _openFacet === 'genre' ? null : 'genre'}>
            Genre${_genres.length ? ` (${_genres.length})` : ''} <span class="chevron">▾</span>
          </button>
          ${_openFacet === 'genre' ? this._genreDropdown() : ''}
        </div>

        <div class="facet-wrap">
          <button class="facet-btn ${_openFacet === 'author' ? 'active' : ''} ${_author ? 'set' : ''}"
                  @click=${() => this._openFacet = _openFacet === 'author' ? null : 'author'}>
            Author <span class="chevron">▾</span>
          </button>
          ${_openFacet === 'author' ? this._authorDropdown() : ''}
        </div>

        <button class="more-btn" title="More filters (coming soon)" aria-label="More filters">⚙️</button>
      </div>
    `;
  }
}

customElements.define('ol-search-bar', OlSearchBar);
