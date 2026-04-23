import { LitElement, html, css } from 'lit';

export class OlHeader extends LitElement {
  static properties = {
    _browseOpen: { state: true },
  };

  constructor() {
    super();
    this._browseOpen = false;
    this._onDocClick = (e) => {
      if (!e.composedPath().includes(this)) this._browseOpen = false;
    };
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._onDocClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._onDocClick);
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
    }
    .browse-menu a:hover { background: white; }

    /* Search */
    .search-wrap { flex: 1; min-width: 160px; max-width: 480px; margin: 0 8px; }
    .search-form {
      display: flex;
      align-items: center;
      background: hsl(0, 0%, 98%);
      border: 1px solid hsl(64, 9%, 71%);
      border-radius: 6px;
      overflow: hidden;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .search-form:focus-within {
      border-color: hsl(202, 96%, 37%);
      box-shadow: 0 0 0 3px hsla(202, 96%, 37%, 0.12);
    }
    .search-form input {
      flex: 1;
      border: none;
      background: none;
      padding: 7px 10px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      color: hsl(0, 0%, 18%);
      min-width: 0;
    }
    .search-form input::placeholder { color: hsl(0, 0%, 55%); }
    .search-btn {
      padding: 7px 10px;
      border: none;
      border-left: 1px solid hsl(0, 0%, 88%);
      background: none;
      cursor: pointer;
      color: hsl(0, 0%, 45%);
      display: flex;
      align-items: center;
      transition: background 0.12s;
    }
    .search-btn:hover { background: rgba(0, 0, 0, 0.04); color: hsl(202, 96%, 37%); }

    /* Auth */
    .auth { display: flex; align-items: center; gap: 6px; margin-left: 4px; }
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

  _submitSearch(e) {
    e.preventDefault();
    const q = this.shadowRoot.querySelector('.search-input').value.trim();
    if (!q) return;
    window.dispatchEvent(new CustomEvent('ol-search', { detail: { q } }));
  }

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

          <div class="search-wrap">
            <form class="search-form" @submit=${this._submitSearch}>
              <input
                class="search-input"
                type="search"
                placeholder="Search books, authors…"
                autocomplete="off"
              >
              <button type="submit" class="search-btn" aria-label="Search">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
              </button>
            </form>
          </div>

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
