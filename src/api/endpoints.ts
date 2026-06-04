import { apiRequest } from './client';
import type {
  AuthResponse,
  ChildDeleteResponse,
  ChildProfile,
  GenerateQuizResponse,
  LearningProgress,
  MistakeNotebookResponse,
  OcrInboxDocument,
  OcrResult,
  OcrReviewConfirmResponse,
  OcrReviewDeleteResponse,
  OcrReviewQuestionDraft,
  ParentProfile,
  ParentProfileUpdates,
  PortfolioExportResponse,
  PracticeAttemptResponse,
  PracticePlanItem,
  PrivacyCenterResponse,
  PrivacySettings,
  ShareReport,
  TeacherShareResponse,
  WeeklyBriefing,
} from '../types';

type LoginPayload = {
  email: string;
  pin: string;
};

type SignupPayload = LoginPayload & {
  display_name: string;
};

type GenerateQuizPayload = {
  child_profile_id: string;
  grade: string;
  practice_plan: PracticePlanItem[];
  question_count: number;
  subject: string;
  weak_topic: string;
};

type PracticeAttemptPayload = {
  child_id: string;
  grade: string;
  subject: string;
  answers: Array<{
    expected_answer: string;
    is_correct: boolean;
    question_id: string;
    question_text: string;
    subject: string;
    submitted_answer: string;
    target_mistake: string;
    topic: string;
  }>;
};

type ShareReportPayload = {
  child_id: string;
  expires_in_days: number;
  include_upload_evidence: boolean;
  report_month?: string;
  scope: 'summary_only' | 'summary_with_evidence';
  teacher_name: string;
};

type PortfolioExportPayload = {
  child_id: string;
  sections: Array<{
    body: string;
    status: string;
    title: string;
  }>;
};

export function getCurrentSession() {
  return apiRequest<AuthResponse>('/api/auth/me');
}

export function login(payload: LoginPayload) {
  return apiRequest<AuthResponse>('/api/auth/login', { method: 'POST', body: payload });
}

export function signup(payload: SignupPayload) {
  return apiRequest<AuthResponse>('/api/auth/signup', { method: 'POST', body: payload });
}

export function logout() {
  return apiRequest<void>('/api/auth/logout', { method: 'POST', parseAs: 'void' });
}

export function updateParent(payload: ParentProfileUpdates) {
  return apiRequest<ParentProfile>('/api/parent', { method: 'PATCH', body: payload });
}

export function createChild(payload: Omit<ChildProfile, 'id'>) {
  return apiRequest<ChildProfile>('/api/children', { method: 'POST', body: payload });
}

export function updateChild(childId: string, payload: Partial<ChildProfile>) {
  return apiRequest<ChildProfile>(`/api/children/${encodeURIComponent(childId)}`, { method: 'PATCH', body: payload });
}

export function deleteChild(childId: string, confirmationName: string) {
  return apiRequest<ChildDeleteResponse>(`/api/children/${encodeURIComponent(childId)}`, {
    method: 'DELETE',
    body: { confirmation_name: confirmationName, delete_storage: true },
  });
}

export function getPrivacyCenter() {
  return apiRequest<PrivacyCenterResponse>('/api/privacy');
}

export function updatePrivacyConsent(payload: Partial<PrivacySettings>) {
  return apiRequest<PrivacyCenterResponse>('/api/privacy/consent', { method: 'PATCH', body: payload });
}

export function uploadOcrReview(formData: FormData) {
  return apiRequest<OcrResult>('/api/ocr-review', { method: 'POST', formData });
}

export function getOcrReviewInbox(childId: string, includeConfirmed = true) {
  const params = new URLSearchParams({ child_id: childId, include_confirmed: String(includeConfirmed) });
  return apiRequest<OcrInboxDocument[]>(`/api/ocr-review/inbox?${params.toString()}`);
}

export function confirmOcrReview(documentId: string, questions: OcrReviewQuestionDraft[], parentNotes?: string) {
  return apiRequest<OcrReviewConfirmResponse>(`/api/ocr-review/${encodeURIComponent(documentId)}/confirm`, {
    method: 'PATCH',
    body: {
      extracted_questions: questions,
      parent_notes: parentNotes,
    },
  });
}

export function deleteOcrReview(documentId: string) {
  return apiRequest<OcrReviewDeleteResponse>(`/api/ocr-review/${encodeURIComponent(documentId)}`, {
    method: 'DELETE',
  });
}

export function generateQuiz(payload: GenerateQuizPayload) {
  return apiRequest<GenerateQuizResponse>('/api/generate-quiz', { method: 'POST', body: payload });
}

export function savePracticeAttempt(payload: PracticeAttemptPayload) {
  return apiRequest<PracticeAttemptResponse>('/api/practice-attempts', { method: 'POST', body: payload });
}

export function getLearningProgress(childId: string) {
  return apiRequest<LearningProgress>(`/api/learning/progress?child_id=${encodeURIComponent(childId)}`);
}

export function getMistakeNotebook(childId: string) {
  return apiRequest<MistakeNotebookResponse>(`/api/mistake-notebook?child_id=${encodeURIComponent(childId)}`);
}

export function getWeeklyBriefing(childId: string) {
  return apiRequest<WeeklyBriefing>(`/api/weekly-briefing?child_id=${encodeURIComponent(childId)}`);
}

export function getShareReports(childId: string) {
  return apiRequest<ShareReport[]>(`/api/reports/share?child_id=${encodeURIComponent(childId)}`);
}

export function createShareReport(payload: ShareReportPayload) {
  return apiRequest<TeacherShareResponse>('/api/reports/share', { method: 'POST', body: payload });
}

export function revokeShareReport(shareId: string) {
  return apiRequest<ShareReport>(`/api/reports/share/${encodeURIComponent(shareId)}`, { method: 'DELETE' });
}

export function exportPortfolio(payload: PortfolioExportPayload) {
  return apiRequest<PortfolioExportResponse>('/api/portfolio/export', { method: 'POST', body: payload });
}

export function downloadPortfolioExport(downloadUrl: string) {
  return apiRequest<Blob>(downloadUrl, { parseAs: 'blob' });
}
