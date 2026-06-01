import { type ChangeEvent, type FormEvent, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import {
  curriculumStages,
  getKlasForGrade,
  getSourceById,
  getStageForGrade,
  getSubjectsForGrade,
  normalizeGrade,
  type CurriculumSubject,
  type KlaId,
} from './data/curriculum';
import { getCourseTopicsForGradeAndSubject, type CourseTopic } from './data/courseContent';

type View = 'home' | 'portfolio' | 'upload' | 'coach' | 'profile';
type AuthMode = 'login' | 'signup';

type BackendStatus = {
  state: 'checking' | 'online' | 'offline';
  detail: string;
};

type OcrResult = {
  ok?: boolean;
  ocr_provider?: string;
  ocr_text_preview?: string;
  page_count?: number;
  uploaded_page_count?: number;
  filenames?: string[];
  review_mode?: string;
  review_model?: string;
  review_fallback_used?: boolean;
  review?: {
    page_count?: number;
    topics?: Array<{
      id?: string;
      subject?: string;
      topic: string;
      strand?: string | null;
      confidence?: number;
      page_numbers?: number[];
    }>;
    extracted_questions?: Array<{
      question_text: string;
      confidence: number;
      page_number?: number | null;
      topic?: string | null;
      topic_ids?: string[];
    }>;
  };
  detail?: string;
};

type ChildProfile = {
  id: string;
  name: string;
  grade: string;
  passport: string;
  focus: string;
  language: string;
  school_type: string;
  avatar_url?: string | null;
};

type PrivacySettings = {
  ai_processing_consent: boolean;
  upload_storage_consent: boolean;
  portfolio_export_consent: boolean;
  product_updates_consent: boolean;
  retention_days: number;
  consent_version: string;
  consent_updated_at?: string | null;
};

type ChildDataSummary = {
  child_id: string;
  child_name: string;
  grade: string;
  document_count: number;
  portfolio_export_count: number;
};

type AuditEvent = {
  id: string;
  event_type: string;
  child_id?: string | null;
  created_at: string;
  details: Record<string, unknown>;
};

type PrivacyCenterResponse = {
  parent: ParentProfile;
  privacy_settings: PrivacySettings;
  children: ChildDataSummary[];
  audit_events: AuditEvent[];
};

type ParentProfile = {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string | null;
  onboarding_complete: boolean;
  privacy_settings: PrivacySettings;
  children: ChildProfile[];
};

type AuthState = 'loading' | 'anonymous' | 'authenticated';

type ExportState = 'idle' | 'running' | 'done' | 'error';

type PortfolioStatus = 'Completed' | 'AI Ready' | 'Drafting';
type PortfolioTone = 'complete' | 'ready' | 'draft';

type PortfolioSectionDraft = {
  id: string;
  icon: string;
  title: string;
  shortTitle: string;
  copy: string;
  status: PortfolioStatus;
  body: string;
  aiDraft: string;
  evidence: string[];
  requiredEvidence: number;
  image?: string;
  updatedAt: string;
};

type QuizItem = {
  id: string;
  grade: string;
  topic: string;
  question_text: string;
  answer: string;
  explanation: string;
  marking_scheme: string;
  target_mistake: string;
  estimated_time_seconds: number;
};

type GeneratedQuiz = {
  items: QuizItem[];
  parent_visible_rationale: string;
};

type PracticePlanItem = {
  topic_id: string;
  title: string;
  title_zh: string;
  strand: string;
  question_count: number;
};

type PracticeStartOptions = {
  practicePlan?: PracticePlanItem[];
  questionCount?: number;
  subject?: string;
  weakTopic?: string;
};

type PracticeState = 'idle' | 'generating' | 'ready' | 'complete' | 'error';

type ProfileSheet =
  | 'edit-parent'
  | 'edit-child'
  | 'add-child'
  | 'privacy'
  | 'language'
  | 'notifications'
  | 'support'
  | 'learning-plus'
  | null;

type ParentProfileUpdates = {
  display_name?: string;
  avatar_url?: string | null;
  onboarding_complete?: boolean;
};

const images = {
  child:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAqFnPUFOorVFJ_n7UaT4cAorgiVSgcl0l0TRTk6RCmpR-rn-Mj_j9hhxUWK1XxcMNjU7evO14snOZ6uGcgSdl1Xv9njxra1ygTZhRMdEbUE6zaU2eNa2bCZsNrAuJSPFp6iFcVh8A_A_2fxFZxykWFkHZjEwdFzxfP8K5IyQ3ZmOKtjWWcdpgoS70DPXCqOtOj8ANljezsqRuJ9Rvau-Nmr_ESjpvLzPh8I8U1ZyZJrhorOlDK44BadfszxbHTe01uLCD_fprHnCNM',
  portfolioChild:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDl33eVYzZH7JImksy7zJIy-ceVprbhzbo6SQYLLeJsOAzbUJDd9aqqcAFWPkizdt7u_tuFJ3IXNlIXAuOmKQkkpKYPyN7U3X-YgQ9zPKYYSfDTB9yvY67cd0tvz3c2z34N8VXbjKWGYLNNzJWl7E0krfjPCigarctm-xaXaaCf-6Nzm4QMXmAs80EqgzJtY9nQXBIu3g0D1JR1chV7xC_NFSRsNEHXrsbPjKtZw2bAiy0Kx8ke7sgqOscLqArDkn3YaC5fVDxHSMHA',
  homework:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBHhi7eWTzzXUeniaXfynHcEg9YQUx5fQWLvD_SAufppdKqb82AOPARNOqKdpqKGX-hgnRV6ffK2JX0agvADWyhQWM4VFXMs3mJoiuAdoFrblldicbQGHmsbyO5wo5HYNGinj7ipzuXujMZeeVAjcyTMzOybXdGdJRnBd5QXQGUuKgo-meMONWIkWM0x24ESkR1lq9JzN8q8WbmzKby8sUxZ0sItyfz-i7Nsn_Q1Qi9nv7GN3E97lWNpAuwjCBl4_ipHgKQjIhANoGo',
  notebook:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCMd1lbK-U1rJZyEQxiCBusflq75hUCPRq-D7fKa0HUAG2Tohd1t80sCS-U5-33iOkbgWKo-mEuWcsmJ9JkrYW1LKg8LaKpYq3jWEtKxoBO8wUuNrg6EugBblLh1-y5PBa-VwL5OvpGfdVNjfmtZIYaTnyCQKjBptxT-9Yv6OIrgxBMCtnRzBf6eHLy9qWiVlW8eJMqKfN-7r9fejaYFXvPOZXG2D6TE8Y8VZ6WonvuSoWe50aU2JaBYhs2ts4cZWafmGUG4yhmeIR1',
  drawing:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCNcaG37lg9CHomCqIQppn8WQZbBnXAUJOLihPqtfdbGQnHxQm4DvVDRko3fnQ2mCtMx_jSjtO7Yb5ZxSv0wf6nD8ikA9o0DQpIXZV1cbsTzThHOwtCmr4uvB2G5vbsFhv9j-IpPnvr5FJzf8tQG5yzir1Y_eGKSowDVyekK2Mm4j0TE7CiQJIypqeK4cizwQxRV9SlEYlPjv7DA2ETxhEUcyzwDayZ0u-2SzmTxPnm4WcqZjxgBduJ6Lq5xCxgkmps2502UxpV5lRU',
  uploadPreview:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA-BqLFDGzgPTZ_ucoHN6geduMrlb_XpXH5PikDxJMnSM7-NlUb3PE-WYXvuCVXZeQjk1_C8vd_TeFxh0-w3oDLKKnksLa2xBDH2UzFMstPFwBXfn__VrXAlcYIUjVlSTBBzWwUINDQpO87uE53GhcKa5gkpc_8CGPQmfEpDCVztsPq3aHRQ3X7MloVq1faPFE5D-EG4LfkqZP7QRSfVvUOXhL5pSntuKpwOEqpD35NXqwSckuhGBw-vVOA7Kcda-vwE8mhAYKDfYwf',
  artwork:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAws8Zz3fBxu1YMxj7lPmHHctCEZHL46W4L5808JxeBZfXKFrONOv3JNzSQdphRtQH_-jJ50My399kC1v1-zpUSUV7ckcIMb3bM4IfCJLZWpccZ-L0bUBJHGibkb3ovvfD95RD7JDBb4CVv6k0RlvfVZXaAuLhCPO8oG6v40soJVepANi_DDF1CN8W6lrgZ2ah_d4jMtqTS0GmxEKniuoEP_-g45m0CuK1r4eNeFLG0coGLMNquO7xIs9R24aWr5MKhR_E77IbYGbbM',
  blocks:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA1HqHfEqhSgR1XW_38S-Z3XjvWXJc1HwvFbrLhcJvcT5X_ePsGkZ7yzxxJ81x-pFAQOOgcHIPiRgiqxxfXTPg8_mhCb9wzt8nX0QOA9aXIRJ1rDgmAbb5Q-Ypzfr0P7ZF91ZSdQ_0GPRO4QoLWjuR-7-PmMjsMlr4H1Pu10MSdB-7WpTArfIdzgMIbFPQvWkH89bRZIcwkRUFOgRdgMW8gbn18kGvvfeqrdpUboLGVEAvSpGu_Pl1GeyebwRag6hUVUGOIsnGPMX6N',
  parent:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAnth6wt6wGBZjFZPoJ9Ee_VOjzpc8qfTr-cQdJfkSkOX4A7JlOkg34rO-nRj9-9c3gKh5yIvoBeiYNVoOckg2jk3E9l33u1yGcKjLr5XrpQgbz-Z7r9LSXhMcAULcHXQ4VmXYkj0mdUiJTSXLX8hTM5Uxj7EgdL4DCoWq7w2PLtBE_0s2XiEBPSkj64apV-Kbkjq_8oumXrpVTQBOWCXlBE_CPLDhsZfNssw5FScv7eybZfxQnbQf-vUnM1KBLjOilNVUjqDJJ869X',
  chloe:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCZzVC0zF9A1-GGV75YWWavsdOz9kuXND7X9-al847sMbtxRQVFrh-Tu5mhsKHwU7hExCTW-3WsTah5OJhwH7e9Y5_DceWoH6xEvbR2oeGb7JRw0QjrkF0oLHuUAnh-eOMV8-dH9NgXaj6q-P1lCAfIsNsnI_wNOIgW9f0ZR-zc8w57QmdTqJ19THZ8ltx3XspAx1jba2owPStDMnFYwleip2jH18YS_l-sDD5BNHAbCHx82e74et_0iYBAkK9X5yg6NjuB1D6v2u1Q',
};

const navItems: Array<{ id: View; label: string; icon: string }> = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'portfolio', label: 'Portfolio', icon: 'import_contacts' },
  { id: 'upload', label: 'Upload', icon: 'add_a_photo' },
  { id: 'coach', label: 'Coach', icon: 'calculate' },
  { id: 'profile', label: 'Profile', icon: 'person' },
];

