import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dir, 'ol-topbar.js'), 'utf8');

describe('ol-topbar mobile', () => {
  it('has a @media (max-width: 600px) block', () => {
    expect(src).toMatch(/@media\s*\([^)]*max-width[^)]*600px[^)]*\)/);
  });

  it('hides :host on mobile screens', () => {
    const mobileIdx = src.search(/@media\s*\([^)]*max-width[^)]*600px[^)]*\)/);
    expect(mobileIdx).toBeGreaterThan(-1);
    const afterMedia = src.slice(mobileIdx);
    // Expect display:none somewhere in the mobile block
    expect(afterMedia).toMatch(/display\s*:\s*none/);
  });
});
