import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { uiCopy } from '../../i18n/uiCopy';
import type { ChildProfile, ParentProfile, PrivacySettings } from '../../types';
import { ProfileSheetModal } from './ProfileSheetModal';

const privacySettings: PrivacySettings = {
  ai_processing_consent: false,
  consent_version: 'test',
  portfolio_export_consent: false,
  product_updates_consent: false,
  retention_days: 365,
  upload_storage_consent: false,
};

const child: ChildProfile = {
  focus: '',
  grade: 'P3',
  id: 'child-test',
  language: '',
  name: 'Avery',
  passport: '',
  school_type: '',
};

const parent: ParentProfile = {
  children: [child],
  display_name: 'Chan Family',
  email: 'parent@example.com',
  id: 'parent-test',
  onboarding_complete: true,
  privacy_settings: privacySettings,
};

describe('ProfileSheetModal', () => {
  it('renders a settings sheet and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <ProfileSheetModal
        copy={uiCopy['zh-Hant']}
        currentChild={child}
        kind="support"
        parent={parent}
        uiLanguage="zh-Hant"
        onAddChild={vi.fn()}
        onClose={onClose}
        onDeleteChild={vi.fn()}
        onPrivacySave={vi.fn()}
        onUiLanguageChange={vi.fn()}
        onUpdateChild={vi.fn()}
        onUpdateParent={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog', { name: '支援與常見問題' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '關閉' }));
    expect(onClose).toHaveBeenCalled();
  });
});