const gradeOptions = ['K1', 'K2', 'K3', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

const evidenceSuggestions = ['作品相片', '家長觀察', '課堂紀錄', '功課 evidence', '活動證書'];

function preferredChildId(parent: ParentProfile): string {
  return parent.children.find((child) => child.id === 'child-matthew')?.id || parent.children[0]?.id || 'child-matthew';
}

function Icon({ name, filled = false }: { name: string; filled?: boolean }) {
  return <span className={filled ? 'material-symbols-outlined icon-filled' : 'material-symbols-outlined'}>{name}</span>;
}

function portfolioTone(status: PortfolioStatus): PortfolioTone {
  if (status === 'Completed') return 'complete';
  if (status === 'AI Ready') return 'ready';
  return 'draft';
}

function formatPortfolioDate() {
  return new Date().toLocaleDateString('en-HK', { day: 'numeric', month: 'short' });
}

function createPortfolioSections(child: ChildProfile | null): PortfolioSectionDraft[] {
  const childName = child?.name || 'Matthew';
  const grade = child?.grade || 'P3';
  const focus = child?.focus || '小學數學 + 升小 Portfolio';

  return [
    {
      id: 'cover',
      icon: 'book',
      title: '封面設計 (Cover Page)',
      shortTitle: 'Cover',
      copy: '基本資料與封面照片。',
      status: 'Completed',
      body: `${childName} 的 Learning Passport 封面已整理基本資料、年級 ${grade}、學習焦點及代表相片，可作學校提交草稿。`,
      aiDraft: `${childName} is a curious and steady learner. This Learning Passport introduces the child through selected work samples, parent observations, and school-ready evidence.`,
      evidence: ['學生相片', '基本資料'],
      requiredEvidence: 2,
      image: images.portfolioChild,
      updatedAt: formatPortfolioDate(),
    },
    {
      id: 'about',
      icon: 'face',
      title: '關於我 (About Me)',
      shortTitle: 'About',
      copy: '性格特徵、興趣及家庭背景。',
      status: 'Completed',
      body: `${childName} 喜歡主動發問，能把新知識連繫到日常生活。家長觀察到孩子在 ${focus} 方面有清晰興趣，願意用例子分享自己的想法。`,
      aiDraft: `${childName} enjoys explaining ideas in simple steps and shows confidence when describing interests, routines, and family-supported learning habits.`,
      evidence: ['家長觀察', '興趣紀錄'],
      requiredEvidence: 2,
      updatedAt: formatPortfolioDate(),
    },
    {
      id: 'attitude',
      icon: 'menu_book',
      title: '學習態度 (Learning Attitude)',
      shortTitle: 'Attitude',
      copy: '課堂表現與學習目標。',
      status: 'AI Ready',
      body: `近期上載紀錄顯示 ${childName} 能保持練習節奏，在分數概念上有進步；應用題審題仍需要每日短練習支援。`,
      aiDraft: `${childName} demonstrates persistence during multi-step questions. Recent evidence suggests stronger number sense, while word-problem reading remains the next growth target.`,
      evidence: ['數學小測', 'AI 學習摘要'],
      requiredEvidence: 3,
      updatedAt: formatPortfolioDate(),
    },
    {
      id: 'self-care',
      icon: 'health_and_safety',
      title: '自理能力 (Self-care)',
      shortTitle: 'Self-care',
      copy: '日常生活技能及獨立性展現。',
      status: 'Drafting',
      body: `${childName} 正在建立更穩定的日常整理習慣，包括準備功課、收拾學習用品，以及在需要協助時清楚表達。`,
      aiDraft: `${childName} is developing independent routines and can follow familiar steps with gentle reminders, especially around school bag organization and homework preparation.`,
      evidence: ['日常觀察'],
      requiredEvidence: 2,
      updatedAt: formatPortfolioDate(),
    },
    {
      id: 'artworks',
      icon: 'palette',
      title: '藝術作品與活動 (Artworks & Activities)',
      shortTitle: 'Activities',
      copy: '展示學生的創造力及參與過的課外活動。',
      status: 'Drafting',
      body: `${childName} 的作品可展示創意、手眼協調和完成作品的耐性。下一步可補充活動相片及家長短評，令 portfolio 更完整。`,
      aiDraft: `${childName}'s artwork and activity evidence shows creativity, fine-motor development, and willingness to participate in guided group tasks.`,
      evidence: ['視藝作品'],
      requiredEvidence: 4,
      image: images.artwork,
      updatedAt: formatPortfolioDate(),
    },
  ];
}

function calculatePortfolioProgress(sections: PortfolioSectionDraft[]) {
  if (!sections.length) return 0;
  const score = sections.reduce((total, section) => {
    const evidenceScore = Math.min(section.evidence.length / Math.max(section.requiredEvidence, 1), 1) * 0.25;
    const statusScore = section.status === 'Completed' ? 0.75 : section.status === 'AI Ready' ? 0.5 : 0.25;
    return total + statusScore + evidenceScore;
  }, 0);
  return Math.min(100, Math.round((score / sections.length) * 100));
}

function buildPortfolioExportSections(sections: PortfolioSectionDraft[]) {
  return sections.map((section) => ({
    title: section.title,
    status: section.status,
    body: `${section.body.trim()} Evidence: ${section.evidence.join(', ') || 'To be added.'}`,
  }));
}

function App() {
  const [activeView, setActiveView] = useState<View>('home');
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [parent, setParent] = useState<ParentProfile | null>(null);
  const [selectedChildId, setSelectedChildId] = useState('child-matthew');
  const [loginEmail, setLoginEmail] = useState('parent@example.com');
  const [loginPin, setLoginPin] = useState('246810');
  const [signupDisplayName, setSignupDisplayName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    state: 'checking',
    detail: 'Checking GCP',
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrState, setOcrState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportError, setExportError] = useState<string | null>(null);
  const [portfolioDrafts, setPortfolioDrafts] = useState<Record<string, PortfolioSectionDraft[]>>({});
  const [practiceState, setPracticeState] = useState<PracticeState>('idle');
  const [practiceQuiz, setPracticeQuiz] = useState<GeneratedQuiz | null>(null);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [lastPracticeOptions, setLastPracticeOptions] = useState<PracticeStartOptions>({});
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [profileSheet, setProfileSheet] = useState<ProfileSheet>(null);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;

    async function checkBackend() {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!alive) return;
        setBackendStatus({
          state: 'online',
          detail: `${data.project_id || 'GCP'} · ${data.gemini_model || 'Gemini'}`,
        });
      } catch {
        if (!alive) return;
        setBackendStatus({
          state: 'offline',
          detail: 'Local prototype mode',
        });
      }
    }

    void checkBackend();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadSession() {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
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
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const uploadPreview = useMemo(() => previewUrl || images.uploadPreview, [previewUrl]);
  const currentChild = useMemo(
    () => parent?.children.find((child) => child.id === selectedChildId) || parent?.children[0] || null,
    [parent, selectedChildId],
  );
  const portfolioChildKey = currentChild?.id || 'child-matthew';
  const currentPortfolioSections = useMemo(
    () => portfolioDrafts[portfolioChildKey] || createPortfolioSections(currentChild),
    [currentChild, portfolioChildKey, portfolioDrafts],
  );

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginEmail, pin: loginPin }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      setParent(data.parent);
      setSelectedChildId(preferredChildId(data.parent));
      setAuthState('authenticated');
      setAuthMode('login');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Login failed');
    }
  }

  async function signup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          display_name: signupDisplayName || loginEmail.split('@')[0] || 'EduPass Parent',
          email: loginEmail,
          pin: loginPin,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      setParent(data.parent);
      setSelectedChildId(preferredChildId(data.parent));
      setAuthState('authenticated');
      setActiveView('profile');
      setToast('Account created');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign up failed');
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
    setParent(null);
    setAuthState('anonymous');
    setActiveView('home');
  }

  function switchChild() {
    if (!parent?.children.length) return;
    const currentIndex = parent.children.findIndex((child) => child.id === selectedChildId);
    const nextChild = parent.children[(currentIndex + 1) % parent.children.length] || parent.children[0];
    setSelectedChildId(nextChild.id);
    setToast(`Switched to ${nextChild.name}`);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const previewFile = files.find((item) => item.type.startsWith('image/'));
    setSelectedFiles(files);
    setPreviewUrl(previewFile ? URL.createObjectURL(previewFile) : null);
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

    const form = new FormData();
    selectedFiles.forEach((file) => form.append('files', file));
    form.append('child_id', currentChild?.id || 'child-matthew');
    form.append('child_profile_id', currentChild?.id || 'child-matthew');
    form.append('grade', currentChild?.grade || 'P3');

    try {
      const response = await fetch('/api/ocr-review', { method: 'POST', body: form, credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      setOcrResult(data);
      setOcrState('done');
    } catch (error) {
      setOcrResult({ detail: error instanceof Error ? error.message : 'OCR analysis failed' });
      setOcrState('error');
    }
  }

  async function startPractice(options: PracticeStartOptions = {}) {
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
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          child_profile_id: currentChild?.id || 'child-matthew',
          grade: currentChild?.grade || 'P3',
          practice_plan: practicePlan,
          question_count: questionCount,
          subject,
          weak_topic: weakTopic,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      setPracticeQuiz(data.quiz);
      setPracticeState('ready');
    } catch (error) {
      setPracticeError(error instanceof Error ? error.message : 'Practice generation failed');
      setPracticeState('error');
    }
  }

  function restartPractice() {
    void startPractice(lastPracticeOptions);
  }

  async function updateSelectedChild(updates: Partial<ChildProfile>) {
    if (!currentChild) return;
    const response = await fetch(`/api/children/${currentChild.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    const child = await response.json();
    if (!response.ok) throw new Error(child.detail || `HTTP ${response.status}`);
    setParent((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        children: previous.children.map((item) => (item.id === child.id ? child : item)),
      };
    });
    setToast('Profile saved');
  }

  async function updateParentProfile(updates: ParentProfileUpdates) {
    const response = await fetch('/api/parent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    const updatedParent = await response.json();
    if (!response.ok) throw new Error(updatedParent.detail || `HTTP ${response.status}`);
    setParent(updatedParent);
    if (updatedParent.children?.length) {
      setSelectedChildId((current) => updatedParent.children.some((child: ChildProfile) => child.id === current)
        ? current
        : preferredChildId(updatedParent));
    }
    setToast('Profile saved');
  }

  async function updatePrivacySettings(updates: Partial<PrivacySettings>) {
    const response = await fetch('/api/privacy/consent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    const summary = await response.json();
    if (!response.ok) throw new Error(summary.detail || `HTTP ${response.status}`);
    setParent(summary.parent);
    setToast('Privacy settings saved');
    return summary as PrivacyCenterResponse;
  }

  async function deleteChildData(childId: string, confirmationName: string) {
    const response = await fetch(`/api/children/${childId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ confirmation_name: confirmationName, delete_storage: true }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || `HTTP ${response.status}`);
    setParent(result.parent);
    setSelectedChildId(preferredChildId(result.parent));
    setToast('Child data deleted');
    return result as { parent: ParentProfile };
  }

  async function addChild(payload: Omit<ChildProfile, 'id'>) {
    const response = await fetch('/api/children', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const child = await response.json();
    if (!response.ok) throw new Error(child.detail || `HTTP ${response.status}`);
    setParent((previous) => {
      if (!previous) return previous;
      return { ...previous, onboarding_complete: true, children: [...previous.children, child] };
    });
    setSelectedChildId(child.id);
    setToast(`${child.name} added`);
  }

  async function completeOnboarding(parentUpdates: ParentProfileUpdates, childPayload: Omit<ChildProfile, 'id'>) {
    const childResponse = await fetch('/api/children', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(childPayload),
    });
    const child = await childResponse.json();
    if (!childResponse.ok) throw new Error(child.detail || `HTTP ${childResponse.status}`);

    const parentResponse = await fetch('/api/parent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...parentUpdates, onboarding_complete: true }),
    });
    const updatedParent = await parentResponse.json();
    if (!parentResponse.ok) throw new Error(updatedParent.detail || `HTTP ${parentResponse.status}`);
    setParent(updatedParent);
    setSelectedChildId(child.id);
    setActiveView('home');
    setToast('Learning profile ready');
  }

  function updatePortfolioSection(sectionId: string, updates: Partial<PortfolioSectionDraft>) {
    const childKey = currentChild?.id || 'child-matthew';
    setPortfolioDrafts((previous) => {
      const sections = previous[childKey] || createPortfolioSections(currentChild);
      return {
        ...previous,
        [childKey]: sections.map((section) => (
          section.id === sectionId
            ? { ...section, ...updates, updatedAt: formatPortfolioDate() }
            : section
        )),
      };
    });
  }

  function addPortfolioEvidence(sectionId: string) {
    const childKey = currentChild?.id || 'child-matthew';
    setPortfolioDrafts((previous) => {
      const sections = previous[childKey] || createPortfolioSections(currentChild);
      return {
        ...previous,
        [childKey]: sections.map((section) => {
          if (section.id !== sectionId) return section;
          const nextEvidence = evidenceSuggestions.find((item) => !section.evidence.includes(item))
            || `家長補充 ${section.evidence.length + 1}`;
          return {
            ...section,
            evidence: [...section.evidence, nextEvidence],
            updatedAt: formatPortfolioDate(),
          };
        }),
      };
    });
  }

  function removePortfolioEvidence(sectionId: string, evidence: string) {
    const childKey = currentChild?.id || 'child-matthew';
    setPortfolioDrafts((previous) => {
      const sections = previous[childKey] || createPortfolioSections(currentChild);
      return {
        ...previous,
        [childKey]: sections.map((section) => (
          section.id === sectionId
            ? {
                ...section,
                evidence: section.evidence.filter((item) => item !== evidence),
                updatedAt: formatPortfolioDate(),
              }
            : section
        )),
      };
    });
  }

  async function exportPortfolio() {
    setExportState('running');
    setExportError(null);
    try {
      const response = await fetch('/api/portfolio/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          child_id: currentChild?.id || 'child-matthew',
          sections: buildPortfolioExportSections(currentPortfolioSections),
        }),
      });
      const record = await response.json();
      if (!response.ok) throw new Error(record.detail || `HTTP ${response.status}`);
      const fileResponse = await fetch(record.download_url, { credentials: 'include' });
      if (!fileResponse.ok) throw new Error(`Download HTTP ${fileResponse.status}`);
      const blob = await fileResponse.blob();
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
    return <LoadingView />;
  }

  if (authState === 'anonymous') {
    return (
      <LoginView
        authError={authError}
        authMode={authMode}
        email={loginEmail}
        pin={loginPin}
        displayName={signupDisplayName}
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
    <div className={appClass}>
      {activeView === 'upload' ? (
        <UploadHeader onBack={() => setActiveView('home')} />
      ) : activeView === 'profile' ? (
        <SettingsHeader onBack={() => setActiveView('home')} onHelp={() => setProfileSheet('support')} />
      ) : (
        <MainHeader activeView={activeView} child={currentChild} onSwitchChild={switchChild} />
      )}

      {activeView === 'home' && <HomeView setActiveView={setActiveView} onStartPractice={() => startPractice()} />}
      {activeView === 'portfolio' && (
        <PortfolioView
          child={currentChild}
          exportError={exportError}
          exportState={exportState}
          sections={currentPortfolioSections}
          onAddEvidence={addPortfolioEvidence}
          onExport={exportPortfolio}
          onOpenUpload={() => setActiveView('upload')}
          onPreviewEvidence={(image) => setLightboxSrc(image)}
          onRemoveEvidence={removePortfolioEvidence}
          onUpdateSection={updatePortfolioSection}
        />
      )}
      {activeView === 'upload' && (
        <UploadView
          backendStatus={backendStatus}
          inputRef={inputRef}
          ocrResult={ocrResult}
          ocrState={ocrState}
          previewUrl={uploadPreview}
          selectedFiles={selectedFiles}
          analyzeUpload={analyzeUpload}
          handleFileChange={handleFileChange}
          onViewPreview={() => setLightboxSrc(uploadPreview)}
        />
      )}
      {activeView === 'coach' && (
        <CoachView
          child={currentChild}
          practiceError={practiceError}
          practiceQuiz={practiceQuiz}
          practiceState={practiceState}
          onCompletePractice={() => setPracticeState('complete')}
          onStartPractice={restartPractice}
          onStartTopic={(options) => startPractice(options)}
          onResetPractice={() => {
            setPracticeQuiz(null);
            setPracticeState('idle');
          }}
        />
      )}
      {activeView === 'profile' && parent ? (
        <ProfileView
          children={parent.children}
          currentChild={currentChild}
          onEditParent={() => setProfileSheet('edit-parent')}
          parent={parent}
          selectedChildId={selectedChildId}
          setSelectedChildId={setSelectedChildId}
          onAddChild={() => setProfileSheet('add-child')}
          onEditChild={() => setProfileSheet('edit-child')}
          onLogout={logout}
          onOpenSetting={setProfileSheet}
        />
      ) : null}

      <BottomNav activeView={activeView} setActiveView={setActiveView} />

      {lightboxSrc ? <PreviewLightbox image={lightboxSrc} onClose={() => setLightboxSrc(null)} /> : null}
      {parent ? (
        <ProfileSheetModal
          currentChild={currentChild}
          kind={profileSheet}
          parent={parent}
          onAddChild={addChild}
          onClose={() => setProfileSheet(null)}
          onDeleteChild={deleteChildData}
          onPrivacySave={updatePrivacySettings}
          onUpdateParent={updateParentProfile}
          onUpdateChild={updateSelectedChild}
        />
      ) : null}
      {toast ? <div className="app-toast">{toast}</div> : null}
    </div>
  );
}

