export type View = 'home' | 'portfolio' | 'upload' | 'coach' | 'profile';
export type AuthMode = 'login' | 'signup';

export type OcrFilePreview = {
  page_number: number;
  filename: string;
  mime_type: string;
  file_kind: 'image' | 'pdf' | 'file';
  preview_url: string;
};

export type OcrResult = {
  ok?: boolean;
  document_id?: string;
  document?: {
    id: string;
    filename?: string;
    parent_confirmed_at?: string | null;
    file_previews?: OcrFilePreview[];
  };
  file_previews?: OcrFilePreview[];
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
      id?: string;
      question_text: string;
      detected_answer?: string | null;
      is_correct?: boolean | null;
      score?: number | null;
      max_score?: number | null;
      confidence: number;
      page_number?: number | null;
      topic?: string | null;
      topic_ids?: string[];
      mistake_tags?: string[];
    }>;
  };
  detail?: string;
};

export type UploadPreviewItem = {
  name: string;
  type: string;
  url: string | null;
  fileKind?: 'image' | 'pdf' | 'file';
  pageNumber?: number;
};

export type PortfolioStatus = 'Completed' | 'AI Ready' | 'Drafting';

export type PortfolioStoredSection = {
  id: string;
  status: PortfolioStatus | string;
  body: string;
  evidence: string[];
  updated_at?: string | null;
};

export type ChildProfile = {
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

export type PrivacySettings = {
  ai_processing_consent: boolean;
  upload_storage_consent: boolean;
  portfolio_export_consent: boolean;
  product_updates_consent: boolean;
  retention_days: number;
  consent_version: string;
  consent_updated_at?: string | null;
};

export type ChildDataSummary = {
  child_id: string;
  child_name: string;
  grade: string;
  document_count: number;
  practice_count: number;
  portfolio_export_count: number;
};

export type AuditEvent = {
  id: string;
  event_type: string;
  child_id?: string | null;
  created_at: string;
  details: Record<string, unknown>;
};

export type PrivacyCenterResponse = {
  parent: ParentProfile;
  privacy_settings: PrivacySettings;
  children: ChildDataSummary[];
  audit_events: AuditEvent[];
};

export type ParentProfile = {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string | null;
  onboarding_complete: boolean;
  privacy_settings: PrivacySettings;
  children: ChildProfile[];
};

export type AuthState = 'loading' | 'anonymous' | 'authenticated';

export type ExportState = 'idle' | 'running' | 'done' | 'error';

export type PortfolioTone = 'complete' | 'ready' | 'draft';

export type PortfolioSectionDraft = {
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

export type QuizItem = {
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

export type GeneratedQuiz = {
  items: QuizItem[];
  parent_visible_rationale: string;
};

export type LearningTopicSummary = {
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

export type SubjectProgressSummary = {
  subject: string;
  evidence_count: number;
  practice_count: number;
  correct_count: number;
  incorrect_count: number;
  mastery: number;
  last_seen_at?: string | null;
};

export type LearningProgress = {
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

export type ShareReport = {
  id: string;
  token: string;
  share_url: string;
  report_month: string;
  teacher_name?: string | null;
  include_upload_evidence?: boolean;
  scope?: 'summary_only' | 'summary_with_evidence';
  expires_at?: string | null;
  revoked_at?: string | null;
};

export type OcrReviewQuestionDraft = {
  id: string;
  question_text: string;
  detected_answer?: string | null;
  is_correct?: boolean | null;
  score?: number | null;
  max_score?: number | null;
  confidence: number;
  page_number?: number | null;
  topic?: string | null;
  topic_ids?: string[];
  mistake_tags: string[];
};

export type OcrInboxDocument = {
  id: string;
  filename: string;
  created_at: string;
  page_count: number;
  review_mode: string;
  parent_confirmed_at?: string | null;
  file_previews?: OcrFilePreview[];
  review: {
    page_count?: number;
    topics?: Array<{ topic: string; confidence?: number; page_numbers?: number[] }>;
    extracted_questions?: OcrReviewQuestionDraft[];
  };
};

export type MistakeNotebookItem = {
  id: string;
  source_type: 'ocr_review' | 'practice_attempt';
  source_id: string;
  subject: string;
  topic: string;
  mistake_tag: string;
  question_text: string;
  submitted_answer: string;
  expected_answer: string;
  confidence?: number | null;
  mastery: number;
  last_seen_at?: string | null;
  recommendation: string;
};

export type WeeklyBriefing = {
  report_month: string;
  week_start: string;
  week_end: string;
  headline: string;
  summary: string;
  wins: string[];
  focus_areas: string[];
  next_actions: string[];
  generated_at: string;
};

export type ShareReportOptions = {
  teacherName?: string;
  expiresInDays?: number;
  includeUploadEvidence?: boolean;
};

export type PracticeSubmission = Record<string, { answer: string; isCorrect: boolean }>;

export type PracticePlanItem = {
  topic_id: string;
  title: string;
  title_zh: string;
  strand: string;
  question_count: number;
};

export type PracticeStartOptions = {
  practicePlan?: PracticePlanItem[];
  questionCount?: number;
  subject?: string;
  weakTopic?: string;
};

export type PracticeState = 'idle' | 'generating' | 'ready' | 'complete' | 'error';
export type UiLanguage = 'zh-Hant' | 'en';

export type ProfileSheet =
  | 'edit-parent'
  | 'edit-child'
  | 'add-child'
  | 'privacy'
  | 'language'
  | 'notifications'
  | 'support'
  | 'learning-plus'
  | null;

export type ParentProfileUpdates = {
  display_name?: string;
  avatar_url?: string | null;
  onboarding_complete?: boolean;
};

export type AuthResponse = {
  ok?: boolean;
  parent: ParentProfile;
};

export type GenerateQuizResponse = {
  quiz: GeneratedQuiz;
};

export type MistakeNotebookResponse = {
  items?: MistakeNotebookItem[];
};

export type TeacherShareResponse = {
  share: ShareReport;
};

export type PortfolioExportResponse = {
  id?: string;
  filename?: string;
  download_url: string;
};

export type PracticeAttemptResponse = {
  id?: string;
  [key: string]: unknown;
};

export type OcrReviewConfirmResponse = {
  parent_confirmed_at?: string | null;
  [key: string]: unknown;
};

export type OcrReviewDeleteResponse = {
  ok?: boolean;
  deleted_document_id?: string;
  deleted_storage_objects?: number;
};

export type ChildDeleteResponse = {
  parent: ParentProfile;
  deleted_child_id?: string;
  deleted_documents?: number;
  deleted_portfolio_exports?: number;
  deleted_storage_objects?: number;
};
