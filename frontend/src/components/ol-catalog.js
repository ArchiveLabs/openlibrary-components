/**
 * ol-catalog — component preview page (the "storybook")
 *
 * Serves as the living documentation for all OL components. Every new
 * component must add a section here. Accessible at /catalog.html in dev.
 *
 * Adding a component:
 *   1. Import it below.
 *   2. Add a _render<Name>() method returning html`...`.
 *   3. Add a <a href="#ol-name"> entry in _renderNav().
 *   4. Call _render<Name>() in render() inside the <main>.
 */
import { LitElement, html, css } from 'lit';
import './ol-topbar.js';
import './ol-header.js';
import './ol-footer.js';
import './ol-search-bar.js';
import './ol-book-card.js';
import './ol-search-hint.js';

// ── Sample data ──────────────────────────────────────────────────────────────

const SAMPLE_CHIPS = [
  { type: 'access',  label: 'Availability: Readable', value: 'readable' },
  { type: 'lang',    label: 'Language: English',      value: 'eng'      },
  { type: 'author',  label: 'Author: Tolkien',        value: 'Tolkien'  },
];

const WORK_READABLE = {
  key: '/works/OL27448W',
  title: 'The Lord of the Rings',
  author_name: ['J.R.R. Tolkien'],
  first_publish_year: 1954,
  ratings_average: 4.5,
  editions: [{ key: '/books/OL7353617M', ebook_access: 'public', cover_i: 9255566 }],
};

const WORK_BORROWABLE = {
  key: '/works/OL1168007W',
  title: '1984',
  author_name: ['George Orwell'],
  first_publish_year: 1949,
  ratings_average: 4.2,
  editions: [{ key: '/books/OL7353618M', ebook_access: 'borrowable' }],
};

const WORK_CATALOG = {
  key: '/works/OL66554W',
  title: 'Pride and Prejudice',
  author_name: ['Jane Austen'],
  first_publish_year: 1813,
  editions: [{ key: '/books/OL7353619M', ebook_access: 'no_ebook' }],
};

const WORK_SERIES = {
  key: '/works/OL59788W',
  title: 'Dune',
  author_name: ['Frank Herbert'],
  first_publish_year: 1965,
  series: ['Dune Chronicles'],
  editions: [{ key: '/books/OL7353620M', ebook_access: 'borrowable' }],
};

const SAMPLE_HINT = {
  key: 'example-hint',
  message: 'Fewer results than expected? Try a shorter query or remove filters.',
  actions: [{ label: 'Learn more', href: 'https://openlibrary.org/search/howto' }],
};

// ── Catalog component ────────────────────────────────────────────────────────

export class OlCatalog extends LitElement {
  static styles = css`
    :host { display: block; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }

    .layout { display: flex; min-height: 100vh; }

    /* Sidebar */
    nav {
      width: 220px; flex-shrink: 0;
      border-right: 1px solid hsl(0,0%,88%);
      padding: 28px 0; position: sticky; top: 0;
      height: 100vh; overflow-y: auto;
      background: hsl(0,0%,99%);
    }
    .nav-logo {
      font-size: 13px; font-weight: 700; color: hsl(202,96%,28%);
      padding: 0 16px 20px; letter-spacing: -0.01em; display: block;
    }
    .nav-section {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: hsl(0,0%,55%);
      padding: 12px 16px 4px;
    }
    nav a {
      display: block; padding: 5px 16px; font-size: 12px;
      text-decoration: none; color: hsl(0,0%,30%);
      border-left: 2px solid transparent; margin: 0;
      transition: background .08s, color .08s;
    }
    nav a:hover { background: hsl(202,96%,96%); color: hsl(202,96%,28%); border-left-color: hsl(202,96%,37%); }

    /* Main content */
    main { flex: 1; padding: 40px 48px; max-width: 860px; overflow-x: hidden; }

    /* Section */
    .section { margin-bottom: 72px; }
    .section-tag {
      display: inline-block;
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: hsl(202,96%,37%);
      background: hsl(202,96%,96%); border-radius: 3px;
      padding: 2px 7px; margin-bottom: 6px;
    }
    .section-name { font-size: 24px; font-weight: 700; margin: 0 0 4px; color: hsl(0,0%,8%); }
    .section-desc { font-size: 14px; color: hsl(0,0%,42%); margin: 0 0 24px; line-height: 1.6; }

    /* Variant block */
    .variant { margin-bottom: 24px; }
    .variant-title {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.05em; color: hsl(0,0%,50%); margin: 0 0 8px;
    }
    .preview {
      border: 1px solid hsl(0,0%,88%); border-radius: 8px;
      padding: 24px; background: hsl(0,0%,99%);
      margin-bottom: 8px;
    }
    .preview.white { background: white; }
    .preview.beige { background: hsl(48,29%,93%); }
    pre {
      background: hsl(220,14%,96%); border: 1px solid hsl(0,0%,88%);
      border-radius: 6px; padding: 12px 16px; font-size: 11px;
      overflow-x: auto; margin: 0; color: hsl(0,0%,25%);
      font-family: "Menlo", "Courier New", monospace; line-height: 1.5;
    }

    /* Token swatches */
    .swatches { display: flex; flex-wrap: wrap; gap: 8px; }
    .swatch {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px; border-radius: 6px; font-size: 11px;
      border: 1px solid rgba(0,0,0,.08);
    }
    .swatch-dot { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; }

    .divider { height: 1px; background: hsl(0,0%,90%); margin: 56px 0; }

    /* Book cards need a constrained container */
    .card-list { max-width: 600px; }
  `;

