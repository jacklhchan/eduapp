import type { ProfileSheet, UiLanguage, View } from '../types';

export const uiLanguageStorageKey = 'edupass-ui-language';

export const navItems: Array<{ id: View; label: Record<UiLanguage, string>; icon: string }> = [
  { id: 'home', label: { 'zh-Hant': '首頁', en: 'Home' }, icon: 'home' },
  { id: 'portfolio', label: { 'zh-Hant': '檔案', en: 'Portfolio' }, icon: 'import_contacts' },
  { id: 'upload', label: { 'zh-Hant': '上載', en: 'Upload' }, icon: 'add_a_photo' },
  { id: 'coach', label: { 'zh-Hant': '進度', en: 'Progress' }, icon: 'monitoring' },
  { id: 'profile', label: { 'zh-Hant': '設定', en: 'Settings' }, icon: 'person' },
];

export const uiLanguageOptions: Array<{
  id: UiLanguage;
  label: Record<UiLanguage, string>;
  description: Record<UiLanguage, string>;
}> = [
  {
    id: 'zh-Hant',
    label: { 'zh-Hant': '繁體中文', en: 'Traditional Chinese' },
    description: { 'zh-Hant': '以繁體中文顯示主要介面。', en: 'Use Traditional Chinese for the main interface.' },
  },
  {
    id: 'en',
    label: { 'zh-Hant': 'English', en: 'English' },
    description: { 'zh-Hant': '以英文顯示導覽與設定介面。', en: 'Use English for navigation and settings.' },
  },
];

export const uiCopy: Record<UiLanguage, {
  back: string;
  close: string;
  help: string;
  passportName: string;
  loading: string;
  uploadTitle: string;
  settingsTitle: string;
  profile: {
    addChild: string;
    appSettings: string;
    children: string;
    editChild: (name?: string) => string;
    editParent: string;
    logout: string;
    parentAvatarAlt: string;
  };
  settingsRows: {
    language: string;
    languageValue: string;
    learningPlusBadge: string;
    learningPlusSubtitle: string;
    learningPlusTitle: string;
    notifications: string;
    privacy: string;
    privacySubtitle: string;
    support: string;
  };
  sheetTitles: Record<Exclude<ProfileSheet, null>, string>;
  settingPanels: {
    learningPlus: { title: string; text: string };
    notifications: { title: string; text: string };
    support: { title: string; text: string };
  };
  languagePanel: {
    title: string;
    intro: string;
    current: string;
  };
  viewLabels: Record<View, string>;
}> = {
  'zh-Hant': {
    back: '返回',
    close: '關閉',
    help: '說明',
    passportName: '學習護照',
    loading: '正在載入安全學習工作區...',
    uploadTitle: '確認作業內容',
    settingsTitle: '設定',
    profile: {
      addChild: '新增學生',
      appSettings: '應用設定',
      children: '學生',
      editChild: (name) => `編輯 ${name || '學生'}`,
      editParent: '編輯家長',
      logout: '登出',
      parentAvatarAlt: '家長頭像',
    },
    settingsRows: {
      language: '語言',
      languageValue: '繁體中文',
      learningPlusBadge: '管理',
      learningPlusSubtitle: '示範帳戶已啟用',
      learningPlusTitle: '學習加值',
      notifications: '通知設定',
      privacy: '資料與私隱',
      privacySubtitle: '上載、同意與資料保留',
      support: '支援與常見問題',
    },
    sheetTitles: {
      'add-child': '新增學生',
      'edit-child': '編輯學生',
      'edit-parent': '編輯家長',
      language: '語言',
      'learning-plus': '學習加值',
      notifications: '通知設定',
      privacy: '資料與私隱',
      support: '支援與常見問題',
    },
    settingPanels: {
      learningPlus: { title: '示範帳戶已啟用', text: '學習加值目前只作原型示範，暫未接入真實付款或訂閱系統。' },
      notifications: { title: '每週進度提醒', text: '提醒偏好會在下一階段接入後端，支援按家長設定電郵或推送通知。' },
      support: { title: '支援與常見問題', text: '此面板用作確認設定流程；正式版可加入常見問題及支援渠道。' },
    },
    languagePanel: {
      title: '介面語言',
      intro: '切換後會即時套用到導覽與設定介面；學習紀錄、檔名和上載內容會保留原文。',
      current: '目前語言',
    },
    viewLabels: {
      coach: '數學進度',
      home: '首頁',
      portfolio: '學習檔案',
      profile: '設定',
      upload: '上載功課',
    },
  },
  en: {
    back: 'Back',
    close: 'Close',
    help: 'Help',
    passportName: 'Learning Passport',
    loading: 'Loading your secure learning workspace...',
    uploadTitle: 'Review Upload',
    settingsTitle: 'Settings',
    profile: {
      addChild: 'Add Child',
      appSettings: 'App Settings',
      children: 'Children',
      editChild: (name) => `Edit ${name || 'Student'}`,
      editParent: 'Edit Parent',
      logout: 'Log out',
      parentAvatarAlt: 'Parent avatar',
    },
    settingsRows: {
      language: 'Language',
      languageValue: 'English',
      learningPlusBadge: 'Manage',
      learningPlusSubtitle: 'Demo account enabled',
      learningPlusTitle: 'Learning Plus',
      notifications: 'Notifications',
      privacy: 'Data & Privacy',
      privacySubtitle: 'Uploads, consent, and retention',
      support: 'Support & FAQ',
    },
    sheetTitles: {
      'add-child': 'Add Child',
      'edit-child': 'Edit Student',
      'edit-parent': 'Edit Parent',
      language: 'Language',
      'learning-plus': 'Learning Plus',
      notifications: 'Notifications',
      privacy: 'Data & Privacy',
      support: 'Support & FAQ',
    },
    settingPanels: {
      learningPlus: { title: 'Demo account enabled', text: 'Learning Plus is shown for the prototype only and is not connected to live billing.' },
      notifications: { title: 'Weekly progress reminders', text: 'Notification preferences will connect to email or push channels in the next phase.' },
      support: { title: 'Support & FAQ', text: 'This panel validates the settings flow; production can add support channels and FAQs.' },
    },
    languagePanel: {
      title: 'Interface Language',
      intro: 'Changes apply instantly to navigation and settings. Learning records, filenames, and uploaded content stay in their original language.',
      current: 'Current language',
    },
    viewLabels: {
      coach: 'Math Progress',
      home: 'Home',
      portfolio: 'Portfolio',
      profile: 'Settings',
      upload: 'Upload',
    },
  },
};

export type UiCopy = (typeof uiCopy)[UiLanguage];

export function isUiLanguage(value: string | null): value is UiLanguage {
  return value === 'zh-Hant' || value === 'en';
}

export function getInitialUiLanguage(): UiLanguage {
  if (typeof window === 'undefined') return 'zh-Hant';
  const stored = window.localStorage.getItem(uiLanguageStorageKey);
  if (isUiLanguage(stored)) return stored;
  return 'zh-Hant';
}

export function uiLanguageLabel(language: UiLanguage, displayLanguage: UiLanguage) {
  return uiLanguageOptions.find((option) => option.id === language)?.label[displayLanguage] || language;
}

export const languageOptions = ['繁體中文', '英文', '雙語：繁中及英文'];
