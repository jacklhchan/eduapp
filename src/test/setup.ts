import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

if (!URL.createObjectURL) {
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:edupass-test'),
    writable: true,
  });
}

if (!URL.revokeObjectURL) {
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: vi.fn(),
    writable: true,
  });
}
