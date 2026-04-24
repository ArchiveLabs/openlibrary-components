import { LitElement, html, css } from 'lit';
import { bestEdition } from '../utils/filters.js';

// readable = ebook_access:[borrowable TO public]; printdisabled is not borrowable
const ACCESS_META = {
  public:        { label: 'Readable',   cls: 'readable'   },
  borrowable:    { label: 'Borrowable', cls: 'borrowable' },
  printdisabled: { label: 'Catalog',    cls: 'catalog'    },
  no_ebook:      { label: 'Catalog',    cls: 'catalog'    },
};

export class OlBookCard extends LitElement {
  static properties = {
    work: { type: Object },
  };

  static styles = css`
    :host { display: block; }

    .card {
      display: flex;
      gap: 14px;
      padding: 16px 0;
      border-bottom: 1px solid hsl(48, 15%, 74%);
    }
    .card:last-child { border-bottom: none; }

    /* Cover */
    .cover {
      flex-shrink: 0;
      width: 56px;
      text-decoration: none;
    }
    .cover img {
      width: 56px;
      height: 84px;
      object-fit: cover;
      border-radius: 3px;
      background: hsl(0, 0%, 88%);
      display: block;
      box-shadow: 1px 1px 4px rgba(0,0,0,0.18);
    }
    .cover-blank {
      width: 56px;
      height: 84px;
      background: hsl(48, 20%, 87%);
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      color: hsl(48, 20%, 60%);
    }

    /* Body */
    .body { flex: 1; min-width: 0; }
    .series {
      font-size: 11px;
      color: hsl(0, 0%, 50%);
      margin: 0 0 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .title {
      font-family: Georgia, serif;
      font-size: 15px;
      font-weight: 600;
      line-height: 1.35;
      margin: 0 0 3px;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .title a {
      color: hsl(210, 100%, 20%);
      text-decoration: none;
    }
    .title a:hover { text-decoration: underline; }
    .author {
      font-size: 13px;
      color: hsl(202, 96%, 28%);
      margin: 0 0 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      font-size: 12px;
      color: hsl(0, 0%, 45%);
    }
    .year { white-space: nowrap; }
    .rating {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      white-space: nowrap;
    }
    .stars { color: hsl(40, 100%, 50%); letter-spacing: -1px; }

    /* Access badge */
    .badge {
      display: inline-block;
      padding: 1px 7px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }
    .badge.readable   { background: hsl(142, 50%, 91%); color: hsl(142, 50%, 22%); }
    .badge.borrowable { background: hsl(270, 45%, 92%); color: hsl(270, 45%, 30%); }
    .badge.open       { background: hsl(217, 70%, 92%); color: hsl(217, 70%, 28%); }
    .badge.catalog    { background: hsl(0, 0%, 92%);    color: hsl(0, 0%, 35%);    }
  `;

  _stars(avg) {
    if (!avg) return '';
    const full  = Math.round(avg);
    const empty = 5 - full;
    return '★'.repeat(full) + '☆'.repeat(empty);
  }

  render() {
    const w = this.work ?? {};
    const ed      = bestEdition(w.editions);
    // Prefer edition title (correct language); fall back to work title
    const title   = ed?.title ?? w.title;
    const coverId = ed?.cover_i ?? w.cover_i;
    // Prefer edition OLID from key for covers; b/olid/ is indexed by edition, not work
    const edOlid  = ed?.key?.split('/').pop();
    const wOlid   = w.key?.split('/').pop();
    // Link to the best edition page; fall back to work page
    const linkKey = ed?.key ?? w.key;
    const coverUrl = edOlid  ? `https://covers.openlibrary.org/b/olid/${edOlid}-M.jpg`
                   : coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
                   : wOlid   ? `https://covers.openlibrary.org/b/olid/${wOlid}-M.jpg`
                   : null;
    const itemUrl  = `https://openlibrary.org${linkKey}`;
    const authors  = (w.author_name ?? []).slice(0, 2).join(', ') || 'Unknown author';
    // Use edition's own ebook_access for the badge (not the work-level rollup)
    const access   = ACCESS_META[ed?.ebook_access ?? w.ebook_access];
    const rating   = w.ratings_average;
    const ratingCount = w.ratings_count;
    const series   = w.series?.[0] ?? null;

    return html`
      <div class="card">
        <a class="cover" href=${itemUrl} target="_blank" rel="noopener" tabindex="-1">
          ${coverUrl
            ? html`<img src=${coverUrl} alt="" loading="lazy">`
            : html`<div class="cover-blank">📖</div>`}
        </a>

        <div class="body">
          ${series ? html`<p class="series">${series}</p>` : ''}
          <p class="title">
            <a href=${itemUrl} target="_blank" rel="noopener">${title ?? 'Untitled'}</a>
          </p>
          <p class="author">${authors}</p>
          <div class="meta">
            ${w.first_publish_year ? html`<span class="year">${w.first_publish_year}</span>` : ''}
            ${rating ? html`
              <span class="rating">
                <span class="stars">${this._stars(rating)}</span>
                ${rating.toFixed(1)}
                ${ratingCount ? html`<span>(${ratingCount.toLocaleString()})</span>` : ''}
              </span>` : ''}
            ${access ? html`<span class="badge ${access.cls}">${access.label}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('ol-book-card', OlBookCard);
