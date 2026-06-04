import type { FormEvent } from 'react';
import { Icon } from '../shared/Icon';
import type { AuthMode, UiLanguage } from '../../types';

export function LoginView({
  authError,
  authMode,
  displayName,
  email,
  onLogin,
  onSignup,
  pin,
  setAuthMode,
  setDisplayName,
  setEmail,
  setPin,
  uiLanguage,
}: {
  authError: string | null;
  authMode: AuthMode;
  displayName: string;
  email: string;
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
  onSignup: (event: FormEvent<HTMLFormElement>) => void;
  pin: string;
  setAuthMode: (mode: AuthMode) => void;
  setDisplayName: (value: string) => void;
  setEmail: (value: string) => void;
  setPin: (value: string) => void;
  uiLanguage: UiLanguage;
}) {
  const isSignup = authMode === 'signup';
  const loginCopy = uiLanguage === 'en'
    ? {
      authSwitch: isSignup ? 'Already have an account? Log in' : 'New parent? Create account',
      email: 'Email',
      intro: isSignup
        ? 'Create a parent account, then set up the first student profile.'
        : 'Log in to load parent details, student records, OCR history, and exported portfolios.',
      parentName: 'Parent name',
      parentNamePlaceholder: 'e.g. Mrs Chan',
      pin: isSignup ? 'Create PIN' : 'Demo PIN',
      submit: isSignup ? 'Create account' : 'Log in',
    }
    : {
      authSwitch: isSignup ? '已有帳戶？登入' : '新家長？建立帳戶',
      email: '電郵',
      intro: isSignup
        ? '建立家長帳戶後，即可設定第一個學生學習檔案。'
        : '登入後會載入家長資料、學生紀錄、OCR 歷史及已匯出的作品集。',
      parentName: '家長姓名',
      parentNamePlaceholder: '例如：陳太',
      pin: isSignup ? '建立 PIN' : '示範 PIN',
      submit: isSignup ? '建立帳戶' : '登入',
    };

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={isSignup ? onSignup : onLogin}>
        <span className="login-mark"><Icon name="school" filled /></span>
        <h1>EduPass AI</h1>
        <p>{loginCopy.intro}</p>
        {isSignup ? (
          <label>
            {loginCopy.parentName}
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder={loginCopy.parentNamePlaceholder} />
          </label>
        ) : null}
        <label>
          {loginCopy.email}
          <input value={email} type="email" onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          {loginCopy.pin}
          <input value={pin} type="password" inputMode="numeric" onChange={(event) => setPin(event.target.value)} />
        </label>
        {authError ? <strong className="login-error">{authError}</strong> : null}
        <button className="primary-action full" type="submit">
          <Icon name={isSignup ? 'person_add' : 'login'} filled />
          {loginCopy.submit}
        </button>
        <button className="auth-switch" type="button" onClick={() => setAuthMode(isSignup ? 'login' : 'signup')}>
          {loginCopy.authSwitch}
        </button>
      </form>
    </main>
  );
}
