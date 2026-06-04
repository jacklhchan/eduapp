import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { uiCopy } from '../../i18n/uiCopy';
import type { ChildProfile, ParentProfile, PrivacySettings } from '../../types';
import { ProfileView } from './ProfileView';

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

describe('ProfileView', () => {
  it('renders profile settings and opens a setting sheet', async () => {
    const user = userEvent.setup();
    const onOpenSetting = vi.fn();

    render(
      <ProfileView
        children={[child]}
        copy={uiCopy['zh-Hant']}
        currentChild={child}
        parent={parent}
        selectedChildId={child.id}
        uiLanguage="zh-Hant"
        onAddChild={vi.fn()}
        onEditChild={vi.fn()}
        onEditParent={vi.fn()}
        onLogout={vi.fn()}
        onOpenSetting={onOpenSetting}
        setSelectedChildId={vi.fn()}
      />,
    );

    expect(screen.getByText('Chan Family')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /資料與私隱/ }));
    expect(onOpenSetting).toHaveBeenCalledWith('privacy');
  });
});
