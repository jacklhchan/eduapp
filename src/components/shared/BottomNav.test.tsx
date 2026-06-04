import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('renders nav labels and selects a view', async () => {
    const user = userEvent.setup();
    const setActiveView = vi.fn();

    render(<BottomNav activeView="home" setActiveView={setActiveView} uiLanguage="zh-Hant" />);

    expect(screen.getByRole('navigation', { name: '主要導覽' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '上載' }));
    expect(setActiveView).toHaveBeenCalledWith('upload');
  });
});
