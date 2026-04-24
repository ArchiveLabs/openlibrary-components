# Contributing to openlibrary-components

A set of composable, drop-in Lit web components for [Open Library](https://openlibrary.org). Built to be self-contained, accessible, and eventually upstreamed into the main OL codebase.

---

## Three-Layer Architecture

Every contribution fits into one of three layers:

```
1. Design System  (frontend/src/styles/)
   Shared CSS tokens — colors, spacing, typography, radii.
   Shadow-DOM components import from here via CSS custom properties.

2. Components     (frontend/src/components/)
   Self-contained Lit web components. Each is independently droppable
   into openlibrary.org. Built from design-system tokens.

3. Compositions   (frontend/)
   Full-page assemblies: index.html wires the OL shell
   (ol-topbar + ol-header + body + ol-footer) around a component.
   catalog.html previews all components in isolation.
```

The shell components (`ol-topbar`, `ol-header`, `ol-footer`) are the reusable frame. The "body" slot is swappable — `ol-search-page` today, anything else tomorrow.

---

## Design System Principles

- **Tokens, not raw values.** New components use CSS custom properties from `tokens.css` rather than hardcoded HSL values. Existing components migrate incrementally.
- **Inherit from the host.** Components use `font-family: inherit` or `var(--font-sans)` so they fit naturally into the host page.
- **No global CSS side effects.** All component styles live inside shadow DOM. `global.css` only applies to the composition shell.

Key tokens:

```css
var(--primary-blue)    /* OL brand blue — buttons, links, focus rings */
var(--link-blue)       /* Slightly darker — hover states */
var(--font-sans)       /* System UI stack */
var(--font-serif)      /* Georgia — book titles */
var(--radius-lg)       /* 8px — panels, cards */
var(--radius-md)       /* 6px — buttons, inputs */
var(--space-sm)        /* 0.5rem */
var(--space-lg)        /* 1rem */
```

---

## Component Contract

Every new component must satisfy this checklist before merging:

- [ ] **File:** `frontend/src/components/ol-<name>.js`
- [ ] **JSDoc block** at the top documenting: props, events emitted, and any usage modes
- [ ] **Design tokens** used for colors, spacing, and type (not raw values)
- [ ] **Shadow DOM** — no global style side effects
- [ ] **Accessibility** — ARIA roles and labels, keyboard navigation for interactive elements
- [ ] **Tests** — any extractable pure logic lives in `utils/` and is tested in Vitest
- [ ] **README entry** — a section in `frontend/src/components/README.md` with props, events, and a usage snippet
- [ ] **Catalog entry** — a section in `ol-catalog.js` showing the component's key variants at `/catalog.html`

The catalog entry is how a reviewer (and future contributor) quickly understands what the component does and what it looks like.

---

## Testing Philosophy

This project tests **logic**, not DOM rendering. The rule:

> If a function takes inputs and returns outputs without touching the DOM, it belongs in `utils/` and must be tested with Vitest.

Component-level DOM tests are **not required** — they add maintenance burden and require a browser environment. The catalog page serves as the visual smoke-test.

```bash
# from frontend/
npm test          # Vitest — all *.test.js files
npm run lint      # ESLint
```

Run both before every commit. Fix failures; do not skip.

---

## Adding a New Component

1. Create `frontend/src/components/ol-<name>.js`
2. Add JSDoc block: props, events, modes
3. Use design tokens (not raw HSL values)
4. Add `customElements.define('ol-<name>', ...)` at the bottom
5. Write any extractable logic into `utils/` first; add Vitest tests
6. Add a section to `frontend/src/components/README.md`
7. Add a preview section to `frontend/src/components/ol-catalog.js`
8. If it touches the backend, update `backend/main.py`

---

## Commit Format

```
type: short imperative description

- detail bullet if needed
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`  
Author: `Michael E. Karpeles <michael.karpeles@gmail.com>`

Squash fixup commits. Keep history as logical milestones — each commit should be meaningful on its own.

---

## PR Checklist

- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] Component checklist complete (if adding/modifying a component)
- [ ] Catalog updated (if adding a new component)
- [ ] No raw HSL values in new code — use tokens

---

## Running Locally

```bash
make dev
# Vite dev server:  http://localhost:8090        — OL composition
# Component catalog: http://localhost:8090/catalog.html
```

Both the Vite server (port 8090) and FastAPI proxy (port 8000) must be running. Vite proxies `/api/*` to FastAPI.

---

## Event Pattern

Components communicate via DOM events, never direct method calls or shared globals:

```
parent ──props──▶ child      (data flows down as attributes/properties)
child  ──events──▶ parent    (changes bubble up as CustomEvents)
```

Events must be dispatched with `bubbles: true, composed: true` so they cross shadow DOM boundaries. Parent components listen with `this.addEventListener(...)`, not `window.addEventListener(...)`.

---

## What Not to Do

- **Don't add features beyond the task.** Three similar lines beat a premature abstraction.
- **Don't duplicate templates.** If you need the same UI in two places, extract a component.
- **Don't mutate props.** Components are display-only for their inputs; they emit events to request changes.
- **Don't use `window.addEventListener`** for component events — use DOM bubbling.
- **Don't write comments that explain what the code does.** Write them only when explaining *why* something non-obvious is done.
