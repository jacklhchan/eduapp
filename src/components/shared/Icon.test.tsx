import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Icon } from './Icon';

describe('Icon', () => {
  it('renders a Material Symbols icon name', () => {
    render(<Icon name="home" filled />);

    const icon = screen.getByText('home');
    expect(icon).toHaveClass('material-symbols-outlined');
    expect(icon).toHaveClass('icon-filled');
  });
});
