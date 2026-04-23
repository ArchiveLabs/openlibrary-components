import { LitElement, html, css } from 'lit';

export class OlFooter extends LitElement {
  static styles = css`
    :host {
      display: block;
      background: hsl(0, 0%, 18%);
      color: hsl(0, 0%, 68%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 13px;
      margin-top: auto;
    }
    .footer {
      max-width: 1060px;
      margin: 0 auto;
      padding: 40px 24px 24px;
    }
    .cols {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }
    .col { flex: 1; min-width: 130px; }
    h3 {
      color: hsl(0, 0%, 88%);
      font-size: 11px;
      font-weight: 700;
      margin: 0 0 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    ul { margin: 0; padding: 0; }
    li { list-style: none; margin-bottom: 7px; }
    a {
      color: hsl(0, 0%, 60%);
      text-decoration: none;
      transition: color 0.12s;
    }
    a:hover { color: hsl(0, 0%, 100%); }
    .divider {
      border: none;
      border-top: 1px solid hsl(0, 0%, 26%);
      margin: 28px 0 20px;
    }
    .bottom {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .social { display: flex; gap: 10px; }
    .social a {
      width: 30px;
      height: 30px;
      background: hsl(0, 0%, 28%);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: hsl(0, 0%, 75%);
      transition: background 0.12s, color 0.12s;
    }
    .social a:hover { background: hsl(0, 0%, 38%); color: white; }
    .copy {
      margin-left: auto;
      font-size: 11px;
      color: hsl(0, 0%, 42%);
    }
  `;

  render() {
    return html`
      <footer>
        <div class="footer">
          <div class="cols">
            <div class="col">
              <h3>Open Library</h3>
              <ul>
                <li><a href="/about">Vision</a></li>
                <li><a href="/volunteer">Volunteer</a></li>
                <li><a href="/partner">Partner With Us</a></li>
                <li><a href="https://blog.openlibrary.org">Blog</a></li>
                <li><a href="/tos">Terms of Service</a></li>
                <li><a href="https://archive.org/donate">Donate</a></li>
              </ul>
            </div>
            <div class="col">
              <h3>Discover</h3>
              <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/books">Books</a></li>
                <li><a href="/authors">Authors</a></li>
                <li><a href="/subjects">Subjects</a></li>
                <li><a href="/collections">Collections</a></li>
                <li><a href="/search/advanced">Advanced Search</a></li>
              </ul>
            </div>
            <div class="col">
              <h3>Develop</h3>
              <ul>
                <li><a href="/developers">Developer Center</a></li>
                <li><a href="/dev/docs/api">API Docs</a></li>
                <li><a href="https://openlibrary.org/data">Bulk Data</a></li>
                <li><a href="https://github.com/internetarchive/openlibrary">GitHub</a></li>
              </ul>
            </div>
            <div class="col">
              <h3>Help</h3>
              <ul>
                <li><a href="https://openlibrary.org/help">Help Center</a></li>
                <li><a href="/contact">Contact</a></li>
                <li><a href="/books/add">Add a Book</a></li>
                <li><a href="https://github.com/internetarchive/openlibrary/releases">Release Notes</a></li>
              </ul>
            </div>
          </div>

          <hr class="divider">

          <div class="bottom">
            <div class="social">
              <a href="https://github.com/internetarchive/openlibrary" aria-label="GitHub">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
              </a>
              <a href="https://bsky.app/profile/openlibrary.org" aria-label="Bluesky">
                <svg width="16" height="14" viewBox="0 0 568 501" fill="currentColor">
                  <path d="M123.121 33.664C188.241 82.553 258.281 181.68 284 234.873c25.719-53.192 95.759-152.32 160.879-201.209C491.866-1.611 568-28.906 568 57.947c0 17.346-9.945 145.713-15.778 166.555-20.275 72.453-94.155 90.933-159.875 79.748C507.222 325.884 540 385.328 540 385.328c-24.555 15.328-50.654-10.17-73.956-18.906C403.291 347.316 315.21 282.89 284 230.64c-31.21 52.25-119.291 116.676-182.044 135.782-23.302 8.736-49.401 34.234-73.956 18.906 0 0 32.778-59.444 146.653-81.078-65.72 11.185-139.6-7.295-159.875-79.748C8.945 203.66-.999 75.293-.999 57.947-.999-28.906 75.135-1.611 123.121 33.664z"/>
                </svg>
              </a>
            </div>
            <span class="copy">
              &copy; ${new Date().getFullYear()} Internet Archive — a 501(c)(3) nonprofit
            </span>
          </div>
        </div>
      </footer>
    `;
  }
}

customElements.define('ol-footer', OlFooter);
