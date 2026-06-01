import { Fragment, type ChangeEvent, type FormEvent, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import {
  curriculumStages,
  getStageForGrade,
  getSubjectsForGrade,
  isAcademicProgressSubject,
  normalizeGrade,
  type CurriculumSubject,
} from './data/curriculum';
import { getCourseTopicsForGradeAndSubject, type CourseTopic } from './data/courseContent';

type View = 'home' | 'portfolio' | 'upload' | 'coach' | 'profile';
type AuthMode = 'login' | 'signup';

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

type UploadPreviewItem = {
  name: string;
  type: string;
  url: string | null;
};

type PortfolioStatus = 'Completed' | 'AI Ready' | 'Drafting';

type PortfolioStoredSection = {
  id: string;
  status: PortfolioStatus | string;
  body: string;
  evidence: string[];
  updated_at?: string | null;
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
  portfolio_sections?: PortfolioStoredSection[];
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
  evidenceSuggestions?: string[];
  requiredEvidence: number;
  image?: string;
  updatedAt: string;
};

type QuizItem = {
  id: string;
  grade: string;
  subject?: string;
  topic: string;
  question_text: string;
  options?: string[];
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

type LearningTopicSummary = {
  topic: string;
  subject: string;
  evidence_count: number;
  practice_count: number;
  correct_count: number;
  incorrect_count: number;
  mastery: number;
  trend: 'improving' | 'steady' | 'needs_attention';
  last_seen_at?: string | null;
};

type SubjectProgressSummary = {
  subject: string;
  evidence_count: number;
  practice_count: number;
  correct_count: number;
  incorrect_count: number;
  mastery: number;
  last_seen_at?: string | null;
};

type LearningProgress = {
  child: ChildProfile;
  report_month: string;
  document_count: number;
  practice_count: number;
  overall_mastery: number;
  trend_points: number[];
  weak_topics: LearningTopicSummary[];
  improved_topics: LearningTopicSummary[];
  all_topics: LearningTopicSummary[];
  subject_scores?: SubjectProgressSummary[];
  recent_activity: Array<Record<string, unknown>>;
};

type ShareReport = {
  token: string;
  share_url: string;
  report_month: string;
  teacher_name?: string | null;
  expires_at?: string | null;
};

type PracticeSubmission = Record<string, { answer: string; isCorrect: boolean }>;

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
  { id: 'home', label: '首頁', icon: 'home' },
  { id: 'portfolio', label: '檔案', icon: 'import_contacts' },
  { id: 'upload', label: '上載', icon: 'add_a_photo' },
  { id: 'coach', label: '進度', icon: 'monitoring' },
  { id: 'profile', label: '設定', icon: 'person' },
];

const gradeOptions = ['K1', 'K2', 'K3', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

const evidenceSuggestions = ['作品相片', '家長觀察', '課堂紀錄', '功課證據', '活動證書'];
const activeCoachSubjectId = 'mathematics';
const activeCoachSubjectName = 'Mathematics';
const defaultPassportName = '學習護照';
const languageOptions = ['繁體中文', '英文', '雙語：繁中及英文'];

const subjectDisplayNames: Record<string, string> = {
  'Chinese Language': '中國語文',
  'Early Childhood Mathematics': '幼兒數學',
  'English Language': '英國語文',
  'Expressing feelings': '情緒表達',
  'Fractions': '分數',
  'Fractions word problems': '分數應用題',
  'General Studies': '常識',
  Inference: '閱讀推論',
  Language: '語文',
  Mathematics: '數學',
  'Number sense': '數感',
  Patterns: '規律',
  'Reading comprehension': '閱讀理解',
  'Self and Society': '個人與群體',
  'Sentence grammar': '句子文法',
  'Story retelling': '故事重述',
  'Community facilities': '社區設施',
  'Self-care routines': '自理常規',
  'Taking turns': '輪候與分享',
  'Two-step word problems': '兩步應用題',
  'Vocabulary in context': '語境詞彙',
};

function displayPassportName(value?: string | null) {
  if (!value || value === 'Learning Passport') return defaultPassportName;
  return value;
}

function portfolioStatusLabel(status: string) {
  if (status === 'Completed') return '已完成';
  if (status === 'AI Ready') return 'AI 草稿';
  if (status === 'Drafting') return '草稿中';
  return status;
}

function displaySubjectName(value?: string | null) {
  if (!value) return '未分類';
  return subjectDisplayNames[value] || value;
}

function displayTopicName(value?: string | null) {
  if (!value) return '未分類主題';
  return subjectDisplayNames[value] || value;
}

function displayKlaName(subject: CurriculumSubject) {
  const labels: Record<string, string> = {
    arts: '藝術教育',
    'chinese-language': '中國語文教育',
    'cross-curricular': '跨學科學習',
    'english-language': '英國語文教育',
    kindergarten: '幼稚園學習範疇',
    mathematics: '數學教育',
    'physical-education': '體育',
    pshe: '個人、社會及人文教育',
    science: '科學教育',
    technology: '科技教育',
  };
  return labels[subject.klaId] || subject.klaName;
}

function displaySubjectUse(subject: CurriculumSubject) {
  if (subject.klaId === 'kindergarten') return '作為成長觀察與作品集證據';
  return '作為成績、OCR 證據與弱項主題追蹤';
}

function displayStageCaption(value: string) {
  const labels: Record<string, string> = {
    Kindergarten: '幼稚園',
    Primary: '小學',
    'Junior Secondary': '初中',
    'Senior Secondary': '高中',
  };
  return labels[value] || value;
}

function displaySubjectStatus(value?: string) {
  if (!value) return '';
  if (value === 'Progressively replaced by Primary Science and Primary Humanities from 2025/26.') {
    return '由 2025/26 起逐步由小學科學及小學人文取代。';
  }
  return value;
}

function displayStrandName(value: string) {
  const labels: Record<string, string> = {
    accounting: '會計',
    algebra: '代數',
    argumentation: '論證',
    'arts in context': '情境中的藝術',
    citizenship: '公民',
    communication: '溝通',
    community: '社群',
    culture: '文化',
    data: '數據',
    'data handling': '數據處理',
    'data skills': '數據技能',
    ecology: '生態',
    economics: '經濟',
    energy: '能量',
    ethics: '倫理',
    'everyday inquiry': '日常探究',
    'gross motor': '大肌肉發展',
    health: '健康',
    'health habits': '健康習慣',
    'historical enquiry': '歷史探究',
    'historical sources': '歷史資料',
    ICT: '資訊科技',
    interpersonal: '人際溝通',
    listening: '聆聽',
    'living environment': '生活環境',
    measure: '量度',
    music: '音樂',
    number: '數',
    'number sense': '數感',
    observation: '觀察',
    patterns: '規律',
    'personal and social': '個人與社會',
    phonetics: '語音',
    programming: '編程',
    reading: '閱讀',
    reflection: '反思',
    'safety awareness': '安全意識',
    'shape and space': '圖形與空間',
    'social skills': '社交技巧',
    speaking: '說話',
    'science and technology': '科學與科技',
    sustainability: '可持續發展',
    values: '價值觀',
    'values and attitudes': '價值觀與態度',
    'visual expression': '視覺表達',
    writing: '寫作',
  };
  return labels[value] || value;
}

function formatActivityDate(value: unknown) {
  const source = String(value || '');
  if (!source) return '剛剛';
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return source.slice(5, 10) || source;
  return date.toLocaleDateString('zh-HK', { month: 'short', day: 'numeric' });
}

function preferredChildId(parent: ParentProfile): string {
  return parent.children.find((child) => child.id === 'child-matthew')?.id || parent.children[0]?.id || 'child-matthew';
}

function preferredProgressSubjectId(subjects: CurriculumSubject[]) {
  return subjects.find((subject) => subject.id === activeCoachSubjectId)?.id || subjects[0]?.id || '';
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
  return new Date().toLocaleDateString('zh-HK', { month: 'short', day: 'numeric' });
}

function isEarlyYearsGrade(grade: string | undefined) {
  return ['K1', 'K2', 'K3'].includes(normalizeGrade(grade));
}

function portfolioStageCopy(child: ChildProfile | null) {
  if (isEarlyYearsGrade(child?.grade)) {
    return {
      badge: '全人發展檔案',
      pdfLabel: '可匯出檔案',
      tipReady: '個成長章節已有 AI 草稿，可由家長確認。',
      tipDone: '幼兒成長檔案已可直接匯出 PDF。',
    };
  }
  return {
    badge: '學科學習護照',
    pdfLabel: '可匯出 PDF',
    tipReady: '個學科章節已有 AI 草稿，可由家長確認。',
    tipDone: '所有學科章節已可直接匯出 PDF。',
  };
}

function usesDemoPortfolioContent(child: ChildProfile | null) {
  return !child || child.id === 'child-matthew' || child.id === 'child-chloe';
}

function blankPortfolioSectionsForNewChild(sections: PortfolioSectionDraft[]) {
  return sections.map((section) => ({
    ...section,
    status: 'Drafting' as PortfolioStatus,
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
        copy: '基本資料、成長焦點與代表相片。',
        status: 'Completed',
        body: `${childName} 的幼兒成長檔案已整理年級 ${grade}、家庭觀察、代表相片及發展焦點，適合作幼稚園或升小面試前的準備草稿。`,
        aiDraft: `${childName} 的幼兒成長檔案可從家庭觀察、日常規律與已確認的發展證據介紹孩子，而不是以學科分數作核心。`,
        evidence: ['學生相片', '基本資料'],
        evidenceSuggestions: ['學生相片', '家庭觀察', '成長焦點', '老師短評'],
        requiredEvidence: 2,
        image: images.portfolioChild,
        updatedAt: formatPortfolioDate(),
      },
      {
        id: 'about',
        icon: 'face',
        title: '關於我',
        shortTitle: '關於我',
        copy: '性格、興趣、家庭生活及表達方式。',
        status: 'Completed',
        body: `${childName} 喜歡透過遊戲和日常生活表達想法。家長可補充孩子的興趣、性格特質、常用語言，以及在熟悉環境中的互動表現。`,
        aiDraft: `${childName} 正透過遊戲、家庭日常和簡單對話建立自我認識，能逐步表達興趣與感受。`,
        evidence: ['家長觀察', '興趣紀錄'],
        evidenceSuggestions: ['興趣相片', '家庭活動', '孩子語錄', '自我介紹錄音'],
        requiredEvidence: 2,
        updatedAt: formatPortfolioDate(),
      },
      {
        id: 'language',
        icon: 'record_voice_over',
        title: '語言與溝通',
        shortTitle: '語言',
        copy: '聆聽、表達、故事分享及雙語接觸。',
        status: 'AI Ready',
        body: `${childName} 正在建立聆聽與表達能力，能用熟悉詞語分享需要、感受和日常經驗。下一步可加入故事閱讀、唱歌或對話例子。`,
        aiDraft: `${childName} 會透過熟悉詞語、手勢、故事和遊戲對話表達需要與想法，家長可補充雙語日常例子。`,
        evidence: ['故事閱讀', '日常對話'],
        evidenceSuggestions: ['故事閱讀相片', '唱歌錄音', '中英文詞語例子', '課堂互動紀錄'],
        requiredEvidence: 3,
        updatedAt: formatPortfolioDate(),
      },
      {
        id: 'self-care',
        icon: 'health_and_safety',
        title: '自理與獨立性',
        shortTitle: '自理',
        copy: '穿衣、收拾、進食、如廁及日常規律。',
        status: 'Drafting',
        body: `${childName} 正在建立日常自理習慣，包括收拾個人物品、跟隨簡單步驟，以及在需要協助時清楚表達。`,
        aiDraft: `${childName} 正在熟悉日常流程中建立獨立性，能在成人溫和提示下跟隨簡單步驟。`,
        evidence: ['日常觀察'],
        evidenceSuggestions: ['收拾書包相片', '進食紀錄', '如廁／洗手習慣', '生活技能觀察'],
        requiredEvidence: 2,
        updatedAt: formatPortfolioDate(),
      },
      {
        id: 'social-emotional',
        icon: 'diversity_1',
        title: '社交與情緒',
        shortTitle: '社交',
        copy: '合作、輪候、情緒表達及同伴互動。',
        status: 'Drafting',
        body: `${childName} 在成人引導下練習輪候、分享及表達情緒。家長可加入同伴活動或家庭互動例子，展示孩子的社交發展。`,
        aiDraft: `${childName} 正學習說出感受、輪候和參與小組活動，並能在成人引導下與同伴互動。`,
        evidence: ['同伴活動'],
        evidenceSuggestions: ['小組活動相片', '情緒表達例子', '合作遊戲', '老師觀察'],
        requiredEvidence: 3,
        updatedAt: formatPortfolioDate(),
      },
      {
        id: 'artworks',
        icon: 'palette',
        title: '創意與體能',
        shortTitle: '創意體能',
        copy: '藝術創作、音樂律動、大小肌肉及感官探索。',
        status: 'Drafting',
        body: `${childName} 的作品和活動可展示創意、手眼協調、專注力和探索精神。下一步可補充作品相片、活動過程及家長短評。`,
        aiDraft: `${childName} 的創作與體能活動證據展示好奇心、精細動作練習、感官探索和願意嘗試的態度。`,
        evidence: ['視藝作品'],
        evidenceSuggestions: ['作品相片', '積木／拼砌活動', '音樂律動', '戶外體能活動'],
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
      body: `${childName} 的學科學習護照已整理基本資料、年級 ${grade}、學習焦點及代表證據，可作家長、補習老師或學校溝通草稿。`,
      aiDraft: `${childName} 的學科學習護照會介紹目前年級、學習目標、代表作品和家長確認的證據。`,
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
      copy: '學習風格、興趣科目及家庭支援。',
      status: 'Completed',
      body: `${childName} 喜歡主動發問，能把新知識連繫到日常生活。家長觀察到孩子在 ${focus} 方面有清晰興趣，適合以短練習、錯題回顧和可視化例子鞏固。`,
      aiDraft: `${childName} 適合以有結構的練習、家長可見的回饋，以及連繫日常生活的例子來鞏固學習。`,
      evidence: ['家長觀察', '興趣紀錄'],
      evidenceSuggestions: ['家長觀察', '學習習慣紀錄', '興趣科目', '補習老師備註'],
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
      title: '學科進展',
      shortTitle: '進展',
      copy: 'OCR 證據、練習結果、強弱項及進步曲線。',
      status: 'Drafting',
      body: `${childName} 的學科進展應連結已確認的功課、測驗、練習結果與弱項主題，避免只靠主觀描述。下一步可加入最近一次 OCR 檢視和練習紀錄。`,
      aiDraft: `${childName} 的學科進展應連結已上載作品、已確認錯題、練習結果和家長同意的下一步。`,
      evidence: ['OCR 證據'],
      evidenceSuggestions: ['功課 OCR 檢視', '測驗分數', '練習結果', '弱項主題摘要'],
      requiredEvidence: 3,
      updatedAt: formatPortfolioDate(),
    },
    {
      id: 'artworks',
      icon: 'emoji_events',
      title: '成果與活動',
      shortTitle: '成果',
      copy: '作品、比賽、活動、閱讀或跨學科證據。',
      status: 'Drafting',
      body: `${childName} 的成果證據可展示課外活動、閱讀、創意作品或跨學科能力。這部分應支援學習目標，而不是取代核心學科進展。`,
      aiDraft: `${childName} 的成果證據若能連繫學習目標，就可展示更廣泛的強項、興趣和可遷移能力。`,
      evidence: ['活動紀錄'],
      evidenceSuggestions: ['活動證書', '閱讀紀錄', '專題作品', '比賽／表演相片'],
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

function calculatePortfolioProgress(sections: PortfolioSectionDraft[]) {
  if (!sections.length) return 0;
  const score = sections.reduce((total, section) => {
    const evidenceScore = Math.min(section.evidence.length / Math.max(section.requiredEvidence, 1), 1) * 0.25;
    const statusScore = section.status === 'Completed' ? 0.75 : section.status === 'AI Ready' ? 0.5 : 0;
    return total + statusScore + evidenceScore;
  }, 0);
  return Math.min(100, Math.round((score / sections.length) * 100));
}

function buildPortfolioExportSections(sections: PortfolioSectionDraft[]) {
  return sections.map((section) => ({
    title: section.title,
    status: section.status,
    body: `${section.body.trim()} 證據：${section.evidence.join('、') || '尚待加入。'}`,
  }));
}

function homeContentForChild(child: ChildProfile | null) {
  const childName = child?.name || '孩子';
  const earlyYears = isEarlyYearsGrade(child?.grade);

  if (earlyYears) {
    return {
      summaryIcon: 'diversity_1',
      summaryTitle: '本週成長摘要',
      summaryBody: (
        <>
          本週加入 <strong>2</strong> 項生活觀察，{childName} 在自理、表達和小組互動上有新證據。
        </>
      ),
      actionIcon: 'child_care',
      actionKicker: '今日建議',
      actionTitle: '整理一項自理或社交觀察',
      actionLabel: '整理檔案',
      actionView: 'portfolio' as View,
      actionDescription: '加入一項家長確認的生活片段，建立面試作品集可用證據。',
      portfolioTitle: '幼兒成長檔案',
      portfolioText: '整理性格、語言、自理、社交情緒、創意與體能發展。',
      progress: 61,
      masteryScore: 68,
      masteryLabel: '成長準備度',
      trendLabel: '本週新增 3 項觀察',
      progressTitle: '全人發展',
      progressText: `${childName} 正在累積自理、語言、社交與創意表達證據。`,
      progressItems: [
        { icon: 'self_improvement', label: '自理', value: 72, tone: 'secondary' },
        { icon: 'record_voice_over', label: '語言', value: 68, tone: 'primary' },
        { icon: 'diversity_1', label: '社交', value: 64, tone: 'tertiary' },
      ],
      goals: [
        { label: '完成 1 項自理觀察', completed: true },
        { label: '上載 1 張作品或活動相片', actionLabel: '上載', actionView: 'upload' as View },
        { label: '檢視「關於我」檔案草稿', actionLabel: '檢視', actionView: 'portfolio' as View },
      ],
      coachIcon: 'psychology_alt',
      coachTitle: 'AI 成長觀察',
      coachText: '以家長確認的生活片段生成面試友善描述，不以學科分數作核心。',
      tags: ['自理能力', '語言表達', '社交情緒'],
      recentUploads: [
        { image: images.portfolioChild, title: '自我介紹相片', time: '今天 10:20' },
        { image: images.blocks, title: '積木合作活動', time: '昨天 17:40' },
        { image: images.artwork, title: '創意畫作', time: '上週五' },
        { image: images.drawing, title: '親子閱讀紀錄', time: '上週三' },
        { image: images.child, title: '生活自理觀察', time: '5月28日' },
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
    actionTitle: '查看各科成績進度',
    actionLabel: '查看進度',
    actionView: 'coach' as View,
    actionDescription: '按學科整理 OCR 證據、測驗分數與弱項主題。',
    portfolioTitle: '學習歷程檔案',
    portfolioText: '收集並整理學生的學習成果與進步軌跡。',
    progress: 65,
    masteryScore: 78,
    masteryLabel: '掌握度',
    trendLabel: '本週提升 5%',
    progressTitle: '學習進度',
    progressText: `${childName} 今個月保持穩定進步，已確認的功課和練習紀錄會用來更新各科成績。`,
    progressItems: [
      { icon: 'calculate', label: '數學', value: 85, tone: 'primary' },
      { icon: 'menu_book', label: '語文', value: 72, tone: 'tertiary' },
      { icon: 'science', label: '常識', value: 60, tone: 'secondary' },
    ],
    goals: [
      { label: '檢視最新各科成績', completed: true },
      { label: '上載 1 份已批改功課', actionLabel: '上載', actionView: 'upload' as View },
      { label: '整理語文改正紀錄', actionLabel: '檢視', actionView: 'portfolio' as View },
    ],
    coachIcon: 'monitoring',
    coachTitle: '學科進度',
    coachText: '集中追蹤各學科的成績、證據與弱項。',
    tags: ['數學', '語文', '科學'],
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
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [progressState, setProgressState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [shareReport, setShareReport] = useState<ShareReport | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [profileSheet, setProfileSheet] = useState<ProfileSheet>(null);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const portfolioSaveTimers = useRef<Record<string, number>>({});

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
      uploadPreviewItems.forEach((item) => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
    };
  }, [uploadPreviewItems]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const timers = portfolioSaveTimers.current;
    return () => {
      Object.values(timers).forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

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
  const portfolioChildKey = currentChild?.id || 'child-matthew';
  const currentPortfolioSections = useMemo(
    () => portfolioDrafts[portfolioChildKey] || mergePortfolioSections(currentChild),
    [currentChild, portfolioChildKey, portfolioDrafts],
  );

  useEffect(() => {
    if (authState !== 'authenticated' || !currentChild) return undefined;
    let alive = true;
    setProgressState('loading');
    fetch(`/api/learning/progress?child_id=${encodeURIComponent(currentChild.id)}`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
        if (!alive) return;
        setLearningProgress(data);
        setProgressState('ready');
      })
      .catch(() => {
        if (!alive) return;
        setProgressState('error');
      });
    return () => {
      alive = false;
    };
  }, [authState, currentChild]);

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
      setAuthError(error instanceof Error ? error.message : '登入失敗');
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
          display_name: signupDisplayName || loginEmail.split('@')[0] || 'EduPass 家長',
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
      setToast('帳戶已建立');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : '建立帳戶失敗');
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
    setToast(`已切換至 ${nextChild.name}`);
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
      setToast('請先在資料與私隱開啟 AI 分析同意');
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
      const message = error instanceof Error ? error.message : '練習生成失敗';
      setPracticeError(message);
      if (message.includes('Parent consent required')) {
        setActiveView('profile');
        setProfileSheet('privacy');
        setToast('請先在資料與私隱開啟 AI 分析同意');
      }
      setPracticeState('error');
    }
  }

  function restartPractice() {
    void startPractice(lastPracticeOptions);
  }

  async function refreshLearningProgress(childId = currentChild?.id) {
    if (!childId) return null;
    setProgressState('loading');
    try {
      const response = await fetch(`/api/learning/progress?child_id=${encodeURIComponent(childId)}`, { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      setLearningProgress(data);
      setProgressState('ready');
      return data as LearningProgress;
    } catch {
      setProgressState('error');
      return null;
    }
  }

  async function completePractice(answers: PracticeSubmission) {
    if (!practiceQuiz || !currentChild) {
      setPracticeState('complete');
      return;
    }
    try {
      const response = await fetch('/api/practice-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
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
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      await refreshLearningProgress(currentChild.id);
      setToast('練習紀錄已加入進度報告');
    } catch (error) {
      setToast(error instanceof Error ? error.message : '練習已完成，但儲存失敗');
    } finally {
      setPracticeState('complete');
    }
  }

  async function shareLearningReport() {
    if (!currentChild) return;
    setShareState('running');
    try {
      const response = await fetch('/api/reports/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          child_id: currentChild.id,
          report_month: learningProgress?.report_month,
          teacher_name: '補習老師 / 班主任',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      setShareReport(data.share);
      setShareState('done');
      setToast('教師報告連結已建立');
    } catch (error) {
      setShareState('error');
      setToast(error instanceof Error ? error.message : '分享報告失敗');
    }
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
    setToast('資料已儲存');
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
    setToast('資料已儲存');
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
    setToast('私隱設定已儲存');
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
    setToast('學生資料已刪除');
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
    setToast(`已新增 ${child.name}`);
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
    setToast('學習檔案已建立');
  }

  async function persistPortfolioSections(childId: string, sections: PortfolioSectionDraft[]) {
    try {
      const response = await fetch(`/api/children/${childId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ portfolio_sections: serializePortfolioSections(sections) }),
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
    } catch (error) {
      setToast(error instanceof Error ? error.message : '學習護照儲存失敗');
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

      {activeView === 'home' && (
        <HomeView
          child={currentChild}
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
          onSelectPreviewPage={setActivePreviewIndex}
          canViewPreview={canViewUploadPreview}
          onViewPreview={() => setLightboxSrc(uploadPreview)}
        />
      )}
      {activeView === 'coach' && (
        <CoachView
          child={currentChild}
          learningProgress={learningProgress}
          progressState={progressState}
          shareReport={shareReport}
          shareState={shareState}
          onShareReport={shareLearningReport}
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
        <p>正在載入安全學習工作區...</p>
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
            ? '建立家長帳戶後，即可設定第一個學生學習檔案。'
            : '登入後會載入家長資料、學生紀錄、OCR 歷史及已匯出的作品集。'}
        </p>
        {isSignup ? (
          <label>
            家長姓名
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="例如：陳太" />
          </label>
        ) : null}
        <label>
          電郵
          <input value={email} type="email" onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          {isSignup ? '建立 PIN' : '示範 PIN'}
          <input value={pin} type="password" inputMode="numeric" onChange={(event) => setPin(event.target.value)} />
        </label>
        {authError ? <strong className="login-error">{authError}</strong> : null}
        <button className="primary-action full" type="submit">
          <Icon name={isSignup ? 'person_add' : 'login'} filled />
          {isSignup ? '建立帳戶' : '登入'}
        </button>
        <button className="auth-switch" type="button" onClick={() => setAuthMode(isSignup ? 'login' : 'signup')}>
          {isSignup ? '已有帳戶？登入' : '新家長？建立帳戶'}
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
            <h1 className="brand-title">{defaultPassportName}</h1>
          ) : (
            <>
              <h1 className="student-title">{activeView === 'home' ? child?.name || 'Matthew' : defaultPassportName}</h1>
              {activeView === 'home' ? <p>{child?.grade || 'P3'} • {displayPassportName(child?.passport)}</p> : null}
            </>
          )}
        </div>
      </div>
      <button className="symbol-button" type="button" aria-label="切換學生檔案" onClick={onSwitchChild}>
        <Icon name="switch_account" />
      </button>
    </header>
  );
}

function UploadHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="upload-appbar">
      <button className="symbol-button" type="button" aria-label="返回" onClick={onBack}>
        <Icon name="arrow_back" />
      </button>
      <h1>確認作業內容</h1>
      <span aria-hidden="true" />
    </header>
  );
}

function SettingsHeader({ onBack, onHelp }: { onBack: () => void; onHelp: () => void }) {
  return (
    <header className="settings-appbar">
      <button className="symbol-button" type="button" aria-label="返回" onClick={onBack}>
        <Icon name="arrow_back" />
      </button>
      <h1>設定</h1>
      <button className="symbol-button" type="button" aria-label="說明" onClick={onHelp}>
        <Icon name="help" />
      </button>
    </header>
  );
}

function HomeView({
  child,
  setActiveView,
}: {
  child: ChildProfile | null;
  setActiveView: (view: View) => void;
}) {
  const [showAllUploads, setShowAllUploads] = useState(false);
  const content = homeContentForChild(child);
  const recentUploads = content.recentUploads;
  const handlePrimaryAction = () => setActiveView(content.actionView);
  const completedGoals = content.goals.filter((goal) => goal.completed).length;
  const handleGoalAction = (view: View | undefined) => {
    if (view) setActiveView(view);
  };

  return (
    <main
      className="content-stack home-view"
      data-stitch-source="projects/10595017015370179580/screens/2cf4c58dda9a400181ac6d8b56c19aea"
    >
      <section className="home-progress-dashboard" aria-label="首頁進度儀表板">
        <Icon name="monitoring" />
        <div className="home-mastery-block">
          <div className="home-mastery-ring-wrap">
            <svg className="home-mastery-ring" viewBox="0 0 36 36" aria-hidden="true">
              <path
                className="ring-track"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="ring-value"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                strokeDasharray={`${content.masteryScore}, 100`}
              />
            </svg>
            <div>
              <strong>{content.masteryScore}%</strong>
              <span>{content.masteryLabel}</span>
            </div>
          </div>
          <span className="home-trend-chip"><Icon name="trending_up" /> {content.trendLabel}</span>
        </div>

        <div className="home-progress-content">
          <div>
            <h2>{content.progressTitle}</h2>
            <p>{content.progressText}</p>
          </div>
          <div className="dashboard-progress-grid">
            {content.progressItems.map((item) => (
              <article className={`dashboard-progress-item ${item.tone}`} key={item.label}>
                <div>
                  <span><Icon name={item.icon} filled /> {item.label}</span>
                  <b>{item.value}%</b>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${item.value}%` }} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="daily-goals-card">
        <div className="daily-goals-head">
          <h2><Icon name="task_alt" filled /> 今日目標</h2>
          <span>已完成 {completedGoals}/{content.goals.length}</span>
        </div>
        <div className="daily-goal-list">
          {content.goals.map((goal) => (
            <div className={goal.completed ? 'daily-goal-row completed' : 'daily-goal-row'} key={goal.label}>
              <span className="goal-check">{goal.completed ? <Icon name="check" /> : null}</span>
              <p>{goal.label}</p>
              {goal.actionLabel ? (
                <button type="button" onClick={() => handleGoalAction(goal.actionView)}>
                  {goal.actionLabel}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="next-action-card dashboard-action-card">
        <Icon name={content.actionIcon} />
        <div className="next-copy">
          <div className="school-icon">
            <Icon name={content.actionIcon} filled />
          </div>
          <div>
            <span>{content.actionKicker}</span>
            <h3>{content.actionTitle}</h3>
            <p>{content.actionDescription}</p>
          </div>
        </div>
        <button className="primary-action" type="button" onClick={handlePrimaryAction}>
          <Icon name={content.actionView === 'coach' ? 'monitoring' : 'edit_note'} filled />
          {content.actionLabel}
        </button>
      </section>

      <section className="shortcut-grid">
        <button className="shortcut-card" type="button" onClick={() => setActiveView('portfolio')}>
          <div className="shortcut-top">
            <span className="shortcut-icon tertiary">
              <Icon name="import_contacts" filled />
            </span>
            <span className="status-chip green">進度 {content.progress}%</span>
          </div>
          <h3>{content.portfolioTitle}</h3>
          <p>{content.portfolioText}</p>
          <div className="progress-track">
            <span style={{ width: `${content.progress}%` }} />
          </div>
        </button>

        <button className="shortcut-card" type="button" onClick={() => setActiveView(content.actionView === 'coach' ? 'coach' : 'portfolio')}>
          <div className="shortcut-top">
            <span className="shortcut-icon primary">
              <Icon name={content.coachIcon} filled />
            </span>
            <Icon name="arrow_forward" />
          </div>
          <h3>{content.coachTitle}</h3>
          <p>{content.coachText}</p>
          <div className="mini-tags">
            {content.tags.map((tag) => <span key={tag}>{tag}</span>)}
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
  onEditPassportInfo,
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
  onEditPassportInfo: () => void;
  onExport: () => void;
  onOpenUpload: () => void;
  onPreviewEvidence: (image: string) => void;
  onRemoveEvidence: (sectionId: string, evidence: string) => void;
  onUpdateSection: (sectionId: string, updates: Partial<PortfolioSectionDraft>) => void;
  sections: PortfolioSectionDraft[];
}) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id || '');
  const progress = calculatePortfolioProgress(sections);
  const completedCount = sections.filter((section) => section.status === 'Completed').length;
  const readyCount = sections.filter((section) => section.status === 'AI Ready').length;
  const evidenceCount = sections.reduce((total, section) => total + section.evidence.length, 0);
  const copy = portfolioStageCopy(child);
  const statusOptions: PortfolioStatus[] = ['Completed', 'AI Ready', 'Drafting'];
  const renderEditorPanel = (section: PortfolioSectionDraft) => (
    <section className="passport-editor-panel" aria-label={`${section.title} 編輯區`}>
      <div className="editor-head">
        <span className="portfolio-icon">
          <Icon name={section.icon} filled />
        </span>
        <div className="editor-title">
          <span>{section.shortTitle} · 更新 {section.updatedAt}</span>
          <h2>{section.title}</h2>
        </div>
        <StatusChip status={section.status} tone={portfolioTone(section.status)} />
      </div>

      <div className="status-segments" role="group" aria-label="章節狀態">
        {statusOptions.map((status) => (
          <button
            className={section.status === status ? 'active' : ''}
            key={status}
            type="button"
            onClick={() => onUpdateSection(section.id, { status })}
          >
            {portfolioStatusLabel(status)}
          </button>
        ))}
      </div>

      <label className="draft-textarea">
        家長確認草稿
        <textarea
          value={section.body}
          onChange={(event) => onUpdateSection(section.id, { body: event.target.value })}
        />
      </label>

      <div className="ai-draft-panel">
        <div>
          <span><Icon name="auto_awesome" filled /> AI 草稿</span>
          <p>{section.aiDraft}</p>
        </div>
        <button
          className="secondary-action"
          type="button"
          onClick={() => onUpdateSection(section.id, { body: section.aiDraft, status: 'Completed' })}
        >
          <Icon name="task_alt" />
          確認採用
        </button>
      </div>

      <div className="evidence-tools">
        <div className="evidence-head">
          <h3>證據庫</h3>
          <span>{section.evidence.length}/{section.requiredEvidence}</span>
        </div>
        <div className="evidence-list">
          {section.evidence.length ? section.evidence.map((item) => (
            <span className="evidence-chip" key={item}>
              {item}
              <button type="button" aria-label={`移除 ${item}`} onClick={() => onRemoveEvidence(section.id, item)}>
                <Icon name="close" />
              </button>
            </span>
          )) : (
            <span className="empty-evidence">尚未加入證據</span>
          )}
        </div>

        <div className="editor-button-row">
          <button className="secondary-action" type="button" onClick={() => onAddEvidence(section.id)}>
            <Icon name="add_circle" />
            新增證據
          </button>
          <button className="secondary-action" type="button" onClick={onOpenUpload}>
            <Icon name="upload_file" />
            上載作品
          </button>
          {section.image ? (
            <button className="secondary-action" type="button" onClick={() => onPreviewEvidence(section.image || '')}>
              <Icon name="fullscreen" />
              預覽相片
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );

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
          <p>{readyCount ? `${readyCount} ${copy.tipReady}` : copy.tipDone}</p>
        </div>
      </section>

      <section className="passport-overview">
        <div>
          <span className="verified-label"><Icon name="verified" filled /> {copy.badge}</span>
          <div className="passport-title-row">
            <h2>{displayPassportName(child?.passport)}</h2>
            <button type="button" onClick={onEditPassportInfo}>
              <Icon name="edit" />
              編輯資料
            </button>
          </div>
          <p>{child?.name || '孩子'} · {child?.grade || 'P3'} · {child?.focus || '尚未設定學習焦點'}</p>
        </div>
        <div className="passport-progress-meter" aria-label={`學習護照完成度 ${progress}%`}>
          <strong>{progress}%</strong>
          <span>{copy.pdfLabel}</span>
        </div>
        <div className="passport-stat-row">
          <span><b>{completedCount}</b> 已完成</span>
          <span><b>{evidenceCount}</b> 證據</span>
          <span><b>{sections.length}</b> 章節</span>
        </div>
      </section>

      <section className="portfolio-grid">
        {sections.map((section) => (
          <Fragment key={section.id}>
            <button
              className={`portfolio-card ${section.id === activeSectionId ? 'active' : ''} ${section.id === 'artworks' ? 'wide' : ''}`}
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
                <span>{section.evidence.length}/{section.requiredEvidence} 證據</span>
              </div>
            </button>
            {section.id === activeSectionId ? renderEditorPanel(section) : null}
          </Fragment>
        ))}
      </section>

      {exportState === 'done' || exportState === 'error' ? (
        <div className={`export-toast ${exportState}`}>
          {exportState === 'done' ? 'PDF 已準備好' : exportError}
        </div>
      ) : null}

      <button className="generate-fab" type="button" onClick={onExport} disabled={exportState === 'running'}>
        <Icon name="picture_as_pdf" filled />
        {exportState === 'running' ? '生成中' : '生成 PDF'}
      </button>
    </main>
  );
}

function StatusChip({ status, tone }: { status: string; tone: string }) {
  return (
    <span className={`status-chip ${tone}`}>
      {tone === 'ready' ? <Icon name="sync" /> : <i />}
      {portfolioStatusLabel(status)}
    </span>
  );
}

function UploadView({
  activePreviewIndex,
  analyzeUpload,
  canViewPreview,
  handleFileChange,
  inputRef,
  onSelectPreviewPage,
  onViewPreview,
  ocrResult,
  ocrState,
  previewItems,
  previewUrl,
  selectedFiles,
}: {
  activePreviewIndex: number;
  analyzeUpload: () => void;
  canViewPreview: boolean;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onSelectPreviewPage: (index: number) => void;
  onViewPreview: () => void;
  ocrResult: OcrResult | null;
  ocrState: 'idle' | 'running' | 'done' | 'error';
  previewItems: UploadPreviewItem[];
  previewUrl: string;
  selectedFiles: File[];
}) {
  const [mistakes, setMistakes] = useState<Array<{
    confidence: string;
    id: string;
    page: string;
    question: string;
    reason: string;
    title: string;
    topic: string;
  }>>([]);
  const detectedQuestions = ocrResult?.review?.extracted_questions || [];
  const detectedTopics = ocrResult?.review?.topics || [];
  const pageCount = ocrResult?.review?.page_count || ocrResult?.page_count || Math.max(selectedFiles.length, 1);
  const selectedFileCount = selectedFiles.length;
  const activePreviewItem = previewItems[activePreviewIndex] || null;
  const topicValue = detectedTopics.length
    ? detectedTopics.map((topic) => displayTopicName(topic.topic)).join(' / ')
    : ocrState === 'done'
      ? '未能穩定判定主題，請家長確認'
      : 'AI 會自動辨識多個主題';
  const statusLabel = ocrState === 'running'
    ? 'AI 分析中'
    : ocrState === 'done'
      ? 'Hybrid 已校正'
      : selectedFileCount
        ? '等待分析'
        : '可多頁上載';

  return (
    <>
      <main className="upload-content">
        <input ref={inputRef} className="hidden-file" type="file" accept="image/*,.pdf" multiple onChange={handleFileChange} />

        <section className="upload-preview">
          <h2>作業預覽</h2>
          <div className={ocrState === 'running' ? 'preview-frame scanning' : 'preview-frame'}>
            {activePreviewItem && !activePreviewItem.url ? (
              <div className="preview-placeholder">
                <Icon name="picture_as_pdf" filled />
                <strong>{activePreviewItem.name}</strong>
                <span>PDF 已加入分析佇列</span>
              </div>
            ) : (
              <img src={previewUrl} alt={activePreviewItem?.name || '已掃描功課'} />
            )}
            {selectedFileCount ? (
              <span className="page-stack-badge">
                <Icon name="filter_none" />
                {selectedFileCount} 頁
              </span>
            ) : null}
            {selectedFileCount ? <span className="preview-page-label">P{activePreviewIndex + 1}</span> : null}
            <div className="page-stack-shadow" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <button type="button" aria-label="查看大圖" onClick={onViewPreview} disabled={!canViewPreview}>
              <Icon name="fullscreen" />
            </button>
          </div>
          {selectedFileCount ? (
            <div className="selected-file-strip" aria-label="已選上載頁面">
              {previewItems.slice(0, 6).map((item, index) => (
                <button
                  className={index === activePreviewIndex ? 'active' : ''}
                  key={`${item.name}-${index}`}
                  type="button"
                  onClick={() => onSelectPreviewPage(index)}
                >
                  <Icon name="check_circle" filled />
                  <b>P{index + 1}</b>
                  {item.url ? <img src={item.url} alt="" /> : <Icon name="picture_as_pdf" />}
                  <span>{item.name}</span>
                </button>
              ))}
              {selectedFileCount > 6 ? <span className="more-pages">另有 {selectedFileCount - 6} 頁</span> : null}
            </div>
          ) : null}
        </section>

        <section className="ocr-panel">
          <div className="ocr-panel-head">
            <h2><Icon name="document_scanner" filled /> 擷取資料</h2>
            <span>{statusLabel}</span>
          </div>

          <FormDisplay icon="stacks" label="頁數 / 檔案" value={selectedFileCount ? `${selectedFileCount} 個檔案，共 ${pageCount} 頁` : '可一次選多張相片或 PDF'} />
          <FormDisplay icon="category" label="學習主題（AI 多主題）" value={topicValue} />

          <div className="parent-confirmation-notice">
            <Icon name="info" filled />
            <p>AI 檢視結果需要家長確認後，才會儲存到學生學習檔案。</p>
          </div>

          {detectedTopics.length ? (
            <div className="detected-topic-grid" aria-label="已辨識主題">
              {detectedTopics.map((topic, index) => (
                <span
                  className={(topic.confidence || 0) >= 0.9 ? 'high-confidence' : ''}
                  key={topic.id || `${topic.topic}-${index}`}
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <b>{displayTopicName(topic.topic)}</b>
                  <small>
                    {topic.confidence !== undefined ? `${Math.round(topic.confidence * 100)}%` : 'AI'}
                    {topic.page_numbers?.length ? ` · P${topic.page_numbers.join(',')}` : ''}
                  </small>
                </span>
              ))}
            </div>
          ) : null}

          <div className="mistake-list">
            <label>辨識到的錯誤題型</label>
            {mistakes.map((mistake) => (
              <MistakeCard
                key={mistake.id}
                confidence={mistake.confidence}
                page={mistake.page}
                title={mistake.title}
                question={mistake.question}
                reason={mistake.reason}
                topic={mistake.topic}
                onDelete={() => setMistakes((items) => items.filter((item) => item.id !== mistake.id))}
                onReasonChange={(reason) =>
                  setMistakes((items) => items.map((item) => (item.id === mistake.id ? { ...item, reason } : item)))
                }
              />
            ))}
            {!mistakes.length && ocrState !== 'done' && ocrState !== 'error' ? (
              <div className="analysis-result neutral">
                <strong>等待 AI 分析</strong>
                <p>選擇作業頁面並開始分析後，才會列出需家長確認的錯誤題型。</p>
              </div>
            ) : null}

            {ocrState === 'done' && detectedQuestions.length ? (
              <div className="analysis-result success question-result-list">
                <strong>混合 OCR 檢視 · {detectedQuestions.length} 題</strong>
                {detectedQuestions.slice(0, 5).map((question, index) => (
                  <p key={`${question.question_text}-${index}`}>
                    <span>P{question.page_number || index + 1}</span>
                    {question.topic ? <em>{displayTopicName(question.topic)}</em> : null}
                    {question.question_text}
                  </p>
                ))}
              </div>
            ) : null}
            {ocrState === 'error' ? (
              <div className="analysis-result error">
                <strong>GCP OCR 錯誤</strong>
                <p>{ocrResult?.detail || 'OCR 分析失敗'}</p>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <footer className={selectedFileCount ? 'upload-footer dual-actions' : 'upload-footer'}>
        <button className="secondary-action add-pages-action" type="button" onClick={() => inputRef.current?.click()}>
          <Icon name="add_photo_alternate" />
          加入更多頁面
        </button>
        <button
          className={ocrState === 'done' ? 'primary-action full save-ready' : 'primary-action full'}
          type="button"
          onClick={analyzeUpload}
          disabled={ocrState === 'running'}
        >
          <span aria-hidden="true" />
          <Icon name={selectedFileCount ? 'document_scanner' : 'upload_file'} filled />
          {ocrState === 'running' ? '正在分析多頁...' : selectedFileCount ? `確認並分析 ${selectedFileCount} 頁` : '選擇功課相片 / PDF'}
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
  confidence,
  onDelete,
  onReasonChange,
  page,
  reason,
  question,
  title,
  topic,
}: {
  confidence: string;
  onDelete: () => void;
  onReasonChange: (reason: string) => void;
  page: string;
  reason: string;
  question: string;
  title: string;
  topic: string;
}) {
  return (
    <article className="mistake-card">
      <div className="mistake-row">
        <input checked readOnly type="checkbox" />
        <div>
          <div className="question-meta-row">
            <span>{page}</span>
            <em>{displayTopicName(topic)}</em>
            <small>{confidence}</small>
          </div>
          <strong>{title}</strong>
          <span>{question}</span>
        </div>
        <button type="button" aria-label="刪除" onClick={onDelete}>
          <Icon name="delete" />
        </button>
      </div>
      <label>
        <span>錯誤原因</span>
        <select value={reason} onChange={(event) => onReasonChange(event.target.value)}>
          <option>運算錯誤</option>
          <option>概念不清</option>
          <option>粗心大意</option>
        </select>
      </label>
    </article>
  );
}

function CoachView({
  child,
  learningProgress,
  onShareReport,
  progressState,
  shareReport,
  shareState,
}: {
  child: ChildProfile | null;
  learningProgress: LearningProgress | null;
  onShareReport: () => void;
  progressState: 'idle' | 'loading' | 'ready' | 'error';
  shareReport: ShareReport | null;
  shareState: 'idle' | 'running' | 'done' | 'error';
}) {
  const profileGrade = normalizeGrade(child?.grade);
  const gradeSubjects = useMemo(
    () => getSubjectsForGrade(profileGrade).filter(isAcademicProgressSubject),
    [profileGrade],
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState(preferredProgressSubjectId(gradeSubjects));
  const selectedSubject = gradeSubjects.find((subject) => subject.id === selectedSubjectId)
    || gradeSubjects.find((subject) => subject.id === activeCoachSubjectId)
    || gradeSubjects[0]
    || null;

  useEffect(() => {
    if (!gradeSubjects.length) {
      setSelectedSubjectId('');
      return;
    }
    if (!gradeSubjects.some((subject) => subject.id === selectedSubjectId)) {
      setSelectedSubjectId(preferredProgressSubjectId(gradeSubjects));
    }
  }, [gradeSubjects, selectedSubjectId]);

  return (
    <main
      className="content-stack coach-view"
      data-stitch-source="projects/10595017015370179580/screens/a592e20bc97e4cbfb85986527e821d31 projects/10595017015370179580/screens/14d41f421d024aac915984de00d1dea0"
    >
      <section className="page-intro tight">
        <h2>學科進度</h2>
        <p>{child?.name || 'Matthew'} 的各科成績、OCR 證據與弱項主題。</p>
      </section>

      <AcademicSubjectProgressPanel
        child={child}
        progress={learningProgress}
        progressState={progressState}
        selectedSubject={selectedSubject}
        subjects={gradeSubjects}
        onSelectSubject={setSelectedSubjectId}
      />

      <CurriculumMapSection
        child={child}
        selectedSubjectId={selectedSubject?.id || ''}
        onSelectSubject={setSelectedSubjectId}
      />

      <LearningReportPanel
        child={child}
        progress={learningProgress}
        progressState={progressState}
        shareReport={shareReport}
        shareState={shareState}
        onShareReport={onShareReport}
      />

      <section className="coach-grid">
        <article className="data-card">
          <div className="card-title-row">
            <h3>弱項主題</h3>
            <Icon name="bar_chart" />
          </div>
          {(learningProgress?.weak_topics || []).slice(0, 4).map((topic) => (
            <Mastery
              key={`${topic.subject}-${topic.topic}`}
              label={displayTopicName(topic.topic)}
              value={topic.mastery}
              tone={topic.mastery >= 75 ? 'green' : topic.mastery >= 60 ? 'amber' : 'red'}
            />
          ))}
          {learningProgress?.weak_topics?.length ? null : <p>暫時未有已評分學習主題。</p>}
        </article>

        <article className="data-card">
          <div className="card-title-row">
            <h3>分數來源</h3>
            <Icon name="fact_check" />
          </div>
          <p>基於已上載並確認的 OCR 檢視、測驗分數及已保存的學科練習紀錄。</p>
          <div className="mistake-tags">
            <span><Icon name="upload_file" /> {learningProgress?.document_count || 0} 份上載</span>
            <span><Icon name="edit_note" /> {learningProgress?.practice_count || 0} 次練習</span>
            <span className="amber"><Icon name="visibility_off" /> 體育 / 視藝不計分</span>
          </div>
        </article>
      </section>

      <section className="history-section">
        <h3>近期紀錄</h3>
        {(learningProgress?.recent_activity || []).slice(0, 3).map((activity, index) => (
          <HistoryCard
            key={`${activity.created_at || index}-${activity.title || 'activity'}`}
            score={`${activity.score ?? learningProgress?.overall_mastery ?? 0}`}
            title={displayTopicName(String(activity.title || '學習證據'))}
            date={formatActivityDate(activity.created_at)}
            text={`${activity.type === 'practice_attempt' ? '學科練習' : 'OCR 證據'} · ${activity.count || 0} 項`}
            tone={Number(activity.score || learningProgress?.overall_mastery || 0) >= 75 ? 'green' : 'gray'}
          />
        ))}
        {learningProgress?.recent_activity?.length ? null : <p className="empty-report-note">上載有分數的學科作品後，這裡會顯示最新紀錄。</p>}
      </section>
    </main>
  );
}

type AcademicSubjectProgressRow = {
  subject: CurriculumSubject;
  mastery: number | null;
  evidenceCount: number;
  practiceCount: number;
  topicCount: number;
  lastSeenAt?: string | null;
};

function normalizeSubjectLabel(value: string) {
  return value.trim().toLowerCase();
}

function buildAcademicSubjectRows(
  progress: LearningProgress | null,
  subjects: CurriculumSubject[],
): AcademicSubjectProgressRow[] {
  const scoreBySubject = new Map((progress?.subject_scores || []).map((score) => [normalizeSubjectLabel(score.subject), score]));
  return subjects.map((subject) => {
    const subjectKeys = [subject.id, subject.name, subject.displayNameZh].map(normalizeSubjectLabel);
    const score = subjectKeys.map((key) => scoreBySubject.get(key)).find(Boolean);
    const topicMatches = (progress?.all_topics || []).filter((topic) => subjectKeys.includes(normalizeSubjectLabel(topic.subject)));
    const evidenceCount = score?.evidence_count ?? topicMatches.reduce((total, topic) => total + topic.evidence_count, 0);
    const practiceCount = score?.practice_count ?? topicMatches.reduce((total, topic) => total + topic.practice_count, 0);
    const mastery = score?.mastery ?? (
      topicMatches.length
        ? Math.round(topicMatches.reduce((total, topic) => total + topic.mastery, 0) / topicMatches.length)
        : null
    );
    const sortedDates = topicMatches.map((topic) => topic.last_seen_at || '').sort();
    const lastSeenAt = score?.last_seen_at || sortedDates[sortedDates.length - 1] || null;
    return {
      subject,
      mastery,
      evidenceCount,
      practiceCount,
      topicCount: topicMatches.length,
      lastSeenAt,
    };
  });
}

function AcademicSubjectProgressPanel({
  child,
  onSelectSubject,
  progress,
  progressState,
  selectedSubject,
  subjects,
}: {
  child: ChildProfile | null;
  onSelectSubject: (subjectId: string) => void;
  progress: LearningProgress | null;
  progressState: 'idle' | 'loading' | 'ready' | 'error';
  selectedSubject: CurriculumSubject | null;
  subjects: CurriculumSubject[];
}) {
  const rows = buildAcademicSubjectRows(progress, subjects);
  const scoredRows = rows.filter((row) => row.mastery !== null);
  const mastery = progressState === 'loading' ? '...' : `${progress?.overall_mastery || 0}%`;
  const selectedRow = rows.find((row) => row.subject.id === selectedSubject?.id) || rows[0];

  return (
    <section
      className="academic-progress-panel"
      aria-label="學科成績進度"
      data-stitch-source="projects/10595017015370179580/screens/a592e20bc97e4cbfb85986527e821d31"
    >
      <div className="academic-progress-hero">
        <div>
          <span className="report-kicker"><Icon name="monitoring" /> 學科進度</span>
          <h2>{child?.name || '孩子'} 的各科成績</h2>
          <p>{progress?.report_month || '今個月'} · {subjects.length} 個學科 · 體育 / 視藝只入作品檔案</p>
        </div>
        <div className="report-mastery-card">
          <strong>{mastery}</strong>
          <small>整體</small>
        </div>
      </div>

      <div className="subject-score-summary">
        <Metric value={`${scoredRows.length}/${subjects.length}`} label="已評分" />
        <Metric value={`${progress?.document_count || 0}`} label="上載" />
        <Metric value={`${progress?.all_topics?.length || 0}`} label="主題" />
      </div>

      {selectedRow ? (
        <article className="selected-subject-score">
          <div>
            <span>學習領域</span>
            <h3>{selectedRow.subject.displayNameZh}</h3>
            <p>{displaySubjectUse(selectedRow.subject)}</p>
          </div>
          <strong>{selectedRow.mastery === null ? '--' : `${selectedRow.mastery}%`}</strong>
        </article>
      ) : null}

      <div className="subject-score-list">
        {rows.map((row) => (
          <button
            className={row.subject.id === selectedSubject?.id ? 'subject-score-row active' : 'subject-score-row'}
            key={row.subject.id}
            type="button"
            onClick={() => onSelectSubject(row.subject.id)}
          >
            <span className="subject-score-icon"><Icon name={row.mastery === null ? 'pending' : 'query_stats'} /></span>
            <div>
              <strong>{row.subject.displayNameZh}</strong>
              <span>{row.evidenceCount} 項證據 · {row.practiceCount} 次練習 · {row.topicCount} 個主題</span>
            </div>
            <b>{row.mastery === null ? '--' : `${row.mastery}%`}</b>
          </button>
        ))}
      </div>
    </section>
  );
}

function LearningReportPanel({
  child,
  onShareReport,
  progress,
  progressState,
  shareReport,
  shareState,
}: {
  child: ChildProfile | null;
  onShareReport: () => void;
  progress: LearningProgress | null;
  progressState: 'idle' | 'loading' | 'ready' | 'error';
  shareReport: ShareReport | null;
  shareState: 'idle' | 'running' | 'done' | 'error';
}) {
  const trend = progress?.trend_points?.length ? progress.trend_points : [42, 48, 55, progress?.overall_mastery || 0].filter(Boolean);
  const weakTopics = progress?.weak_topics || [];
  const improvedTopics = progress?.improved_topics || [];
  const shareHref = shareReport?.share_url ? `${window.location.origin}${shareReport.share_url}` : '';
  const mastery = progressState === 'loading' ? '...' : `${progress?.overall_mastery || 0}%`;
  const reportMonth = progress?.report_month || '今個月';
  const copyShareHref = () => {
    if (shareHref && navigator.clipboard) {
      void navigator.clipboard.writeText(shareHref);
    }
  };

  return (
    <section
      className={shareState === 'done' ? 'learning-report-panel share-ready' : 'learning-report-panel'}
      aria-label="進度報告與教師分享"
      data-stitch-source="projects/7550425496525656523/screens/1fb93eb80a3b493a96781f530ba50099"
    >
      <div className="report-panel-head">
        <div>
          <span className="report-kicker"><Icon name="analytics" /> 進度報告</span>
          <h2>{child?.name || '孩子'} 的進步報告</h2>
          <p>{reportMonth} · OCR 證據 + 科目分數</p>
        </div>
        <div className="report-mastery-card" aria-label={`掌握度 ${mastery}`}>
          <strong>{mastery}</strong>
          <small>掌握度</small>
        </div>
      </div>

      <div className="report-dashboard">
        <div className="report-trend-card">
          <span>整體掌握度</span>
          <strong>{mastery}</strong>
          <div className="trend-line" aria-label="近期進度走勢">
            {trend.map((point, index) => (
              <i
                key={`${point}-${index}`}
                style={{ height: `${Math.max(18, Math.min(96, point))}%`, animationDelay: `${index * 80}ms` }}
              />
            ))}
          </div>
        </div>
        <div className="report-metrics">
          <Metric value={`${progress?.document_count || 0}`} label="上載" />
          <Metric value={`${progress?.practice_count || 0}`} label="練習" />
          <Metric value={`${progress?.all_topics?.length || 0}`} label="主題" />
        </div>
      </div>

      <div className="topic-report-grid">
        <article>
          <h3><Icon name="flag" /> 三個主要弱項</h3>
          {weakTopics.length ? weakTopics.map((topic) => (
            <TopicReportRow key={`${topic.subject}-${topic.topic}`} topic={topic} />
          )) : <p className="empty-report-note">完成 OCR review 或輸入測驗分數後會整理弱項。</p>}
        </article>
        <article>
          <h3><Icon name="trending_up" /> 已改善</h3>
          {improvedTopics.length ? improvedTopics.map((topic) => (
            <TopicReportRow key={`${topic.subject}-${topic.topic}`} topic={topic} />
          )) : <p className="empty-report-note">暫時未有足夠歷史紀錄判斷改善項目。</p>}
        </article>
      </div>

      <div className={shareState === 'done' ? 'teacher-share-card shared' : 'teacher-share-card'}>
        <div>
          <span><Icon name="verified_user" filled /> 家長控制分享</span>
          <h3>分享給補習老師</h3>
          <p>連結只包含學習弱項、改善項目與分數紀錄摘要；不公開原始相片。</p>
        </div>
        <div className="teacher-share-actions">
          <button className="primary-action report-share-button" type="button" disabled={shareState === 'running'} onClick={onShareReport}>
            <Icon name={shareState === 'done' ? 'task_alt' : 'ios_share'} filled />
            {shareState === 'running' ? '準備中...' : shareState === 'done' ? '已分享給老師' : '分享給補習老師'}
          </button>
          {shareHref ? (
            <div className="teacher-share-link-row" aria-label="教師報告連結已建立">
              <button type="button" aria-label="複製教師報告連結" onClick={copyShareHref}>
                <Icon name="content_copy" />
              </button>
              <a href={shareHref} target="_blank" rel="noreferrer">{shareHref}</a>
              <a className="open-report-link" href={shareHref} target="_blank" rel="noreferrer" aria-label="開啟教師報告">
                <Icon name="open_in_new" />
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TopicReportRow({ topic }: { topic: LearningTopicSummary }) {
  return (
    <div className={`topic-report-row ${topic.trend}`}>
      <div>
        <strong>{displayTopicName(topic.topic)}</strong>
        <span>{displaySubjectName(topic.subject)} · 證據 {topic.evidence_count} · 練習 {topic.practice_count}</span>
      </div>
      <b>{topic.mastery}%</b>
    </div>
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
              <b>{Math.round(item.estimated_time_seconds / 60)} min</b>
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

function CurriculumMapSection({
  child,
  onSelectSubject,
  selectedSubjectId,
}: {
  child: ChildProfile | null;
  onSelectSubject: (subjectId: string) => void;
  selectedSubjectId: string;
}) {
  const profileGrade = normalizeGrade(child?.grade);
  const selectedStage = getStageForGrade(profileGrade);
  const stage = curriculumStages.find((item) => item.id === selectedStage) || curriculumStages[1];
  const academicSubjects = useMemo(
    () => getSubjectsForGrade(profileGrade).filter(isAcademicProgressSubject),
    [profileGrade],
  );
  const notices = useMemo(() => gradeNotices(profileGrade), [profileGrade]);

  useEffect(() => {
    if (academicSubjects.length && !academicSubjects.some((subject) => subject.id === selectedSubjectId)) {
      onSelectSubject(preferredProgressSubjectId(academicSubjects));
    }
  }, [academicSubjects, onSelectSubject, selectedSubjectId]);

  return (
    <section className="curriculum-map" aria-label="HKEDB 課程地圖">
      <div className="curriculum-head">
        <div>
          <span className="verified-label"><Icon name="verified" filled /> 學科清單 · {profileGrade}</span>
          <h2>{child?.name || '孩子'} 的學科地圖</h2>
        </div>
      </div>

      <div className="profile-grade-lock">
        <span className="grade-token"><Icon name="badge" /> {profileGrade}</span>
        <div>
          <strong>{stage.label} · {displayStageCaption(stage.caption)}</strong>
          <p>{child?.school_type || '香港學校'} · 成績追蹤不包括體育 / 視藝</p>
        </div>
      </div>

      <section className="stage-summary">
        <div>
          <span>{displayStageCaption(stage.caption)}</span>
          <h3>{stage.learningGoal}</h3>
        </div>
        <div className="curriculum-metrics">
          <Metric value="成績" label="模式" />
          <Metric value={`${academicSubjects.length}`} label="學科" />
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

      {academicSubjects.length ? (
        <div className="subject-list">
          {academicSubjects.map((subject) => (
            <CurriculumSubjectCard
              grade={profileGrade}
              key={subject.id}
              selected={subject.id === selectedSubjectId}
              subject={subject}
              roadmap={false}
              onSelect={() => onSelectSubject(subject.id)}
            />
          ))}
        </div>
      ) : null}
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
  const activeSubject = selectedSubject?.id === activeCoachSubjectId ? selectedSubject : null;
  const topics = useMemo(
    () => getCourseTopicsForGradeAndSubject(profileGrade, activeSubject),
    [profileGrade, activeSubject],
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

  if (!activeSubject || !selectedTopic) {
    return (
      <section className="course-planner roadmap-only" aria-label="數學主題提示">
        <div className="course-head">
          <div>
            <span><Icon name="calculate" filled /> 數學</span>
            <h2>{profileGrade} 數學學習主題</h2>
          </div>
          <b>數學優先</b>
        </div>
        <p className="roadmap-note">正在載入數學課程節點；練習生成、弱項追蹤與報告目前都以數學為主。</p>
      </section>
    );
  }

  return (
    <section className="course-planner" aria-label="學習主題與課程內容">
      <div className="course-head">
        <div>
          <span><Icon name="auto_stories" filled /> 課程內容草稿</span>
          <h2>{profileGrade} {activeSubject.displayNameZh} 學習主題</h2>
        </div>
        <b>019e81ae</b>
      </div>

      <div className="topic-rail" role="tablist" aria-label="課程主題">
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
              <span>{topic.subjectNameZh} · {displayStrandName(topic.strand)}</span>
              <strong>{topic.titleZh}</strong>
            </button>
          </article>
        ))}
      </div>

      <article className="topic-detail-card">
        <div className="topic-detail-top">
          <div>
            <span>{selectedTopic.subjectNameZh} · {displayStrandName(selectedTopic.strand)}</span>
            <h3>{selectedTopic.titleZh}</h3>
            <p>{selectedTopic.outcomes[0] || '按課程目標整理練習重點。'}</p>
          </div>
          <Metric value={`${selectedTopic.lessonCount}`} label="課節" />
        </div>

        <div className="topic-stats">
          <span><Icon name="schedule" /> {selectedTopic.durationMinutes} 分鐘</span>
          <span><Icon name="signal_cellular_alt" /> {selectedTopic.level}</span>
          <span><Icon name="sell" /> 學習證據標籤</span>
        </div>

        <section className="practice-builder" aria-label="練習題數分配">
          <div className="builder-head">
            <div>
              <span>練習設定</span>
              <h4>按主題 / 範疇分配題數</h4>
            </div>
            <Metric value={`${totalQuestions}`} label="題目" />
          </div>
          <div className="allocation-list">
            {topics.map((topic) => (
              <div className={topic.id === selectedTopic.id ? 'allocation-row active' : 'allocation-row'} key={topic.id}>
                <button type="button" onClick={() => setSelectedTopicId(topic.id)}>
                  <span>{displayStrandName(topic.strand)}</span>
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
          onClick={() => onStartPractice(buildPracticeOptions(activeSubject, activePlan))}
        >
          <Icon name="play_lesson" filled />
          生成 {totalQuestions || 0} 題
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
    <div className="question-stepper" aria-label={`題數 ${count}`}>
      <button type="button" aria-label="減少題數" onClick={() => onChange(Math.max(0, count - 1))}>
        <Icon name="remove" />
      </button>
      <span><b>{count}</b>{label}</span>
      <button type="button" aria-label="增加題數" onClick={() => onChange(Math.min(10, count + 1))}>
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
    subject: activeCoachSubjectName,
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
  roadmap,
  selected,
  subject,
}: {
  grade: string;
  onSelect: () => void;
  roadmap?: boolean;
  selected: boolean;
  subject: CurriculumSubject;
}) {
  return (
    <button
      className={`${selected ? 'curriculum-subject-card selected' : 'curriculum-subject-card'}${roadmap ? ' roadmap' : ''}`}
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
    >
      <div className="subject-card-top">
        <div>
          <span>{displayKlaName(subject)}</span>
          <h3>{subject.displayNameZh}</h3>
          <p>{displaySubjectUse(subject)}</p>
        </div>
        <b>{roadmap ? '路線圖' : grade}</b>
      </div>
      <div className="strand-tags">
        {subject.strands.slice(0, 3).map((strand) => (
          <span key={strand}>{displayStrandName(strand)}</span>
        ))}
      </div>
      <p className="app-use">
        <Icon name={roadmap ? 'map' : 'auto_awesome'} />
        {roadmap ? '暫未在原型啟用。' : displaySubjectUse(subject)}
      </p>
      {subject.status ? <p className="subject-status">{displaySubjectStatus(subject.status)}</p> : null}
    </button>
  );
}

function gradeNotices(grade: string) {
  return [
    { icon: 'school', text: `${grade} 學科` },
    { icon: 'visibility_off', text: '體育 / 視藝不作成績追蹤' },
  ];
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
    { icon: 'workspace_premium', title: 'Learning Plus', subtitle: '示範帳戶已啟用', badge: '管理', sheet: 'learning-plus' as const },
    { icon: 'language', title: '語言', value: '繁體中文', sheet: 'language' as const },
    { icon: 'security', title: '資料與私隱', subtitle: '上載、同意與資料保留', sheet: 'privacy' as const },
    { icon: 'notifications', title: '通知設定', sheet: 'notifications' as const },
    { icon: 'help_center', title: '支援與常見問題', sheet: 'support' as const },
  ];

  return (
    <main className="profile-content">
      <section className="parent-profile">
        <div className="parent-avatar">
          <img src={images.parent} alt="家長頭像" />
          <button type="button" aria-label="編輯家長資料" onClick={onEditParent}>
            <Icon name="edit" />
          </button>
        </div>
        <h2>{parent.display_name}</h2>
        <p>{parent.email}</p>
        <div className="profile-action-row">
          <button type="button" onClick={onEditParent}>編輯家長</button>
          <button type="button" onClick={onEditChild}>編輯 {currentChild?.name || '學生'}</button>
        </div>
      </section>

      <section className="children-section">
        <h3>學生</h3>
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
            <span>新增學生</span>
          </button>
        </div>
      </section>

      <section className="settings-list">
        <h3>應用設定</h3>
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
            <span className="settings-copy"><strong>登出</strong></span>
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
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="功課預覽">
      <section className="preview-lightbox">
        <button className="symbol-button" type="button" aria-label="關閉預覽" onClick={onClose}>
          <Icon name="close" />
        </button>
        <img src={image} alt="功課完整預覽" />
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
    'add-child': '新增學生',
    'edit-child': `編輯 ${currentChild?.name || '學生'}`,
    'edit-parent': '編輯家長',
    language: '語言',
    'learning-plus': 'Learning Plus',
    notifications: '通知設定',
    privacy: '資料與私隱',
    support: '支援與常見問題',
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={titles[kind]}>
      <section className="profile-sheet">
        <div className="sheet-head">
          <h2>{titles[kind]}</h2>
          <button className="symbol-button" type="button" aria-label="關閉" onClick={onClose}>
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
          <SettingPanel icon="language" title="繁體中文" text="介面文案已統一為繁體中文；英文只保留於產品名稱、課程來源或技術名詞。" />
        ) : null}

        {kind === 'notifications' ? (
          <SettingPanel icon="notifications" title="每週進度提醒" text="提醒偏好會在下一階段接入後端，支援按家長設定電郵或推送通知。" />
        ) : null}

        {kind === 'learning-plus' ? (
          <SettingPanel icon="workspace_premium" title="示範帳戶已啟用" text="Learning Plus 目前只作原型示範，暫未接入真實付款或訂閱系統。" />
        ) : null}

        {kind === 'support' ? (
          <SettingPanel icon="help_center" title="支援與常見問題" text="此面板用作確認設定流程；正式版可加入常見問題及支援渠道。" />
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
              <Icon name={event.event_type === 'child_data_deleted' ? 'delete_forever' : 'verified_user'} />
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
  return eventType.replace(/_/g, ' ');
}

function formatAuditTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-HK', { dateStyle: 'medium', timeStyle: 'short' });
}

function BottomNav({ activeView, setActiveView }: { activeView: View; setActiveView: (view: View) => void }) {
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
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default App;
