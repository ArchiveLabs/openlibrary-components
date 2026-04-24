# openlibrary-components

Composable, drop-in Lit web components for [Open Library](https://openlibrary.org), backed by a FastAPI dev server for local testing and preview.

**Purpose:** Build and iterate on reusable UI components — search, filtering, book display — with the goal of upstreaming them into openlibrary.org.

**Repo:** [github.com/ArchiveLabs/openlibrary-components](https://github.com/ArchiveLabs/openlibrary-components)

> **For agents and contributors:** Read [`CONTRIBUTING.md`](CONTRIBUTING.md) for the component contract and design-system rules. Every significant subsystem also has its own README. This main README contains only the things every contributor must know.

---

## Quick Start

```bash
make dev          # starts both Vite (port 8090) and FastAPI (port 8000)
# or:
make up           # Docker Compose (production-like)
```

Open http://localhost:8090 for the OL composition, or http://localhost:8090/catalog.html for the component catalog. Vite proxies `/api/*` requests to FastAPI at port 8000.

## Stack

| Layer | Technology |
|---|---|
| Frontend | [Lit 3](https://lit.dev) web components, Vite |
| Backend | FastAPI (Python), proxying to openlibrary.org |
| Tests | Vitest (pure JS utils); no DOM mocking needed |
| Lint | ESLint (JS) |

## Key Commands

```bash
# from frontend/
npm run dev          # Vite dev server
npm run build        # production build → backend/static/
npm test             # Vitest (all *.test.js)
npm run test:watch   # Vitest interactive
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix

# from repo root
make build           # build frontend
make up              # Docker Compose
```

## Architecture at a Glance

Three layers, each with a clear responsibility:

```
Design System  frontend/src/styles/tokens.css
               CSS custom properties — colors, spacing, type, radii.
               All new components use these; existing ones migrate incrementally.

Components     frontend/src/components/
               Self-contained Lit web components. Drop any one into openlibrary.org.
               Each has a README entry, a catalog story, and Vitest-tested pure logic.

Compositions   frontend/index.html   — OL shell (topbar + header + body + footer)
               frontend/catalog.html — component preview catalog (/catalog.html in dev)
```

```
/
├── backend/
│   └── main.py          # FastAPI proxy: /api/search, /api/authors/search, etc.
├── frontend/
│   ├── index.html        # OL composition entry
│   ├── catalog.html      # Component catalog entry
│   └── src/
│       ├── main.js       # OL composition script
│       ├── catalog.js    # Catalog script
│       ├── components/   # Lit web components  ← see README.md
│       ├── utils/        # Pure JS utilities   ← see README.md
│       └── styles/       # tokens.css, global.css, catalog.css
├── docs/
│   └── filter-semantics.md
├── CONTRIBUTING.md       # Component contract, design-system rules, PR process
├── Makefile
└── docker-compose.yml
```

The backend is a thin FastAPI proxy that translates filter params into OL Solr query syntax.

## Subsystem READMEs

Read these before touching the relevant area:

- [`frontend/src/components/README.md`](frontend/src/components/README.md) — Lit component architecture, conventions, and component catalogue
- [`frontend/src/utils/README.md`](frontend/src/utils/README.md) — Pure filter utilities, testing philosophy

## Commit Conventions

- Author: `Michael E. Karpeles <michael.karpeles@gmail.com>`
- Format: `type: short description` (feat, fix, refactor, test, docs, chore)
- Squash fixup commits before they land; keep history as logical milestones

## Design Principles

- **Testable-first**: extract all business logic (filter building, chip construction, URL params) into pure functions in `utils/` before wiring to components.
- **Components own state, utils own logic**: Lit components manage UI state and events; `utils/` modules are framework-agnostic and fully testable with Vitest.
- **Share components**: dropdown mode (homepage) and results mode share the same Lit components wherever possible. Avoid duplicating templates — use props and CSS to adapt.
- **No premature abstraction**: three similar lines beat a premature helper. Build the abstraction when the third real use case appears.
- **Static > dynamic when counts are approximate**: spoof availability counts from fractions rather than making O(n) API calls until we have a real facet endpoint.
