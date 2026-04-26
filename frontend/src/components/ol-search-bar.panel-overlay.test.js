import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync(new URL('./ol-search-bar.js', import.meta.url), 'utf8');

// ── CSS helpers ───────────────────────────────────────────────────────────────

function extractBlock(source, startToken) {
  const idx = source.indexOf(startToken);
  if (idx === -1) return '';
  let depth = 0;
  for (let i = idx; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') { depth--; if (depth === 0) return source.slice(idx, i + 1); }
  }
  return '';
}

// :host(.mobile-exp) rules are now standalone — search full src, not a media block.
const mobileBlock  = extractBlock(src, '@media (max-width: 600px)');
const panelCssIdx  = src.indexOf('.panel {');
const panelCssEnd  = src.indexOf('}', panelCssIdx);
const panelCss     = panelCssIdx !== -1 ? src.slice(panelCssIdx, panelCssEnd + 1) : '';

// ── Panel CSS contract ────────────────────────────────────────────────────────

describe('ol-search-bar panel overlay — CSS positioning contract', () => {
  it('panel base rule uses position:fixed so it escapes header width constraints', () => {
    expect(panelCss).toMatch(/position\s*:\s*fixed/);
  });

  it('panel top is driven by --ol-panel-top CSS custom property', () => {
    expect(panelCss).toMatch(/top\s*:\s*var\(--ol-panel-top/);
  });

  it('panel right is driven by --ol-panel-right CSS custom property', () => {
    expect(panelCss).toMatch(/right\s*:\s*var\(--ol-panel-right/);
  });

  it('panel width is driven by --ol-panel-width CSS custom property', () => {
    expect(panelCss).toMatch(/width\s*:\s*var\(--ol-panel-width/);
  });

  it('panel left is driven by --ol-panel-left CSS custom property', () => {
    expect(panelCss).toMatch(/left\s*:\s*var\(--ol-panel-left/);
  });
});

// ── _positionPanel JS contract ────────────────────────────────────────────────

describe('ol-search-bar panel overlay — _positionPanel JS contract', () => {
  // Find the method definition (not call sites like _positionPanel();) by including the brace.
  const fnStart = src.indexOf('_positionPanel() {');
  const fnBody  = fnStart !== -1 ? src.slice(fnStart, fnStart + 800) : '';

  it('_positionPanel method exists', () => {
    expect(fnStart).not.toBe(-1);
  });

  it('_positionPanel sets --ol-panel-top via setProperty on the host', () => {
    expect(fnBody).toMatch(/setProperty\s*\(\s*['"]--ol-panel-top['"]/);
  });

  it('_positionPanel sets --ol-panel-right via setProperty on the host', () => {
    expect(fnBody).toMatch(/setProperty\s*\(\s*['"]--ol-panel-right['"]/);
  });

  it('_positionPanel sets --ol-panel-width via setProperty on the host', () => {
    expect(fnBody).toMatch(/setProperty\s*\(\s*['"]--ol-panel-width['"]/);
  });

  it('_positionPanel enforces a minimum panel width of 600px', () => {
    expect(fnBody).toMatch(/Math\.max\s*\(\s*600/);
  });

  it('_positionPanel skips positioning when _mobileExpanded is true', () => {
    expect(fnBody).toMatch(/_mobileExpanded.*return|return.*_mobileExpanded/s);
  });

  it('_positionPanel reads getBoundingClientRect from the trigger element', () => {
    expect(fnBody).toMatch(/getBoundingClientRect/);
  });

  it('_positionPanel sets --ol-panel-left via setProperty on the host', () => {
    expect(fnBody).toMatch(/setProperty\s*\(\s*['"]--ol-panel-left['"]/);
  });
});

// ── Trigger button contract ───────────────────────────────────────────────────

describe('ol-search-bar panel overlay — trigger button contract', () => {
  it('has a .trigger-btn CSS class', () => {
    expect(src).toMatch(/\.trigger-btn/);
  });

  it('has _onTriggerClick event handler', () => {
    expect(src).toMatch(/_onTriggerClick/);
  });

  it('trigger-btn is wired to _onTriggerClick in the template', () => {
    expect(src).toMatch(/trigger-btn[\s\S]{0,200}_onTriggerClick|_onTriggerClick[\s\S]{0,200}trigger-btn/);
  });
});

// ── Panel-input contract ──────────────────────────────────────────────────────

describe('ol-search-bar panel overlay — panel-input contract', () => {
  it('panel-input-row container exists in CSS', () => {
    expect(src).toMatch(/\.panel-input-row/);
  });

  it('panel-input class is used on the real input inside the panel', () => {
    expect(src).toMatch(/panel-input/);
  });

  it('updated() focuses the panel-input when the panel opens', () => {
    const updFn = src.slice(src.indexOf('updated(changed)'), src.indexOf('updated(changed)') + 1000);
    expect(updFn).toMatch(/panel-input/);
  });
});

// ── Window resize contract ────────────────────────────────────────────────────

describe('ol-search-bar panel overlay — window resize contract', () => {
  it('_onWinResize handler is defined', () => {
    expect(src).toMatch(/_onWinResize/);
  });

  it('resize listener is added in connectedCallback', () => {
    const cb = src.slice(src.indexOf('connectedCallback'), src.indexOf('connectedCallback') + 300);
    expect(cb).toMatch(/addEventListener\s*\(\s*['"]resize['"]/);
  });

  it('resize listener is removed in disconnectedCallback', () => {
    const cb = src.slice(src.indexOf('disconnectedCallback'), src.indexOf('disconnectedCallback') + 300);
    expect(cb).toMatch(/removeEventListener\s*\(\s*['"]resize['"]/);
  });

  it('_onWinResize calls _positionPanel to reposition (does not just close the panel)', () => {
    const fnIdx = src.indexOf('_onWinResize =');
    const fnBody = fnIdx !== -1 ? src.slice(fnIdx, fnIdx + 500) : '';
    expect(fnBody).toMatch(/_positionPanel/);
  });

  it('_onWinResize sets _mobileExpanded=true when viewport shrinks into mobile', () => {
    const fnIdx = src.indexOf('_onWinResize =');
    const fnBody = fnIdx !== -1 ? src.slice(fnIdx, fnIdx + 500) : '';
    // isMobile branch must set _mobileExpanded = true
    expect(fnBody).toMatch(/isMobile[\s\S]{0,80}_mobileExpanded\s*=\s*true/);
  });
});

// ── Mobile overlay regression ─────────────────────────────────────────────────

describe('ol-search-bar panel overlay — mobile overlay not broken', () => {
  it('mobile overlay still overrides panel to position:static', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.panel[^}]*position\s*:\s*static/);
  });

  it('_onTriggerClick sets _mobileExpanded=true on narrow viewports', () => {
    const fn = src.slice(src.indexOf('_onTriggerClick'), src.indexOf('_onTriggerClick') + 300);
    expect(fn).toMatch(/_mobileExpanded\s*=\s*true/);
  });

  it('mobile overlay hides the trigger .input-row so two search inputs are not visible', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.input-row[^}]*display\s*:\s*none/);
  });
});
