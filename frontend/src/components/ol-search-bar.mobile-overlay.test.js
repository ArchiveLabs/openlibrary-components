import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync(new URL('./ol-search-bar.js', import.meta.url), 'utf8');

// Pull out just the @media (max-width: 600px) block by brace-counting
function extractMediaBlock(source, startToken) {
  const idx = source.indexOf(startToken);
  if (idx === -1) return '';
  let depth = 0;
  for (let i = idx; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(idx, i + 1);
    }
  }
  return '';
}

const mobileBlock = extractMediaBlock(src, '@media (max-width: 600px)');

describe('ol-search-bar mobile overlay CSS contract', () => {
  it('has :host(.mobile-exp) rule inside the mobile media block', () => {
    expect(mobileBlock).toMatch(/:host\(\.mobile-exp\)/);
  });

  it(':host(.mobile-exp) uses position: fixed for a true viewport overlay', () => {
    expect(mobileBlock).toMatch(/:host\(\.mobile-exp\)[^}]*position\s*:\s*fixed/);
  });

  it(':host(.mobile-exp) has z-index of at least 9000 to sit above all other content', () => {
    const match = mobileBlock.match(/:host\(\.mobile-exp\)[^}]*z-index\s*:\s*(\d+)/);
    expect(match).not.toBeNull();
    expect(parseInt(match[1], 10)).toBeGreaterThanOrEqual(9000);
  });

  it(':host(.mobile-exp) covers the full dynamic viewport height with 100dvh', () => {
    expect(mobileBlock).toMatch(/:host\(\.mobile-exp\)[^}]*height\s*:\s*100dvh/);
  });

  it(':host(.mobile-exp) stretches to full width with 100dvw', () => {
    expect(mobileBlock).toMatch(/:host\(\.mobile-exp\)[^}]*width\s*:\s*100dvw/);
  });

  it(':host(.mobile-exp) .panel resets to static positioning (not absolute)', () => {
    expect(mobileBlock).toMatch(/:host\(\.mobile-exp\)\s+\.panel[^}]*position\s*:\s*static/);
  });

  it(':host(.mobile-exp) .panel removes max-height constraint', () => {
    expect(mobileBlock).toMatch(/:host\(\.mobile-exp\)\s+\.panel[^}]*max-height\s*:\s*none/);
  });

  it(':host(.mobile-exp) .ac-scroll removes max-height constraint', () => {
    expect(mobileBlock).toMatch(/:host\(\.mobile-exp\)\s+\.ac-scroll[^}]*max-height\s*:\s*none/);
  });
});

describe('ol-search-bar mobile overlay JS contract', () => {
  it('declares _mobileExpanded reactive state property', () => {
    expect(src).toMatch(/_mobileExpanded\s*:\s*\{[^}]*state\s*:\s*true/);
  });

  it('initialises _mobileExpanded to false in constructor', () => {
    expect(src).toMatch(/this\._mobileExpanded\s*=\s*false/);
  });

  it('sets _mobileExpanded = true in _onFocus when on mobile', () => {
    expect(src).toMatch(/_mobileExpanded\s*=\s*true/);
  });

  it('clears _mobileExpanded in _onKeyDown Escape path', () => {
    // Escape handler should reset the overlay
    const escapeBlock = src.slice(src.indexOf("key === 'Escape'"), src.indexOf("key === 'Escape'") + 200);
    expect(escapeBlock).toMatch(/_mobileExpanded\s*=\s*false/);
  });

  it('toggles mobile-exp class on :host via updated()', () => {
    expect(src).toMatch(/classList\.toggle\s*\(\s*['"]mobile-exp['"]\s*,\s*this\._mobileExpanded\s*\)/);
  });
});
