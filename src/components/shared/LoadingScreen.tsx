import type { UiCopy } from '../../i18n/uiCopy';
import { Icon } from './Icon';

export function LoadingScreen({ copy }: { copy: UiCopy }) {
  return (
    <main className="login-shell">
      <section className="login-card">
        <span className="login-mark"><Icon name="school" filled /></span>
        <h1>EduPass AI</h1>
        <p>{copy.loading}</p>
      </section>
    </main>
  );
}