function LoadingView() {
  return (
    <main className="login-shell">
      <section className="login-card">
        <span className="login-mark"><Icon name="school" filled /></span>
        <h1>EduPass AI</h1>
        <p>Loading secure learning workspace...</p>
      </section>
    </main>
  );
}

function LoginView({
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
}) {
  const isSignup = authMode === 'signup';

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={isSignup ? onSignup : onLogin}>
        <span className="login-mark"><Icon name="school" filled /></span>
        <h1>EduPass AI</h1>
        <p>
          {isSignup
            ? 'Create a parent account, then set up your first child learning profile.'
            : 'Sign in to load parent profile, child records, OCR history, and portfolio exports from GCP.'}
        </p>
        {isSignup ? (
          <label>
            Parent name
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="e.g. Mrs Chan" />
          </label>
        ) : null}
        <label>
          Email
          <input value={email} type="email" onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          {isSignup ? 'Create PIN' : 'Demo PIN'}
          <input value={pin} type="password" inputMode="numeric" onChange={(event) => setPin(event.target.value)} />
        </label>
        {authError ? <strong className="login-error">{authError}</strong> : null}
        <button className="primary-action full" type="submit">
          <Icon name={isSignup ? 'person_add' : 'login'} filled />
          {isSignup ? 'Create account' : 'Sign in'}
        </button>
        <button className="auth-switch" type="button" onClick={() => setAuthMode(isSignup ? 'login' : 'signup')}>
          {isSignup ? 'Already have an account? Sign in' : 'New parent? Create account'}
        </button>
      </form>
    </main>
  );
}

