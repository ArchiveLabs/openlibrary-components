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

  it(':host(.mobile-exp) .ac-scroll grows to fill remaining panel height via flex: 1', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.ac-scroll[^}]*flex\s*:\s*1/);
  });

  it(':host(.mobile-exp) .ac-scroll has min-height:0 so it can shrink below content size', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.ac-scroll[^}]*min-height\s*:\s*0/);
  });

  it(':host(.mobile-exp) .ac-scroll removes max-height cap so content fills the space', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.ac-scroll[^}]*max-height\s*:\s*none/);
  });

  it(':host(.mobile-exp) .panel is a flex column so children stack and ac-scroll can flex-grow', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.panel[^}]*display\s*:\s*flex/);
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.panel[^}]*flex-direction\s*:\s*column/);
  });

  it(':host(.mobile-exp) .panel and .search-outer both have min-height:0 to allow flex shrink', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.panel[^}]*min-height\s*:\s*0/);
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.search-outer[^}]*min-height\s*:\s*0/);
  });

  it('@media 600px .ac-scroll rule is scoped to :host(:not(.mobile-exp)) — no specificity conflict', () => {
    const mediaBlock = src.slice(src.indexOf('@media (max-width: 600px)'), src.indexOf('@media (max-width: 600px)') + 400);
    expect(mediaBlock).toMatch(/:host\(:not\(\.mobile-exp\)\)\s+\.ac-scroll/);
    expect(mediaBlock).not.toMatch(/[^)]\s+\.ac-scroll\s*\{[^}]*max-height/); // plain .ac-scroll should not appear
  });

  it(':host(.mobile-exp) .panel sets width:100% to override the desktop CSS var', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.panel[^}]*width\s*:\s*100%/);
  });

  it(':host(.mobile-exp) .panel uses overflow:hidden to bound the flex scroll region', () => {
    // In full-screen mode the panel IS the viewport, so facet dropdowns remain
    // within its bounds and are not clipped; overflow:hidden is needed so that
    // flex children (ac-scroll) are properly height-constrained.
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.panel[^}]*overflow\s*:\s*hidden/);
  });

  it(':host(.mobile-exp) .panel and .search-outer have min-height:0 so flex chain can shrink', () => {
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.panel[^}]*min-height\s*:\s*0/);
    expect(src).toMatch(/:host\(\.mobile-exp\)\s+\.search-outer[^}]*min-height\s*:\s*0/);
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

  it('locks body scroll when mobile overlay opens and restores it when it closes', () => {
    const updatedFn = src.slice(src.indexOf('updated(changed)'), src.indexOf('updated(changed)') + 1200);
    expect(updatedFn).toMatch(/document\.body\.style\.overflow/);
    expect(updatedFn).toMatch(/_mobileExpanded.*hidden|hidden.*_mobileExpanded/s);
  });

  it('restores body scroll in disconnectedCallback in case component is removed while expanded', () => {
    const dcFn = src.slice(src.indexOf('disconnectedCallback()'), src.indexOf('disconnectedCallback()') + 400);
    expect(dcFn).toMatch(/document\.body\.style\.overflow/);
  });
});

// ── Scroll lock — any droppable mode (issue #44 follow-up) ───────────────────
//
// Scroll lock must engage whenever the droppable search panel is open, not only
// when the mobile full-screen overlay is active.  The gate is _open (the
// universal open state) checked against showFacets (droppable mode), NOT
// _mobileExpanded (mobile-only).

describe('ol-search-bar scroll lock — any droppable panel open', () => {
  // Find the line that acquires the lock so we can inspect its context.
  const lockIdx = src.search(/this\._scrollLockActive\s*=\s*true/);
  const lockCtx = lockIdx !== -1 ? src.slice(Math.max(0, lockIdx - 300), lockIdx) : '';

  it('_scrollLockActive = true exists in source', () => {
    expect(lockIdx).not.toBe(-1);
  });

  it('scroll lock acquire is gated on _open change (not _mobileExpanded) so desktop panel also locks scroll', () => {
    expect(lockCtx).toMatch(/changed\.has\s*\(\s*'_open'\s*\)/);
  });

  it('scroll lock acquire condition checks showFacets so embedded mode does not lock scroll', () => {
    expect(lockCtx).toMatch(/showFacets/);
  });

  it('disconnectedCallback restores overflow via _scrollLockActive flag', () => {
    const dcFn = src.slice(src.indexOf('disconnectedCallback'), src.indexOf('disconnectedCallback') + 500);
    expect(dcFn).toMatch(/_scrollLockActive/);
    expect(dcFn).toMatch(/document\.body\.style\.overflow/);
  });
});
