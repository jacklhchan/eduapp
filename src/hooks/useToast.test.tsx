import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useToast } from './useToast';

function ToastHarness() {
  const { showToast, toast } = useToast(50);
  return (
    <button type="button" onClick={() => showToast('已儲存')}>
      {toast || 'idle'}
    </button>
  );
}

describe('useToast', () => {
  it('shows and clears toast text', async () => {
    vi.useFakeTimers();

    render(<ToastHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'idle' }));
    expect(screen.getByRole('button', { name: '已儲存' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(55);
    });
    expect(screen.getByRole('button', { name: 'idle' })).toBeInTheDocument();
    vi.useRealTimers();
  });
});
