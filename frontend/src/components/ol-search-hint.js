import { LitElement, html, css } from 'lit';

/**
 * A dismissible contextual hint bar rendered between the filter bar and search results.
 *
 * Props:
 *   hint — { key: string, message: string, actions?: { label: string, href: string }[] } | null
 *          When null (or previously dismissed), renders nothing.
 *
 * The dismissed state for each `key` is persisted in localStorage under
 * `ol-hint-dismissed:<key>` so it survives page reloads.
 *
 * Usage:
 *   <ol-search-hint .hint=${{ key: 'fulltext', message: 'Try full-text search…',
 *     actions: [{ label: 'Search inside books', href: '…' }] }}></ol-search-hint>
 */
export class OlSearchHint extends LitElement {
  static properties = {
    hint:        { type: Object },
    _dismissed:  { type: Boolean, state: true },
  };

  static styles = css`
    :host { display: block; }

    .hint-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 14px;
      min-height: 40px;
      border-bottom: 1px solid hsl(0, 0%, 92%);
      background: hsl(48, 35%, 97%);
      font-size: 13px;
      color: hsl(0, 0%, 35%);
      font-family: inherit;
    }

    .hint-icon {
      flex-shrink: 0;
      font-size: 15px;
      line-height: 1;
    }

    .hint-msg {
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .hint-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .hint-action {
      display: inline-block;
      font-size: 12px;
      font-family: inherit;
      padding: 2px 10px;
      border-radius: 9999px;
      border: 1px solid hsl(202, 60%, 65%);
      color: hsl(202, 96%, 28%);
      background: transparent;
      cursor: pointer;
      text-decoration: none;
      transition: background .08s;
      white-space: nowrap;
    }
    .hint-action:hover { background: hsl(202, 60%, 94%); }

    .hint-dismiss {
      flex-shrink: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 17px;
      line-height: 1;
      color: hsl(0, 0%, 60%);
      padding: 4px 6px;
      border-radius: 4px;
      transition: color .08s, background .08s;
    }
    .hint-dismiss:hover { color: hsl(0, 0%, 20%); background: hsl(0, 0%, 94%); }
  `;

  _storageKey(key) {
    return `ol-hint-dismissed:${key}`;
  }

  _isDismissed(key) {
    try {
      return !!localStorage.getItem(this._storageKey(key));
    } catch {
      return false;
    }
  }

  _dismiss() {
    const key = this.hint?.key;
    if (!key) return;
    try {
      localStorage.setItem(this._storageKey(key), '1');
    } catch {
      // localStorage blocked (private browsing, etc.) — dismiss for session only
    }
    this._dismissed = true;
  }

  willUpdate(changed) {
    // Reset dismissed state whenever a different hint key is shown
    if (changed.has('hint') && this.hint?.key) {
      this._dismissed = this._isDismissed(this.hint.key);
    }
  }

  render() {
    if (!this.hint || this._dismissed) return html``;

    const { message, actions = [] } = this.hint;

    return html`
      <div class="hint-bar">
        <span class="hint-icon">💡</span>
        <span class="hint-msg">${message}</span>
        ${actions.length ? html`
          <div class="hint-actions">
            ${actions.map(a => html`
              <a class="hint-action" href=${a.href} target="_blank" rel="noopener">${a.label}</a>
            `)}
          </div>` : ''}
        <button class="hint-dismiss" title="Dismiss" @click=${this._dismiss}>×</button>
      </div>
    `;
  }
}

customElements.define('ol-search-hint', OlSearchHint);
