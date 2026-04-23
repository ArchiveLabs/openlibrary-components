import { LitElement, html, css } from 'lit';

class OlApp extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: hsl(48, 33%, 83%);
    }
    h1 {
      font-family: Georgia, serif;
      color: hsl(202, 96%, 28%);
      margin: 0 0 8px;
    }
    p { color: hsl(0, 0%, 40%); margin: 0; }
    code {
      font-size: 12px;
      background: hsl(0, 0%, 92%);
      padding: 2px 6px;
      border-radius: 4px;
      margin-top: 16px;
      display: inline-block;
    }
  `;

  render() {
    return html`
      <h1>Open Library Lite</h1>
      <p>FastAPI · Lit · Docker — playground ready.</p>
      <code>make dev  |  make up</code>
    `;
  }
}

customElements.define('ol-app', OlApp);
