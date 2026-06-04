import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { uiCopy } from '../../i18n/uiCopy';
import type { ChildProfile } from '../../types';
import { MainHeader, SettingsHeader } from './AppHeaders';

const child: ChildProfile = {
  focus: '',
  grade: 'P3',
  id: 'child-test',
  language: '',
  name: 'Avery',
  passport: 'Learning Passport',
  school_type: '',
};

describe('AppHeaders', () => {
  it('renders the main header and switches child', async () => {
    const user = userEvent.setup();
    const onSwitchChild = vi.fn();

    render(<MainHeader activeView="home" child={child} copy={uiCopy['zh-Hant']} onSwitchChild={onSwitchChild} />);

    expect(screen.getByRole('heading', { name: 'Avery' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '切換學生檔案' }));
    expect(onSwitchChild).toHaveBeenCalled();
  });

  it('renders settings actions', async () => {
    const user = userEvent.setup();
    const onHelp = vi.fn();

    render(<SettingsHeader copy={uiCopy['zh-Hant']} onBack={vi.fn()} onHelp={onHelp} />);

    await user.click(screen.getByRole('button', { name: '說明' }));
    expect(onHelp).toHaveBeenCalled();
  });
});
