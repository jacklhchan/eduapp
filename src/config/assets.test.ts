import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { images } from './assets';

describe('images', () => {
  it('contains the expected app image keys', () => {
    expect(Object.keys(images).sort()).toEqual([
      'artwork',
      'blocks',
      'child',
      'chloe',
      'drawing',
      'homework',
      'notebook',
      'parent',
      'portfolioChild',
      'uploadPreview',
    ]);
  });

  it('keeps the hardcoded image map out of App.tsx', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    expect(appSource).toContain("from './config/assets'");
    expect(appSource).not.toMatch(/const\s+images\s*=/);
  });
});
