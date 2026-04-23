# Filter Query Semantics

## Current behaviour

All multi-value facets within a single filter type are **OR**'d together.
All distinct filter types are **AND**'d with each other and the main query.

Examples:

| Selection | Effective query |
|-----------|----------------|
| Language: English + French | `language:eng OR language:fre` |
| Genre: Fiction + Mystery | `subject:"fiction" OR subject:"mystery"` |
| Author: Hemingway + Author: Fitzgerald | `author:"Hemingway" OR author:"Fitzgerald"` |
| Language: English + Genre: Fiction | `(language:eng) AND (subject:"fiction")` |

## Chip encoding

Each active filter renders as a chip with a human-readable `type: value` prefix,
e.g. `language: English`, `subject: Cheese`.  The chip `value` field carries the
raw token used for removal and for building the query (e.g. `eng`, `fiction`).

## Future: per-facet AND / OR toggle

Currently there is no way to AND values within a single facet
(e.g. "books available in both English AND French"). Adding this requires:

1. **UX**: a toggle indicator on multi-select dropdowns (pill icon or label).
2. **State**: extend each multi-value filter from `string[]` to
   `{ values: string[], op: 'OR' | 'AND' }`.
3. **URL encoding**: `language=eng&language=fre&language_op=or`
4. **Backend**: wrap OR'd values in `(… OR …)`, chain AND'd values with ` AND `.
5. **Chip label**: show operator — e.g. `language OR: English, French` vs
   `language AND: English, French`.

Until this is implemented, all intra-facet logic is OR-only.
