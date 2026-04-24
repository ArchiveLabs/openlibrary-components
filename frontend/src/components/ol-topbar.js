import { LitElement, html, css } from 'lit';

export class OlTopbar extends LitElement {
  static styles = css`
    :host {
      display: block;
      background: hsl(0, 0%, 13%);
      color: hsl(0, 0%, 65%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 12px;
    }
    .bar {
      max-width: 1060px;
      margin: 0 auto;
      padding: 5px 16px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    a {
      color: inherit;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: color 0.12s;
    }
    a:hover { color: hsl(0, 0%, 95%); }
    .ia-logo { font-weight: 500; }
    .spacer  { flex: 1; }
    .donate  { color: hsl(0, 72%, 72%); }
    .donate:hover { color: hsl(0, 72%, 85%); }
    .sep {
      width: 1px;
      height: 12px;
      background: hsl(0, 0%, 28%);
    }
    @media (max-width: 600px) {
      :host { display: none; }
    }
  `;

  render() {
    return html`
      <div class="bar">
        <a href="https://archive.org" class="ia-logo">
          <!-- Simplified Internet Archive "building" glyph -->
          <svg width="18" height="18" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
            <rect x="8"  y="62" width="84" height="10" rx="2"/>
            <rect x="18" y="46" width="10" height="22"/>
            <rect x="33" y="36" width="10" height="32"/>
            <rect x="48" y="26" width="10" height="42"/>
            <rect x="63" y="36" width="10" height="32"/>
            <rect x="8"  y="18" width="84" height="10" rx="2"/>
          </svg>
          Internet Archive
        </a>
        <span class="spacer"></span>
        <a href="https://archive.org/donate" class="donate">♥ Donate</a>
        <span class="sep"></span>
        <a href="https://openlibrary.org">Open Library</a>
      </div>
    `;
  }
}

customElements.define('ol-topbar', OlTopbar);
