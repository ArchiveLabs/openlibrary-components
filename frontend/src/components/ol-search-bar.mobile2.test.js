import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync(new URL('./ol-search-bar.js', import.meta.url), 'utf8');

// Find the @media (max-width: 600px) block
const mediaIdx = src.indexOf('@media (max-width: 600px)');
// The block ends at the matching closing brace — find it by counting braces
function extractMediaBlock(source, idx) {
  let depth = 0;
  const start = idx;
  for (let i = idx; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return '';
}
const mobileBlock = mediaIdx !== -1 ? extractMediaBlock(src, mediaIdx) : '';

describe('ol-search-bar mobile Phase 2 CSS contract', () => {
  it('has a @media (max-width: 600px) block', () => {
    expect(mediaIdx).not.toBe(-1);
  });

  it('.ac-scroll max-height uses vh (not px) so it respects virtual keyboard', () => {
    const match = mobileBlock.match(/\.ac-scroll[^{]*\{[^}]*max-height\s*:\s*(\S+)/);
    expect(match).not.toBeNull();
    expect(match[1]).toMatch(/vh/);
  });

  it('.panel-chips has max-height to prevent many chips from pushing results off screen', () => {
    expect(mobileBlock).toMatch(/\.panel-chips[^{]*\{[^}]*max-height/);
  });

  it('.panel-chips has overflow-y: auto so chips are still accessible', () => {
    expect(mobileBlock).toMatch(/\.panel-chips[^{]*\{[^}]*overflow-y\s*:\s*auto/);
  });

  it('.pf-btn has at least 11px vertical padding for 44px touch target', () => {
    const match = mobileBlock.match(/\.pf-btn[^{]*\{[^}]*padding\s*:\s*(\d+)px/);
    expect(match).not.toBeNull();
    const topPad = parseInt(match[1], 10);
    expect(topPad).toBeGreaterThanOrEqual(11);
  });
});
