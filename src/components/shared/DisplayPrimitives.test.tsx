import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Metric } from './Metric';
import { RecentThumb } from './RecentThumb';
import { StatusChip } from './StatusChip';

describe('shared display primitives', () => {
  it('renders a metric pill', () => {
    render(<Metric label="題目" value="5" />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('題目')).toBeInTheDocument();
  });

  it('renders a recent thumbnail', () => {
    render(<RecentThumb image="/homework.png" title="數學小測" time="今天" />);

    expect(screen.getByRole('img', { name: '數學小測' })).toHaveAttribute('src', '/homework.png');
    expect(screen.getByText('今天')).toBeInTheDocument();
  });

  it('renders a status chip label', () => {
    render(<StatusChip label="AI 草稿" tone="ready" />);

    expect(screen.getByText('AI 草稿')).toBeInTheDocument();
  });
});
