import { describe, expect, it } from 'vitest';
import { navItems, uiCopy } from './uiCopy';
import type { UiLanguage, View } from '../types';

const languages: UiLanguage[] = ['zh-Hant', 'en'];
const views: View[] = ['home', 'portfolio', 'upload', 'coach', 'profile'];

describe('uiCopy', () => {
  it('has nav labels for zh-Hant and en', () => {
    for (const item of navItems) {
      expect(item.label['zh-Hant']).toBeTruthy();
      expect(item.label.en).toBeTruthy();
    }
  });

  it('does not miss primary view labels', () => {
    for (const language of languages) {
      for (const view of views) {
        expect(uiCopy[language].viewLabels[view]).toBeTruthy();
      }
    }
  });
});
