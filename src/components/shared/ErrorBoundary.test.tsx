import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function BrokenChild(): never {
  throw new Error('broken render');
}

describe('ErrorBoundary', () => {
  it('renders fallback UI and logs the error', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: '畫面暫時未能載入' })).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
  });
});
