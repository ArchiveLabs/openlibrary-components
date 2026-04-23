import { LitElement, html, css } from 'lit';
import './ol-search-bar.js';
import './ol-book-card.js';

export class OlSearchPage extends LitElement {
  static properties = {
    _results:   { state: true },
    _numFound:  { state: true },
    _loading:   { state: true },
    _error:     { state: true },
    _page:      { state: true },
    _lastQuery: { state: true },
  };

  constructor() {
    super();
    this._results   = [];
    this._numFound  = 0;
    this._loading   = false;
    this._error     = null;
    this._page      = 1;
    this._lastQuery = null;
    this._globalSearch = (e) => this._onSearch(e);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('ol-search', this._globalSearch);
    // Restore query from URL on load
    const q = new URLSearchParams(location.search).get('q');
    if (q) this._fetch({ q }, 1);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('ol-search', this._globalSearch);
  }

  _onSearch(e) {
    this._lastQuery = e.detail;
    this._page = 1;
    this._fetch(e.detail, 1);
    // Sync URL so the page is bookmarkable
    const url = new URL(location.href);
    url.searchParams.set('q', e.detail.q ?? '');
    history.replaceState({}, '', url.toString());
  }

  async _fetch(query, page) {
    this._loading = true;
    this._error   = null;
    try {
      const p = new URLSearchParams();
      if (query.q)            p.set('q', query.q);
      if (query.ebook_access) p.set('ebook_access', query.ebook_access);
      if (query.language)     p.set('language', query.language);
      if (query.author)       p.set('author', query.author);
      for (const s of query.subjects ?? []) p.append('subjects', s);
      p.set('page', String(page));
      p.set('limit', '20');

      const res = await fetch(`/api/search?${p}`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      this._results  = data.docs ?? [];
      this._numFound = data.num_found ?? 0;
    } catch (err) {
      this._error = err.message;
    } finally {
      this._loading = false;
    }
  }

  _paginate(delta) {
    const next = this._page + delta;
    if (next < 1) return;
    this._page = next;
    this._fetch(this._lastQuery, next);
    this.shadowRoot?.querySelector('ol-search-bar')?.scrollIntoView({ behavior: 'smooth' });
  }

  static styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    /* ── Hero (empty state) ───────────────────────────────────── */
    .hero {
      text-align: center;
      padding: 60px 16px 40px;
    }
    .hero h1 {
      font-family: Georgia, serif;
      font-size: 32px;
      color: hsl(202, 96%, 28%);
      margin: 0 0 8px;
    }
    .hero p { color: hsl(0, 0%, 45%); margin: 0 0 32px; font-size: 15px; }
    .hero .search-wrap { max-width: 640px; margin: 0 auto; }

    /* ── Results view ─────────────────────────────────────────── */
    .results-wrap { padding-top: 8px; }
    .results-head {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin-bottom: 4px;
    }
    .count {
      font-size: 13px;
      color: hsl(0, 0%, 45%);
    }

    /* ── States ───────────────────────────────────────────────── */
    .loading {
      padding: 48px 0;
      text-align: center;
      color: hsl(0, 0%, 50%);
      font-size: 14px;
    }
    .loading-dots::after {
      content: '…';
      animation: dots 1.2s steps(3, end) infinite;
    }
    @keyframes dots {
      0%, 20%  { content: '.';   }
      40%      { content: '..';  }
      60%, 100%{ content: '…';   }
    }
    .error-msg {
      margin: 20px 0;
      padding: 12px 16px;
      background: hsl(0, 72%, 96%);
      border: 1px solid hsl(0, 72%, 85%);
      border-radius: 6px;
      color: hsl(0, 72%, 35%);
      font-size: 13px;
    }
    .no-results {
      padding: 40px 0;
      text-align: center;
      color: hsl(0, 0%, 50%);
      font-size: 14px;
    }

    /* ── Pagination ───────────────────────────────────────────── */
    .pagination {
      display: flex;
      align-items: center;
      gap: 12px;
      justify-content: center;
      margin-top: 24px;
      padding: 16px 0;
    }
    .page-btn {
      padding: 6px 16px;
      border: 1px solid hsl(0, 0%, 78%);
      border-radius: 6px;
      background: white;
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
      color: hsl(0, 0%, 28%);
      transition: all 0.12s;
    }
    .page-btn:hover:not(:disabled) {
      border-color: hsl(202, 96%, 37%);
      color: hsl(202, 96%, 28%);
    }
    .page-btn:disabled { opacity: 0.38; cursor: default; }
    .page-info { font-size: 13px; color: hsl(0, 0%, 45%); }
  `;

  _renderSearch() {
    return html`<ol-search-bar @ol-search=${this._onSearch}></ol-search-bar>`;
  }

  render() {
    const hasResults = this._results.length > 0;
    const hasQuery   = !!this._lastQuery;

    if (!hasQuery) {
      return html`
        <div class="hero">
          <h1>Find your next book</h1>
          <p>Search 25+ million books from the Open Library catalog.</p>
          <div class="search-wrap">${this._renderSearch()}</div>
        </div>
      `;
    }

    return html`
      <div class="results-wrap">
        ${this._renderSearch()}

        ${this._loading ? html`
          <div class="loading"><span class="loading-dots">Searching</span></div>` : ''}

        ${this._error ? html`
          <div class="error-msg">Search error: ${this._error}</div>` : ''}

        ${!this._loading && !this._error && hasQuery ? html`
          <div class="results-head">
            <span class="count">
              ${this._numFound > 0
                ? `${this._numFound.toLocaleString()} result${this._numFound === 1 ? '' : 's'}`
                : ''}
            </span>
          </div>` : ''}

        ${!this._loading && !this._error && hasQuery && !hasResults ? html`
          <div class="no-results">No results found. Try adjusting your search or filters.</div>` : ''}

        <div>
          ${this._results.map(w => html`<ol-book-card .work=${w}></ol-book-card>`)}
        </div>

        ${hasResults ? html`
          <div class="pagination">
            <button class="page-btn" ?disabled=${this._page === 1}
                    @click=${() => this._paginate(-1)}>← Previous</button>
            <span class="page-info">Page ${this._page}</span>
            <button class="page-btn" @click=${() => this._paginate(1)}>Next →</button>
          </div>` : ''}
      </div>
    `;
  }
}

customElements.define('ol-search-page', OlSearchPage);