  _renderNav() {
    return html`
      <nav>
        <span class="nav-logo">OL Components</span>
        <div class="nav-section">Design System</div>
        <a href="#tokens">Tokens</a>
        <div class="nav-section">Components</div>
        <a href="#ol-search-bar">ol-search-bar</a>
        <a href="#ol-book-card">ol-book-card</a>
        <a href="#ol-search-hint">ol-search-hint</a>
        <div class="nav-section">Shell</div>
        <a href="#shell">ol-topbar / ol-header / ol-footer</a>
      </nav>
    `;
  }

  _renderTokens() {
    const chips = [
      ['access',  'Access',  'hsl(142,50%,91%)', 'hsl(142,50%,22%)'],
      ['lang',    'Lang',    'hsl(217,70%,92%)', 'hsl(217,70%,28%)'],
      ['fiction', 'Fiction', 'hsl(270,45%,92%)', 'hsl(270,45%,30%)'],
      ['genre',   'Genre',   'hsl(270,35%,93%)', 'hsl(270,35%,32%)'],
      ['author',  'Author',  'hsl(25,80%,92%)',  'hsl(25,80%,28%)' ],
      ['subject', 'Subject', 'hsl(340,60%,92%)', 'hsl(340,60%,28%)'],
    ];
    return html`
      <div class="section" id="tokens">
        <span class="section-tag">Design System</span>
        <div class="section-name">Tokens</div>
        <p class="section-desc">
          CSS custom properties in <code>frontend/src/styles/tokens.css</code>.
          Use these in all new components — never raw HSL values.
        </p>

        <div class="variant">
          <div class="variant-title">Brand Colors</div>
          <div class="preview white">
            <div class="swatches">
              ${[
                ['--primary-blue', 'hsl(202,96%,37%)', 'Primary blue'],
                ['--link-blue',    'hsl(202,96%,28%)', 'Link / hover'],
                ['--dark-blue',    'hsl(210,100%,20%)', 'Dark blue'],
              ].map(([tok, hsl, label]) => html`
                <div class="swatch" style="background:${hsl}15">
                  <div class="swatch-dot" style="background:${hsl}"></div>
                  <span style="color:${hsl}">${label}</span>
                  <code style="font-size:10px;color:hsl(0,0%,50%)">${tok}</code>
                </div>`)}
            </div>
          </div>
        </div>

        <div class="variant">
          <div class="variant-title">Chip / Badge Colors</div>
          <div class="preview white">
            <div class="swatches">
              ${chips.map(([type, label, bg, text]) => html`
                <div class="swatch" style="background:${bg};border-color:${text}30">
                  <span style="color:${text};font-weight:600">${label}</span>
                  <code style="font-size:10px;color:hsl(0,0%,50%)">--chip-${type}-*</code>
                </div>`)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _renderSearchBar() {
    return html`
      <div class="section" id="ol-search-bar">
        <span class="section-tag">Component</span>
        <div class="section-name">ol-search-bar</div>
        <p class="section-desc">
          Unified search input used in two modes. <strong>Droppable</strong> (showFacets=true): owns
          local filter state, shows the facet panel and autocomplete on focus.
          <strong>Embedded</strong> (showFacets=false): display-only; receives chips as a prop and
          fires <code>ol-filter-change</code> events upward.
        </p>

        <div class="variant">
          <div class="variant-title">Droppable / Hero Mode</div>
          <div class="preview white">
            <ol-search-bar show-facets></ol-search-bar>
          </div>
          <pre>&lt;ol-search-bar show-facets
  api-base="https://openlibrary.org"
  site-base="https://openlibrary.org"&gt;&lt;/ol-search-bar&gt;</pre>
        </div>

        <div class="variant">
          <div class="variant-title">Embedded / Results Mode (with chips)</div>
          <div class="preview white">
            <ol-search-bar
              .chips=${SAMPLE_CHIPS}
              .q=${'tolkien'}
            ></ol-search-bar>
          </div>
          <pre>&lt;ol-search-bar
  q="tolkien"
  .chips="\${chips}"&gt;&lt;/ol-search-bar&gt;

&lt;!-- chips: [{ type, label, value }, ...] --&gt;
&lt;!-- fires: ol-filter-change ({ filter, value }) — same event as droppable mode --&gt;
&lt;!-- fires: ol-search ({ q, filters }) --&gt;</pre>
        </div>
      </div>
    `;
  }

  _renderBookCard() {
    return html`
      <div class="section" id="ol-book-card">
        <span class="section-tag">Component</span>
        <div class="section-name">ol-book-card</div>
        <p class="section-desc">
          Stateless result card for a single OL work. Access badge reflects
          <code>ebook_access</code> on the best edition: <em>Readable</em> (public),
          <em>Borrowable</em> (borrowable), <em>Catalog</em> (no_ebook / printdisabled).
        </p>

        <div class="variant">
          <div class="variant-title">All access states</div>
          <div class="preview beige card-list">
            <ol-book-card .work=${WORK_READABLE}></ol-book-card>
            <ol-book-card .work=${WORK_BORROWABLE}></ol-book-card>
            <ol-book-card .work=${WORK_SERIES}></ol-book-card>
            <ol-book-card .work=${WORK_CATALOG}></ol-book-card>
          </div>
          <pre>&lt;ol-book-card .work="\${work}"&gt;&lt;/ol-book-card&gt;

&lt;!-- work: OL search result doc (key, title, author_name,
          first_publish_year, editions, series?, ratings_average?) --&gt;</pre>
        </div>
      </div>
    `;
  }

  _renderSearchHint() {
    return html`
      <div class="section" id="ol-search-hint">
        <span class="section-tag">Component</span>
        <div class="section-name">ol-search-hint</div>
        <p class="section-desc">
          Dismissible contextual hint bar. Dismissals persist in
          <code>localStorage</code> keyed by <code>hint.key</code>. Renders nothing when
          <code>hint</code> is null.
        </p>

        <div class="variant">
          <div class="variant-title">With message and action</div>
          <div class="preview white">
            <ol-search-hint .hint=${SAMPLE_HINT}></ol-search-hint>
          </div>
          <pre>&lt;ol-search-hint .hint="\${hint}"&gt;&lt;/ol-search-hint&gt;

&lt;!-- hint: { key, message, actions?: [{ label, href }] } | null --&gt;</pre>
        </div>
      </div>
    `;
  }

  _renderShell() {
    return html`
      <div class="section" id="shell">
        <span class="section-tag">Shell</span>
        <div class="section-name">ol-topbar / ol-header / ol-footer</div>
        <p class="section-desc">
          The Open Library page frame. Used in <code>index.html</code> around the active body
          component. The body slot is swappable — <code>ol-search-page</code> today,
          any other experience tomorrow.
        </p>
        <div class="variant">
          <div class="variant-title">Composition (from index.html)</div>
          <pre>&lt;ol-topbar&gt;&lt;/ol-topbar&gt;
&lt;ol-header&gt;&lt;/ol-header&gt;
&lt;main&gt;
  &lt;!-- swap body component here --&gt;
  &lt;ol-search-page&gt;&lt;/ol-search-page&gt;
&lt;/main&gt;
&lt;ol-footer&gt;&lt;/ol-footer&gt;</pre>
        </div>
        <p class="section-desc" style="margin-top:16px">
          See these live at
          <a href="/" target="_blank" rel="noopener">the OL composition (index.html)</a>.
        </p>
      </div>
    `;
  }

  render() {
    return html`
      <div class="layout">
        ${this._renderNav()}
        <main>
          ${this._renderTokens()}
          <div class="divider"></div>
          ${this._renderSearchBar()}
          <div class="divider"></div>
          ${this._renderBookCard()}
          <div class="divider"></div>
          ${this._renderSearchHint()}
          <div class="divider"></div>
          ${this._renderShell()}
        </main>
      </div>
    `;
  }
}

customElements.define('ol-catalog', OlCatalog);
