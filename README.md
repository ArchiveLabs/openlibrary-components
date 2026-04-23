# openlibrary-lite

A fast, modern playground UI for the [Open Library](https://openlibrary.org) catalog, built with FastAPI + Lit web components.

**Purpose:** Prototype new UX patterns for search, filtering, and book discovery — with the goal of eventually upstreaming improvements to the main Open Library codebase.

> **For agents and contributors:** Every significant subsystem has its own README. You are expected to read subsystem READMEs before making changes to those areas. See the index below. This main README contains only the things every contributor must know; subsystem-specific conventions and architecture live closer to the code.

---

## Quick Start

```bash
make dev          # starts both Vite (port 8090) and FastAPI (port 8000)
# or:
make up           # Docker Compose (production-like)
```

Open http://localhost:8090. Vite proxies `/api/*` requests to FastAPI at port 8000.

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

```
/
├── backend/
│   └── main.py          # FastAPI: /api/search, /api/authors/search, /api/subjects/search
├── frontend/
│   └── src/
│       ├── main.js       # Lit app entry point
│       ├── components/   # Lit web components  ← has its own README
│       ├── utils/        # Pure JS utilities   ← has its own README
│       └── styles/       # Global CSS
├── docs/                 # Design decisions and specs
│   └── filter-semantics.md
├── Makefile
└── docker-compose.yml
```

The frontend is a single-page app. All search state lives in `ol-search-page`. The backend is a thin proxy that translates filter params into OL Solr query syntax.

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
