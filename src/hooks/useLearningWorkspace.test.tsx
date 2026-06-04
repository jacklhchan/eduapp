import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as endpoints from '../api/endpoints';
import type { ChildProfile, LearningProgress, MistakeNotebookItem, OcrInboxDocument, ShareReport, WeeklyBriefing } from '../types';
import { useLearningWorkspace } from './useLearningWorkspace';

vi.mock('../api/endpoints', () => ({
  createShareReport: vi.fn(),
  getLearningProgress: vi.fn(),
  getMistakeNotebook: vi.fn(),
  getOcrReviewInbox: vi.fn(),
  getShareReports: vi.fn(),
  getWeeklyBriefing: vi.fn(),
  revokeShareReport: vi.fn(),
}));

const child: ChildProfile = {
  focus: '分數',
  grade: 'P3',
  id: 'child-test',
  language: '繁體中文',
  name: 'Avery',
  passport: 'Learning Passport',
  school_type: '香港主流小學',
};

const progress: LearningProgress = {
  all_topics: [],
  child,
  document_count: 1,
  improved_topics: [],
  overall_mastery: 67,
  practice_count: 1,
  recent_activity: [],
  report_month: '2026-06',
  subject_scores: [],
  trend_points: [],
  weak_topics: [],
};

const document: OcrInboxDocument = {
  created_at: '2026-06-04T08:00:00+08:00',
  filename: 'math-homework.jpg',
  id: 'doc-test',
  page_count: 1,
  parent_confirmed_at: null,
  review: { extracted_questions: [], page_count: 1, topics: [] },
  review_mode: 'hybrid',
};

const mistake: MistakeNotebookItem = {
  expected_answer: '1/2',
  id: 'mistake-test',
  mastery: 67,
  mistake_tag: 'concept',
  question_text: '1/3 + 1/6 = ?',
  recommendation: '重溫通分。',
  source_id: 'doc-test',
  source_type: 'ocr_review',
  subject: 'Mathematics',
  submitted_answer: '1/3',
  topic: 'Fractions',
};

const briefing: WeeklyBriefing = {
  focus_areas: ['Fractions'],
  generated_at: '2026-06-04T08:00:00+08:00',
  headline: 'Ready',
  next_actions: ['Review'],
  report_month: '2026-06',
  summary: 'Keep going',
  week_end: '2026-06-07',
  week_start: '2026-06-01',
  wins: ['Practice'],
};

const share: ShareReport = {
  id: 'share-test',
  report_month: '2026-06',
  share_url: '/teacher-report/token-test',
  token: 'token-test',
};

function WorkspaceHarness({ showToast = vi.fn() }: { showToast?: (message: string | null) => void }) {
  const workspace = useLearningWorkspace({ currentChild: child, showToast });
  return (
    <section>
      <span data-testid="progress">{workspace.progressState}:{workspace.learningProgress?.overall_mastery ?? 'none'}</span>
      <span data-testid="inbox">{workspace.ocrInboxState}:{workspace.ocrInbox.length}</span>
      <span data-testid="notebook">{workspace.mistakeNotebook.length}</span>
      <span data-testid="briefing">{workspace.weeklyBriefing?.headline || 'none'}</span>
      <span data-testid="shares">{workspace.shareState}:{workspace.shareReports.length}:{workspace.shareReport?.id || 'none'}</span>
      <button type="button" onClick={() => void workspace.refreshLearningProgress()}>refresh progress</button>
      <button type="button" onClick={() => void workspace.refreshP0Workspace()}>refresh workspace</button>
      <button type="button" onClick={() => void workspace.shareLearningReport({ teacherName: 'Ms Lee' })}>share report</button>
    </section>
  );
}

describe('useLearningWorkspace', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('refreshes progress, workspace data, and share state successfully', async () => {
    const showToast = vi.fn();
    vi.mocked(endpoints.getLearningProgress).mockResolvedValue(progress);
    vi.mocked(endpoints.getOcrReviewInbox).mockResolvedValue([document]);
    vi.mocked(endpoints.getMistakeNotebook).mockResolvedValue({ items: [mistake] });
    vi.mocked(endpoints.getWeeklyBriefing).mockResolvedValue(briefing);
    vi.mocked(endpoints.getShareReports).mockResolvedValue([share]);
    vi.mocked(endpoints.createShareReport).mockResolvedValue({ share });

    render(<WorkspaceHarness showToast={showToast} />);

    fireEvent.click(screen.getByRole('button', { name: 'refresh progress' }));
    await waitFor(() => expect(screen.getByTestId('progress')).toHaveTextContent('ready:67'));

    fireEvent.click(screen.getByRole('button', { name: 'refresh workspace' }));
    await waitFor(() => expect(screen.getByTestId('inbox')).toHaveTextContent('ready:1'));
    expect(screen.getByTestId('notebook')).toHaveTextContent('1');
    expect(screen.getByTestId('briefing')).toHaveTextContent('Ready');
    expect(screen.getByTestId('shares')).toHaveTextContent('idle:1:none');

    fireEvent.click(screen.getByRole('button', { name: 'share report' }));
    await waitFor(() => expect(screen.getByTestId('shares')).toHaveTextContent('done:1:share-test'));
    expect(endpoints.createShareReport).toHaveBeenCalledWith(expect.objectContaining({
      child_id: child.id,
      teacher_name: 'Ms Lee',
    }));
    expect(showToast).toHaveBeenCalledWith('教師報告連結已建立');
  });

  it('keeps fallback state and surfaces share errors', async () => {
    const showToast = vi.fn();
    vi.mocked(endpoints.getLearningProgress).mockRejectedValue(new Error('progress failed'));
    vi.mocked(endpoints.getOcrReviewInbox).mockRejectedValue(new Error('inbox failed'));
    vi.mocked(endpoints.getMistakeNotebook).mockRejectedValue(new Error('notebook failed'));
    vi.mocked(endpoints.getWeeklyBriefing).mockRejectedValue(new Error('briefing failed'));
    vi.mocked(endpoints.getShareReports).mockRejectedValue(new Error('shares failed'));
    vi.mocked(endpoints.createShareReport).mockRejectedValue(new Error('share failed'));

    render(<WorkspaceHarness showToast={showToast} />);

    fireEvent.click(screen.getByRole('button', { name: 'refresh progress' }));
    await waitFor(() => expect(screen.getByTestId('progress')).toHaveTextContent('error:none'));

    fireEvent.click(screen.getByRole('button', { name: 'refresh workspace' }));
    await waitFor(() => expect(screen.getByTestId('inbox')).toHaveTextContent('error:0'));
    expect(screen.getByTestId('notebook')).toHaveTextContent('0');
    expect(screen.getByTestId('briefing')).toHaveTextContent('none');
    expect(screen.getByTestId('shares')).toHaveTextContent('idle:0:none');

    fireEvent.click(screen.getByRole('button', { name: 'share report' }));
    await waitFor(() => expect(screen.getByTestId('shares')).toHaveTextContent('error:0:none'));
    expect(showToast).toHaveBeenCalledWith('share failed');
  });
});
