import { navItems } from '../../i18n/uiCopy';
import type { UiLanguage, View } from '../../types';
import { Icon } from './Icon';

export function BottomNav({
  activeView,
  setActiveView,
  uiLanguage,
}: {
  activeView: View;
  setActiveView: (view: View) => void;
  uiLanguage: UiLanguage;
}) {
  return (
    <nav className="bottom-nav" aria-label="主要導覽">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={activeView === item.id ? 'active' : ''}
          type="button"
          onClick={() => setActiveView(item.id)}
        >
          <Icon name={item.icon} filled={activeView === item.id} />
          <span>{item.label[uiLanguage]}</span>
        </button>
      ))}
    </nav>
  );
}
