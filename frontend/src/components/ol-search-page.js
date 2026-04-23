import { LitElement, html, css } from 'lit';
import './ol-search-bar.js';
import './ol-book-card.js';

const LIMIT = 20;

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
    const q = new URLSearchParams(location.search).get('q');
    if (q) this._fetch({ q }, 1);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('ol-search', this._globalSearch);
  }

  _onSearch(e) {
    this._lastQuery = e.detail;
    this._fetch(e.detail, 1);
    const url = new URL(location.href);
    url.searchParams.set('q', e.detail.q ?? '');
    history.replaceState({}, '', url.toString());
  }

  async _fetch(query, page) {
    // Clear immediately — don't show stale results while loading
    this._results  = [];
    this._numFound = 0;
    this._error    = null;
    this._page     = page;
    this._loading  = true;

    try {
      const p = new URLSearchParams();
      if (query.q)            p.set('q', query.q);
      if (query.sort)         p.set('sort', query.sort);
      if (query.ebook_access) p.set('ebook_access', query.ebook_access);
      if (query.language)     p.set('language', query.language);
      if (query.author)       p.set('author', query.author);
      for (const s of query.subjects ?? []) p.append('subjects', s);
      p.set('page', String(page));
      p.set('limit', String(LIMIT));

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
    if (next < 1 || !this._lastQuery) return;
    this._fetch(this._lastQuery, next);
    this.shadowRoot?.querySelector('ol-search-bar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  static styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    /* ── Hero ─────────────────────────────────────────────────── */
    .hero {
      text-align: center;
      padding: 60px 16px 40px;
    }
    .hero h1 {
      font-family: Georgia, serif;
      font-size: 30px;
      color: hsl(202, 96%, 28%);
      margin: 0 0 8px;
    }
    .hero p { color: hsl(0,0%,45%); margin: 0 0 32px; font-size: 15px; }
    .hero .sw { max-width: 640px; margin: 0 auto; }

    /* ── Results layout ───────────────────────────────────────── */
    .results-wrap {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* White card around results */
    .results-body {
      background: white;
      border-radius: 10px;
      border: 1px solid hsl(48, 15%, 74%);
      padding: 0 20px;
      min-height: 120px;
    }

    .results-head {
      display: flex;
      align-items: center;
      padding: 14px 0 10px;
      border-bottom: 1px solid hsl(0,0%,93%);
      margin-bottom: 4px;
    }
    .count {
      font-size: 13px;
      color: hsl(0,0%,45%);
    }

    /* ── States ───────────────────────────────────────────────── */
    .loading {
      padding: 48px 0;
      text-align: center;
      color: hsl(0,0%,50%);
      font-size: 14px;
    }
    .error-msg {
      margin: 20px 0;
      padding: 12px 16px;
      background: hsl(0,72%,96%);
      border: 1px solid hsl(0,72%,85%);
      border-radius: 6px;
      color: hsl(0,72%,35%);
      font-size: 13px;
    }
    .no-results {
      padding: 48px 0;
      text-align: center;
      color: hsl(0,0%,50%);
      font-size: 14px;
    }

    /* ── Pagination ───────────────────────────────────────────── */
    .pagination {
      display: flex;
      align-items: center;
      gap: 12px;
      justify-content: center;
      padding: 16px 0 20px;
      border-top: 1px solid hsl(0,0%,93%);
      margin-top: 4px;
    }
    .page-btn {
      padding: 6px 16px;
      border: 1px solid hsl(0,0%,78%);
      border-radius: 6px;
      background: white;
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
      color: hsl(0,0%,28%);
      transition: all 0.12s;
    }
    .page-btn:hover:not(:disabled) { border-color: hsl(202,96%,37%); color: hsl(202,96%,28%); }
    .page-btn:disabled { opacity: 0.35; cursor: default; }
    .page-info { font-size: 13px; color: hsl(0,0%,45%); }
  `;

  render() {
    const hasQuery   = !!this._lastQuery;
    const hasResults = this._results.length > 0;
    const hasPrev    = this._page > 1;
    const hasNext    = this._numFound > this._page * LIMIT;
    const facetQ     = this._lastQuery?.q ?? '';

    if (!hasQuery) {
      return html`
        <div class="hero">
          <h1>Find your next book</h1>
          <p>Search 25+ million books from the Open Library catalog.</p>
          <div class="sw">
            <ol-search-bar @ol-search=${this._onSearch}></ol-search-bar>
          </div>
        </div>`;
    }

    return html`
      <div class="results-wrap">
        <ol-search-bar
          .facetQ=${facetQ}
          @ol-search=${this._onSearch}
        ></ol-search-bar>

        <div class="results-body">
          ${this._loading ? html`
            <div class="loading">Searching…</div>` : ''}

          ${!this._loading && this._error ? html`
            <div class="error-msg">Search error: ${this._error}</div>` : ''}

          ${!this._loading && !this._error ? html`
            <div class="results-head">
              <span class="count">
                ${this._numFound > 0
                  ? `${this._numFound.toLocaleString()} result${this._numFound === 1 ? '' : 's'}`
                  : hasQuery ? 'No results' : ''}
              </span>
            </div>` : ''}

          ${!this._loading && !this._error && hasQuery && !hasResults ? html`
            <div class="no-results">No results found — try adjusting your search or filters.</div>` : ''}

          <div>
            ${this._results.map(w => html`<ol-book-card .work=${w}></ol-book-card>`)}
          </div>

          ${!this._loading && hasResults ? html`
            <div class="pagination">
              <button class="page-btn" ?disabled=${!hasPrev}
                      @click=${() => this._paginate(-1)}>← Previous</button>
              <span class="page-info">Page ${this._page}</span>
              <button class="page-btn" ?disabled=${!hasNext}
                      @click=${() => this._paginate(1)}>Next →</button>
            </div>` : ''}
        </div>
      </div>`;
  }
}

customElements.define('ol-search-page', OlSearchPage);
