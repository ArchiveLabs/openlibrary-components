/**
 * TDD contract for utils/breakpoints.js — central viewport breakpoint constants.
 *
 * Three raw numbers currently appear scattered across ol-search-bar.js (in both
 * JS matchMedia calls and CSS media queries) with no single source of truth:
 *
 *   600  — full-screen mobile overlay threshold (JS _onTriggerClick, _onWinResize + CSS)
 *   785  — icon-only trigger (CSS-only, JS never checks this)
 *   900  — panel right-align vs center threshold (JS _positionPanel)
 *
 * These tests will fail (red) until breakpoints.js is created, then pass (green).
 * The static-analysis suite below also verifies that the JS-side matchMedia calls
 * in ol-search-bar no longer contain raw numeric literals once the refactor is done.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { BREAKPOINTS } from './breakpoints.js';

// ── Constant values ────────────────────────────────────────────────────────────

describe('BREAKPOINTS constant', () => {
  it('is exported from utils/breakpoints.js', () => {
    expect(BREAKPOINTS).toBeDefined();
  });

  it('mobile is 600 — full-screen overlay activates below this width', () => {
    expect(BREAKPOINTS.mobile).toBe(600);
  });

  it('narrow is 785 — icon-only trigger activates below this width', () => {
    expect(BREAKPOINTS.narrow).toBe(785);
  });

  it('wide is 900 — panel switches from centered to right-aligned above this width', () => {
    expect(BREAKPOINTS.wide).toBe(900);
  });

  it('all values are positive integers', () => {
    for (const [, v] of Object.entries(BREAKPOINTS)) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });

  it('mobile < narrow < wide (logical ordering)', () => {
    expect(BREAKPOINTS.mobile).toBeLessThan(BREAKPOINTS.narrow);
    expect(BREAKPOINTS.narrow).toBeLessThan(BREAKPOINTS.wide);
  });
});

// ── Static analysis: JS source no longer hard-codes breakpoint numbers ─────────
// These assertions become meaningful after the refactor; they ensure the raw
// literals are not re-introduced by future edits.

const searchBarSrc = readFileSync(
  new URL('../components/ol-search-bar.js', import.meta.url), 'utf8'
);

describe('ol-search-bar.js — JS matchMedia calls use BREAKPOINTS, not raw literals', () => {
  it('does not call matchMedia with a raw 600px literal in JS', () => {
    // CSS template literals will still contain '600px' — narrow the match to
    // matchMedia() call sites only.
    const matchMediaCalls = [...searchBarSrc.matchAll(/matchMedia\s*\([^)]+\)/g)]
      .map(m => m[0]);
    for (const call of matchMediaCalls) {
      expect(call).not.toContain('600px');
    }
  });

  it('does not call matchMedia with a raw 900px literal in JS', () => {
    const matchMediaCalls = [...searchBarSrc.matchAll(/matchMedia\s*\([^)]+\)/g)]
      .map(m => m[0]);
    for (const call of matchMediaCalls) {
      expect(call).not.toContain('900px');
    }
  });

  it('_positionPanel does not compare window.innerWidth against a raw 900 literal', () => {
    const fnStart = searchBarSrc.indexOf('_positionPanel()');
    const fnBody  = fnStart !== -1 ? searchBarSrc.slice(fnStart, fnStart + 600) : '';
    // After refactor, should compare against BREAKPOINTS.wide, not > 900
    expect(fnBody).not.toMatch(/>\s*900[^a-zA-Z]/);
  });
});
