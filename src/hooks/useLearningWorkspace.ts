import { useCallback, useState } from 'react';
import * as endpoints from '../api/endpoints';
import type {
  ChildProfile,
  LearningProgress,
  MistakeNotebookItem,
  OcrInboxDocument,
  ShareReport,
  ShareReportOptions,
  WeeklyBriefing,
} from '../types';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type ShareState = 'idle' | 'running' | 'done' | 'error';

export function useLearningWorkspace({
  currentChild,
  showToast,
}: {
  currentChild: ChildProfile | null;
  showToast: (message: string | null) => void;
}) {
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [progressState, setProgressState] = useState<LoadState>('idle');
  const [shareReport, setShareReport] = useState<ShareReport | null>(null);
  const [shareReports, setShareReports] = useState<ShareReport[]>([]);
  const [shareState, setShareState] = useState<ShareState>('idle');
  const [ocrInbox, setOcrInbox] = useState<OcrInboxDocument[]>([]);
  const [ocrInboxState, setOcrInboxState] = useState<LoadState>('idle');
  const [mistakeNotebook, setMistakeNotebook] = useState<MistakeNotebookItem[]>([]);
  const [weeklyBriefing, setWeeklyBriefing] = useState<WeeklyBriefing | null>(null);
  const currentChildId = currentChild?.id;

  const refreshLearningProgress = useCallback(async (childId = currentChildId) => {
    if (!childId) return null;
    setProgressState('loading');
    try {
      const data = await endpoints.getLearningProgress(childId);
      setLearningProgress(data);
      setProgressState('ready');
      return data;
    } catch {
      setProgressState('error');
      return null;
    }
  }, [currentChildId]);

  const refreshOcrInbox = useCallback(async (childId = currentChildId) => {
    if (!childId) return [] as OcrInboxDocument[];
    setOcrInboxState('loading');
    try {
      const data = await endpoints.getOcrReviewInbox(childId, true);
      setOcrInbox(data);
      setOcrInboxState('ready');
      return data;
    } catch {
      setOcrInboxState('error');
      return [];
    }
  }, [currentChildId]);

  const refreshMistakeNotebook = useCallback(async (childId = currentChildId) => {
    if (!childId) return [] as MistakeNotebookItem[];
    try {
      const data = await endpoints.getMistakeNotebook(childId);
      setMistakeNotebook(data.items || []);
      return data.items || [];
    } catch {
      setMistakeNotebook([]);
      return [];
    }
  }, [currentChildId]);

  const refreshWeeklyBriefing = useCallback(async (childId = currentChildId) => {
    if (!childId) return null;
    try {
      const data = await endpoints.getWeeklyBriefing(childId);
      setWeeklyBriefing(data);
      return data;
    } catch {
      setWeeklyBriefing(null);
      return null;
    }
  }, [currentChildId]);

  const refreshShareLinks = useCallback(async (childId = currentChildId) => {
    if (!childId) return [] as ShareReport[];
    try {
      const data = await endpoints.getShareReports(childId);
      setShareReports(data);
      return data;
    } catch {
      setShareReports([]);
      return [];
    }
  }, [currentChildId]);

  const refreshP0Workspace = useCallback(async (childId = currentChildId) => {
    if (!childId) return;
    await Promise.all([
      refreshOcrInbox(childId),
      refreshMistakeNotebook(childId),
      refreshWeeklyBriefing(childId),
      refreshShareLinks(childId),
    ]);
  }, [currentChildId, refreshMistakeNotebook, refreshOcrInbox, refreshShareLinks, refreshWeeklyBriefing]);

  const shareLearningReport = useCallback(async (options: ShareReportOptions = {}) => {
    if (!currentChild) return;
    setShareState('running');
    try {
      const data = await endpoints.createShareReport({
        child_id: currentChild.id,
        expires_in_days: options.expiresInDays || 30,
        include_upload_evidence: Boolean(options.includeUploadEvidence),
        report_month: learningProgress?.report_month,
        scope: options.includeUploadEvidence ? 'summary_with_evidence' : 'summary_only',
        teacher_name: options.teacherName || '補習老師 / 班主任',
      });
      setShareReport(data.share);
      await refreshShareLinks(currentChild.id);
      setShareState('done');
      showToast('教師報告連結已建立');
    } catch (error) {
      setShareState('error');
      showToast(error instanceof Error ? error.message : '分享報告失敗');
    }
  }, [currentChild, learningProgress?.report_month, refreshShareLinks, showToast]);

  const revokeShareReport = useCallback(async (shareId: string) => {
    const data = await endpoints.revokeShareReport(shareId);
    setShareReports((current) => current.map((item) => (item.id === shareId ? data : item)));
    showToast('教師分享連結已撤回');
  }, [showToast]);

  const removeOcrInboxDocument = useCallback((documentId: string) => {
    setOcrInbox((current) => current.filter((document) => document.id !== documentId));
  }, []);

  return {
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
  };
}
