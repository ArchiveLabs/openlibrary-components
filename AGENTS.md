# Agent Guide — openlibrary-lite

This guide is for AI agents working in this repository. Read it fully before making changes.

**Also read:** [`README.md`](README.md) for stack overview and design principles, and the subsystem READMEs listed there.

---

## What This Project Is

A modern search UI playground for [Open Library](https://openlibrary.org). It is **not** the main OL codebase (which is at `~/Projects/openlibrary` and uses Infogami/web.py). Changes here are prototypes that may be upstreamed later.

## Key Philosophies

### 1. Pure logic lives in `utils/`, not in components

All filter state manipulation (`buildChips`, `buildSearchParams`, `toggleArrayValue`, etc.) lives in `frontend/src/utils/filters.js`. These are pure functions with zero DOM/fetch dependencies, so they can be fully tested with Vitest in a Node environment.

**Rule:** Before adding logic to a component, ask if it belongs in `utils/` first. If it takes inputs and returns outputs without side effects, it belongs there.

### 2. Tests before components

Write or update `filters.test.js` before changing component behavior. If a new filter or chip type is added, test the pure logic first, then wire it into the component.

### 3. Components share, they don't duplicate

`ol-search-bar` is used in both dropdown (homepage) and results modes. `ol-howto-modal` is used in both `ol-search-bar` and `ol-search-page`. When you find yourself writing the same template in two places, extract it.

### 4. Don't break what works

Always run `npm test` and `npm run lint` before committing. If you add a feature that changes existing behavior, update the affected tests rather than deleting them.

### 5. Every component has a README

When you create or significantly modify a Lit component, check whether its README in `frontend/src/components/` needs updating. If no README exists for the component, create one.

---

## Repository Layout

```
backend/
  main.py            FastAPI proxy; translates filter params to OL Solr syntax
  requirements.txt

frontend/
  src/
    main.js          App entry point — registers custom elements and mounts ol-search-page
    components/      Lit web components (each should have inline JSDoc + README entry)
    utils/           Pure JS modules (tested with Vitest)
    styles/          Global CSS (imported by main.js)
  eslint.config.js   ESLint flat config
  vite.config.js     Vite + Vitest config; /api proxy → port 8000

docs/
  filter-semantics.md   OR/AND semantics, future AND/OR toggle plan

Makefile             dev, build, up, down
docker-compose.yml
```

## Development Workflow

```bash
make dev             # Vite on :8090 + FastAPI on :8000 (hot reload)
npm test             # run all Vitest tests (from frontend/)
npm run lint         # ESLint (from frontend/)
```

Always start `make dev` before testing UI changes manually. Vite serves on **port 8090**; uvicorn on **port 8000**. The Vite proxy handles `/api/*` so both must be running. Visit http://localhost:8090.

> **Backend `.venv`:** uvicorn is installed in `backend/.venv/`. The Makefile runs `.venv/bin/uvicorn` explicitly — do not rely on a global uvicorn.

## Adding a New Filter

1. Add the option constant to `filters.js` (e.g. `FOO_OPTIONS`).
2. Add the new field to `EMPTY_FILTERS`.
3. Update `buildChips()` — add chip with correct `type` and `label: 'type: value'` prefix.
4. Update `buildSearchParams()` — serialize the new param.
5. Write tests in `filters.test.js` covering all three functions above.
6. Update `ol-search-bar.js` — add the facet button and dropdown renderer.
7. Update `ol-search-page.js` — add state field, `_onFilterChange`, `_onChipRemove`, `_rfLabel`, `_rfActive`, `_rfApply`, dropdown renderer.
8. Update `backend/main.py` — handle the new query param.

## Adding a New Lit Component

Every component must satisfy this checklist before merging:

1. Create `frontend/src/components/ol-<name>.js`.
2. Add JSDoc block at the top: props, events, any usage modes.
3. Use CSS custom properties from `styles/tokens.css` (not raw HSL values).
4. Add `customElements.define('ol-<name>', ...)` at the bottom.
5. Add a section to `frontend/src/components/README.md`.
6. Add a `_render<Name>()` section to `frontend/src/components/ol-catalog.js` so the component appears at `/catalog.html`.
7. Write pure-logic tests in `utils/` + Vitest for any extractable logic.

## Commit Format

```
type: short imperative description

- bullet details if needed
```

Author: `Michael E. Karpeles <michael.karpeles@gmail.com>`

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`

Squash fixup commits; keep history as logical milestones.

## Pull Request Standards

### Bug fixes must include evidence

Every PR that fixes a bug or addresses a regression **must** include at least one of:

1. **A new test** (Vitest or Playwright) that was failing before the fix and passes after. Name it so it's obvious which bug it covers. Prefer a Playwright test for interactive/click bugs since they verify the actual browser behavior; prefer a Vitest CSS-content test for layout/style regressions.

2. **A screenshot** attached to the PR description showing the fixed state (acceptable when writing a deterministic test isn't practical, e.g. a pure visual regression). Playwright's `page.screenshot()` is the preferred way to generate these.

The PR body should state which test proves the fix, or link the screenshot inline. Copilot and reviewers will check for this.

**Anti-pattern to avoid:** opening a bug-fix PR that only modifies source code with no test or screenshot. A fix with no proof is unverifiable and may silently regress.

---

## Known Constraints and Gotchas

- **Shadow DOM z-index**: dropdowns inside shadow roots can be clipped by overflow. Keep dropdowns inside the same shadow root as their triggers (`z-index` works across shadow boundaries only when there's no stacking context ancestor).
- **`position:fixed` in shadow DOM**: works relative to viewport as long as the shadow host has no `transform`/`filter`. `ol-howto-modal` relies on this.
- **OR vs AND semantics**: multiple values within one facet are OR'd; different facets are AND'd. See `docs/filter-semantics.md`. Do not change this without updating the doc.
- **`printdisabled` is not "readable"**: books with `ebook_access=printdisabled` are only accessible to print-disabled patrons. "Readable Books Only" means `ebook_access:borrowable OR ebook_access:public` — never include `printdisabled` in that set.
- **Static availability counts**: the counts in the availability dropdown (~50M, ~4.6M, etc.) are hardcoded in `AVAILABILITY_OPTIONS.staticCount`. They are not fetched per-search. Update them periodically as OL's catalog grows.
- **`ol-search-bar` is display-only for filters**: in hero mode, `ol-search-bar` reads `filters` from its parent and emits `ol-filter-change` events up. It never mutates filter state directly.
- **Edition resolution**: search results are work-level records. Use `bestEdition(w.editions)` from `filters.js` to pick the highest-ranked edition (`public > borrowable > printdisabled > no_ebook`). Always link to the edition URL (`/books/OL…`) not the work URL (`/works/OL…`) when an edition exists.
- **Series**: the `series` field is requested from the OL search API and may be an array. Show `w.series?.[0]` above the title if present. Not all works have series data — treat it as optional.
- **OL `ebook_access` enum (Solr numeric)**: `no_ebook=0, printdisabled=1, borrowable=2, public=3`. The range query `ebook_access:[borrowable TO public]` correctly covers 2–3 and excludes printdisabled.
