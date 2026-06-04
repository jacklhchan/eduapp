import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ParentProfile, PrivacySettings } from '../../types';
import { OnboardingView } from './OnboardingView';

const privacySettings: PrivacySettings = {
  ai_processing_consent: false,
  consent_version: 'test',
  portfolio_export_consent: false,
  product_updates_consent: false,
  retention_days: 365,
  upload_storage_consent: false,
};

const parent: ParentProfile = {
  children: [],
  display_name: 'Chan Family',
  email: 'parent@example.com',
  id: 'parent-test',
  onboarding_complete: false,
  privacy_settings: privacySettings,
};

describe('OnboardingView', () => {
  it('renders the onboarding form and submits profile payloads', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn().mockResolvedValue(undefined);

    render(<OnboardingView parent={parent} onComplete={onComplete} onLogout={vi.fn()} />);

    expect(screen.getByText('首次登入設定')).toBeInTheDocument();
    await user.type(screen.getByLabelText('學生姓名'), 'Avery');
    await user.click(screen.getByRole('button', { name: '開始使用 EduPass' }));

    expect(onComplete).toHaveBeenCalledWith(
      { display_name: 'Chan Family' },
      expect.objectContaining({ grade: 'P1', name: 'Avery' }),
    );
  });
});
