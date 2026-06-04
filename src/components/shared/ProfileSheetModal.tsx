import { type FormEvent, useEffect, useState } from 'react';
import * as endpoints from '../../api/endpoints';
import { gradeOptions } from '../../config/options';
import { languageOptions, uiLanguageLabel, uiLanguageOptions, type UiCopy } from '../../i18n/uiCopy';
import type { ChildProfile, ParentProfile, ParentProfileUpdates, PrivacyCenterResponse, PrivacySettings, ProfileSheet, UiLanguage } from '../../types';
import { Icon } from './Icon';

export function ProfileSheetModal({
  copy,
  currentChild,
  kind,
  parent,
  uiLanguage,
  onAddChild,
  onClose,
  onDeleteChild,
  onPrivacySave,
  onUiLanguageChange,
  onUpdateParent,
  onUpdateChild,
}: {
  copy: UiCopy;
  currentChild: ChildProfile | null;
  kind: ProfileSheet;
  parent: ParentProfile;
  uiLanguage: UiLanguage;
  onAddChild: (payload: Omit<ChildProfile, 'id'>) => Promise<void>;
  onClose: () => void;
  onDeleteChild: (childId: string, confirmationName: string) => Promise<{ parent: ParentProfile }>;
  onPrivacySave: (updates: Partial<PrivacySettings>) => Promise<PrivacyCenterResponse>;
  onUiLanguageChange: (language: UiLanguage) => void;
  onUpdateParent: (updates: ParentProfileUpdates) => Promise<void>;
  onUpdateChild: (updates: Partial<ChildProfile>) => Promise<void>;
}) {
  if (!kind) return null;

  const title = kind === 'edit-child' ? copy.profile.editChild(currentChild?.name) : copy.sheetTitles[kind];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <section className="profile-sheet">
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="symbol-button" type="button" aria-label={copy.close} onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        {kind === 'edit-parent' ? (
          <ParentProfileForm
            initial={parent}
            onSubmit={async (payload) => {
              await onUpdateParent(payload);
              onClose();
            }}
          />
        ) : null}

        {kind === 'edit-child' && currentChild ? (
          <ChildProfileForm
            initial={currentChild}
            submitLabel="儲存檔案"
            onSubmit={async (payload) => {
              await onUpdateChild(payload);
              onClose();
            }}
          />
        ) : null}

        {kind === 'add-child' ? (
          <ChildProfileForm
            submitLabel="新增學生"
            onSubmit={async (payload) => {
              await onAddChild(payload as Omit<ChildProfile, 'id'>);
              onClose();
            }}
          />
        ) : null}

        {kind === 'privacy' ? (
          <PrivacyCenterPanel
            currentChild={currentChild}
            parent={parent}
            onDeleteChild={onDeleteChild}
            onPrivacySave={onPrivacySave}
          />
        ) : null}

        {kind === 'language' ? (
          <LanguageSettingsPanel
            copy={copy}
            uiLanguage={uiLanguage}
            onChange={onUiLanguageChange}
          />
        ) : null}

        {kind === 'notifications' ? (
          <SettingPanel icon="notifications" title={copy.settingPanels.notifications.title} text={copy.settingPanels.notifications.text} />
        ) : null}

        {kind === 'learning-plus' ? (
          <SettingPanel icon="workspace_premium" title={copy.settingPanels.learningPlus.title} text={copy.settingPanels.learningPlus.text} />
        ) : null}

        {kind === 'support' ? (
          <SettingPanel icon="help_center" title={copy.settingPanels.support.title} text={copy.settingPanels.support.text} />
        ) : null}
      </section>
    </div>
  );
}

function ParentProfileForm({
  initial,
  onSubmit,
}: {
  initial: ParentProfile;
  onSubmit: (payload: ParentProfileUpdates) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(initial.display_name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ display_name: displayName });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="sheet-form" onSubmit={submit}>
      <label>
        家長顯示名稱
        <input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
      </label>
      <label>
        電郵
        <input readOnly value={initial.email} />
      </label>
      {error ? <strong className="login-error">{error}</strong> : null}
      <button className="primary-action full" type="submit" disabled={saving}>
        <Icon name={saving ? 'sync' : 'save'} filled />
        {saving ? '儲存中...' : '儲存家長資料'}
      </button>
    </form>
  );
}

function ChildProfileForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: ChildProfile;
  onSubmit: (payload: Omit<ChildProfile, 'id'> | Partial<ChildProfile>) => Promise<void>;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [grade, setGrade] = useState(initial?.grade || 'P1');
  const [focus, setFocus] = useState(initial?.focus ?? '');
  const [schoolType, setSchoolType] = useState(initial?.school_type ?? '');
  const [language, setLanguage] = useState(initial?.language ?? '');
  const [passport, setPassport] = useState(initial?.passport ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        avatar_url: initial?.avatar_url || null,
        focus,
        grade,
        language,
        name,
        passport,
        school_type: schoolType,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="sheet-form" onSubmit={submit}>
      <label>
        學生姓名
        <input required value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        年級
        <select required value={grade} onChange={(event) => setGrade(event.target.value)}>
          {gradeOptions.map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
      <label>
        學習護照名稱
        <input value={passport} onChange={(event) => setPassport(event.target.value)} />
      </label>
      <label>
        學習焦點
        <textarea value={focus} onChange={(event) => setFocus(event.target.value)} />
      </label>
      <label>
        語言
        <select value={language} onChange={(event) => setLanguage(event.target.value)}>
          <option value="">尚未設定</option>
          {languageOptions.map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
      <label>
        學校類型
        <input value={schoolType} onChange={(event) => setSchoolType(event.target.value)} />
      </label>
      {error ? <strong className="login-error">{error}</strong> : null}
      <button className="primary-action full" type="submit" disabled={saving}>
        <Icon name={saving ? 'sync' : 'save'} filled />
        {saving ? '儲存中...' : submitLabel}
      </button>
    </form>
  );
}

function LanguageSettingsPanel({
  copy,
  onChange,
  uiLanguage,
}: {
  copy: UiCopy;
  onChange: (language: UiLanguage) => void;
  uiLanguage: UiLanguage;
}) {
  return (
    <div className="language-panel">
      <div className="setting-panel compact">
        <span className="settings-icon"><Icon name="language" /></span>
        <h3>{copy.languagePanel.title}</h3>
        <p>{copy.languagePanel.intro}</p>
      </div>
      <div className="language-choice-list" role="radiogroup" aria-label={copy.languagePanel.title}>
        {uiLanguageOptions.map((option) => {
          const selected = option.id === uiLanguage;
          return (
            <button
              className={selected ? 'language-choice active' : 'language-choice'}
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.id)}
            >
              <span className="settings-icon">
                <Icon name={option.id === 'zh-Hant' ? 'translate' : 'language'} />
              </span>
              <span>
                <strong>{option.label[uiLanguage]}</strong>
                <small>{option.description[uiLanguage]}</small>
              </span>
              {selected ? <Icon name="check_circle" filled /> : null}
            </button>
          );
        })}
      </div>
      <p className="language-current">{copy.languagePanel.current}: {uiLanguageLabel(uiLanguage, uiLanguage)}</p>
    </div>
  );
}

