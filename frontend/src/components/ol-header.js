import { LitElement, html, css } from 'lit';
import { EMPTY_FILTERS, buildChips } from '../utils/filters.js';
import './ol-search-bar.js';

export class OlHeader extends LitElement {
  static properties = {
    _browseOpen: { state: true },
    _mode:       { state: true },   // 'home' | 'search'
    _filters:    { state: true },
    _chips:      { state: true },
  };

  constructor() {
    super();
    this._browseOpen = false;
    this._mode    = 'home';
    this._filters = EMPTY_FILTERS;
    this._chips   = buildChips(EMPTY_FILTERS);

    this._onDocClick = (e) => {
      if (!e.composedPath().includes(this)) this._browseOpen = false;
    };
    this._onAppState = (e) => {
      this._mode    = e.detail.hasQuery ? 'search' : 'home';
      this._filters = e.detail.filters ?? EMPTY_FILTERS;
      this._chips   = e.detail.chips   ?? [];
    };
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._onDocClick);
    window.addEventListener('ol-app-state', this._onAppState);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._onDocClick);
    window.removeEventListener('ol-app-state', this._onAppState);
  }

  static styles = css`
    :host {
      display: block;
      background: linear-gradient(to bottom,
        hsl(41, 47%, 93%),
        hsl(41, 48%, 89%)
      );
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      position: sticky;
      top: 0;
      z-index: 50;
      overflow: visible;
    }
    .bar {
      max-width: 1060px;
      margin: 0 auto;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    /* Logo */
    .logo {
      display: flex;
      align-items: center;
      text-decoration: none;
      flex-shrink: 0;
      margin-right: 8px;
    }
    .logo img { height: 34px; width: auto; }

    /* Nav links */
    nav { display: flex; align-items: center; }
    nav a, nav button {
      color: hsl(0, 0%, 22%);
      font-family: inherit;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      padding: 6px 10px;
      border-radius: 5px;
      border: none;
      background: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      white-space: nowrap;
      transition: background 0.12s;
    }
    nav a:hover, nav button:hover, nav button.open {
      background: rgba(0, 0, 0, 0.07);
    }
    .chevron { font-size: 9px; opacity: 0.55; }

    /* Browse dropdown */
    .browse-wrap { position: relative; }
    .browse-menu {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      background: hsl(48, 29%, 93%);
      border: 1px solid hsl(64, 9%, 71%);
      border-radius: 7px;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
      min-width: 176px;
      padding: 5px 0;
      z-index: 100;
    }
    .browse-menu a {
      display: block;
      padding: 8px 16px;
      border-radius: 0;
      font-weight: 400;
      font-size: 13px;
      color: hsl(0, 0%, 22%);
      text-decoration: none;
    }
    .browse-menu a:hover { background: white; }

    /* Search area — grows to fill space, constrained to reasonable max */
    .search-wrap {
      flex: 1;
      min-width: 160px;
      max-width: 640px;
      margin: 0 8px;
    }

    /* Auth */
    .auth { display: flex; align-items: center; gap: 6px; margin-left: 4px; flex-shrink: 0; }
    .btn-login {
      font-size: 13px;
      padding: 5px 13px;
      border-radius: 5px;
      border: 1.5px solid hsl(202, 96%, 37%);
      background: none;
      color: hsl(202, 96%, 28%);
      text-decoration: none;
      font-family: inherit;
      font-weight: 500;
      transition: background 0.12s;
      white-space: nowrap;
    }
    .btn-login:hover { background: hsla(202, 96%, 37%, 0.07); }
    .btn-signup {
      font-size: 13px;
      padding: 5px 13px;
      border-radius: 5px;
      background: hsl(202, 96%, 37%);
      color: white;
      border: none;
      text-decoration: none;
      font-family: inherit;
      font-weight: 500;
      transition: background 0.12s;
      white-space: nowrap;
    }
    .btn-signup:hover { background: hsl(202, 96%, 28%); }
  `;

  render() {
    return html`
      <header>
        <div class="bar">
          <a href="/" class="logo">
            <img
              src="https://openlibrary.org/static/images/openlibrary-logo-tighter.svg"
              alt="Open Library"
            >
          </a>

          <nav>
            <a href="/mybooks">My Books</a>
            <div class="browse-wrap">
              <button
                class="${this._browseOpen ? 'open' : ''}"
                @click=${() => this._browseOpen = !this._browseOpen}
                aria-expanded=${this._browseOpen}
              >
                Browse <span class="chevron">▾</span>
              </button>
              ${this._browseOpen ? html`
                <div class="browse-menu">
                  <a href="/subjects">Subjects</a>
                  <a href="/trending">Trending</a>
                  <a href="/collections">Collections</a>
                  <a href="/lists">Lists</a>
                  <a href="/search/inside">Search Inside</a>
                  <a href="/search/advanced">Advanced Search</a>
                </div>
              ` : ''}
            </div>
          </nav>

          ${this._mode === 'home' ? html`
            <div class="search-wrap">
              <ol-search-bar
                .showFacets=${true}
                .filters=${this._filters}
                .chips=${this._chips}
              ></ol-search-bar>
            </div>
          ` : ''}

          <div class="auth">
            <a href="/account/login" class="btn-login">Log In</a>
            <a href="/account/create" class="btn-signup">Sign Up</a>
          </div>
        </div>
      </header>
    `;
  }
}

customElements.define('ol-header', OlHeader);
