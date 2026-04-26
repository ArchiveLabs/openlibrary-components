import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync(new URL('./ol-search-bar.js', import.meta.url), 'utf8');

// :host(.mobile-exp) rules are now standalone (not inside a media query) so we
// search the full source rather than a media block.

describe('ol-search-bar mobile overlay CSS contract', () => {
  it('has :host(.mobile-exp) rule in the component styles', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)/);
  });

  it(':host(.mobile-exp) uses position: fixed for a true viewport overlay', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)[^}]*position\s*:\s*fixed/);
  });

  it(':host(.mobile-exp) has z-index of at least 9000 to sit above all other content', () => {
    const match = src.match(/:host\(\.mobile-exp\)[^}]*z-index\s*:\s*(\d+)/);
    expect(match).not.toBeNull();
    expect(parseInt(match[1], 10)).toBeGreaterThanOrEqual(9000);
  });

  it(':host(.mobile-exp) covers the full dynamic viewport height with 100dvh', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)[^}]*height\s*:\s*100dvh/);
  });

  it(':host(.mobile-exp) stretches to full width with 100dvw', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)[^}]*width\s*:\s*100dvw/);
  });

  it(':host(.mobile-exp) .panel resets to static positioning (not absolute)', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.panel[^}]*position\s*:\s*static/);
  });

  it(':host(.mobile-exp) .panel removes max-height constraint', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.panel[^}]*max-height\s*:\s*none/);
  });

  it(':host(.mobile-exp) .ac-scroll has a vh-based max-height for results scrolling', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.ac-scroll[^}]*max-height\s*:\s*\d+vh/);
  });

  it(':host(.mobile-exp) .panel sets width:100% to override the desktop CSS var', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.panel[^}]*width\s*:\s*100%/);
  });

  it(':host(.mobile-exp) .panel uses overflow:visible so facet dropdowns are not clipped', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.panel[^}]*overflow\s*:\s*visible/);
  });
});

describe('ol-search-bar mobile overlay — facet dropdown clipping fix', () => {
  it(':host(.mobile-exp) .pf-bar overrides overflow to visible so ol-facet-drop is not clipped', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.pf-bar[^}]*overflow\s*:\s*visible/);
  });

  it(':host(.mobile-exp) .pf-bar uses flex-wrap: wrap so buttons stay visible instead of scrolling off-screen', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.pf-bar[^}]*flex-wrap\s*:\s*wrap/);
  });
});

describe('ol-search-bar mobile overlay JS contract', () => {
  it('declares _mobileExpanded reactive state property', () => {
    expect(src).toMatch(/_mobileExpanded\s*:\s*\{[^}]*state\s*:\s*true/);
  });

  it('initialises _mobileExpanded to false in constructor', () => {
    expect(src).toMatch(/this\._mobileExpanded\s*=\s*false/);
  });

  it('sets _mobileExpanded = true in _onTriggerClick on narrow viewports', () => {
    const fn = src.slice(src.indexOf('_onTriggerClick'), src.indexOf('_onTriggerClick') + 300);
    expect(fn).toMatch(/_mobileExpanded\s*=\s*true/);
  });

  it('calls _closePanel() in _onKeyDown Escape path', () => {
    const escapeBlock = src.slice(src.indexOf("key === 'Escape'"), src.indexOf("key === 'Escape'") + 200);
    expect(escapeBlock).toMatch(/_closePanel\(\)/);
  });

  it('toggles mobile-exp class on :host via updated()', () => {
    expect(src).toMatch(/classList\.toggle\s*\(\s*['"]mobile-exp['"]\s*,\s*this\._mobileExpanded\s*\)/);
  });
});