function SettingPanel({ icon, text, title }: { icon: string; text: string; title: string }) {
  return (
    <div className="setting-panel">
      <span className="settings-icon"><Icon name={icon} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function PrivacyCenterPanel({
  currentChild,
  onDeleteChild,
  onPrivacySave,
  parent,
}: {
  currentChild: ChildProfile | null;
  onDeleteChild: (childId: string, confirmationName: string) => Promise<{ parent: ParentProfile }>;
  onPrivacySave: (updates: Partial<PrivacySettings>) => Promise<PrivacyCenterResponse>;
  parent: ParentProfile;
}) {
  const activeChild = currentChild || parent.children[0] || null;
  const [summary, setSummary] = useState<PrivacyCenterResponse | null>(null);
  const [settings, setSettings] = useState<PrivacySettings>(parent.privacy_settings);
  const [deleteName, setDeleteName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPrivacy() {
    const data = await endpoints.getPrivacyCenter();
    setSummary(data);
    setSettings(data.privacy_settings);
  }

  useEffect(() => {
    let alive = true;
    endpoints.getPrivacyCenter()
      .then((data) => {
        if (!alive) return;
        setSummary(data);
        setSettings(data.privacy_settings);
      })
      .catch((privacyError) => {
        if (!alive) return;
        setError(privacyError instanceof Error ? privacyError.message : '私隱設定暫時未能載入');
      });
    return () => {
      alive = false;
    };
  }, [parent.id]);

  function updateSetting<K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) {
    setSettings((previous) => ({ ...previous, [key]: value }));
  }

  async function savePrivacy() {
    setSaving(true);
    setError(null);
    try {
      const updated = await onPrivacySave(settings);
      setSummary(updated);
      setSettings(updated.privacy_settings);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!activeChild) return;
    setDeleting(true);
    setError(null);
    try {
      await onDeleteChild(activeChild.id, deleteName);
      setDeleteName('');
      await loadPrivacy();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '刪除失敗');
    } finally {
      setDeleting(false);
    }
  }

  const childSummary = summary?.children.find((item) => item.child_id === activeChild?.id);
  const auditEvents = summary?.audit_events || [];
  const deleteReady = Boolean(activeChild && deleteName.trim() === activeChild.name);
  const canDelete = Boolean(activeChild && (summary?.children.length || parent.children.length) > 1);
  const consentSaved = Boolean(settings.consent_updated_at);

  return (
    <div className="privacy-center-panel">
      <section className="privacy-hero-card">
        <span className="privacy-shield"><Icon name="security" filled /></span>
        <h3>家長同意與學生資料</h3>
        <p>管理 {activeChild?.name || '學生'} 的 AI 分析、上載儲存、作品集匯出和資料保留設定。</p>
        <span className={consentSaved ? 'privacy-status saved' : 'privacy-status'}>
          <Icon name={consentSaved ? 'check_circle' : 'pending'} filled />
          {consentSaved ? '同意已儲存' : '尚待確認同意'}
        </span>
      </section>

      <section className="privacy-card">
        <h3>資料處理</h3>
        <ConsentSwitch
          checked={settings.ai_processing_consent}
          description="允許系統使用 OCR 文字及功課內容作 AI 分析。"
          label="AI 分析處理"
          onChange={(checked) => updateSetting('ai_processing_consent', checked)}
        />
        <ConsentSwitch
          checked={settings.upload_storage_consent}
          description="允許把功課相片或 PDF 儲存在學生工作區。"
          label="功課上載儲存"
          onChange={(checked) => updateSetting('upload_storage_consent', checked)}
        />
        <ConsentSwitch
          checked={settings.portfolio_export_consent}
          description="允許保存生成的作品集 PDF 及下載紀錄。"
          label="作品集 PDF 匯出"
          onChange={(checked) => updateSetting('portfolio_export_consent', checked)}
        />
        <ConsentSwitch
          checked={settings.product_updates_consent}
          description="接收原型進度及測試提醒。"
          label="產品更新"
          onChange={(checked) => updateSetting('product_updates_consent', checked)}
        />
      </section>

      <section className="privacy-card">
        <div className="privacy-card-head">
          <h3>資料保留</h3>
          <Icon name="info" />
        </div>
        <p>按指定期限自動刪除學生資料及活動紀錄。</p>
        <div className="retention-segments" role="group" aria-label="資料保留期限">
          {[
            { label: '90 日', value: 90 },
            { label: '180 日', value: 180 },
            { label: '1 年', value: 365 },
            { label: '直到手動刪除', value: 3650 },
          ].map((option) => (
            <button
              className={settings.retention_days === option.value ? 'active' : ''}
              key={option.value}
              type="button"
              onClick={() => updateSetting('retention_days', option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {activeChild ? (
        <section className="privacy-child-summary">
          <span>{activeChild.name.charAt(0).toUpperCase()}</span>
          <div>
            <h3>{activeChild.name} • {activeChild.grade}</h3>
            <p>
              <Icon name="description" /> 文件：{childSummary?.document_count ?? 0}
              <Icon name="picture_as_pdf" /> 作品集 PDF：{childSummary?.portfolio_export_count ?? 0}
            </p>
          </div>
        </section>
      ) : null}

      <section className="privacy-card">
        <h3>審計紀錄</h3>
        <div className="audit-list">
          {auditEvents.length ? auditEvents.slice(0, 3).map((event) => (
            <div className="audit-row" key={event.id}>
              <Icon name={event.event_type.includes('deleted') ? 'delete_forever' : 'verified_user'} />
              <div>
                <strong>{auditEventLabel(event.event_type)}</strong>
                <span>{formatAuditTime(event.created_at)}</span>
              </div>
            </div>
          )) : (
            <p>暫時未有私隱活動紀錄。</p>
          )}
        </div>
      </section>

      {activeChild ? (
        <section className="danger-zone-card">
          <div className="danger-zone-head">
            <Icon name="warning" filled />
            <div>
              <h3>危險操作</h3>
              <p>永久刪除 {activeChild.name} 的所有資料、生成作品集及設定。此操作不能復原。</p>
            </div>
          </div>
          <label>
            如要確認，請輸入「{activeChild.name}」
            <input value={deleteName} onChange={(event) => setDeleteName(event.target.value)} placeholder={`輸入 ${activeChild.name}`} />
          </label>
          {!canDelete ? <small>原型帳戶需要保留至少一個學生檔案。</small> : null}
          <button className="danger-action" type="button" disabled={!deleteReady || !canDelete || deleting} onClick={confirmDelete}>
            <Icon name={deleting ? 'sync' : 'delete_forever'} />
            {deleting ? '刪除中...' : `刪除 ${activeChild.name} 資料`}
          </button>
        </section>
      ) : null}

      {error ? <strong className="login-error">{error}</strong> : null}

      <div className="privacy-save-bar">
        <button className={saving ? 'primary-action full saving' : 'primary-action full'} type="button" onClick={savePrivacy} disabled={saving}>
          <span />
          {saving ? '儲存中...' : '儲存私隱設定'}
        </button>
      </div>
    </div>
  );
}

function ConsentSwitch({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="consent-switch-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input checked={checked} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
      <i />
    </label>
  );
}

function auditEventLabel(eventType: string) {
  if (eventType === 'privacy_settings_updated') return '私隱設定已更新';
  if (eventType === 'child_data_deleted') return '學生資料已刪除';
  if (eventType === 'portfolio_exported') return '作品集 PDF 已匯出';
  if (eventType === 'ocr_review_confirmed') return 'OCR 檢視已確認';
  if (eventType === 'ocr_review_deleted') return 'OCR 記錄已刪除';
  if (eventType === 'learning_report_shared') return '學習報告已分享';
  if (eventType === 'learning_report_share_revoked') return '分享連結已撤回';
  if (eventType === 'practice_attempt_saved') return '練習紀錄已儲存';
  return eventType.replace(/_/g, ' ');
}

function formatAuditTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-HK', { dateStyle: 'medium', timeStyle: 'short' });
}