function OnboardingView({
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
  const [focus, setFocus] = useState('小學數學 + Portfolio');
  const [schoolType, setSchoolType] = useState('香港主流小學');
  const [language, setLanguage] = useState('繁中 / English');
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
          passport: 'Learning Passport',
          school_type: schoolType,
        },
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Profile setup failed');
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
            <span>First login setup</span>
            <h1>Create learning profiles</h1>
            <p>{parent.email}</p>
          </div>
        </div>

        <label>
          Parent display name
          <input required value={parentName} onChange={(event) => setParentName(event.target.value)} />
        </label>

        <div className="onboarding-divider">
          <Icon name="child_care" />
          <span>First child profile</span>
        </div>

        <label>
          Child name
          <input required value={childName} onChange={(event) => setChildName(event.target.value)} placeholder="e.g. Matthew" />
        </label>
        <div className="form-grid two">
          <label>
            Grade
            <select value={grade} onChange={(event) => setGrade(event.target.value)}>
              {gradeOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>
            Language
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option>繁中 / English</option>
              <option>繁體中文</option>
              <option>English</option>
            </select>
          </label>
        </div>
        <label>
          Learning focus
          <textarea value={focus} onChange={(event) => setFocus(event.target.value)} />
        </label>
        <label>
          School type
          <input value={schoolType} onChange={(event) => setSchoolType(event.target.value)} />
        </label>

        {error ? <strong className="login-error">{error}</strong> : null}

        <button className="primary-action full" type="submit" disabled={saving}>
          <Icon name={saving ? 'sync' : 'check_circle'} filled />
          {saving ? 'Saving...' : 'Start EduPass'}
        </button>
        <button className="auth-switch" type="button" onClick={onLogout}>Logout</button>
      </form>
    </main>
  );
}

function MainHeader({
  activeView,
  child,
  onSwitchChild,
}: {
  activeView: View;
  child: ChildProfile | null;
  onSwitchChild: () => void;
}) {
  const isPortfolio = activeView === 'portfolio';
  const avatar = child?.name === 'Chloe' ? images.chloe : isPortfolio ? images.portfolioChild : images.child;

  return (
    <header className="top-appbar">
      <div className="profile-row">
        <img className="avatar-img" src={avatar} alt={child?.name || 'Matthew'} />
        <div>
          {isPortfolio ? (
            <h1 className="brand-title">Learning Passport</h1>
          ) : (
            <>
              <h1 className="student-title">{activeView === 'home' ? child?.name || 'Matthew' : 'Learning Passport'}</h1>
              {activeView === 'home' ? <p>{child?.grade || 'P3'} • {child?.passport || 'Learning Passport'}</p> : null}
            </>
          )}
        </div>
      </div>
      <button className="symbol-button" type="button" aria-label="Switch profile" onClick={onSwitchChild}>
        <Icon name="switch_account" />
      </button>
    </header>
  );
}

function UploadHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="upload-appbar">
      <button className="symbol-button" type="button" aria-label="Go back" onClick={onBack}>
        <Icon name="arrow_back" />
      </button>
      <h1>確認作業內容</h1>
      <span />
    </header>
  );
}

function SettingsHeader({ onBack, onHelp }: { onBack: () => void; onHelp: () => void }) {
  return (
    <header className="settings-appbar">
      <button className="symbol-button" type="button" aria-label="Back" onClick={onBack}>
        <Icon name="arrow_back" />
      </button>
      <h1>Settings</h1>
      <button className="symbol-button" type="button" aria-label="Help" onClick={onHelp}>
        <Icon name="help" />
      </button>
    </header>
  );
}

function HomeView({
  onStartPractice,
  setActiveView,
}: {
  onStartPractice: () => void;
  setActiveView: (view: View) => void;
}) {
  const [showAllUploads, setShowAllUploads] = useState(false);
  const recentUploads = [
    { image: images.homework, title: '數學小測', time: '今天 14:30' },
    { image: images.notebook, title: '中文造句', time: '昨天 18:15' },
    { image: images.drawing, title: '視藝作品', time: '上週五' },
    { image: images.artwork, title: '視藝活動', time: '上週三' },
    { image: images.blocks, title: 'STEM 作品', time: '5月28日' },
  ];

  return (
    <main className="content-stack home-view">
      <section className="ai-summary-card">
        <Icon name="auto_awesome" />
        <div className="ai-summary-inner">
          <div className="summary-icon">
            <Icon name="insights" filled />
          </div>
          <div>
            <h2>本週 AI 學習摘要</h2>
            <p>
              本週上載 <strong>2</strong> 份功課，分數概念有進步，應用題審題仍需練習。繼續保持！
            </p>
          </div>
        </div>
      </section>

      <section className="next-action-card">
        <div className="next-copy">
          <div className="school-icon">
            <Icon name="school" filled />
          </div>
          <div>
            <span>今日建議</span>
            <h3>練習：5題兩步應用題</h3>
          </div>
        </div>
        <button className="primary-action" type="button" onClick={onStartPractice}>
          <Icon name="play_arrow" filled />
          開始練習
        </button>
      </section>

      <section className="shortcut-grid">
        <button className="shortcut-card" type="button" onClick={() => setActiveView('portfolio')}>
          <div className="shortcut-top">
            <span className="shortcut-icon tertiary">
              <Icon name="import_contacts" filled />
            </span>
            <span className="status-chip green">進度 65%</span>
          </div>
          <h3>學習歷程檔案</h3>
          <p>收集並整理學生的學習成果與進步軌跡。</p>
          <div className="progress-track">
            <span style={{ width: '65%' }} />
          </div>
        </button>

        <button className="shortcut-card" type="button" onClick={() => setActiveView('coach')}>
          <div className="shortcut-top">
            <span className="shortcut-icon primary">
              <Icon name="calculate" filled />
            </span>
            <Icon name="arrow_forward" />
          </div>
          <h3>AI 數學教練</h3>
          <p>基礎運算掌握良好，目前專注於應用題解析。</p>
          <div className="mini-tags">
            <span>分數計算 (優)</span>
            <span>應用題 (需努力)</span>
          </div>
        </button>
      </section>

      <section className="recent-section">
        <div className="section-heading">
          <h2>最近上載紀錄</h2>
          <button type="button" onClick={() => setShowAllUploads((value) => !value)}>
            {showAllUploads ? '收合' : '查看全部'} <Icon name={showAllUploads ? 'expand_less' : 'chevron_right'} />
          </button>
        </div>
        <div className="recent-scroll">
          <button className="add-upload-card" type="button" onClick={() => setActiveView('upload')}>
            <Icon name="add_a_photo" />
            <span>新增功課</span>
          </button>
          {recentUploads.slice(0, showAllUploads ? recentUploads.length : 3).map((item) => (
            <RecentThumb key={`${item.title}-${item.time}`} image={item.image} title={item.title} time={item.time} />
          ))}
        </div>
      </section>
    </main>
  );
}

function RecentThumb({ image, title, time }: { image: string; title: string; time: string }) {
  return (
    <div className="recent-thumb">
      <img src={image} alt={title} />
      <div>
        <strong>{title}</strong>
        <span>{time}</span>
      </div>
    </div>
  );
}

