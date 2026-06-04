import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { uiCopy } from '../../i18n/uiCopy';
import { LoadingScreen } from './LoadingScreen';

describe('LoadingScreen', () => {
  it('renders the configured loading copy', () => {
    render(<LoadingScreen copy={uiCopy['zh-Hant']} />);

    expect(screen.getByRole('heading', { name: 'EduPass AI' })).toBeInTheDocument();
    expect(screen.getByText(uiCopy['zh-Hant'].loading)).toBeInTheDocument();
  });
});
