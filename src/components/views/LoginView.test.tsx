import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginView } from './LoginView';

describe('LoginView', () => {
  it('renders login controls and switches auth mode', async () => {
    const user = userEvent.setup();
    const setAuthMode = vi.fn();

    render(
      <LoginView
        authError={null}
        authMode="login"
        displayName=""
        email="parent@example.com"
        pin="246810"
        uiLanguage="zh-Hant"
        onLogin={vi.fn()}
        onSignup={vi.fn()}
        setAuthMode={setAuthMode}
        setDisplayName={vi.fn()}
        setEmail={vi.fn()}
        setPin={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'EduPass AI' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登入' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '新家長？建立帳戶' }));
    expect(setAuthMode).toHaveBeenCalledWith('signup');
  });
});
