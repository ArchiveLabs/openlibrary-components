# Filter Utilities

Pure JavaScript modules with no DOM or fetch dependencies. Fully testable in a Node environment via Vitest.

## `filters.js`

The single source of truth for filter constants, state shape, and all filter transformation logic.

### Constants

| Export | Purpose |
|--------|---------|
| `SORT_OPTIONS` | `{ value, label }[]` — sort order options |
| `AVAILABILITY_OPTIONS` | `{ value, label, staticCount, fraction }[]` — availability tiers |
| `LANGUAGE_OPTIONS` | `{ value, label }[]` — ISO 639-2 language codes |
| `FICTION_OPTIONS` | `{ value, label }[]` — `fiction` and `nonfiction` pinned filters |
| `GENRE_OPTIONS` | `{ value, label }[]` — scrollable genre list (fiction/nonfiction excluded — they're in FICTION_OPTIONS) |
| `POPULAR_SUBJECTS` | `string[]` — ~90 subject strings for default suggestions |
| `POPULAR_AUTHORS` | `string[]` — ~48 author names for default suggestions |
| `EMPTY_FILTERS` | Default filter state object |

### `EMPTY_FILTERS` shape

```js
{
  sort:          '',           // '' = relevance
  availability:  'readable',  // default is Readable Books Only
  fictionFilter: '',          // '' | 'fiction' | 'nonfiction'
  languages:     [],          // ISO 639-2 codes
  genres:        [],          // subject strings
  authors:       [],          // author name strings
  subjects:      [],          // subject strings
}
```

### Functions

#### `buildChips(filters) → Chip[]`

Derives the chip array from a filter state object. Chips are ordered: `access → fiction → lang → genre → author → subject`.

Each chip: `{ type: string, label: string, value: string }`
- `label` always has a human-readable type prefix: `"language: English"`, `"subject: Cheese"`, etc.
- `type` is used for color classes (`chip-access`, `chip-fiction`, etc.) and for chip removal routing

#### `buildSearchParams(q, filters, page, limit) → URLSearchParams`

Serializes a search into URL params for `/api/search`. Multi-value arrays become repeated params (OR'd on backend).

#### `toggleArrayValue(arr, value) → arr`

Immutable toggle — adds value if absent, removes if present. Used for all multi-select filter arrays.

#### `shufflePick(arr, n) → arr`

Returns `n` randomly selected items from `arr` without mutating the source. Used for 🎲 dice button in author/subject dropdowns.

#### `spoofAvailabilityCounts(numFound) → { [value]: number }`

Returns per-availability estimated counts based on `numFound` and each option's `fraction`. Used only for display purposes until real per-category API calls are implemented.

#### Label helpers

`getLangLabel(code)`, `getAvailabilityLabel(value)`, `getGenreLabel(value)`, `getSortLabel(value)`, `getFictionLabel(value)` — all return the human-readable label for a known value or fall back to the raw value.

---

## `filters.test.js`

59 tests covering all functions and constants. Run with `npm test` from `frontend/`.

### Test philosophy

- Every function in `filters.js` must have tests before it ships.
- Tests use Vitest's `describe`/`it`/`expect` — no mocking, no async.
- When AVAILABILITY_OPTIONS or EMPTY_FILTERS change, update the tests to reflect the new expected values immediately.
- Tests are the contract. If a test fails after your change, either fix the logic or explicitly update the expectation with a comment explaining why.

### Adding tests

When adding a new filter field:
1. Test the constant (correct values, correct shape).
2. Test `buildChips` — chip is present with correct `type`, `label`, `value`.
3. Test `buildSearchParams` — param is serialized/omitted correctly.
4. Test chip ordering — the new type is in the right position in the output array.
