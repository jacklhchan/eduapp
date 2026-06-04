import { type FormEvent, useState } from 'react';
import { gradeOptions } from '../../config/options';
import { languageOptions } from '../../i18n/uiCopy';
import type { ChildProfile, ParentProfile, ParentProfileUpdates } from '../../types';
import { Icon } from '../shared/Icon';

export function OnboardingView({
  onComplete,
  onLogout,
  parent,
}: {
  onComplete: (parentUpdates: ParentProfileUpdates, childPayload: Omit<ChildProfile, 'id'>) => Promise<void>;
  onLogout: () => void;
  parent: ParentProfile;
}) {
  const [parentName, setParentName] = useState(parent.display_name || '');
  const [childName, setChildName] = useState('');
  const [grade, setGrade] = useState('P1');
  const [focus, setFocus] = useState('');
  const [schoolType, setSchoolType] = useState('');
  const [language, setLanguage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onComplete(
        { display_name: parentName },
        {
          avatar_url: null,
          focus,
          grade,
          language,
          name: childName,
          passport: '',
          school_type: schoolType,
        },
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '建立檔案失敗');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="onboarding-shell">
      <form className="onboarding-card" onSubmit={submit}>
        <div className="onboarding-head">
          <span className="login-mark"><Icon name="family_restroom" filled /></span>
          <div>
            <span>首次登入設定</span>
            <h1>建立學習檔案</h1>
            <p>{parent.email}</p>
          </div>
        </div>

        <label>
          家長顯示名稱
          <input required value={parentName} onChange={(event) => setParentName(event.target.value)} />
        </label>

        <div className="onboarding-divider">
          <Icon name="child_care" />
          <span>第一位學生檔案</span>
        </div>

        <label>
          學生姓名
          <input required value={childName} onChange={(event) => setChildName(event.target.value)} placeholder="例如：Matthew" />
        </label>
        <div className="form-grid two">
          <label>
            年級
            <select value={grade} onChange={(event) => setGrade(event.target.value)}>
              {gradeOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>
            語言
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="">尚未設定</option>
              {languageOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
        </div>
        <label>
          學習焦點
          <textarea value={focus} onChange={(event) => setFocus(event.target.value)} />
        </label>
        <label>
          學校類型
          <input value={schoolType} onChange={(event) => setSchoolType(event.target.value)} />
        </label>

        {error ? <strong className="login-error">{error}</strong> : null}

        <button className="primary-action full" type="submit" disabled={saving}>
          <Icon name={saving ? 'sync' : 'check_circle'} filled />
          {saving ? '儲存中...' : '開始使用 EduPass'}
        </button>
        <button className="auth-switch" type="button" onClick={onLogout}>登出</button>
      </form>
    </main>
  );
}
