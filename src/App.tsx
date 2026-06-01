import { type ChangeEvent, type FormEvent, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import {
  curriculumStages,
  getStageForGrade,
  getSubjectsForGrade,
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
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'portfolio', label: 'Portfolio', icon: 'import_contacts' },
  { id: 'upload', label: 'Upload', icon: 'add_a_photo' },
  { id: 'coach', label: 'Coach', icon: 'calculate' },
  { id: 'profile', label: 'Profile', icon: 'person' },
];

const gradeOptions = ['K1', 'K2', 'K3', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

const evidenceSuggestions = ['作品相片', '家長觀察', '課堂紀錄', '功課 evidence', '活動證書'];
const activeCoachSubjectId = 'mathematics';
const activeCoachSubjectName = 'Mathematics';

function preferredChildId(parent: ParentProfile): string {
  return parent.children.find((child) => child.id === 'child-matthew')?.id || parent.children[0]?.id || 'child-matthew';
}

function preferredCoachSubjectId(subjects: CurriculumSubject[]) {
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
  return new Date().toLocaleDateString('en-HK', { day: 'numeric', month: 'short' });
}

function isEarlyYearsGrade(grade: string | undefined) {
  return ['K1', 'K2', 'K3'].includes(normalizeGrade(grade));
}

function portfolioStageCopy(child: ChildProfile | null) {
  if (isEarlyYearsGrade(child?.grade)) {
    return {
      badge: 'Whole-child portfolio',
      pdfLabel: 'Portfolio ready',
      tipReady: '個 personal development section 已有 AI 草稿，可由家長確認。',
      tipDone: '幼兒成長 portfolio 已可直接匯出 PDF。',
    };
  }
  return {
    badge: 'Academic learning passport',
    pdfLabel: 'PDF ready',
    tipReady: '個 academic section 已有 AI 草稿，可由家長確認。',
    tipDone: '所有 academic section 已可直接匯出 PDF。',
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
  const focus = child?.focus || '小學數學 + 升小 Portfolio';
  const earlyYears = isEarlyYearsGrade(grade);
  const useSeedContent = usesDemoPortfolioContent(child);

  if (earlyYears) {
    const sections: PortfolioSectionDraft[] = [
      {
        id: 'cover',
        icon: 'book',
        title: '封面設計 (Cover Page)',
        shortTitle: 'Cover',
        copy: '基本資料、成長焦點與代表相片。',
        status: 'Completed',
        body: `${childName} 的幼兒成長 Portfolio 已整理年級 ${grade}、家庭觀察、代表相片及發展焦點，適合作幼稚園或升小面試前的 school-ready 草稿。`,
        aiDraft: `${childName}'s early years portfolio introduces the child through family observations, daily routines, and selected development evidence rather than academic scores.`,
        evidence: ['學生相片', '基本資料'],
        evidenceSuggestions: ['學生相片', '家庭觀察', '成長焦點', '老師短評'],
        requiredEvidence: 2,
        image: images.portfolioChild,
        updatedAt: formatPortfolioDate(),
      },
      {
        id: 'about',
        icon: 'face',
        title: '關於我 (About Me)',
        shortTitle: 'About',
        copy: '性格、興趣、家庭生活及表達方式。',
        status: 'Completed',
        body: `${childName} 喜歡透過遊戲和日常生活表達想法。家長可補充孩子的興趣、性格特質、常用語言，以及在熟悉環境中的互動表現。`,
        aiDraft: `${childName} is developing a clear sense of self through play, family routines, and simple conversations about interests and feelings.`,
        evidence: ['家長觀察', '興趣紀錄'],
        evidenceSuggestions: ['興趣相片', '家庭活動', '孩子語錄', '自我介紹錄音'],
        requiredEvidence: 2,
        updatedAt: formatPortfolioDate(),
      },
      {
        id: 'language',
        icon: 'record_voice_over',
        title: '語言與溝通 (Language & Communication)',
        shortTitle: 'Language',
        copy: '聆聽、表達、故事分享及雙語接觸。',
        status: 'AI Ready',
        body: `${childName} 正在建立聆聽與表達能力，能用熟悉詞語分享需要、感受和日常經驗。下一步可加入故事閱讀、唱歌或對話例子。`,
        aiDraft: `${childName} communicates needs and ideas through familiar words, gestures, stories, and play-based conversations, with parent support in bilingual routines.`,
        evidence: ['故事閱讀', '日常對話'],
        evidenceSuggestions: ['故事閱讀相片', '唱歌錄音', '中英文詞語例子', '課堂互動紀錄'],
        requiredEvidence: 3,
        updatedAt: formatPortfolioDate(),
      },
      {
        id: 'self-care',
        icon: 'health_and_safety',
        title: '自理與獨立性 (Self-care & Independence)',
        shortTitle: 'Self-care',
        copy: '穿衣、收拾、進食、如廁及日常規律。',
        status: 'Drafting',
        body: `${childName} 正在建立日常自理習慣，包括收拾個人物品、跟隨簡單步驟，以及在需要協助時清楚表達。`,
        aiDraft: `${childName} is developing independence in familiar routines and can follow simple steps with gentle reminders from adults.`,
        evidence: ['日常觀察'],
        evidenceSuggestions: ['收拾書包相片', '進食紀錄', '如廁／洗手習慣', '生活技能觀察'],
        requiredEvidence: 2,
        updatedAt: formatPortfolioDate(),
      },
      {
        id: 'social-emotional',
        icon: 'diversity_1',
        title: '社交與情緒 (Social & Emotional)',
        shortTitle: 'Social',
        copy: '合作、輪候、情緒表達及同伴互動。',
        status: 'Drafting',
        body: `${childName} 在成人引導下練習輪候、分享及表達情緒。家長可加入同伴活動或家庭互動例子，展示孩子的社交發展。`,
        aiDraft: `${childName} is learning to name feelings, take turns, and participate in small-group routines with adult guidance.`,
        evidence: ['同伴活動'],
        evidenceSuggestions: ['小組活動相片', '情緒表達例子', '合作遊戲', '老師觀察'],
        requiredEvidence: 3,
        updatedAt: formatPortfolioDate(),
      },
      {
        id: 'artworks',
        icon: 'palette',
        title: '創意與體能 (Creativity & Physical Development)',
        shortTitle: 'Creativity',
        copy: '藝術創作、音樂律動、大小肌肉及感官探索。',
        status: 'Drafting',
        body: `${childName} 的作品和活動可展示創意、手眼協調、專注力和探索精神。下一步可補充作品相片、活動過程及家長短評。`,
        aiDraft: `${childName}'s creative and movement evidence shows curiosity, fine-motor practice, sensory exploration, and willingness to try guided activities.`,
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
      title: '封面設計 (Cover Page)',
      shortTitle: 'Cover',
      copy: '基本資料、年級、學習焦點與代表相片。',
      status: 'Completed',
      body: `${childName} 的 Academic Learning Passport 已整理基本資料、年級 ${grade}、學習焦點及代表 evidence，可作家長、補習老師或學校溝通草稿。`,
      aiDraft: `${childName}'s academic learning passport introduces current grade, learning goals, selected work samples, and parent-confirmed evidence.`,
      evidence: ['學生相片', '基本資料'],
      evidenceSuggestions: ['學生相片', '基本資料', '學期目標', '老師／家長備註'],
      requiredEvidence: 2,
      image: images.portfolioChild,
      updatedAt: formatPortfolioDate(),
    },
    {
      id: 'about',
      icon: 'face',
      title: '學習者檔案 (Learner Profile)',
      shortTitle: 'Profile',
      copy: '學習風格、興趣科目及家庭支援。',
      status: 'Completed',
      body: `${childName} 喜歡主動發問，能把新知識連繫到日常生活。家長觀察到孩子在 ${focus} 方面有清晰興趣，適合以短練習、錯題回顧和可視化例子鞏固。`,
      aiDraft: `${childName} benefits from structured practice, parent-visible feedback, and examples that connect academic ideas to daily contexts.`,
      evidence: ['家長觀察', '興趣紀錄'],
      evidenceSuggestions: ['家長觀察', '學習習慣紀錄', '興趣科目', '補習老師備註'],
      requiredEvidence: 2,
      updatedAt: formatPortfolioDate(),
    },
    {
      id: 'attitude',
      icon: 'menu_book',
      title: '學習態度與策略 (Learning Attitude)',
      shortTitle: 'Attitude',
      copy: '堅持度、審題習慣、改正策略與學習目標。',
      status: 'AI Ready',
      body: `近期上載紀錄顯示 ${childName} 能保持練習節奏，在分數概念上有進步；應用題審題仍需要每日短練習支援。`,
      aiDraft: `${childName} demonstrates persistence during multi-step questions. Recent evidence suggests stronger number sense, while word-problem reading remains the next growth target.`,
      evidence: ['數學小測', 'AI 學習摘要'],
      evidenceSuggestions: ['錯題分析', '練習紀錄', '老師評語', '自我反思'],
      requiredEvidence: 3,
      updatedAt: formatPortfolioDate(),
    },
    {
      id: 'academic-progress',
      icon: 'monitoring',
      title: '學科進展 (Academic Progress)',
      shortTitle: 'Progress',
      copy: 'OCR evidence、練習結果、強弱項及進步曲線。',
      status: 'Drafting',
      body: `${childName} 的學科進展應連結已確認的功課、測驗、練習結果與弱項 topic，避免只靠主觀描述。下一步可加入最近一次 OCR review 和 practice attempt。`,
      aiDraft: `${childName}'s academic progress should connect uploaded work, confirmed mistakes, practice outcomes, and parent-approved next steps.`,
      evidence: ['OCR evidence'],
      evidenceSuggestions: ['功課 OCR review', '測驗分數', '練習結果', '弱項 topic summary'],
      requiredEvidence: 3,
      updatedAt: formatPortfolioDate(),
    },
    {
      id: 'artworks',
      icon: 'emoji_events',
      title: '成果與活動 (Achievements & Activities)',
      shortTitle: 'Achievements',
      copy: '作品、比賽、活動、閱讀或跨學科 evidence。',
      status: 'Drafting',
      body: `${childName} 的成果 evidence 可展示課外活動、閱讀、創意作品或跨學科能力。這部分應支援學習目標，而不是取代核心學科進展。`,
      aiDraft: `${childName}'s achievement evidence can show broader strengths, interests, and transferable skills when linked back to learning goals.`,
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
    body: `${section.body.trim()} Evidence: ${section.evidence.join(', ') || 'To be added.'}`,
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
          本週加入 <strong>2</strong> 項生活觀察，{childName} 在自理、表達和小組互動上有新 evidence。
        </>
      ),
      actionIcon: 'child_care',
      actionKicker: '今日建議',
      actionTitle: '整理一項自理或社交觀察',
      actionLabel: '整理 Portfolio',
      actionView: 'portfolio' as View,
      portfolioTitle: '幼兒成長 Portfolio',
      portfolioText: '整理性格、語言、自理、社交情緒、創意與體能發展。',
      progress: 61,
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
    actionIcon: 'school',
    actionKicker: '今日建議',
    actionTitle: '練習：5題兩步應用題',
    actionLabel: '開始練習',
    actionView: 'coach' as View,
    portfolioTitle: '學習歷程檔案',
    portfolioText: '收集並整理學生的學習成果與進步軌跡。',
    progress: 65,
    coachIcon: 'calculate',
    coachTitle: 'AI 數學教練',
    coachText: '基礎運算掌握良好，目前專注於應用題解析。',
    tags: ['分數計算 (優)', '應用題 (需努力)'],
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
      setOcrResult({ detail: error instanceof Error ? error.message : 'OCR analysis failed' });
      setOcrState('error');
    }
  }

  async function startPractice(options: PracticeStartOptions = {}) {
    if (!parent?.privacy_settings.ai_processing_consent) {
      setActiveView('profile');
      setProfileSheet('privacy');
      setPracticeState('idle');
      setPracticeError('Parent consent required for AI practice generation');
      setToast('請先在 Data & Privacy 開啟 AI review processing');
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
      const message = error instanceof Error ? error.message : 'Practice generation failed';
      setPracticeError(message);
      if (message.includes('Parent consent required')) {
        setActiveView('profile');
        setProfileSheet('privacy');
        setToast('請先在 Data & Privacy 開啟 AI review processing');
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
      setToast('Practice saved to progress report');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Practice completed but save failed');
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
          teacher_name: 'Tutor / Class Teacher',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      setShareReport(data.share);
      setShareState('done');
      setToast('Teacher report link ready');
    } catch (error) {
      setShareState('error');
      setToast(error instanceof Error ? error.message : 'Report share failed');
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
      setToast(error instanceof Error ? error.message : 'Learning Passport save failed');
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
          onStartPractice={() => startPractice()}
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
          practiceError={practiceError}
          practiceQuiz={practiceQuiz}
          practiceState={practiceState}
          progressState={progressState}
          shareReport={shareReport}
          shareState={shareState}
          onCompletePractice={completePractice}
          onShareReport={shareLearningReport}
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
      <h1>確認作業內容 / Upload Review</h1>
      <span aria-hidden="true" />
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
  child,
  onStartPractice,
  setActiveView,
}: {
  child: ChildProfile | null;
  onStartPractice: () => void;
  setActiveView: (view: View) => void;
}) {
  const [showAllUploads, setShowAllUploads] = useState(false);
  const content = homeContentForChild(child);
  const recentUploads = content.recentUploads;
  const handlePrimaryAction = content.actionView === 'coach'
    ? onStartPractice
    : () => setActiveView(content.actionView);

  return (
    <main className="content-stack home-view">
      <section className="ai-summary-card">
        <Icon name="auto_awesome" />
        <div className="ai-summary-inner">
          <div className="summary-icon">
            <Icon name={content.summaryIcon} filled />
          </div>
          <div>
            <h2>{content.summaryTitle}</h2>
            <p>{content.summaryBody}</p>
          </div>
        </div>
      </section>

      <section className="next-action-card">
        <div className="next-copy">
          <div className="school-icon">
            <Icon name={content.actionIcon} filled />
          </div>
          <div>
            <span>{content.actionKicker}</span>
            <h3>{content.actionTitle}</h3>
          </div>
        </div>
        <button className="primary-action" type="button" onClick={handlePrimaryAction}>
          <Icon name={content.actionView === 'coach' ? 'play_arrow' : 'edit_note'} filled />
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
  const activeSection = sections.find((section) => section.id === activeSectionId) || sections[0];
  const progress = calculatePortfolioProgress(sections);
  const completedCount = sections.filter((section) => section.status === 'Completed').length;
  const readyCount = sections.filter((section) => section.status === 'AI Ready').length;
  const evidenceCount = sections.reduce((total, section) => total + section.evidence.length, 0);
  const copy = portfolioStageCopy(child);
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
          <p>{readyCount ? `${readyCount} ${copy.tipReady}` : copy.tipDone}</p>
        </div>
      </section>

      <section className="passport-overview">
        <div>
          <span className="verified-label"><Icon name="verified" filled /> {copy.badge}</span>
          <div className="passport-title-row">
            <h2>{child?.passport || 'Learning Passport'}</h2>
            <button type="button" onClick={onEditPassportInfo}>
              <Icon name="edit" />
              Edit info
            </button>
          </div>
          <p>{child?.name || '孩子'} · {child?.grade || 'P3'} · {child?.focus || 'Portfolio Builder'}</p>
        </div>
        <div className="passport-progress-meter" aria-label={`Passport progress ${progress}%`}>
          <strong>{progress}%</strong>
          <span>{copy.pdfLabel}</span>
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
    ? detectedTopics.map((topic) => topic.topic).join(' / ')
    : ocrState === 'done'
      ? '未能穩定判定 topic，請家長確認'
      : 'AI 會自動辨識多個 topic';
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
              <img src={previewUrl} alt={activePreviewItem?.name || 'Scanned math homework'} />
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
            <button type="button" aria-label="View full image" onClick={onViewPreview} disabled={!canViewPreview}>
              <Icon name="fullscreen" />
            </button>
          </div>
          {selectedFileCount ? (
            <div className="selected-file-strip" aria-label="Selected upload pages">
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
              {selectedFileCount > 6 ? <span className="more-pages">+{selectedFileCount - 6} more</span> : null}
            </div>
          ) : null}
        </section>

        <section className="ocr-panel">
          <div className="ocr-panel-head">
            <h2><Icon name="document_scanner" filled /> 擷取資料</h2>
            <span>{statusLabel}</span>
          </div>

          <FormDisplay icon="stacks" label="頁數 / 檔案" value={selectedFileCount ? `${pageCount} pages from ${selectedFileCount} upload(s)` : '可一次選多張相片或 PDF'} />
          <FormDisplay icon="category" label="學習主題 (AI 多 topic)" value={topicValue} />

          <div className="parent-confirmation-notice">
            <Icon name="info" filled />
            <p>AI review requires parent confirmation before saving to learning profile.</p>
          </div>

          {detectedTopics.length ? (
            <div className="detected-topic-grid" aria-label="Detected topics">
              {detectedTopics.map((topic, index) => (
                <span
                  className={(topic.confidence || 0) >= 0.9 ? 'high-confidence' : ''}
                  key={topic.id || `${topic.topic}-${index}`}
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <b>{topic.topic}</b>
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
                <strong>Hybrid OCR Review · {detectedQuestions.length} items</strong>
                {detectedQuestions.slice(0, 5).map((question, index) => (
                  <p key={`${question.question_text}-${index}`}>
                    <span>P{question.page_number || index + 1}</span>
                    {question.topic ? <em>{question.topic}</em> : null}
                    {question.question_text}
                  </p>
                ))}
              </div>
            ) : null}
            {ocrState === 'error' ? (
              <div className="analysis-result error">
                <strong>GCP OCR Error</strong>
                <p>{ocrResult?.detail || 'OCR analysis failed'}</p>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <footer className={selectedFileCount ? 'upload-footer dual-actions' : 'upload-footer'}>
        <button className="secondary-action add-pages-action" type="button" onClick={() => inputRef.current?.click()}>
          <Icon name="add_photo_alternate" />
          Add More Pages
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
            <em>{topic}</em>
            <small>{confidence}</small>
          </div>
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
  learningProgress,
  onCompletePractice,
  onResetPractice,
  onShareReport,
  onStartPractice,
  onStartTopic,
  practiceError,
  practiceQuiz,
  practiceState,
  progressState,
  shareReport,
  shareState,
}: {
  child: ChildProfile | null;
  learningProgress: LearningProgress | null;
  onCompletePractice: (answers: PracticeSubmission) => void;
  onResetPractice: () => void;
  onShareReport: () => void;
  onStartPractice: () => void;
  onStartTopic: (options: PracticeStartOptions) => void;
  practiceError: string | null;
  practiceQuiz: GeneratedQuiz | null;
  practiceState: PracticeState;
  progressState: 'idle' | 'loading' | 'ready' | 'error';
  shareReport: ShareReport | null;
  shareState: 'idle' | 'running' | 'done' | 'error';
}) {
  const profileGrade = normalizeGrade(child?.grade);
  const gradeSubjects = useMemo(() => getSubjectsForGrade(profileGrade), [profileGrade]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(preferredCoachSubjectId(gradeSubjects));
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
      setSelectedSubjectId(preferredCoachSubjectId(gradeSubjects));
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
        <p>{child?.name || 'Matthew'} 目前集中數學弱項、OCR evidence 與針對練習。</p>
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

      <LearningReportPanel
        child={child}
        progress={learningProgress}
        progressState={progressState}
        shareReport={shareReport}
        shareState={shareState}
        onShareReport={onShareReport}
      />

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
      aria-label="Progress report and teacher share"
      data-stitch-source="projects/7550425496525656523/screens/1fb93eb80a3b493a96781f530ba50099"
    >
      <div className="report-panel-head">
        <div>
          <span className="report-kicker"><Icon name="analytics" /> Progress Report</span>
          <h2>{child?.name || '孩子'} 的進步報告</h2>
          <p>{reportMonth} · OCR evidence + practice attempts</p>
        </div>
        <div className="report-mastery-card" aria-label={`Mastery ${mastery}`}>
          <strong>{mastery}</strong>
          <small>Mastery</small>
        </div>
      </div>

      <div className="report-dashboard">
        <div className="report-trend-card">
          <span>Overall Mastery</span>
          <strong>{mastery}</strong>
          <div className="trend-line" aria-label="Recent progress trend">
            {trend.map((point, index) => (
              <i
                key={`${point}-${index}`}
                style={{ height: `${Math.max(18, Math.min(96, point))}%`, animationDelay: `${index * 80}ms` }}
              />
            ))}
          </div>
        </div>
        <div className="report-metrics">
          <Metric value={`${progress?.document_count || 0}`} label="Uploads" />
          <Metric value={`${progress?.practice_count || 0}`} label="Practices" />
          <Metric value={`${progress?.all_topics?.length || 0}`} label="Topics" />
        </div>
      </div>

      <div className="topic-report-grid">
        <article>
          <h3><Icon name="flag" /> Top 3 weak topics</h3>
          {weakTopics.length ? weakTopics.map((topic) => (
            <TopicReportRow key={`${topic.subject}-${topic.topic}`} topic={topic} />
          )) : <p className="empty-report-note">完成 OCR review 或練習後會自動生成弱項。</p>}
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
          <p>連結只包含學習弱項、改善項目與練習紀錄摘要；不公開原始相片。</p>
        </div>
        <div className="teacher-share-actions">
          <button className="primary-action report-share-button" type="button" disabled={shareState === 'running'} onClick={onShareReport}>
            <Icon name={shareState === 'done' ? 'task_alt' : 'ios_share'} filled />
            {shareState === 'running' ? '準備中...' : shareState === 'done' ? '已分享給老師' : '分享給補習老師'}
          </button>
          {shareHref ? (
            <div className="teacher-share-link-row" aria-label="Teacher report link ready">
              <button type="button" aria-label="Copy teacher report link" onClick={copyShareHref}>
                <Icon name="content_copy" />
              </button>
              <a href={shareHref} target="_blank" rel="noreferrer">{shareHref}</a>
              <a className="open-report-link" href={shareHref} target="_blank" rel="noreferrer" aria-label="Open teacher report">
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
        <strong>{topic.topic}</strong>
        <span>{topic.subject} · evidence {topic.evidence_count} · practice {topic.practice_count}</span>
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
          <Metric value={`${submittedCount}/${quiz.items.length}`} label="Submitted" />
          <Metric value={`${correctCount}/${quiz.items.length}`} label="Correct" />
          <Metric value={`${Math.ceil(quiz.items.reduce((total, item) => total + item.estimated_time_seconds, 0) / 60)}`} label="Mins" />
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

            <div className="choice-list" role="radiogroup" aria-label={`Question ${index + 1} choices`}>
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
  const profileGrade = normalizeGrade(child?.grade);
  const selectedStage = getStageForGrade(profileGrade);
  const stage = curriculumStages.find((item) => item.id === selectedStage) || curriculumStages[1];
  const mathSubject = useMemo(
    () => getSubjectsForGrade(profileGrade).find((subject) => subject.id === activeCoachSubjectId) || null,
    [profileGrade],
  );
  const notices = useMemo(() => gradeNotices(profileGrade), [profileGrade]);

  useEffect(() => {
    if (mathSubject && selectedSubjectId !== mathSubject.id) {
      onSelectSubject(mathSubject.id);
    }
  }, [mathSubject, onSelectSubject, selectedSubjectId]);

  return (
    <section className="curriculum-map" aria-label="HKEDB curriculum map">
      <div className="curriculum-head">
        <div>
          <span className="verified-label"><Icon name="verified" filled /> Active MVP · Mathematics · {profileGrade}</span>
          <h2>{child?.name || '孩子'} 的課程地圖</h2>
        </div>
      </div>

      <div className="profile-grade-lock">
        <span className="grade-token"><Icon name="badge" /> {profileGrade}</span>
        <div>
          <strong>{stage.label} · {stage.caption}</strong>
          <p>{child?.school_type || '香港學校'} · 目前專注數學練習與弱項追蹤</p>
        </div>
      </div>

      <section className="stage-summary">
        <div>
          <span>{stage.caption}</span>
          <h3>{stage.learningGoal}</h3>
        </div>
        <div className="curriculum-metrics">
          <Metric value="Maths" label="Focus" />
          <Metric value="1" label="Subject" />
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

      {mathSubject ? (
        <div className="subject-list">
          <CurriculumSubjectCard
            grade={profileGrade}
            selected={mathSubject.id === selectedSubjectId}
            subject={mathSubject}
            roadmap={false}
            onSelect={() => onSelectSubject(mathSubject.id)}
          />
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
      <section className="course-planner roadmap-only" aria-label="Mathematics topic notice">
        <div className="course-head">
          <div>
            <span><Icon name="calculate" filled /> Mathematics</span>
            <h2>{profileGrade} 數學 Learning Topics</h2>
          </div>
          <b>Math first</b>
        </div>
        <p className="roadmap-note">正在載入數學課程節點；練習生成、弱項追蹤與報告目前都以數學為主。</p>
      </section>
    );
  }

  return (
    <section className="course-planner" aria-label="Learning topics and course content">
      <div className="course-head">
        <div>
          <span><Icon name="auto_stories" filled /> Course content draft</span>
          <h2>{profileGrade} {activeSubject.displayNameZh} Learning Topics</h2>
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
          onClick={() => onStartPractice(buildPracticeOptions(activeSubject, activePlan))}
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
          <span>{subject.klaName}</span>
          <h3>{subject.displayNameZh}</h3>
          <p>{subject.name}</p>
        </div>
        <b>{roadmap ? 'Roadmap' : grade}</b>
      </div>
      <div className="strand-tags">
        {subject.strands.slice(0, 3).map((strand) => (
          <span key={strand}>{strand}</span>
        ))}
      </div>
      <p className="app-use">
        <Icon name={roadmap ? 'map' : 'auto_awesome'} />
        {roadmap ? 'Not active in this MVP.' : subject.appUse}
      </p>
      {subject.status ? <p className="subject-status">{subject.status}</p> : null}
    </button>
  );
}

function gradeNotices(grade: string) {
  return [
    { icon: 'calculate', text: `${grade} 數學課程節點` },
    { icon: 'task_alt', text: '練習、弱項追蹤與報告集中數學' },
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
