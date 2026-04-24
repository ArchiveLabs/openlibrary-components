import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dir, 'ol-header.js'), 'utf8');

describe('ol-header mobile', () => {
  it('has a @media (max-width: 600px) block', () => {
    expect(src).toMatch(/@media\s*\([^)]*max-width[^)]*600px[^)]*\)/);
  });

  it('hides nav links on mobile', () => {
    const mobileIdx = src.search(/@media\s*\([^)]*max-width[^)]*600px[^)]*\)/);
    const afterMedia = src.slice(mobileIdx);
    expect(afterMedia).toMatch(/nav\s*\{[^}]*display\s*:\s*none/);
  });

  it('hides the Sign Up button on mobile', () => {
    const mobileIdx = src.search(/@media\s*\([^)]*max-width[^)]*600px[^)]*\)/);
    const afterMedia = src.slice(mobileIdx);
    expect(afterMedia).toMatch(/\.btn-signup\s*\{[^}]*display\s*:\s*none/);
  });
});
