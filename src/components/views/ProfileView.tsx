import { images } from '../../config/assets';
import { uiLanguageLabel, type UiCopy } from '../../i18n/uiCopy';
import type { ChildProfile, ParentProfile, ProfileSheet, UiLanguage } from '../../types';
import { Icon } from '../shared/Icon';

export function ProfileView({
  children,
  copy,
  currentChild,
  onAddChild,
  onEditChild,
  onEditParent,
  onLogout,
  onOpenSetting,
  parent,
  selectedChildId,
  setSelectedChildId,
  uiLanguage,
}: {
  children: ChildProfile[];
  copy: UiCopy;
  currentChild: ChildProfile | null;
  onAddChild: () => void;
  onEditChild: () => void;
  onEditParent: () => void;
  onLogout: () => void;
  onOpenSetting: (sheet: ProfileSheet) => void;
  parent: ParentProfile;
  selectedChildId: string;
  setSelectedChildId: (id: string) => void;
  uiLanguage: UiLanguage;
}) {
  const settings = [
    {
      icon: 'workspace_premium',
      title: copy.settingsRows.learningPlusTitle,
      subtitle: copy.settingsRows.learningPlusSubtitle,
      badge: copy.settingsRows.learningPlusBadge,
      sheet: 'learning-plus' as const,
    },
    {
      icon: 'language',
      title: copy.settingsRows.language,
      value: uiLanguageLabel(uiLanguage, uiLanguage),
      sheet: 'language' as const,
    },
    {
      icon: 'security',
      title: copy.settingsRows.privacy,
      subtitle: copy.settingsRows.privacySubtitle,
      sheet: 'privacy' as const,
    },
    { icon: 'notifications', title: copy.settingsRows.notifications, sheet: 'notifications' as const },
    { icon: 'help_center', title: copy.settingsRows.support, sheet: 'support' as const },
  ];

  return (
    <main className="profile-content">
      <section className="parent-profile">
        <div className="parent-avatar">
          <img src={images.parent} alt={copy.profile.parentAvatarAlt} />
          <button type="button" aria-label={copy.profile.editParent} onClick={onEditParent}>
            <Icon name="edit" />
          </button>
        </div>
        <h2>{parent.display_name}</h2>
        <p>{parent.email}</p>
        <div className="profile-action-row">
          <button type="button" onClick={onEditParent}>{copy.profile.editParent}</button>
          <button type="button" onClick={onEditChild}>{copy.profile.editChild(currentChild?.name)}</button>
        </div>
      </section>

      <section className="children-section">
        <h3>{copy.profile.children}</h3>
        <div className="children-scroll">
          {children.map((child) => (
            <ChildCard
              key={child.id}
              active={child.id === selectedChildId}
              grade={child.grade}
              image={child.name === 'Chloe' ? images.chloe : images.child}
              name={child.name}
              onSelect={() => setSelectedChildId(child.id)}
            />
          ))}
          <button className="add-child" type="button" onClick={onAddChild}>
            <Icon name="add" />
            <span>{copy.profile.addChild}</span>
          </button>
        </div>
      </section>

      <section className="settings-list">
        <h3>{copy.profile.appSettings}</h3>
        <div className="settings-card">
          {settings.map((item) => (
            <button className="settings-row" key={item.title} type="button" onClick={() => onOpenSetting(item.sheet)}>
              <span className="settings-icon">
                <Icon name={item.icon} />
              </span>
              <span className="settings-copy">
                <strong>{item.title}</strong>
                {item.subtitle ? <small>{item.subtitle}</small> : null}
              </span>
              {item.badge ? <b>{item.badge}</b> : null}
              {item.value ? <em>{item.value}</em> : null}
              <Icon name="chevron_right" />
            </button>
          ))}
          <button className="settings-row logout" type="button" onClick={onLogout}>
            <span className="settings-icon"><Icon name="logout" /></span>
            <span className="settings-copy"><strong>{copy.profile.logout}</strong></span>
          </button>
        </div>
      </section>
    </main>
  );
}

function ChildCard({
  active,
  grade,
  image,
  name,
  onSelect,
}: {
  active: boolean;
  grade: string;
  image: string;
  name: string;
  onSelect: () => void;
}) {
  return (
    <button className={active ? 'child-card active' : 'child-card'} type="button" onClick={onSelect}>
      <img src={image} alt={name} />
      <strong>{name}</strong>
      <span>{grade}</span>
    </button>
  );
}
