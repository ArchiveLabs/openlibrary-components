import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync(new URL('./ol-facet-drop.js', import.meta.url), 'utf8');

// Find the @media (max-width: 600px) block and extract it by counting braces
const mediaIdx = src.indexOf('@media (max-width: 600px)');
function extractMediaBlock(source, idx) {
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
const mobileBlock = mediaIdx !== -1 ? extractMediaBlock(src, mediaIdx) : '';

describe('ol-facet-drop mobile CSS contract', () => {
  it('has a @media (max-width: 600px) block', () => {
    expect(mediaIdx).not.toBe(-1);
  });

  it(':host gets max-width to prevent viewport overflow on narrow screens', () => {
    expect(mobileBlock).toMatch(/max-width\s*:\s*calc\(100vw\s*-\s*8px\)/);
  });

  it(':host defaults to left-aligned on mobile (overrides any inline left)', () => {
    expect(mobileBlock).toMatch(/:host\s*\{[^}]*left\s*:\s*0/);
  });

  it(':host([right]) still right-aligns on mobile', () => {
    expect(mobileBlock).toMatch(/:host\(\[right\]\)[^}]*right\s*:\s*0/);
  });

  it('.item padding is increased to at least 11px vertical for 44px touch target', () => {
    // Expect padding with at least 11px on top (covers 11px 14px, 11px 12px, etc.)
    const itemPaddingMatch = mobileBlock.match(/\.item\s*\{[^}]*padding\s*:\s*(\d+)px/);
    expect(itemPaddingMatch).not.toBeNull();
    const topPadding = parseInt(itemPaddingMatch[1], 10);
    expect(topPadding).toBeGreaterThanOrEqual(11);
  });
});
