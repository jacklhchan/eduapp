import { type ChangeEvent, type FormEvent, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import * as endpoints from './api/endpoints';
import { MainHeader, SettingsHeader, UploadHeader } from './components/shared/AppHeaders';
import { BottomNav } from './components/shared/BottomNav';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { Icon } from './components/shared/Icon';
import { LoadingScreen } from './components/shared/LoadingScreen';
import { Metric } from './components/shared/Metric';
import { PreviewLightbox } from './components/shared/PreviewLightbox';
import { ProfileSheetModal } from './components/shared/ProfileSheetModal';
import { HomeView } from './components/views/HomeView';
import { CoachView } from './components/views/CoachView';
import { LoginView } from './components/views/LoginView';
import { OnboardingView } from './components/views/OnboardingView';
import { PortfolioView } from './components/views/PortfolioView';
import { ProfileView } from './components/views/ProfileView';
import { UploadView } from './components/views/UploadView';
import { images } from './config/assets';
import { displayTopicName, filterLearningProgressForMvp } from './domain/learningDisplay';
import { gradeOptions } from './config/options';
import { useLearningWorkspace } from './hooks/useLearningWorkspace';
import { useToast } from './hooks/useToast';
import { getInitialUiLanguage, languageOptions, uiCopy, uiLanguageLabel, uiLanguageStorageKey, type UiCopy } from './i18n/uiCopy';
import type { AuthMode, AuthState, AuditEvent, ChildDataSummary, ChildProfile, ExportState, GeneratedQuiz, LearningProgress, LearningTopicSummary, MistakeNotebookItem, OcrFilePreview, OcrInboxDocument, OcrResult, OcrReviewQuestionDraft, ParentProfile, ParentProfileUpdates, PortfolioSectionDraft, PortfolioStatus, PortfolioStoredSection, PortfolioTone, PracticePlanItem, PracticeStartOptions, PracticeState, PracticeSubmission, PrivacyCenterResponse, PrivacySettings, QuizItem, ShareReport, ShareReportOptions, SubjectProgressSummary, UiLanguage, UploadPreviewItem, View, WeeklyBriefing, ProfileSheet } from './types';
import { normalizeGrade } from './data/curriculum';

const evidenceSuggestions = ['作品相片', '家長觀察', '課堂紀錄', '功課證據', '活動證書'];
function preferredChildId(parent: ParentProfile): string {
  return parent.children.find((child) => child.id === 'child-matthew')?.id || parent.children[0]?.id || 'child-matthew';
}

function formatPortfolioDate() {
  return new Date().toLocaleDateString('zh-HK', { month: 'short', day: 'numeric' });
}

function isEarlyYearsGrade(grade: string | undefined) {
  return ['K1', 'K2', 'K3'].includes(normalizeGrade(grade));
}

function usesDemoPortfolioContent(child: ChildProfile | null) {
  return !child || child.id === 'child-matthew' || child.id === 'child-chloe';
}

function blankPortfolioSectionsForNewChild(sections: PortfolioSectionDraft[]) {
  return sections.map((section) => ({
    ...section,
    status: 'Drafting' as PortfolioStatus,
    aiDraft: '',
    body: '',
    evidence: [],
    image: undefined,
  }));
}

function createPortfolioSections(child: ChildProfile | null): PortfolioSectionDraft[] {
  const childName = child?.name || 'Matthew';
  const grade = child?.grade || 'P3';
  const focus = child?.focus || '小學數學及學習歷程';
  const earlyYears = isEarlyYearsGrade(grade);
  const useSeedContent = usesDemoPortfolioContent(child);

  if (earlyYears) {
    const sections: PortfolioSectionDraft[] = [
      {
        id: 'cover',
        icon: 'book',
        title: '封面設計',
        shortTitle: '封面',
        copy: '基本資料、數學焦點與代表證據。',
        status: 'Completed',
        body: `${childName} 的幼兒數學檔案已整理年級 ${grade}、數學興趣、代表相片及家長確認的數學遊戲證據。`,
        aiDraft: `${childName} 的幼兒數學檔案可從數數、比較、圖形和規律活動介紹孩子的數學準備度。`,
        evidence: ['學生相片', '數學焦點'],
        evidenceSuggestions: ['學生相片', '數學焦點', '數數活動', '老師短評'],
        requiredEvidence: 2,
        image: images.portfolioChild,
        updatedAt: formatPortfolioDate(),
      },
      {
        id: 'about',
        icon: 'psychology_alt',
        title: '數學興趣',
        shortTitle: '興趣',
        copy: '生活數學、好奇心與解難習慣。',
        status: 'Completed',
        body: `${childName} 喜歡在遊戲和日常生活中找數字、比較多少和提出問題。家長可補充孩子對數學活動的興趣與解題習慣。`,
        aiDraft: `${childName} 正透過生活物件、遊戲和簡單任務建立數學好奇心，能逐步把數量和形狀連繫到日常情境。`,
        evidence: ['家長觀察', '數學興趣'],
        evidenceSuggestions: ['數學遊戲相片', '生活找數字', '親子數數活動', '老師短評'],
        requiredEvidence: 2,
        updatedAt: formatPortfolioDate(),
      },
      {
        id: 'language',
        icon: 'looks_one',
        title: '數感與數數',
        shortTitle: '數感',
        copy: '點算、比較多少與簡單數量記錄。',
        status: 'AI Ready',
        body: `${childName} 正在建立數感，能用實物點算、比較多少，並嘗試用圖像或口頭方式記錄簡單數量。`,
        aiDraft: `${childName} 可透過零食分享、玩具分類和生活找數字，逐步鞏固點算和比較概念。`,
        evidence: ['數數活動', '多少比較'],
        evidenceSuggestions: ['玩具點算相片', '零食分享活動', '生活找數字', '數量記錄'],
        requiredEvidence: 3,
        updatedAt: formatPortfolioDate(),
      },
      {
        id: 'self-care',
        icon: 'category',
        title: '圖形與空間',
        shortTitle: '圖形',
        copy: '形狀辨認、拼砌、位置與大小比較。',
        status: 'Drafting',
        body: `${childName} 正在透過拼砌、分類和觀察活動認識形狀、大小與位置。`,
        aiDraft: `${childName} 可用積木、拼圖和生活物件建立圖形與空間概念，並練習說出形狀特徵。`,
        evidence: ['圖形活動'],
        evidenceSuggestions: ['積木拼砌相片', '圖形分類', '大小比較', '位置遊戲'],
        requiredEvidence: 2,
        updatedAt: formatPortfolioDate(),
      },
      {
        id: 'social-emotional',
        icon: 'grid_view',
        title: '規律與分類',
        shortTitle: '規律',
        copy: '顏色、形狀、大小分類與簡單規律。',
        status: 'Drafting',
        body: `${childName} 正在練習按顏色、形狀或大小分類，並延續簡單規律。`,
        aiDraft: `${childName} 可透過珠串、積木和圖卡活動發現 AB / AAB 等簡單規律。`,
        evidence: ['分類活動'],
        evidenceSuggestions: ['分類遊戲相片', '規律配對', '珠串活動', '積木排序'],
        requiredEvidence: 3,
        updatedAt: formatPortfolioDate(),
      },
      {
        id: 'artworks',
        icon: 'emoji_events',
        title: '生活數學證據',
        shortTitle: '生活數學',
        copy: '親子活動、遊戲紀錄與數學應用片段。',
        status: 'Drafting',
        body: `${childName} 的生活數學證據可展示數數、比較、分類和圖形應用。下一步可補充活動相片、過程及家長短評。`,
        aiDraft: `${childName} 的生活數學活動可展示好奇心、數感、圖形觀察和願意嘗試解難的態度。`,
        evidence: ['數學遊戲'],
        evidenceSuggestions: ['數學活動相片', '積木／拼砌活動', '購物數數', '圖形尋寶'],
        requiredEvidence: 4,
        image: images.artwork,
        updatedAt: formatPortfolioDate(),
      },
    ];
    return useSeedContent ? sections : blankPortfolioSectionsForNewChild(sections);
  }

  const sections: PortfolioSectionDraft[] = [
    {
      id: 'cover',
      icon: 'book',
      title: '封面設計',
      shortTitle: '封面',
      copy: '基本資料、年級、學習焦點與代表相片。',
      status: 'Completed',
      body: `${childName} 的數學學習護照已整理基本資料、年級 ${grade}、學習焦點及代表證據，可作家長、補習老師或學校溝通草稿。`,
      aiDraft: `${childName} 的數學學習護照會介紹目前年級、數學學習目標、代表作品和家長確認的證據。`,
      evidence: ['學生相片', '基本資料'],
      evidenceSuggestions: ['學生相片', '基本資料', '學期目標', '老師／家長備註'],
      requiredEvidence: 2,
      image: images.portfolioChild,
      updatedAt: formatPortfolioDate(),
    },
    {
      id: 'about',
      icon: 'face',
      title: '學習者檔案',
      shortTitle: '檔案',
      copy: '數學學習風格、興趣主題及家庭支援。',
      status: 'Completed',
      body: `${childName} 喜歡主動發問，能把新知識連繫到日常生活。家長觀察到孩子在 ${focus} 方面有清晰興趣，適合以短練習、錯題回顧和可視化例子鞏固。`,
      aiDraft: `${childName} 適合以有結構的練習、家長可見的回饋，以及連繫日常生活的例子來鞏固學習。`,
      evidence: ['家長觀察', '興趣紀錄'],
      evidenceSuggestions: ['家長觀察', '學習習慣紀錄', '數學興趣主題', '補習老師備註'],
      requiredEvidence: 2,
      updatedAt: formatPortfolioDate(),
    },
    {
      id: 'attitude',
      icon: 'menu_book',
      title: '學習態度與策略',
      shortTitle: '學習態度',
      copy: '堅持度、審題習慣、改正策略與學習目標。',
      status: 'AI Ready',
      body: `近期上載紀錄顯示 ${childName} 能保持練習節奏，在分數概念上有進步；應用題審題仍需要每日短練習支援。`,
      aiDraft: `${childName} 在多步驟題目中能保持堅持；近期證據顯示數感有進步，下一步可加強應用題審題。`,
      evidence: ['數學小測', 'AI 學習摘要'],
      evidenceSuggestions: ['錯題分析', '練習紀錄', '老師評語', '自我反思'],
      requiredEvidence: 3,
      updatedAt: formatPortfolioDate(),
    },
    {
      id: 'academic-progress',
      icon: 'monitoring',
      title: '數學進展',
      shortTitle: '進展',
      copy: 'OCR 證據、練習結果、強弱項及進步曲線。',
      status: 'Drafting',
      body: `${childName} 的數學進展應連結已確認的功課、測驗、練習結果與弱項主題，避免只靠主觀描述。下一步可加入最近一次 OCR 檢視和練習紀錄。`,
      aiDraft: `${childName} 的數學進展應連結已上載作品、已確認錯題、練習結果和家長同意的下一步。`,
      evidence: ['OCR 證據'],
      evidenceSuggestions: ['功課 OCR 檢視', '測驗分數', '練習結果', '弱項主題摘要'],
      requiredEvidence: 3,
      updatedAt: formatPortfolioDate(),
    },
    {
      id: 'artworks',
      icon: 'emoji_events',
      title: '數學成果',
      shortTitle: '成果',
      copy: '數學作品、比賽、活動或探究證據。',
      status: 'Drafting',
      body: `${childName} 的數學成果證據可展示課外練習、比賽、專題或生活解難片段。這部分應支援數學學習目標，而不是取代核心數學進展。`,
      aiDraft: `${childName} 的數學成果證據若能連繫學習目標，就可展示更廣泛的數學強項、興趣和解難能力。`,
      evidence: ['數學活動紀錄'],
      evidenceSuggestions: ['數學活動證書', '數學專題作品', '解題展示', '比賽相片'],
      requiredEvidence: 4,
      image: images.artwork,
      updatedAt: formatPortfolioDate(),
    },
  ];
  return useSeedContent ? sections : blankPortfolioSectionsForNewChild(sections);
}

function normalizePortfolioStatus(value: string | undefined): PortfolioStatus {
  if (value === 'Completed' || value === 'AI Ready' || value === 'Drafting') return value;
  return 'Drafting';
}

function mergePortfolioSections(child: ChildProfile | null): PortfolioSectionDraft[] {
  const baseSections = createPortfolioSections(child);
  const storedSections = child?.portfolio_sections || [];

  return baseSections.map((section) => {
    const stored = storedSections.find((item) => item.id === section.id);
    if (!stored) return section;
    return {
      ...section,
      status: normalizePortfolioStatus(stored.status),
      body: stored.body || section.body,
      evidence: Array.isArray(stored.evidence) ? stored.evidence : section.evidence,
      updatedAt: stored.updated_at || section.updatedAt,
    };
  });
}

function serializePortfolioSections(sections: PortfolioSectionDraft[]): PortfolioStoredSection[] {
  return sections.map((section) => ({
    id: section.id,
    status: section.status,
    body: section.body,
    evidence: section.evidence,
    updated_at: section.updatedAt,
  }));
}

function buildPortfolioExportSections(sections: PortfolioSectionDraft[]) {
  return sections.map((section) => ({
    title: section.title,
    status: section.status,
    body: `${section.body.trim()} 證據：${section.evidence.join('、') || '尚待加入。'}`,
  }));
}

function childHasLearningData(progress?: LearningProgress | null) {
  if (!progress) return false;
  return Boolean(
    progress.document_count ||
    progress.practice_count ||
    progress.recent_activity.length ||
    progress.all_topics.length ||
    (progress.subject_scores || []).some((subject) => subject.evidence_count || subject.practice_count),
  );
}

function blankHomeContentForChild(child: ChildProfile | null, earlyYears: boolean) {
  const childName = child?.name || '孩子';
  return {
    summaryIcon: 'calculate',
    summaryTitle: earlyYears ? '等待幼兒數學紀錄' : '等待數學紀錄',
    summaryBody: (
      <>
        {childName} 的數學檔案仍是空白。上載第一份數學功課或數學遊戲證據後，這裡才會開始顯示進度。
      </>
    ),
    actionIcon: 'add_a_photo',
    actionKicker: '下一步',
    actionTitle: earlyYears ? '上載第一份數學遊戲證據' : '上載第一份已批改數學功課',
    actionLabel: '開始上載',
    actionView: 'upload' as View,
    actionDescription: '新學生不會沿用 demo 資料；所有進度只會由家長確認的紀錄建立。',
    portfolioTitle: earlyYears ? '幼兒數學檔案' : '數學學習檔案',
    portfolioText: '尚未加入數學章節內容或證據。',
    progress: 0,
    masteryScore: 0,
    masteryLabel: earlyYears ? '數學準備度' : '數學紀錄',
    trendLabel: '等待第一份紀錄',
    progressTitle: earlyYears ? '幼兒數學' : '數學進度',
    progressText: `${childName} 目前未有已確認的數學上載、練習或檔案證據。`,
    progressItems: earlyYears
      ? [
        { icon: 'looks_one', label: '數數', value: 0, tone: 'primary' },
        { icon: 'category', label: '圖形', value: 0, tone: 'secondary' },
        { icon: 'grid_view', label: '規律', value: 0, tone: 'tertiary' },
      ]
      : [
        { icon: 'add_circle', label: '加減', value: 0, tone: 'primary' },
        { icon: 'percent', label: '分數', value: 0, tone: 'tertiary' },
        { icon: 'psychology_alt', label: '應用題', value: 0, tone: 'secondary' },
      ],
    goals: [
      { label: '補充學生基本資料', actionLabel: '檢視', actionView: 'profile' as View },
      { label: earlyYears ? '上載 1 張數學遊戲相片' : '上載 1 份已批改數學功課', actionLabel: '上載', actionView: 'upload' as View },
      { label: '建立第一個數學證據', actionLabel: '檔案', actionView: 'portfolio' as View },
    ],
    coachIcon: 'calculate',
    coachTitle: earlyYears ? 'AI 數學觀察' : '數學進度',
    coachText: '有家長確認的紀錄後才會產生摘要與建議。',
    tags: earlyYears ? ['數感', '圖形', '規律'] : ['加減', '分數', '應用題'],
    recentUploads: [],
  };
}

function homeContentForChild(child: ChildProfile | null, progress?: LearningProgress | null) {
  const childName = child?.name || '孩子';
  const earlyYears = isEarlyYearsGrade(child?.grade);

  if (child && !usesDemoPortfolioContent(child) && !childHasLearningData(progress)) {
    return blankHomeContentForChild(child, earlyYears);
  }

  if (earlyYears) {
    return {
      summaryIcon: 'calculate',
      summaryTitle: '本週幼兒數學摘要',
      summaryBody: (
        <>
          本週加入 <strong>2</strong> 項數學遊戲證據，{childName} 正在練習數數、比較與圖形辨認。
        </>
      ),
      actionIcon: 'calculate',
      actionKicker: '今日建議',
      actionTitle: '整理一項數學遊戲證據',
      actionLabel: '整理數學',
      actionView: 'portfolio' as View,
      actionDescription: '加入一項家長確認的數數、圖形或規律活動。',
      portfolioTitle: '幼兒數學檔案',
      portfolioText: '整理數感、圖形、規律與生活數學證據。',
      progress: 61,
      masteryScore: 68,
      masteryLabel: '數學準備度',
      trendLabel: '本週新增 3 項數學證據',
      progressTitle: '幼兒數學',
      progressText: `${childName} 正在累積數感、圖形與規律證據。`,
      progressItems: [
        { icon: 'looks_one', label: '數數', value: 72, tone: 'primary' },
        { icon: 'category', label: '圖形', value: 68, tone: 'secondary' },
        { icon: 'grid_view', label: '規律', value: 64, tone: 'tertiary' },
      ],
      goals: [
        { label: '完成 1 項數數活動', completed: true },
        { label: '上載 1 張數學遊戲相片', actionLabel: '上載', actionView: 'upload' as View },
        { label: '檢視幼兒數學檔案草稿', actionLabel: '檢視', actionView: 'portfolio' as View },
      ],
      coachIcon: 'calculate',
      coachTitle: 'AI 數學觀察',
      coachText: '以家長確認的數學遊戲片段整理下一步。',
      tags: ['數感', '圖形', '規律'],
      recentUploads: [
        { image: images.blocks, title: '積木數數活動', time: '今天 10:20' },
        { image: images.artwork, title: '圖形分類遊戲', time: '昨天 17:40' },
        { image: images.drawing, title: '生活找數字', time: '上週五' },
        { image: images.notebook, title: '規律配對練習', time: '上週三' },
        { image: images.homework, title: '多少比較活動', time: '5月28日' },
      ],
    };
  }

  return {
    summaryIcon: 'insights',
    summaryTitle: '本週 AI 學習摘要',
    summaryBody: (
      <>
        本週上載 <strong>2</strong> 份功課，分數概念有進步，應用題審題仍需練習。繼續保持！
      </>
    ),
    actionIcon: 'monitoring',
    actionKicker: '今日建議',
    actionTitle: '查看數學進度',
    actionLabel: '查看進度',
    actionView: 'coach' as View,
    actionDescription: '按數學主題整理 OCR 證據、測驗分數與弱項。',
    portfolioTitle: '學習歷程檔案',
    portfolioText: '收集並整理學生的學習成果與進步軌跡。',
    progress: 65,
    masteryScore: 78,
    masteryLabel: '掌握度',
    trendLabel: '本週提升 5%',
    progressTitle: '學習進度',
    progressText: `${childName} 今個月保持穩定進步，已確認的功課和練習紀錄會用來更新數學掌握度。`,
    progressItems: [
      { icon: 'add_circle', label: '加減', value: 85, tone: 'primary' },
      { icon: 'percent', label: '分數', value: 72, tone: 'tertiary' },
      { icon: 'psychology_alt', label: '應用題', value: 60, tone: 'secondary' },
    ],
    goals: [
      { label: '檢視最新數學掌握度', completed: true },
      { label: '上載 1 份已批改功課', actionLabel: '上載', actionView: 'upload' as View },
      { label: '整理數學錯題紀錄', actionLabel: '檢視', actionView: 'coach' as View },
    ],
    coachIcon: 'monitoring',
    coachTitle: '數學進度',
    coachText: '集中追蹤數學主題、證據與弱項。',
    tags: ['加減', '分數', '應用題'],
    recentUploads: [
      { image: images.homework, title: '數學小測', time: '今天 14:30' },
      { image: images.notebook, title: '分數練習', time: '昨天 18:15' },
      { image: images.drawing, title: '應用題改正', time: '上週五' },
      { image: images.artwork, title: '乘除法工作紙', time: '上週三' },
      { image: images.blocks, title: '圖形與空間練習', time: '5月28日' },
    ],
  };
}

function App() {
  const [activeView, setActiveView] = useState<View>('home');
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>(getInitialUiLanguage);
  const [parent, setParent] = useState<ParentProfile | null>(null);
  const [selectedChildId, setSelectedChildId] = useState('child-matthew');
  const [loginEmail, setLoginEmail] = useState('parent@example.com');
  const [loginPin, setLoginPin] = useState('246810');
  const [signupDisplayName, setSignupDisplayName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadPreviewItems, setUploadPreviewItems] = useState<UploadPreviewItem[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [ocrState, setOcrState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportError, setExportError] = useState<string | null>(null);
  const [portfolioDrafts, setPortfolioDrafts] = useState<Record<string, PortfolioSectionDraft[]>>({});
  const [practiceState, setPracticeState] = useState<PracticeState>('idle');
  const [practiceQuiz, setPracticeQuiz] = useState<GeneratedQuiz | null>(null);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [lastPracticeOptions, setLastPracticeOptions] = useState<PracticeStartOptions>({});
  const [reviewConfirmState, setReviewConfirmState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [ocrDeleteId, setOcrDeleteId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [profileSheet, setProfileSheet] = useState<ProfileSheet>(null);
  const { showToast, toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const portfolioSaveTimers = useRef<Record<string, number>>({});
  const copy = uiCopy[uiLanguage];

  useEffect(() => {
    let alive = true;

    async function loadSession() {
      try {
        const data = await endpoints.getCurrentSession();
        if (!alive) return;
        setParent(data.parent);
        setSelectedChildId(preferredChildId(data.parent));
        setAuthState('authenticated');
      } catch {
        if (!alive) return;
        setAuthState('anonymous');
      }
    }

    void loadSession();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      uploadPreviewItems.forEach((item) => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
    };
  }, [uploadPreviewItems]);

  useEffect(() => {
    window.localStorage.setItem(uiLanguageStorageKey, uiLanguage);
    document.documentElement.lang = uiLanguage === 'en' ? 'en' : 'zh-Hant';
  }, [uiLanguage]);

  useEffect(() => {
    const timers = portfolioSaveTimers.current;
    return () => {
      Object.values(timers).forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  function updateUiLanguage(nextLanguage: UiLanguage) {
    setUiLanguage(nextLanguage);
    showToast(nextLanguage === 'zh-Hant' ? '已切換至繁體中文' : 'Language switched to English');
  }

  const uploadPreview = useMemo(
    () =>
      uploadPreviewItems[activePreviewIndex]?.url ||
      (uploadPreviewItems.length ? '' : images.uploadPreview),
    [activePreviewIndex, uploadPreviewItems],
  );
  const canViewUploadPreview = !uploadPreviewItems.length || Boolean(uploadPreviewItems[activePreviewIndex]?.url);
  const currentChild = useMemo(
    () => parent?.children.find((child) => child.id === selectedChildId) || parent?.children[0] || null,
    [parent, selectedChildId],
  );
  const {
    learningProgress,
    mistakeNotebook,
    ocrInbox,
    ocrInboxState,
    progressState,
    refreshLearningProgress,
    refreshP0Workspace,
    removeOcrInboxDocument,
    revokeShareReport,
    shareLearningReport,
    shareReport,
    shareReports,
    shareState,
    weeklyBriefing,
  } = useLearningWorkspace({ currentChild, showToast });
  const portfolioChildKey = currentChild?.id || 'child-matthew';
  const currentPortfolioSections = useMemo(
    () => portfolioDrafts[portfolioChildKey] || mergePortfolioSections(currentChild),
    [currentChild, portfolioChildKey, portfolioDrafts],
  );
  const homeContent = useMemo(
    () => homeContentForChild(currentChild, filterLearningProgressForMvp(learningProgress)),
    [currentChild, learningProgress],
  );

  useEffect(() => {
    if (authState !== 'authenticated' || !currentChild) return undefined;
    void refreshLearningProgress(currentChild.id);
    void refreshP0Workspace(currentChild.id);
    return undefined;
  }, [authState, currentChild]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);
    try {
      const data = await endpoints.login({ email: loginEmail, pin: loginPin });
      setParent(data.parent);
      setSelectedChildId(preferredChildId(data.parent));
      setAuthState('authenticated');
      setAuthMode('login');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : '登入失敗');
    }
  }

  async function signup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);
    try {
      const data = await endpoints.signup({
        display_name: signupDisplayName || loginEmail.split('@')[0] || 'EduPass 家長',
        email: loginEmail,
        pin: loginPin,
      });
      setParent(data.parent);
      setSelectedChildId(preferredChildId(data.parent));
      setAuthState('authenticated');
      setActiveView('profile');
      showToast('帳戶已建立');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : '建立帳戶失敗');
    }
  }

  async function logout() {
    await endpoints.logout().catch(() => undefined);
    setParent(null);
    setAuthState('anonymous');
    setActiveView('home');
  }

  function switchChild() {
    if (!parent?.children.length) return;
    const currentIndex = parent.children.findIndex((child) => child.id === selectedChildId);
    const nextChild = parent.children[(currentIndex + 1) % parent.children.length] || parent.children[0];
    setSelectedChildId(nextChild.id);
    showToast(`已切換至 ${nextChild.name}`);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    uploadPreviewItems.forEach((item) => {
      if (item.url) URL.revokeObjectURL(item.url);
    });
    setSelectedFiles(files);
    setUploadPreviewItems(files.map((file) => ({
      name: file.name,
      type: file.type,
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    })));
    setActivePreviewIndex(0);
    setOcrResult(null);
    setOcrState('idle');
  }

  async function analyzeUpload() {
    if (!selectedFiles.length) {
      inputRef.current?.click();
      return;
    }

    setOcrState('running');
    setOcrResult(null);
    const uploadChildId = currentChild?.id || 'child-matthew';

    const form = new FormData();
    selectedFiles.forEach((file) => form.append('files', file));
    form.append('child_id', uploadChildId);
    form.append('child_profile_id', uploadChildId);
    form.append('grade', currentChild?.grade || 'P3');

    try {
      const data = await endpoints.uploadOcrReview(form);
      setOcrResult(data);
      setOcrState('done');
      await refreshLearningProgress(uploadChildId);
      await refreshP0Workspace(uploadChildId);
      showToast('已匯入學習進度');
    } catch (error) {
      setOcrResult({ detail: error instanceof Error ? error.message : 'OCR 分析失敗' });
      setOcrState('error');
    }
  }

  async function startPractice(options: PracticeStartOptions = {}) {
    if (!parent?.privacy_settings.ai_processing_consent) {
      setActiveView('profile');
      setProfileSheet('privacy');
      setPracticeState('idle');
      setPracticeError('需要家長同意後才能使用 AI 練習功能');
      showToast('請先在資料與私隱開啟 AI 分析同意');
      return;
    }

    setActiveView('coach');
    setPracticeState('generating');
    setPracticeQuiz(null);
    setPracticeError(null);

    const practicePlan = (options.practicePlan || []).filter((item) => item.question_count > 0);
    const plannedQuestionCount = practicePlan.reduce((total, item) => total + item.question_count, 0);
    const questionCount = Math.max(1, Math.min(options.questionCount || plannedQuestionCount || 5, 20));
    const subject = options.subject || 'Mathematics';
    const weakTopic = options.weakTopic || practicePlan.map((item) => item.title_zh || item.title).join(' / ') || 'Fractions word problems';
    const requestOptions = { practicePlan, questionCount, subject, weakTopic };
    setLastPracticeOptions(requestOptions);

    try {
      const data = await endpoints.generateQuiz({
        child_profile_id: currentChild?.id || 'child-matthew',
        grade: currentChild?.grade || 'P3',
        practice_plan: practicePlan,
        question_count: questionCount,
        subject,
        weak_topic: weakTopic,
      });
      setPracticeQuiz(data.quiz);
      setPracticeState('ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : '練習生成失敗';
      setPracticeError(message);
      if (message.includes('Parent consent required')) {
        setActiveView('profile');
        setProfileSheet('privacy');
        showToast('請先在資料與私隱開啟 AI 分析同意');
      }
      setPracticeState('error');
    }
  }

  function restartPractice() {
    void startPractice(lastPracticeOptions);
  }

  async function completePractice(answers: PracticeSubmission) {
    if (!practiceQuiz || !currentChild) {
      setPracticeState('complete');
      return;
    }
    try {
      await endpoints.savePracticeAttempt({
        child_id: currentChild.id,
        grade: currentChild.grade,
        subject: practiceQuiz.items[0]?.subject || lastPracticeOptions.subject || 'Mathematics',
        answers: practiceQuiz.items.map((item) => ({
          expected_answer: item.answer,
          is_correct: answers[item.id]?.isCorrect ?? false,
          question_id: item.id,
          question_text: item.question_text,
          subject: item.subject || lastPracticeOptions.subject || 'Mathematics',
          submitted_answer: answers[item.id]?.answer || '',
          target_mistake: item.target_mistake || 'concept',
          topic: item.topic,
        })),
      });
      await refreshLearningProgress(currentChild.id);
      await refreshP0Workspace(currentChild.id);
      showToast('練習紀錄已加入進度報告與錯題簿');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '練習已完成，但儲存失敗');
    } finally {
      setPracticeState('complete');
    }
  }

  async function confirmOcrReview(documentId: string, questions: OcrReviewQuestionDraft[], parentNotes?: string) {
    setReviewConfirmState('running');
    try {
      const data = await endpoints.confirmOcrReview(documentId, normalizeReviewQuestionDrafts(questions), parentNotes);
      setReviewConfirmState('done');
      setOcrResult((current) => current?.document?.id === documentId
        ? { ...current, document: { ...current.document, parent_confirmed_at: data.parent_confirmed_at } }
        : current);
      await refreshLearningProgress(currentChild?.id);
      await refreshP0Workspace(currentChild?.id);
      showToast('OCR 檢視已由家長確認');
    } catch (error) {
      setReviewConfirmState('error');
      showToast(error instanceof Error ? error.message : 'OCR 確認失敗');
      throw error;
    }
  }

  async function deleteOcrReviewDocument(documentId: string, filename?: string) {
    if (!documentId || ocrDeleteId) return;
    const label = filename || '這份 OCR 記錄';
    const confirmed = window.confirm(`永久刪除「${label}」？\n\nOCR 結果、原始相片 / PDF 及相關進度證據會一併移除。`);
    if (!confirmed) return;

    setOcrDeleteId(documentId);
    try {
      await endpoints.deleteOcrReview(documentId);

      const openDocumentId = ocrResult?.document?.id || ocrResult?.document_id;
      removeOcrInboxDocument(documentId);
      if (openDocumentId === documentId) {
        uploadPreviewItems.forEach((item) => {
          if (item.url) URL.revokeObjectURL(item.url);
        });
        setOcrResult(null);
        setOcrState('idle');
        setReviewConfirmState('idle');
        setSelectedFiles([]);
        setUploadPreviewItems([]);
        setActivePreviewIndex(0);
        setActiveView('coach');
      }
      await refreshLearningProgress(currentChild?.id);
      await refreshP0Workspace(currentChild?.id);
      showToast('OCR 記錄已刪除');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'OCR 記錄刪除失敗');
    } finally {
      setOcrDeleteId(null);
    }
  }

  function openOcrReviewDocument(document: OcrInboxDocument) {
    uploadPreviewItems.forEach((item) => {
      if (item.url) URL.revokeObjectURL(item.url);
    });
    setSelectedFiles([]);
    setUploadPreviewItems([]);
    setActivePreviewIndex(0);
    setOcrResult({
      document: {
        id: document.id,
        file_previews: document.file_previews || [],
        filename: document.filename,
        parent_confirmed_at: document.parent_confirmed_at,
      },
      document_id: document.id,
      file_previews: document.file_previews || [],
      ok: true,
      page_count: document.page_count,
      review: {
        ...document.review,
        page_count: Number(document.review.page_count || document.page_count || 1),
      },
      review_mode: document.review_mode,
    });
    setOcrState('done');
    setReviewConfirmState(document.parent_confirmed_at ? 'done' : 'idle');
    setActiveView('upload');
    showToast(document.parent_confirmed_at ? '已載入已確認 OCR 結果' : '已載入 OCR 待確認結果');
  }

  async function updateSelectedChild(updates: Partial<ChildProfile>) {
    if (!currentChild) return;
    const child = await endpoints.updateChild(currentChild.id, updates);
    setParent((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        children: previous.children.map((item) => (item.id === child.id ? child : item)),
      };
    });
    showToast('資料已儲存');
  }

  async function updateParentProfile(updates: ParentProfileUpdates) {
    const updatedParent = await endpoints.updateParent(updates);
    setParent(updatedParent);
    if (updatedParent.children?.length) {
      setSelectedChildId((current) => updatedParent.children.some((child: ChildProfile) => child.id === current)
        ? current
        : preferredChildId(updatedParent));
    }
    showToast('資料已儲存');
  }

  async function updatePrivacySettings(updates: Partial<PrivacySettings>) {
    const summary = await endpoints.updatePrivacyConsent(updates);
    setParent(summary.parent);
    showToast('私隱設定已儲存');
    return summary;
  }

  async function deleteChildData(childId: string, confirmationName: string) {
    const result = await endpoints.deleteChild(childId, confirmationName);
    setParent(result.parent);
    setSelectedChildId(preferredChildId(result.parent));
    showToast('學生資料已刪除');
    return result;
  }

  async function addChild(payload: Omit<ChildProfile, 'id'>) {
    const child = await endpoints.createChild(payload);
    setParent((previous) => {
      if (!previous) return previous;
      return { ...previous, onboarding_complete: true, children: [...previous.children, child] };
    });
    setSelectedChildId(child.id);
    showToast(`已新增 ${child.name}`);
  }

  async function completeOnboarding(parentUpdates: ParentProfileUpdates, childPayload: Omit<ChildProfile, 'id'>) {
    const child = await endpoints.createChild(childPayload);
    const updatedParent = await endpoints.updateParent({ ...parentUpdates, onboarding_complete: true });
    setParent(updatedParent);
    setSelectedChildId(child.id);
    setActiveView('home');
    showToast('學習檔案已建立');
  }

  async function persistPortfolioSections(childId: string, sections: PortfolioSectionDraft[]) {
    try {
      const child = await endpoints.updateChild(childId, { portfolio_sections: serializePortfolioSections(sections) });
      setParent((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          children: previous.children.map((item) => (item.id === child.id ? child : item)),
        };
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : '學習護照儲存失敗');
    }
  }

  function schedulePortfolioSave(childId: string, sections: PortfolioSectionDraft[]) {
    const existingTimer = portfolioSaveTimers.current[childId];
    if (existingTimer) window.clearTimeout(existingTimer);
    portfolioSaveTimers.current[childId] = window.setTimeout(() => {
      delete portfolioSaveTimers.current[childId];
      void persistPortfolioSections(childId, sections);
    }, 550);
  }

  function updatePortfolioSections(transform: (sections: PortfolioSectionDraft[]) => PortfolioSectionDraft[]) {
    if (!currentChild) return;
    const childKey = currentChild.id;
    const sections = portfolioDrafts[childKey] || mergePortfolioSections(currentChild);
    const nextSections = transform(sections);
    setPortfolioDrafts((previous) => {
      return {
        ...previous,
        [childKey]: nextSections,
      };
    });
    schedulePortfolioSave(childKey, nextSections);
  }

  function updatePortfolioSection(sectionId: string, updates: Partial<PortfolioSectionDraft>) {
    updatePortfolioSections((sections) => sections.map((section) => (
      section.id === sectionId
        ? { ...section, ...updates, updatedAt: formatPortfolioDate() }
        : section
    )));
  }

  function addPortfolioEvidence(sectionId: string) {
    updatePortfolioSections((sections) => sections.map((section) => {
      if (section.id !== sectionId) return section;
      const suggestions = section.evidenceSuggestions || evidenceSuggestions;
      const nextEvidence = suggestions.find((item) => !section.evidence.includes(item))
        || `家長補充 ${section.evidence.length + 1}`;
      return {
        ...section,
        evidence: [...section.evidence, nextEvidence],
        updatedAt: formatPortfolioDate(),
      };
    }));
  }

  function removePortfolioEvidence(sectionId: string, evidence: string) {
    updatePortfolioSections((sections) => sections.map((section) => (
      section.id === sectionId
        ? {
            ...section,
            evidence: section.evidence.filter((item) => item !== evidence),
            updatedAt: formatPortfolioDate(),
          }
        : section
    )));
  }

  async function exportPortfolio() {
    setExportState('running');
    setExportError(null);
    try {
      const record = await endpoints.exportPortfolio({
        child_id: currentChild?.id || 'child-matthew',
        sections: buildPortfolioExportSections(currentPortfolioSections),
      });
      const blob = await endpoints.downloadPortfolioExport(record.download_url);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = record.filename || 'learning-passport.pdf';
      anchor.click();
      URL.revokeObjectURL(url);
      setExportState('done');
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'PDF export failed');
      setExportState('error');
    }
  }

  const appClass = activeView === 'upload' ? 'stitch-app upload-mode' : 'stitch-app';

  if (authState === 'loading') {
    return <LoadingScreen copy={copy} />;
  }

  if (authState === 'anonymous') {
    return (
      <LoginView
        authError={authError}
        authMode={authMode}
        email={loginEmail}
        pin={loginPin}
        displayName={signupDisplayName}
        uiLanguage={uiLanguage}
        setEmail={setLoginEmail}
        setAuthMode={(mode) => {
          setAuthMode(mode);
          setAuthError(null);
        }}
        setPin={setLoginPin}
        setDisplayName={setSignupDisplayName}
        onLogin={login}
        onSignup={signup}
      />
    );
  }

  if (parent && (!parent.onboarding_complete || parent.children.length === 0)) {
    return (
      <OnboardingView
        parent={parent}
        onComplete={completeOnboarding}
        onLogout={logout}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className={appClass}>
      {activeView === 'upload' ? (
        <UploadHeader copy={copy} onBack={() => setActiveView('home')} />
      ) : activeView === 'profile' ? (
        <SettingsHeader copy={copy} onBack={() => setActiveView('home')} onHelp={() => setProfileSheet('support')} />
      ) : (
        <MainHeader activeView={activeView} child={currentChild} copy={copy} onSwitchChild={switchChild} />
      )}

      {activeView === 'home' && (
        <HomeView
          content={homeContent}
          setActiveView={setActiveView}
        />
      )}
      {activeView === 'portfolio' && (
        <PortfolioView
          child={currentChild}
          exportError={exportError}
          exportState={exportState}
          sections={currentPortfolioSections}
          onAddEvidence={addPortfolioEvidence}
          onEditPassportInfo={() => setProfileSheet('edit-child')}
          onExport={exportPortfolio}
          onOpenUpload={() => setActiveView('upload')}
          onPreviewEvidence={(image) => setLightboxSrc(image)}
          onRemoveEvidence={removePortfolioEvidence}
          onUpdateSection={updatePortfolioSection}
        />
      )}
      {activeView === 'upload' && (
        <UploadView
          inputRef={inputRef}
          ocrResult={ocrResult}
          ocrState={ocrState}
          activePreviewIndex={activePreviewIndex}
          previewUrl={uploadPreview}
          previewItems={uploadPreviewItems}
          selectedFiles={selectedFiles}
          analyzeUpload={analyzeUpload}
          handleFileChange={handleFileChange}
          confidenceLabel={confidenceLabel}
          displayTopicName={displayTopicName}
          questionLikelyCorrect={questionLikelyCorrect}
          ocrConfirmState={reviewConfirmState}
          ocrDeleteId={ocrDeleteId}
          onConfirmReview={confirmOcrReview}
          onDeleteReview={deleteOcrReviewDocument}
          onSelectPreviewPage={setActivePreviewIndex}
          canViewPreview={canViewUploadPreview}
          onViewPreview={(image) => setLightboxSrc(image)}
          onViewProgress={() => setActiveView('home')}
        />
      )}
      {activeView === 'coach' && (
        <CoachView
          child={currentChild}
          learningProgress={learningProgress}
          mistakeNotebook={mistakeNotebook}
          ocrInbox={ocrInbox}
          ocrInboxState={ocrInboxState}
          progressState={progressState}
          shareReports={shareReports}
          shareReport={shareReport}
          shareState={shareState}
          weeklyBriefing={weeklyBriefing}
          ocrDeleteId={ocrDeleteId}
          onDeleteOcrReview={deleteOcrReviewDocument}
          onOpenOcrReview={openOcrReviewDocument}
          onRevokeShareReport={revokeShareReport}
          onShareReport={shareLearningReport}
        />
      )}
      {activeView === 'profile' && parent ? (
        <ProfileView
          children={parent.children}
          currentChild={currentChild}
          copy={copy}
          onEditParent={() => setProfileSheet('edit-parent')}
          parent={parent}
          selectedChildId={selectedChildId}
          setSelectedChildId={setSelectedChildId}
          onAddChild={() => setProfileSheet('add-child')}
          onEditChild={() => setProfileSheet('edit-child')}
          onLogout={logout}
          onOpenSetting={setProfileSheet}
          uiLanguage={uiLanguage}
        />
      ) : null}

      <BottomNav activeView={activeView} setActiveView={setActiveView} uiLanguage={uiLanguage} />

      {lightboxSrc ? <PreviewLightbox image={lightboxSrc} onClose={() => setLightboxSrc(null)} /> : null}
      {parent ? (
        <ProfileSheetModal
          currentChild={currentChild}
          kind={profileSheet}
          copy={copy}
          parent={parent}
          uiLanguage={uiLanguage}
          onAddChild={addChild}
          onClose={() => setProfileSheet(null)}
          onDeleteChild={deleteChildData}
          onPrivacySave={updatePrivacySettings}
          onUiLanguageChange={updateUiLanguage}
          onUpdateParent={updateParentProfile}
          onUpdateChild={updateSelectedChild}
        />
      ) : null}
        {toast ? <div className="app-toast">{toast}</div> : null}
      </div>
    </ErrorBoundary>
  );
}


function normalizeQuizOptions(item: QuizItem) {
  const options = (item.options || [])
    .map(displayMathText)
    .filter((option, index, values) => option.trim() && values.indexOf(option) === index);
  const answer = displayMathText(item.answer);
  if (options.some((option) => estimateAnswerCorrect(option, answer))) {
    return options.slice(0, 4);
  }
  return [answer, ...options].filter(Boolean).slice(0, 4);
}

function displayMathText(value: string) {
  return value
    .replace(/\\(?:dfrac|tfrac|frac)\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1/$2')
    .replace(/\\triangle/g, '△')
    .replace(/\\square/g, '□')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\cdot/g, '×')
    .replace(/\\pm/g, '±')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\left|\\right/g, '')
    .replace(/\$/g, '')
    .replace(/\\\(|\\\)|\\\[|\\\]/g, '')
    .replace(/\\([A-Za-z]+)/g, '$1')
    .replace(/\\/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function confidenceLabel(value: number) {
  if (value >= 0.9) return '高信心';
  if (value >= 0.72) return '中信心';
  return '低信心';
}

function questionLikelyCorrect(question: {
  detected_answer?: string | null;
  is_correct?: boolean | null;
  mistake_tags?: string[];
  max_score?: number | null;
  question_text: string;
  score?: number | null;
}) {
  if (question.is_correct !== null && question.is_correct !== undefined) return question.is_correct;
  if (question.score !== null && question.score !== undefined && question.max_score) {
    return question.score >= question.max_score;
  }
  const expected = inferExpectedArithmeticAnswer(question.question_text);
  if (expected !== null && answerTextContainsValue(question.detected_answer || '', expected)) return true;
  if (question.mistake_tags?.length) return false;
  return true;
}

function inferExpectedArithmeticAnswer(questionText: string) {
  const numbers = Array.from(questionText.matchAll(/\d+/g)).map((match) => Number(match[0]));
  if (numbers.length < 2) return null;
  const operands = numbers.slice(-2);
  if (/比|貴|便宜|多多少|少多少|相差|差多少/.test(questionText)) return Math.abs(operands[1] - operands[0]);
  if (/共|一共|合共|總共|共有|共要|共售|共需|加起/.test(questionText)) return operands[0] + operands[1];
  return null;
}

function answerTextContainsValue(answerText: string, expected: number) {
  const equation = answerText.match(/(\d+)\s*([+\-＋－])\s*(\d+)\s*=?\s*(\d+)/);
  if (equation) {
    const left = Number(equation[1]);
    const op = equation[2];
    const right = Number(equation[3]);
    const result = Number(equation[4]);
    const calculated = op === '+' || op === '＋' ? left + right : left - right;
    return calculated === expected && result === expected;
  }
  return Array.from(answerText.matchAll(/\d+/g)).some((match) => Number(match[0]) === expected);
}

function normalizeReviewQuestionDrafts(questions: OcrReviewQuestionDraft[]) {
  return questions
    .filter((question) => String(question.question_text || question.topic || '').trim())
    .map((question, index) => {
      const isCorrect = questionLikelyCorrect({
        detected_answer: question.detected_answer,
        is_correct: question.is_correct,
        mistake_tags: question.mistake_tags,
        max_score: question.max_score,
        question_text: question.question_text || question.topic || '',
        score: question.score,
      });
      return {
        confidence: Math.max(0, Math.min(1, question.confidence || 0.5)),
        curriculum_node_id: null,
        detected_answer: question.detected_answer || null,
        id: question.id || `q${index + 1}`,
        is_correct: isCorrect,
        max_score: question.max_score ?? (isCorrect ? 1 : null),
        mistake_tags: isCorrect ? [] : (Array.isArray(question.mistake_tags) && question.mistake_tags.length ? question.mistake_tags : ['concept']),
        page_number: question.page_number || index + 1,
        question_text: String(question.question_text || question.topic || `OCR 題目 ${index + 1}`).trim(),
        score: question.score ?? (isCorrect ? 1 : null),
        topic: question.topic || null,
        topic_ids: question.topic_ids || [],
      };
    });
}

function estimateAnswerCorrect(answer: string, expected: string) {
  const normalize = (value: string) => displayMathText(value).trim().toLowerCase().replace(/\s+/g, ' ');
  return Boolean(normalize(answer)) && normalize(answer) === normalize(expected);
}

function PracticeAnalyzingView({ child }: { child: ChildProfile | null }) {
  return (
    <main className="content-stack practice-screen">
      <section className="analyzing-card">
        <div className="analyzing-orbit">
          <span />
          <Icon name="auto_awesome" filled />
        </div>
        <h2>AI 分析中</h2>
        <p>正在根據 {child?.name || 'Matthew'} 的年級、弱項與 HKEDB 課程地圖生成每日 5 分鐘特訓。</p>
        <div className="analyzing-steps">
          <span>讀取學習紀錄</span>
          <span>比對課程節點</span>
          <span>生成原創題目</span>
        </div>
      </section>
    </main>
  );
}

function DailyPracticeView({
  onComplete,
  onRestart,
  quiz,
}: {
  onComplete: (answers: PracticeSubmission) => void;
  onRestart: () => void;
  quiz: GeneratedQuiz;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const submittedCount = quiz.items.filter((item) => submitted[item.id]).length;
  const allSubmitted = quiz.items.length > 0 && submittedCount === quiz.items.length;
  const correctCount = quiz.items.filter((item) => submitted[item.id] && estimateAnswerCorrect(answers[item.id] || '', item.answer)).length;

  function submitItem(item: QuizItem) {
    setSubmitted((current) => ({ ...current, [item.id]: true }));
  }

  function completeWithMarks() {
    onComplete(Object.fromEntries(quiz.items.map((item) => [
      item.id,
      {
        answer: answers[item.id] || '',
        isCorrect: estimateAnswerCorrect(answers[item.id] || '', item.answer),
      },
    ])));
  }

  return (
    <main className="content-stack practice-screen">
      <section className="page-intro tight">
        <h2>互動練習</h2>
        <p>{quiz.parent_visible_rationale}</p>
        <div className="practice-progress-strip">
        <Metric value={`${submittedCount}/${quiz.items.length}`} label="已提交" />
        <Metric value={`${correctCount}/${quiz.items.length}`} label="答對" />
        <Metric value={`${Math.ceil(quiz.items.reduce((total, item) => total + item.estimated_time_seconds, 0) / 60)}`} label="分鐘" />
        </div>
      </section>

      <section className="practice-list">
        {quiz.items.map((item, index) => (
          <article className={submitted[item.id] ? 'practice-card answered' : 'practice-card'} key={item.id}>
            <div className="practice-meta">
              <span>Q{index + 1}</span>
              <span>{displayMathText(item.topic)}</span>
              <b>{Math.round(item.estimated_time_seconds / 60)} 分鐘</b>
            </div>
            <h3>{displayMathText(item.question_text)}</h3>

            <div className="choice-list" role="radiogroup" aria-label={`第 ${index + 1} 題選項`}>
              {normalizeQuizOptions(item).map((option, optionIndex) => {
                const selected = answers[item.id] === option;
                const correct = estimateAnswerCorrect(option, item.answer);
                return (
                  <button
                    className={[
                      'choice-option',
                      selected ? 'selected' : '',
                      submitted[item.id] && correct ? 'correct' : '',
                      submitted[item.id] && selected && !correct ? 'incorrect' : '',
                    ].filter(Boolean).join(' ')}
                    disabled={submitted[item.id]}
                    key={`${item.id}-${option}`}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setAnswers((current) => ({ ...current, [item.id]: option }))}
                  >
                    <b>{String.fromCharCode(65 + optionIndex)}</b>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>

            {submitted[item.id] ? (
              <div className="answer-panel">
                <span className="student-answer-review">
                  <Icon name={estimateAnswerCorrect(answers[item.id] || '', item.answer) ? 'task_alt' : 'replay'} />
                  你的答案：{displayMathText(answers[item.id] || '')} · {estimateAnswerCorrect(answers[item.id] || '', item.answer) ? '答對' : '需要再練'}
                </span>
                <strong>參考答案：{displayMathText(item.answer)}</strong>
                <p>{displayMathText(item.explanation)}</p>
                <small>{displayMathText(item.marking_scheme)}</small>
              </div>
            ) : null}
            <button
              className="secondary-action"
              type="button"
              disabled={!answers[item.id]?.trim()}
              onClick={() => submitItem(item)}
            >
              <Icon name={submitted[item.id] ? 'task_alt' : 'check_circle'} />
              {submitted[item.id] ? '已提交' : '提交本題'}
            </button>
          </article>
        ))}
      </section>

      <div className="practice-actions">
        <button className="secondary-action" type="button" onClick={onRestart}>
          <Icon name="refresh" /> 重新生成
        </button>
        <button className="primary-action" type="button" onClick={completeWithMarks} disabled={!allSubmitted}>
          <Icon name="check_circle" filled /> 完成練習
        </button>
      </div>
    </main>
  );
}

function PracticeCompleteView({
  onBack,
  onRestart,
  quiz,
}: {
  onBack: () => void;
  onRestart: () => void;
  quiz: GeneratedQuiz | null;
}) {
  const itemCount = quiz?.items.length || 0;
  const grade = quiz?.items[0]?.grade || 'HK';
  return (
    <main className="content-stack practice-screen">
      <section className="completion-card">
        <div className="completion-badge">
          <Icon name="trophy" filled />
        </div>
        <h2>練習完成</h2>
        <p>已完成今日 5 分鐘特訓。系統會把這次練習加入學習軌跡，供下次推薦使用。</p>
        <div className="completion-stats">
          <Metric value={`${itemCount}`} label="題目" />
          <Metric value="+8%" label="專注" />
          <Metric value={grade} label="級別" />
        </div>
        <div className="practice-actions">
          <button className="secondary-action" type="button" onClick={onBack}>
            <Icon name="dashboard" /> 回到分析
          </button>
          <button className="primary-action" type="button" onClick={onRestart}>
            <Icon name="refresh" /> 再練一次
          </button>
        </div>
      </section>
    </main>
  );
}

export default App;
