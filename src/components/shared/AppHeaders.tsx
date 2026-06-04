import { images } from '../../config/assets';
import type { UiCopy } from '../../i18n/uiCopy';
import type { ChildProfile, View } from '../../types';
import { Icon } from './Icon';

export function MainHeader({
  activeView,
  child,
  copy,
  onSwitchChild,
}: {
  activeView: View;
  child: ChildProfile | null;
  copy: UiCopy;
  onSwitchChild: () => void;
}) {
  const isPortfolio = activeView === 'portfolio';
  const avatar = child?.name === 'Chloe' ? images.chloe : isPortfolio ? images.portfolioChild : images.child;
  const passportLabel = child?.passport && child.passport !== 'Learning Passport' ? child.passport : copy.passportName;
  const sectionLabel = activeView === 'home' ? passportLabel : copy.viewLabels[activeView];

  return (
    <header className="top-appbar">
      <div className="profile-row">
        <img className="avatar-img" src={avatar} alt={child?.name || 'Matthew'} />
        <div>
          <h1 className={isPortfolio ? 'brand-title' : 'student-title'}>{child?.name || 'Matthew'}</h1>
          <p>{child?.grade || 'P3'} • {sectionLabel}</p>
        </div>
      </div>
      <button className="symbol-button" type="button" aria-label="切換學生檔案" onClick={onSwitchChild}>
        <Icon name="switch_account" />
      </button>
    </header>
  );
}

export function UploadHeader({ copy, onBack }: { copy: UiCopy; onBack: () => void }) {
  return (
    <header className="upload-appbar">
      <button className="symbol-button" type="button" aria-label={copy.back} onClick={onBack}>
        <Icon name="arrow_back" />
      </button>
      <h1>{copy.uploadTitle}</h1>
      <span aria-hidden="true" />
    </header>
  );
}

export function SettingsHeader({ copy, onBack, onHelp }: { copy: UiCopy; onBack: () => void; onHelp: () => void }) {
  return (
    <header className="settings-appbar">
      <button className="symbol-button" type="button" aria-label={copy.back} onClick={onBack}>
        <Icon name="arrow_back" />
      </button>
      <h1>{copy.settingsTitle}</h1>
      <button className="symbol-button" type="button" aria-label={copy.help} onClick={onHelp}>
        <Icon name="help" />
      </button>
    </header>
  );
}
