import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dir, 'ol-search-page.js'), 'utf8');
const globalCss = readFileSync(join(__dir, '../styles/global.css'), 'utf8');

describe('ol-search-page mobile', () => {
  it('has a @media (max-width: 600px) block', () => {
    expect(src).toMatch(/@media\s*\([^)]*max-width[^)]*600px[^)]*\)/);
  });

  it('makes the cover grid fit within 375px', () => {
    const mobileIdx = src.search(/@media\s*\([^)]*max-width[^)]*600px[^)]*\)/);
    const afterMedia = src.slice(mobileIdx);
    // Cover images should be narrowed on mobile (< 100px)
    const widthMatch = afterMedia.match(/\.cover-item\s+img[^{]*\{[^}]*width\s*:\s*(\d+)px/);
    expect(widthMatch).not.toBeNull();
    const coverWidth = parseInt(widthMatch[1], 10);
    expect(coverWidth).toBeLessThan(100);
    // 4 covers + 3 gaps should fit in 375px
    const gapMatch = afterMedia.match(/\.cover-grid[^{]*\{[^}]*gap\s*:\s*(\d+)px/);
    if (gapMatch) {
      const gap = parseInt(gapMatch[1], 10);
      expect(4 * coverWidth + 3 * gap).toBeLessThanOrEqual(375);
    }
  });

  it('makes the results filter bar horizontally scrollable on mobile', () => {
    const mobileIdx = src.search(/@media\s*\([^)]*max-width[^)]*600px[^)]*\)/);
    const afterMedia = src.slice(mobileIdx);
    expect(afterMedia).toMatch(/\.rf-bar[^{]*\{[^}]*overflow-x\s*:\s*auto/);
  });
});

describe('global.css mobile', () => {
  it('has a mobile media query for main padding', () => {
    expect(globalCss).toMatch(/@media\s*\([^)]*max-width[^)]*600px[^)]*\)/);
  });

  it('reduces main padding on mobile', () => {
    const mobileIdx = globalCss.search(/@media\s*\([^)]*max-width[^)]*600px[^)]*\)/);
    const afterMedia = globalCss.slice(mobileIdx);
    expect(afterMedia).toMatch(/main\s*\{[^}]*padding/);
  });
});
