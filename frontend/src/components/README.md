# Lit Components

All UI is built from Lit 3 web components with shadow DOM. Each component owns its styles and is independently mountable.

## Component Catalogue

### `ol-search-page`

The root application component. Owns **all filter and search state**.

**Props:** none (reads `?q=` from URL on mount)

**Key responsibilities:**
- `_lastQ` — the active query string (null = hero/homepage mode)
- `_availability`, `_fictionFilter`, `_languages`, `_genres`, `_authors`, `_subjects`, `_sort` — canonical filter state
- Computes `_chips` (from `buildChips()`) and `_filters` (shape object) as derived getters
- Renders hero mode (`ol-search-bar` with `showFacets=true`) or results mode (search bar + filter bar + book cards)
- Handles `ol-search`, `ol-filter-change` events

**Mode switching:** `_lastQ === null` → hero; otherwise results.

**Filter bar:** `_renderFilterBar()` produces the results-mode facet strip (avail → lang → genre → author → subject → ⚙️ → sort). Dropdowns open inline via `_openFacet` state.

---

### `ol-search-bar`

Search input with chips + autocomplete panel. **Display-only for filters** — reads filter state from props, emits events upward.

**Props:**
- `q: String` — controlled query string (synced to internal `_q`)
- `chips: Array` — `{ type, label, value }[]` rendered as colored pills
- `showFacets: Boolean` — when true, renders the facet bar inside the open panel (hero mode)
- `filters: Object` — current filter state (read-only; only used when `showFacets=true`)

**Events emitted:**
- `ol-search` — `{ q }` when user submits
- `ol-filter-change` — `{ filter, value }` when a facet changes or a chip × is clicked (both modes)

**Facet bar order (dropdown mode):** avail | lang | genre | author | subject | ⚙️ | sort

**Chip colors** (CSS class `chip-<type>`):
- `access` → green, `fiction` → purple, `lang` → blue, `genre` → light purple, `author` → orange, `subject` → pink

**Autocomplete badge:** shows `Readable` (green) when `ebook_access` is `public` or `borrowable`; `Catalog` (gray) otherwise.

---

### `ol-howto-modal`

Modal dialog with an iframe pointing to `https://openlibrary.org/search/howto`.

**Props:** `open: Boolean`

**Events:** `close` — fired when the user dismisses (click overlay, ×, or Escape)

**Usage:**
```js
html`<ol-howto-modal .open=${this._howtoOpen} @close=${() => this._howtoOpen = false}></ol-howto-modal>`
```

Uses `position:fixed` inside shadow DOM — works as long as the host element has no `transform`/`filter` ancestor creating a containing block.

---

### `ol-book-card`

Displays a single search result. Stateless.

**Props:** `work: Object` — a single OL search result doc

**`ebook_access` badge values:**
- `public` → Readable (green)
- `borrowable` → Borrowable (purple)
- `printdisabled` → Open (blue) — **not the same as "readable"**
- `no_ebook` (or missing) → Catalog (gray)

---

### `ol-search-hint`

A dismissible contextual hint bar rendered between the results filter bar and the book cards. Styled to match the filter bar height (40px min, same border).

**Props:**
- `hint: Object | null` — `{ key: string, message: string, actions?: { label: string, href: string }[] }`

When `hint` is `null`, the component renders nothing. When a user dismisses the hint, the key is stored in `localStorage` as `ol-hint-dismissed:<key>` and the hint stays hidden on future visits.

**Usage in `ol-search-page`:**
The parent computes the hint via `_computeHint(q, filters, numFound)` after each search response. Add new hint conditions there; each condition must have a unique `key`.

```js
// Example hint object:
{
  key: 'fulltext-suggest',
  message: 'Fewer results than expected? Try searching inside book text.',
  actions: [{ label: 'Search inside books', href: 'https://openlibrary.org/search/inside?q=...' }]
}
```

**Dismissal:** per-key, persisted in `localStorage`. Clearing `localStorage` resets all dismissals. Private-browsing fallback: dismissed for the session only (localStorage unavailable).

---

### `ol-header` / `ol-topbar` / `ol-footer`

Layout shell components. Minimal logic.

---

## Conventions

### State ownership

`ol-search-page` is the single source of truth for all filter state. Child components receive state as props and emit events to request changes. Never mutate state in `ol-search-bar` directly.

### Events flow up, props flow down

```
ol-search-page ──props──▶ ol-search-bar
ol-search-bar  ──events─▶ ol-search-page
```

The same pattern applies to any nested component.

### Shared components vs duplicated templates

Before writing the same dropdown logic twice (once for hero mode in `ol-search-bar`, once for results mode in `ol-search-page`), consider whether the dropdown can be a standalone component. The current duplication between `pf-*` (panel facet) and `rf-*` (results facet) CSS/templates is a known area for future refactor — see `docs/filter-semantics.md`.

### CSS naming

- `pf-*` — panel facet (inside `ol-search-bar`'s dropdown panel)
- `rf-*` — results facet (inside `ol-search-page`'s filter bar)
- `ac-*` — autocomplete (inside `ol-search-bar`'s results area)
- `chip-*` — filter chips

Shadow DOM means these class names don't leak, but keep them prefixed anyway for clarity.

### Testing

Lit component tests are **not** required to be DOM tests. If a component method is pure (e.g. `_rfLabel`, `_isFacetActive`), extract it to `utils/` and test it there. Reserve DOM/integration tests for behavior that genuinely requires rendering.