function PortfolioView({
  child,
  exportError,
  exportState,
  onAddEvidence,
  onExport,
  onOpenUpload,
  onPreviewEvidence,
  onRemoveEvidence,
  onUpdateSection,
  sections,
}: {
  child: ChildProfile | null;
  exportError: string | null;
  exportState: ExportState;
  onAddEvidence: (sectionId: string) => void;
  onExport: () => void;
  onOpenUpload: () => void;
  onPreviewEvidence: (image: string) => void;
  onRemoveEvidence: (sectionId: string, evidence: string) => void;
  onUpdateSection: (sectionId: string, updates: Partial<PortfolioSectionDraft>) => void;
  sections: PortfolioSectionDraft[];
}) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id || '');
  const activeSection = sections.find((section) => section.id === activeSectionId) || sections[0];
  const progress = calculatePortfolioProgress(sections);
  const completedCount = sections.filter((section) => section.status === 'Completed').length;
  const readyCount = sections.filter((section) => section.status === 'AI Ready').length;
  const evidenceCount = sections.reduce((total, section) => total + section.evidence.length, 0);
  const statusOptions: PortfolioStatus[] = ['Completed', 'AI Ready', 'Drafting'];

  useEffect(() => {
    if (!sections.length) return;
    if (!sections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(sections[0].id);
    }
  }, [activeSectionId, sections]);

  return (
    <main className="content-stack portfolio-view">
      <section className="portfolio-tip">
        <Icon name="auto_awesome" />
        <div>
          <h3>AI 協助中</h3>
          <p>{readyCount ? `${readyCount} 個 section 已有 AI 草稿，可由家長確認。` : '所有 section 已可直接匯出 PDF。'}</p>
        </div>
      </section>

      <section className="passport-overview">
        <div>
          <span className="verified-label"><Icon name="verified" filled /> School-ready draft</span>
          <h2>{child?.passport || 'Learning Passport'}</h2>
          <p>{child?.name || '孩子'} · {child?.grade || 'P3'} · {child?.focus || 'Portfolio Builder'}</p>
        </div>
        <div className="passport-progress-meter" aria-label={`Passport progress ${progress}%`}>
          <strong>{progress}%</strong>
          <span>PDF ready</span>
        </div>
        <div className="passport-stat-row">
          <span><b>{completedCount}</b> Completed</span>
          <span><b>{evidenceCount}</b> Evidence</span>
          <span><b>{sections.length}</b> Sections</span>
        </div>
      </section>

      <section className="portfolio-grid">
        {sections.map((section) => (
          <button
            className={`portfolio-card ${section.id === activeSectionId ? 'active' : ''} ${section.id === 'artworks' ? 'wide' : ''}`}
            key={section.id}
            type="button"
            onClick={() => setActiveSectionId(section.id)}
          >
            <div className="portfolio-card-top">
              <span className="portfolio-icon">
                <Icon name={section.icon} filled />
              </span>
              <StatusChip status={section.status} tone={portfolioTone(section.status)} />
            </div>
            <div className={section.id === 'artworks' ? 'art-row' : undefined}>
              <div>
                <h3>{section.title}</h3>
                <p>{section.copy}</p>
              </div>
              {section.image ? (
                <div className="art-thumbs">
                  <img src={section.image} alt={section.title} />
                  <span>
                    <img src={section.id === 'artworks' ? images.blocks : section.image} alt="" />
                    <b>+{Math.max(section.evidence.length - 1, 1)}</b>
                  </span>
                </div>
              ) : null}
            </div>
            <div className="portfolio-card-actions">
              <span><Icon name="edit_note" /> 編輯</span>
              <span>{section.evidence.length}/{section.requiredEvidence} evidence</span>
            </div>
          </button>
        ))}
      </section>

      {activeSection ? (
        <section className="passport-editor-panel" aria-label={`${activeSection.title} editor`}>
          <div className="editor-head">
            <span className="portfolio-icon">
              <Icon name={activeSection.icon} filled />
            </span>
            <div className="editor-title">
              <span>{activeSection.shortTitle} · Updated {activeSection.updatedAt}</span>
              <h2>{activeSection.title}</h2>
            </div>
            <StatusChip status={activeSection.status} tone={portfolioTone(activeSection.status)} />
          </div>

          <div className="status-segments" role="group" aria-label="Portfolio section status">
            {statusOptions.map((status) => (
              <button
                className={activeSection.status === status ? 'active' : ''}
                key={status}
                type="button"
                onClick={() => onUpdateSection(activeSection.id, { status })}
              >
                {status}
              </button>
            ))}
          </div>

          <label className="draft-textarea">
            School-ready draft
            <textarea
              value={activeSection.body}
              onChange={(event) => onUpdateSection(activeSection.id, { body: event.target.value })}
            />
          </label>

          <div className="ai-draft-panel">
            <div>
              <span><Icon name="auto_awesome" filled /> AI draft</span>
              <p>{activeSection.aiDraft}</p>
            </div>
            <button
              className="secondary-action"
              type="button"
              onClick={() => onUpdateSection(activeSection.id, { body: activeSection.aiDraft, status: 'Completed' })}
            >
              <Icon name="task_alt" />
              確認採用
            </button>
          </div>

          <div className="evidence-tools">
            <div className="evidence-head">
              <h3>Evidence bank</h3>
              <span>{activeSection.evidence.length}/{activeSection.requiredEvidence}</span>
            </div>
            <div className="evidence-list">
              {activeSection.evidence.length ? activeSection.evidence.map((item) => (
                <span className="evidence-chip" key={item}>
                  {item}
                  <button type="button" aria-label={`Remove ${item}`} onClick={() => onRemoveEvidence(activeSection.id, item)}>
                    <Icon name="close" />
                  </button>
                </span>
              )) : (
                <span className="empty-evidence">No evidence yet</span>
              )}
            </div>

            <div className="editor-button-row">
              <button className="secondary-action" type="button" onClick={() => onAddEvidence(activeSection.id)}>
                <Icon name="add_circle" />
                新增 evidence
              </button>
              <button className="secondary-action" type="button" onClick={onOpenUpload}>
                <Icon name="upload_file" />
                上載作品
              </button>
              {activeSection.image ? (
                <button className="secondary-action" type="button" onClick={() => onPreviewEvidence(activeSection.image || '')}>
                  <Icon name="fullscreen" />
                  預覽相片
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {exportState === 'done' || exportState === 'error' ? (
        <div className={`export-toast ${exportState}`}>
          {exportState === 'done' ? 'PDF export ready' : exportError}
        </div>
      ) : null}

      <button className="generate-fab" type="button" onClick={onExport} disabled={exportState === 'running'}>
        <Icon name="picture_as_pdf" filled />
        {exportState === 'running' ? 'Generating' : 'Generate PDF'}
      </button>
    </main>
  );
}

function StatusChip({ status, tone }: { status: string; tone: string }) {
  return (
    <span className={`status-chip ${tone}`}>
      {tone === 'ready' ? <Icon name="sync" /> : <i />}
      {status}
    </span>
  );
}

function UploadView({
  analyzeUpload,
  backendStatus,
  handleFileChange,
  inputRef,
  onViewPreview,
  ocrResult,
  ocrState,
  previewUrl,
  selectedFile,
}: {
  analyzeUpload: () => void;
  backendStatus: BackendStatus;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onViewPreview: () => void;
  ocrResult: OcrResult | null;
  ocrState: 'idle' | 'running' | 'done' | 'error';
  previewUrl: string;
  selectedFile: File | null;
}) {
  const [mistakes, setMistakes] = useState([
    { id: 'm1', title: '異分母加減運算', question: '第 3, 5 題', reason: '運算錯誤 (Calculation)' },
    { id: 'm2', title: '分數約分未完成', question: '第 8 題', reason: '概念不清 (Conceptual)' },
  ]);
  const detectedQuestion = ocrResult?.review?.extracted_questions?.[0]?.question_text;
  const pipelineLabel = ocrResult?.review_mode === 'multimodal_llm'
    ? 'Vision + Gemini multimodal'
    : ocrResult?.review_mode === 'text_only_llm'
      ? 'OCR + Gemini text review'
      : 'GCP OCR + Gemini';

  return (
    <>
      <main className="upload-content">
        <input ref={inputRef} className="hidden-file" type="file" accept="image/*,.pdf" onChange={handleFileChange} />

        <section className="upload-preview">
          <h2>作業預覽</h2>
          <div className="preview-frame">
            <img src={previewUrl} alt="Scanned math homework" />
            <button type="button" aria-label="View full image" onClick={onViewPreview}>
              <Icon name="fullscreen" />
            </button>
          </div>
        </section>

        <section className="ocr-panel">
          <div className="ocr-panel-head">
            <h2><Icon name="document_scanner" filled /> 擷取資料</h2>
            <span>{ocrState === 'done' ? 'Hybrid 已校正' : '自動辨識完成'}</span>
          </div>

          <div className="ocr-pipeline-card">
            <span><Icon name="hub" filled /></span>
            <div>
              <strong>{pipelineLabel}</strong>
              <p>
                {ocrState === 'done'
                  ? `${ocrResult?.ocr_provider || 'OCR'} → ${ocrResult?.review_model || 'Gemini'}${ocrResult?.review_fallback_used ? ' · fallback used' : ''}`
                  : 'OCR extracts evidence first; Gemini reviews the original upload and text together.'}
              </p>
            </div>
          </div>

          <FormDisplay icon="category" label="學習主題 (自動辨識)" value="分數 (Fractions)" />
          <FormDisplay icon="grade" label="作業得分" value="85/100" />

          <div className="mistake-list">
            <label>辨識到的錯誤題型</label>
            {mistakes.map((mistake) => (
              <MistakeCard
                key={mistake.id}
                title={mistake.title}
                question={mistake.question}
                reason={mistake.reason}
                onDelete={() => setMistakes((items) => items.filter((item) => item.id !== mistake.id))}
                onReasonChange={(reason) =>
                  setMistakes((items) => items.map((item) => (item.id === mistake.id ? { ...item, reason } : item)))
                }
              />
            ))}
            {!mistakes.length ? (
              <div className="analysis-result success">
                <strong>All reviewed</strong>
                <p>所有 AI 偵測錯誤已由家長確認。</p>
              </div>
            ) : null}

            {ocrState === 'done' && detectedQuestion ? (
              <div className="analysis-result success">
                <strong>Hybrid OCR Review</strong>
                <p>{detectedQuestion}</p>
              </div>
            ) : null}
            {ocrState === 'error' ? (
              <div className="analysis-result error">
                <strong>GCP OCR Error</strong>
                <p>{ocrResult?.detail || 'OCR analysis failed'}</p>
              </div>
            ) : null}
          </div>

          <p className="backend-note">
            {backendStatus.state === 'online' ? `Backend: ${backendStatus.detail}` : backendStatus.detail}
          </p>
        </section>
      </main>

      <footer className="upload-footer">
        <button className="primary-action full" type="button" onClick={analyzeUpload} disabled={ocrState === 'running'}>
          <Icon name={selectedFile ? 'document_scanner' : 'upload_file'} filled />
          {ocrState === 'running' ? '正在分析...' : selectedFile ? '確認並分析' : '選擇功課相片'}
        </button>
      </footer>
    </>
  );
}

function FormDisplay({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <label className="form-display">
      <span>{label}</span>
      <div>
        <Icon name={icon} />
        <input readOnly value={value} />
        <Icon name="edit" />
      </div>
    </label>
  );
}

function MistakeCard({
  onDelete,
  onReasonChange,
  reason,
  question,
  title,
}: {
  onDelete: () => void;
  onReasonChange: (reason: string) => void;
  reason: string;
  question: string;
  title: string;
}) {
  return (
    <article className="mistake-card">
      <div className="mistake-row">
        <input checked readOnly type="checkbox" />
        <div>
          <strong>{title}</strong>
          <span>{question}</span>
        </div>
        <button type="button" aria-label="Delete" onClick={onDelete}>
          <Icon name="delete" />
        </button>
      </div>
      <label>
        <span>錯誤原因</span>
        <select value={reason} onChange={(event) => onReasonChange(event.target.value)}>
          <option>運算錯誤 (Calculation)</option>
          <option>概念不清 (Conceptual)</option>
          <option>粗心大意 (Careless)</option>
        </select>
      </label>
    </article>
  );
}

function CoachView({
  child,
  onCompletePractice,
  onResetPractice,
  onStartPractice,
  onStartTopic,
  practiceError,
  practiceQuiz,
  practiceState,
}: {
  child: ChildProfile | null;
  onCompletePractice: () => void;
  onResetPractice: () => void;
  onStartPractice: () => void;
  onStartTopic: (options: PracticeStartOptions) => void;
  practiceError: string | null;
  practiceQuiz: GeneratedQuiz | null;
  practiceState: PracticeState;
}) {
  const profileGrade = normalizeGrade(child?.grade);
  const gradeSubjects = useMemo(() => getSubjectsForGrade(profileGrade), [profileGrade]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(gradeSubjects[0]?.id || '');
  const selectedSubject = gradeSubjects.find((subject) => subject.id === selectedSubjectId) || gradeSubjects[0] || null;

  useEffect(() => {
    if (!gradeSubjects.length) {
      setSelectedSubjectId('');
      return;
    }
    if (!gradeSubjects.some((subject) => subject.id === selectedSubjectId)) {
      setSelectedSubjectId(gradeSubjects[0].id);
    }
  }, [gradeSubjects, selectedSubjectId]);

  if (practiceState === 'generating') {
    return <PracticeAnalyzingView child={child} />;
  }

  if (practiceState === 'ready' && practiceQuiz) {
    return <DailyPracticeView onComplete={onCompletePractice} onRestart={onStartPractice} quiz={practiceQuiz} />;
  }

  if (practiceState === 'complete') {
    return <PracticeCompleteView onBack={onResetPractice} onRestart={onStartPractice} quiz={practiceQuiz} />;
  }

  return (
    <main className="content-stack coach-view">
      <section className="page-intro tight">
        <h2>數學學習分析</h2>
        <p>{child?.name || 'Matthew'} 本週完成 3 份練習，整體正確率提升 <strong>8%</strong>。</p>
      </section>

      <CurriculumMapSection
        child={child}
        selectedSubjectId={selectedSubject?.id || ''}
        onSelectSubject={setSelectedSubjectId}
      />

      <CourseContentSection
        child={child}
        selectedSubject={selectedSubject}
        onStartPractice={onStartTopic}
      />

      <section className="coach-hero">
        <div>
          <h3><Icon name="lightbulb" filled /> 每日 5 分鐘特訓</h3>
          <p>系統偵測到『應用題』為當前弱項。開始一次簡短的針對性練習，鞏固解題思路！</p>
        </div>
        <button type="button" onClick={onStartPractice}><Icon name="play_arrow" filled /> 開始練習</button>
      </section>

      {practiceState === 'error' ? (
        <div className="analysis-result error">
          <strong>練習生成失敗</strong>
          <p>{practiceError || '請稍後再試。'}</p>
        </div>
      ) : null}

      <section className="coach-grid">
        <article className="data-card">
          <div className="card-title-row">
            <h3>主題掌握度</h3>
            <Icon name="bar_chart" />
          </div>
          <Mastery label="分數" value={92} tone="green" />
          <Mastery label="時間" value={85} tone="mint" />
          <Mastery label="幾何" value={70} tone="amber" />
          <Mastery label="應用題" value={45} tone="red" />
        </article>

        <article className="data-card">
          <div className="card-title-row">
            <h3>需注意的錯誤類型</h3>
            <Icon name="warning" />
          </div>
          <p>基於近期 5 次測驗的 AI 分析：</p>
          <div className="mistake-tags">
            <span className="danger"><Icon name="search" /> 看漏關鍵字</span>
            <span>計算錯誤</span>
            <span className="amber"><Icon name="straighten" /> 單位換算</span>
          </div>
        </article>
      </section>

      <section className="history-section">
        <h3>近期練習記錄</h3>
        <HistoryCard score="85" title="週末綜合卷" date="10/12" text="進步神速！但在『長度單位換算』上要更小心，建議再複習一次口訣。" tone="green" />
        <HistoryCard score="92" title="課堂小測：幾何" date="10/10" text="完美的幾何理解，面積公式運用得非常熟練，繼續保持！" tone="gray" />
      </section>
    </main>
  );
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
  onComplete: () => void;
  onRestart: () => void;
  quiz: GeneratedQuiz;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const submittedCount = quiz.items.filter((item) => submitted[item.id]).length;
  const allSubmitted = quiz.items.length > 0 && submittedCount === quiz.items.length;

  return (
    <main className="content-stack practice-screen">
      <section className="page-intro tight">
        <h2>互動練習</h2>
        <p>{quiz.parent_visible_rationale}</p>
        <div className="practice-progress-strip">
          <Metric value={`${submittedCount}/${quiz.items.length}`} label="Submitted" />
          <Metric value={`${Math.ceil(quiz.items.reduce((total, item) => total + item.estimated_time_seconds, 0) / 60)}`} label="Mins" />
          <Metric value={quiz.items[0]?.grade || 'HK'} label="Level" />
        </div>
      </section>

      <section className="practice-list">
        {quiz.items.map((item, index) => (
          <article className={submitted[item.id] ? 'practice-card answered' : 'practice-card'} key={item.id}>
            <div className="practice-meta">
              <span>Q{index + 1}</span>
              <span>{item.topic}</span>
              <b>{Math.round(item.estimated_time_seconds / 60)} min</b>
            </div>
            <h3>{item.question_text}</h3>

            <label className="student-answer-field">
              <span>你的答案</span>
              <textarea
                disabled={submitted[item.id]}
                value={answers[item.id] || ''}
                placeholder="在這裡作答；提交後才會顯示參考答案。"
                onChange={(event) => setAnswers((current) => ({ ...current, [item.id]: event.target.value }))}
              />
            </label>

            {submitted[item.id] ? (
              <div className="answer-panel">
                <span className="student-answer-review">
                  <Icon name="edit_note" />
                  你的答案：{answers[item.id]}
                </span>
                <strong>參考答案：{item.answer}</strong>
                <p>{item.explanation}</p>
                <small>{item.marking_scheme}</small>
              </div>
            ) : null}
            <button
              className="secondary-action"
              type="button"
              disabled={!answers[item.id]?.trim()}
              onClick={() => setSubmitted((current) => ({ ...current, [item.id]: true }))}
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
        <button className="primary-action" type="button" onClick={onComplete} disabled={!allSubmitted}>
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
          <Metric value={`${itemCount}`} label="Items" />
          <Metric value="+8%" label="Focus" />
          <Metric value={grade} label="Level" />
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

function CurriculumMapSection({
  child,
  onSelectSubject,
  selectedSubjectId,
}: {
  child: ChildProfile | null;
  onSelectSubject: (subjectId: string) => void;
  selectedSubjectId: string;
}) {
  const [selectedKla, setSelectedKla] = useState<KlaId | 'all'>('all');
  const profileGrade = normalizeGrade(child?.grade);
  const selectedStage = getStageForGrade(profileGrade);
  const stage = curriculumStages.find((item) => item.id === selectedStage) || curriculumStages[1];
  const klas = useMemo(() => getKlasForGrade(profileGrade), [profileGrade]);
  const gradeSubjects = useMemo(() => getSubjectsForGrade(profileGrade), [profileGrade]);
  const subjects = useMemo(() => getSubjectsForGrade(profileGrade, selectedKla), [profileGrade, selectedKla]);
  const notices = useMemo(() => gradeNotices(profileGrade), [profileGrade]);
  const sourceIds = useMemo(
    () => Array.from(new Set(gradeSubjects.flatMap((subject) => subject.sourceIds))).slice(0, 5),
    [gradeSubjects],
  );

  useEffect(() => {
    setSelectedKla('all');
  }, [profileGrade]);

  useEffect(() => {
    if (!subjects.length) return;
    if (!subjects.some((subject) => subject.id === selectedSubjectId)) {
      onSelectSubject(subjects[0].id);
    }
  }, [onSelectSubject, selectedSubjectId, subjects]);

  return (
    <section className="curriculum-map" aria-label="HKEDB curriculum map">
      <div className="curriculum-head">
        <div>
          <span className="verified-label"><Icon name="verified" filled /> Official EDB aligned · {profileGrade}</span>
          <h2>{child?.name || '孩子'} 的課程地圖</h2>
        </div>
        <a href="https://www.edb.gov.hk/en/curriculum-development/kla/overview.html" target="_blank" rel="noreferrer">
          Source
          <Icon name="open_in_new" />
        </a>
      </div>

      <div className="profile-grade-lock">
        <span className="grade-token"><Icon name="badge" /> {profileGrade}</span>
        <div>
          <strong>{stage.label} · {stage.caption}</strong>
          <p>{child?.school_type || '香港學校'} · {gradeSubjects.length} 個當前年級科目</p>
        </div>
      </div>

      <section className="stage-summary">
        <div>
          <span>{stage.caption}</span>
          <h3>{stage.learningGoal}</h3>
        </div>
        <div className="curriculum-metrics">
          <Metric value={String(klas.length)} label={selectedStage === 'kg' ? 'Areas' : 'KLAs'} />
          <Metric value={`${gradeSubjects.length}`} label="Subjects" />
          <Metric value="2025/26" label="EDB" />
        </div>
      </section>

      {notices.length ? (
        <div className="transition-notices">
          {notices.map((notice) => (
            <span key={notice.text}><Icon name={notice.icon} /> {notice.text}</span>
          ))}
        </div>
      ) : null}

      <div className="kla-filter" aria-label="KLA filter">
        <button className={selectedKla === 'all' ? 'active' : ''} type="button" onClick={() => setSelectedKla('all')}>
          All
        </button>
        {klas.map((kla) => (
          <button
            key={kla.id}
            className={selectedKla === kla.id ? 'active' : ''}
            type="button"
            onClick={() => setSelectedKla(kla.id)}
          >
            {shortKlaLabel(kla.name)}
          </button>
        ))}
      </div>

      <div className="subject-list">
        {subjects.map((subject) => (
          <CurriculumSubjectCard
            key={subject.id}
            grade={profileGrade}
            selected={subject.id === selectedSubjectId}
            subject={subject}
            onSelect={() => onSelectSubject(subject.id)}
          />
        ))}
      </div>

      <section className="source-strip">
        <div>
          <Icon name="policy" />
          <h3>官方來源</h3>
        </div>
        {sourceIds.map((sourceId) => {
          const source = getSourceById(sourceId);
          if (!source) return null;
          return (
            <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
              {source.title}
            </a>
          );
        })}
      </section>
    </section>
  );
}

function CourseContentSection({
  child,
  onStartPractice,
  selectedSubject,
}: {
  child: ChildProfile | null;
  onStartPractice: (options: PracticeStartOptions) => void;
  selectedSubject: CurriculumSubject | null;
}) {
  const profileGrade = normalizeGrade(child?.grade);
  const topics = useMemo(
    () => getCourseTopicsForGradeAndSubject(profileGrade, selectedSubject),
    [profileGrade, selectedSubject],
  );
  const [selectedTopicId, setSelectedTopicId] = useState(topics[0]?.id || '');
  const [topicQuestionCounts, setTopicQuestionCounts] = useState<Record<string, number>>({});
  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId) || topics[0];
  const totalQuestions = topics.reduce((total, topic) => total + (topicQuestionCounts[topic.id] || 0), 0);
  const activePlan = topics
    .map((topic) => ({
      topic,
      questionCount: topicQuestionCounts[topic.id] || 0,
    }))
    .filter((item) => item.questionCount > 0);

  useEffect(() => {
    setSelectedTopicId(topics[0]?.id || '');
    setTopicQuestionCounts(defaultTopicCounts(topics));
  }, [topics]);

  if (!selectedTopic) return null;

  return (
    <section className="course-planner" aria-label="Learning topics and course content">
      <div className="course-head">
        <div>
          <span><Icon name="auto_stories" filled /> Course content draft</span>
          <h2>{profileGrade} {selectedSubject?.displayNameZh || ''} Learning Topics</h2>
        </div>
        <b>019e81ae</b>
      </div>

      <div className="topic-rail" role="tablist" aria-label="Course topics">
        {topics.map((topic) => (
          <article
            key={topic.id}
            className={topic.id === selectedTopic.id ? 'topic-tile active' : 'topic-tile'}
          >
            <button
              className="topic-select"
              type="button"
              role="tab"
              aria-selected={topic.id === selectedTopic.id}
              onClick={() => setSelectedTopicId(topic.id)}
            >
              <span>{topic.subjectNameZh} · {topic.strand}</span>
              <strong>{topic.titleZh}</strong>
            </button>
            <QuestionStepper
              count={topicQuestionCounts[topic.id] || 0}
              label="題"
              onChange={(count) => setTopicQuestionCounts((current) => ({ ...current, [topic.id]: count }))}
            />
          </article>
        ))}
      </div>

      <article className="topic-detail-card">
        <div className="topic-detail-top">
          <div>
            <span>{selectedTopic.subjectName} · {selectedTopic.strand}</span>
            <h3>{selectedTopic.titleZh}</h3>
            <p>{selectedTopic.title}</p>
          </div>
          <Metric value={`${selectedTopic.lessonCount}`} label="Lessons" />
        </div>

        <div className="topic-stats">
          <span><Icon name="schedule" /> {selectedTopic.durationMinutes} min</span>
          <span><Icon name="signal_cellular_alt" /> {selectedTopic.level}</span>
          <span><Icon name="sell" /> {selectedTopic.evidenceTag}</span>
        </div>

        <section className="practice-builder" aria-label="Practice question allocation">
          <div className="builder-head">
            <div>
              <span>Practice setup</span>
              <h4>按 topic / area 分配題數</h4>
            </div>
            <Metric value={`${totalQuestions}`} label="Questions" />
          </div>
          <div className="allocation-list">
            {topics.map((topic) => (
              <div className={topic.id === selectedTopic.id ? 'allocation-row active' : 'allocation-row'} key={topic.id}>
                <button type="button" onClick={() => setSelectedTopicId(topic.id)}>
                  <span>{topic.strand}</span>
                  <strong>{topic.titleZh}</strong>
                </button>
                <QuestionStepper
                  count={topicQuestionCounts[topic.id] || 0}
                  label="題"
                  onChange={(count) => setTopicQuestionCounts((current) => ({ ...current, [topic.id]: count }))}
                />
              </div>
            ))}
          </div>
        </section>

        <div className="outcome-chips">
          {selectedTopic.outcomes.map((outcome) => (
            <span key={outcome}>{outcome}</span>
          ))}
        </div>

        <div className="lesson-list">
          {selectedTopic.lessons.map((lesson, index) => (
            <span key={lesson}>
              <b>{index + 1}</b>
              {lesson}
            </span>
          ))}
        </div>

        <button
          className="primary-action full"
          type="button"
          disabled={!totalQuestions}
          onClick={() => onStartPractice(buildPracticeOptions(selectedSubject, activePlan))}
        >
          <Icon name="play_lesson" filled />
          Generate {totalQuestions || 0} questions
        </button>
      </article>
    </section>
  );
}

function QuestionStepper({
  count,
  label,
  onChange,
}: {
  count: number;
  label: string;
  onChange: (count: number) => void;
}) {
  return (
    <div className="question-stepper" aria-label={`Question count ${count}`}>
      <button type="button" aria-label="Decrease questions" onClick={() => onChange(Math.max(0, count - 1))}>
        <Icon name="remove" />
      </button>
      <span><b>{count}</b>{label}</span>
      <button type="button" aria-label="Increase questions" onClick={() => onChange(Math.min(10, count + 1))}>
        <Icon name="add" />
      </button>
    </div>
  );
}

function defaultTopicCounts(topics: CourseTopic[]) {
  return Object.fromEntries(topics.map((topic) => [topic.id, 1]));
}

function buildPracticeOptions(
  selectedSubject: CurriculumSubject | null,
  activePlan: Array<{ topic: CourseTopic; questionCount: number }>,
): PracticeStartOptions {
  const practicePlan = activePlan.map(({ questionCount, topic }) => ({
    question_count: questionCount,
    strand: topic.strand,
    title: topic.title,
    title_zh: topic.titleZh,
    topic_id: topic.id,
  }));

  return {
    practicePlan,
    questionCount: practicePlan.reduce((total, item) => total + item.question_count, 0),
    subject: selectedSubject?.name || activePlan[0]?.topic.subjectName || 'Mathematics',
    weakTopic: practicePlan.map((item) => item.title_zh).join(' / '),
  };
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="metric-pill">
      <strong>{value}</strong>
      <small>{label}</small>
    </span>
  );
}

function CurriculumSubjectCard({
  grade,
  onSelect,
  selected,
  subject,
}: {
  grade: string;
  onSelect: () => void;
  selected: boolean;
  subject: CurriculumSubject;
}) {
  return (
    <button
      className={selected ? 'curriculum-subject-card selected' : 'curriculum-subject-card'}
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
    >
      <div className="subject-card-top">
        <div>
          <span>{subject.klaName}</span>
          <h3>{subject.displayNameZh}</h3>
          <p>{subject.name}</p>
        </div>
        <b>{grade}</b>
      </div>
      <div className="strand-tags">
        {subject.strands.slice(0, 3).map((strand) => (
          <span key={strand}>{strand}</span>
        ))}
      </div>
      <p className="app-use"><Icon name="auto_awesome" /> {subject.appUse}</p>
      {subject.status ? <p className="subject-status">{subject.status}</p> : null}
    </button>
  );
}

function gradeNotices(grade: string) {
  if (grade === 'P1' || grade === 'P4') {
    return [
      { icon: 'science', text: '小學科學 / 小學人文 2025/26 首批級別' },
      { icon: 'swap_horiz', text: '常識科逐步過渡至新科目' },
    ];
  }

  if (['P2', 'P3', 'P5', 'P6'].includes(grade)) {
    return [
      { icon: 'swap_horiz', text: '常識科過渡級別，2027/28 前逐步替換' },
      { icon: 'code', text: '高小需保留編程 / 科技教育 evidence' },
    ];
  }

  if (['S1', 'S2', 'S3'].includes(grade)) {
    return [
      { icon: 'history_edu', text: '中國歷史為初中獨立必修科' },
      { icon: 'account_balance', text: '公民、經濟與社會按初中年級推進' },
    ];
  }

  if (['S4', 'S5', 'S6'].includes(grade)) {
    return [
      { icon: 'hub', text: '核心科、選修科、應用學習與 OLE 並行' },
      { icon: 'route', text: 'Portfolio 連結升學與生涯 evidence' },
    ];
  }

  return [{ icon: 'extension', text: '幼稚園按六個學習範疇保存成長證據' }];
}

function shortKlaLabel(klaName: string) {
  if (klaName.includes('Chinese')) return 'Chinese';
  if (klaName.includes('English')) return 'English';
  if (klaName.includes('Mathematics')) return 'Maths';
  if (klaName.includes('Science')) return 'Science';
  if (klaName.includes('Technology')) return 'Tech';
  if (klaName.includes('Humanities')) return 'PSHE';
  if (klaName.includes('Arts')) return 'Arts';
  if (klaName.includes('Physical')) return 'PE';
  if (klaName.includes('Kindergarten')) return 'KG';
  return 'Other';
}

function Mastery({ label, tone, value }: { label: string; tone: string; value: number }) {
  return (
    <div className="mastery-row">
      <span>{label}</span>
      <div className="mastery-track">
        <i className={tone} style={{ width: `${value}%` }} />
      </div>
      <b>{value}%</b>
    </div>
  );
}

function HistoryCard({ date, score, text, title, tone }: { date: string; score: string; text: string; title: string; tone: string }) {
  return (
    <article className="history-card">
      <div className={`score-ring ${tone}`}>
        <strong>{score}</strong>
        <span>分</span>
      </div>
      <div>
        <div className="history-meta">
          <strong>{title}</strong>
          <span>{date}</span>
        </div>
        <p><Icon name={tone === 'green' ? 'robot_2' : 'verified'} /> {text}</p>
      </div>
    </article>
  );
}

function ProfileView({
  children,
  currentChild,
  onAddChild,
  onEditChild,
  onEditParent,
  onLogout,
  onOpenSetting,
  parent,
  selectedChildId,
  setSelectedChildId,
}: {
  children: ChildProfile[];
  currentChild: ChildProfile | null;
  onAddChild: () => void;
  onEditChild: () => void;
  onEditParent: () => void;
  onLogout: () => void;
  onOpenSetting: (sheet: ProfileSheet) => void;
  parent: ParentProfile;
  selectedChildId: string;
  setSelectedChildId: (id: string) => void;
}) {
  const settings = [
    { icon: 'workspace_premium', title: 'Learning Plus', subtitle: 'Active Subscription', badge: 'Manage', sheet: 'learning-plus' as const },
    { icon: 'language', title: 'Language', value: '繁體中文', sheet: 'language' as const },
    { icon: 'security', title: 'Data & Privacy', subtitle: 'Uploads, PCPD consent', sheet: 'privacy' as const },
    { icon: 'notifications', title: 'Notification Settings', sheet: 'notifications' as const },
    { icon: 'help_center', title: 'Support & FAQ', sheet: 'support' as const },
  ];

  return (
    <main className="profile-content">
      <section className="parent-profile">
        <div className="parent-avatar">
          <img src={images.parent} alt="Parent Avatar" />
          <button type="button" aria-label="Edit parent profile" onClick={onEditParent}>
            <Icon name="edit" />
          </button>
        </div>
        <h2>{parent.display_name}</h2>
        <p>{parent.email}</p>
        <div className="profile-action-row">
          <button type="button" onClick={onEditParent}>Edit Parent</button>
          <button type="button" onClick={onEditChild}>Edit {currentChild?.name || 'Child'}</button>
        </div>
      </section>

      <section className="children-section">
        <h3>Children</h3>
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
            <span>Add Child</span>
          </button>
        </div>
      </section>

      <section className="settings-list">
        <h3>App Settings</h3>
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
            <span className="settings-copy"><strong>Logout</strong></span>
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

function PreviewLightbox({ image, onClose }: { image: string; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Homework preview">
      <section className="preview-lightbox">
        <button className="symbol-button" type="button" aria-label="Close preview" onClick={onClose}>
          <Icon name="close" />
        </button>
        <img src={image} alt="Full homework preview" />
      </section>
    </div>
  );
}

function ProfileSheetModal({
  currentChild,
  kind,
  parent,
  onAddChild,
  onClose,
  onDeleteChild,
  onPrivacySave,
  onUpdateParent,
  onUpdateChild,
}: {
  currentChild: ChildProfile | null;
  kind: ProfileSheet;
  parent: ParentProfile;
  onAddChild: (payload: Omit<ChildProfile, 'id'>) => Promise<void>;
  onClose: () => void;
  onDeleteChild: (childId: string, confirmationName: string) => Promise<{ parent: ParentProfile }>;
  onPrivacySave: (updates: Partial<PrivacySettings>) => Promise<PrivacyCenterResponse>;
  onUpdateParent: (updates: ParentProfileUpdates) => Promise<void>;
  onUpdateChild: (updates: Partial<ChildProfile>) => Promise<void>;
}) {
  if (!kind) return null;

  const titles: Record<Exclude<ProfileSheet, null>, string> = {
    'add-child': 'Add Child',
    'edit-child': `Edit ${currentChild?.name || 'Child'}`,
    'edit-parent': 'Edit Parent',
    language: 'Language',
    'learning-plus': 'Learning Plus',
    notifications: 'Notifications',
    privacy: 'Data & Privacy',
    support: 'Support & FAQ',
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={titles[kind]}>
      <section className="profile-sheet">
        <div className="sheet-head">
          <h2>{titles[kind]}</h2>
          <button className="symbol-button" type="button" aria-label="Close" onClick={onClose}>
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
            submitLabel="Save Profile"
            onSubmit={async (payload) => {
              await onUpdateChild(payload);
              onClose();
            }}
          />
        ) : null}

        {kind === 'add-child' ? (
          <ChildProfileForm
            submitLabel="Add Child"
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
          <SettingPanel icon="language" title="繁體中文 / English" text="Prototype language is currently Traditional Chinese with English labels where Stitch source screens use bilingual copy." />
        ) : null}

        {kind === 'notifications' ? (
          <SettingPanel icon="notifications" title="Weekly progress reminders" text="Reminder preferences are staged here. The next backend phase can persist email / push notification choices per parent." />
        ) : null}

        {kind === 'learning-plus' ? (
          <SettingPanel icon="workspace_premium" title="Active Subscription" text="Learning Plus is marked active for the demo account. Billing integration is intentionally not connected in this prototype." />
        ) : null}

        {kind === 'support' ? (
          <SettingPanel icon="help_center" title="Support & FAQ" text="For prototype testing, use this panel to confirm navigation and settings flow. A real FAQ / support channel can be added as a separate screen." />
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
      setError(submitError instanceof Error ? submitError.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="sheet-form" onSubmit={submit}>
      <label>
        Parent display name
        <input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
      </label>
      <label>
        Email
        <input readOnly value={initial.email} />
      </label>
      {error ? <strong className="login-error">{error}</strong> : null}
      <button className="primary-action full" type="submit" disabled={saving}>
        <Icon name={saving ? 'sync' : 'save'} filled />
        {saving ? 'Saving...' : 'Save Parent'}
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
  const [focus, setFocus] = useState(initial?.focus || '小學數學 + Portfolio');
  const [schoolType, setSchoolType] = useState(initial?.school_type || '香港主流小學');
  const [language, setLanguage] = useState(initial?.language || '繁中 / English');
  const [passport, setPassport] = useState(initial?.passport || 'Learning Passport');
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
      setError(submitError instanceof Error ? submitError.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="sheet-form" onSubmit={submit}>
      <label>
        Child name
        <input required value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Grade
        <select required value={grade} onChange={(event) => setGrade(event.target.value)}>
          {gradeOptions.map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
      <label>
        Passport
        <input value={passport} onChange={(event) => setPassport(event.target.value)} />
      </label>
      <label>
        Learning focus
        <textarea value={focus} onChange={(event) => setFocus(event.target.value)} />
      </label>
      <label>
        Language
        <select value={language} onChange={(event) => setLanguage(event.target.value)}>
          <option>繁中 / English</option>
          <option>繁體中文</option>
          <option>English</option>
        </select>
      </label>
      <label>
        School type
        <input value={schoolType} onChange={(event) => setSchoolType(event.target.value)} />
      </label>
      {error ? <strong className="login-error">{error}</strong> : null}
      <button className="primary-action full" type="submit" disabled={saving}>
        <Icon name={saving ? 'sync' : 'save'} filled />
        {saving ? 'Saving...' : submitLabel}
      </button>
    </form>
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
    const response = await fetch('/api/privacy', { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
    setSummary(data);
    setSettings(data.privacy_settings);
  }

  useEffect(() => {
    let alive = true;
    fetch('/api/privacy', { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
        if (!alive) return;
        setSummary(data);
        setSettings(data.privacy_settings);
      })
      .catch((privacyError) => {
        if (!alive) return;
        setError(privacyError instanceof Error ? privacyError.message : 'Privacy settings unavailable');
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
      setError(saveError instanceof Error ? saveError.message : 'Save failed');
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
      setError(deleteError instanceof Error ? deleteError.message : 'Delete failed');
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
        <h3>Parent consent & child data</h3>
        <p>Control AI processing, upload storage, portfolio export and retention for {activeChild?.name || 'your child'}.</p>
        <span className={consentSaved ? 'privacy-status saved' : 'privacy-status'}>
          <Icon name={consentSaved ? 'check_circle' : 'pending'} filled />
          {consentSaved ? 'Consent saved' : 'Consent pending'}
        </span>
      </section>

      <section className="privacy-card">
        <h3>Data Processing</h3>
        <ConsentSwitch
          checked={settings.ai_processing_consent}
          description="AI 分析處理：allow OCR text and homework review to be processed by Vertex AI."
          label="AI review processing"
          onChange={(checked) => updateSetting('ai_processing_consent', checked)}
        />
        <ConsentSwitch
          checked={settings.upload_storage_consent}
          description="作業上傳儲存：store homework images or PDFs in the child workspace."
          label="Homework upload storage"
          onChange={(checked) => updateSetting('upload_storage_consent', checked)}
        />
        <ConsentSwitch
          checked={settings.portfolio_export_consent}
          description="作品集 PDF 導出：save generated portfolio PDFs for download history."
          label="Portfolio PDF export"
          onChange={(checked) => updateSetting('portfolio_export_consent', checked)}
        />
        <ConsentSwitch
          checked={settings.product_updates_consent}
          description="產品更新：receive prototype progress and testing reminders."
          label="Product updates"
          onChange={(checked) => updateSetting('product_updates_consent', checked)}
        />
      </section>

      <section className="privacy-card">
        <div className="privacy-card-head">
          <h3>Data Retention</h3>
          <Icon name="info" />
        </div>
        <p>Automatically delete child data and activity history after a set period.</p>
        <div className="retention-segments" role="group" aria-label="Data retention period">
          {[
            { label: '90 days', value: 90 },
            { label: '180 days', value: 180 },
            { label: '1 year', value: 365 },
            { label: 'Until deleted', value: 3650 },
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
              <Icon name="description" /> Documents: {childSummary?.document_count ?? 0}
              <Icon name="picture_as_pdf" /> Portfolio PDFs: {childSummary?.portfolio_export_count ?? 0}
            </p>
          </div>
        </section>
      ) : null}

      <section className="privacy-card">
        <h3>Audit activity</h3>
        <div className="audit-list">
          {auditEvents.length ? auditEvents.slice(0, 3).map((event) => (
            <div className="audit-row" key={event.id}>
              <Icon name={event.event_type === 'child_data_deleted' ? 'delete_forever' : 'verified_user'} />
              <div>
                <strong>{auditEventLabel(event.event_type)}</strong>
                <span>{formatAuditTime(event.created_at)}</span>
              </div>
            </div>
          )) : (
            <p>No privacy activity yet.</p>
          )}
        </div>
      </section>

      {activeChild ? (
        <section className="danger-zone-card">
          <div className="danger-zone-head">
            <Icon name="warning" filled />
            <div>
              <h3>Danger Zone</h3>
              <p>Permanently delete all data, generated portfolios, and settings for {activeChild.name}. This action cannot be undone.</p>
            </div>
          </div>
          <label>
            To confirm, type "{activeChild.name}"
            <input value={deleteName} onChange={(event) => setDeleteName(event.target.value)} placeholder={`Type ${activeChild.name}`} />
          </label>
          {!canDelete ? <small>Keep at least one child profile in this prototype account.</small> : null}
          <button className="danger-action" type="button" disabled={!deleteReady || !canDelete || deleting} onClick={confirmDelete}>
            <Icon name={deleting ? 'sync' : 'delete_forever'} />
            {deleting ? 'Deleting...' : `Delete ${activeChild.name} data`}
          </button>
        </section>
      ) : null}

      {error ? <strong className="login-error">{error}</strong> : null}

      <div className="privacy-save-bar">
        <button className={saving ? 'primary-action full saving' : 'primary-action full'} type="button" onClick={savePrivacy} disabled={saving}>
          <span />
          {saving ? 'Saving...' : 'Save privacy settings'}
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
  if (eventType === 'privacy_settings_updated') return 'Privacy settings updated';
  if (eventType === 'child_data_deleted') return 'Child data deleted';
  if (eventType === 'portfolio_exported') return 'Portfolio PDF exported';
  return eventType.replace(/_/g, ' ');
}

function formatAuditTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-HK', { dateStyle: 'medium', timeStyle: 'short' });
}

function BottomNav({ activeView, setActiveView }: { activeView: View; setActiveView: (view: View) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={activeView === item.id ? 'active' : ''}
          type="button"
          onClick={() => setActiveView(item.id)}
        >
          <Icon name={item.icon} filled={activeView === item.id} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default App;
