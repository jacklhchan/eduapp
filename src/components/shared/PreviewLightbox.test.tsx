import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PreviewLightbox } from './PreviewLightbox';

describe('PreviewLightbox', () => {
  it('shows the preview image and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<PreviewLightbox image="/preview.png" onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: '功課預覽' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '功課完整預覽' })).toHaveAttribute('src', '/preview.png');
    await user.click(screen.getByRole('button', { name: '關閉預覽' }));
    expect(onClose).toHaveBeenCalled();
  });
});
