import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ChildProfile, LearningProgress, MistakeNotebookItem, OcrInboxDocument } from '../../types';
import { CoachView } from './CoachView';

const child: ChildProfile = {
  focus: '分數應用題',
  grade: 'P3',
  id: 'child-test',
  language: '繁體中文',
  name: 'Avery',
  passport: 'Learning Passport',
  school_type: '香港主流小學',
};

const progress: LearningProgress = {
  all_topics: [
    {
      correct_count: 2,
      evidence_count: 1,
      incorrect_count: 1,
      mastery: 67,
      practice_count: 1,
      subject: 'Mathematics',
      topic: 'Fractions',
      trend: 'needs_attention',
    },
  ],
  child,
  document_count: 1,
  improved_topics: [],
  overall_mastery: 67,
  practice_count: 1,
  recent_activity: [{ count: 3, created_at: '2026-06-04T08:00:00+08:00', score: 67, title: 'Fractions', type: 'ocr_review' }],
  report_month: '2026-06',
  subject_scores: [
    {
      correct_count: 2,
      evidence_count: 1,
      incorrect_count: 1,
      mastery: 67,
      practice_count: 1,
      subject: 'Mathematics',
    },
  ],
  trend_points: [55, 60, 67],
  weak_topics: [
    {
      correct_count: 2,
      evidence_count: 1,
      incorrect_count: 1,
      mastery: 67,
      practice_count: 1,
      subject: 'Mathematics',
      topic: 'Fractions',
      trend: 'needs_attention',
    },
  ],
};

const ocrDocument: OcrInboxDocument = {
  created_at: '2026-06-04T08:00:00+08:00',
  filename: 'math-homework.jpg',
  id: 'doc-test',
  page_count: 1,
  parent_confirmed_at: null,
  review: {
    extracted_questions: [
      {
        confidence: 0.7,
        detected_answer: '1/2',
        id: 'q1',
        is_correct: false,
        mistake_tags: ['concept'],
        page_number: 1,
        question_text: '1/3 + 1/6 = ?',
        score: 0,
        topic: 'Fractions',
      },
    ],
    page_count: 1,
    topics: [{ confidence: 0.82, page_numbers: [1], topic: 'Fractions' }],
  },
  review_mode: 'hybrid',
};

const mistake: MistakeNotebookItem = {
  confidence: 0.7,
  expected_answer: '1/2',
  id: 'mistake-test',
  last_seen_at: '2026-06-04T08:00:00+08:00',
  mastery: 67,
  mistake_tag: 'concept',
  question_text: '1/3 + 1/6 = ?',
  recommendation: '重溫同分母與通分。',
  source_id: 'doc-test',
  source_type: 'ocr_review',
  subject: 'Mathematics',
  submitted_answer: '1/3',
  topic: 'Fractions',
};

describe('CoachView', () => {
  it('renders progress, review inbox, notebook, and report panels', () => {
    render(
      <CoachView
        child={child}
        learningProgress={progress}
        mistakeNotebook={[mistake]}
        ocrDeleteId={null}
        ocrInbox={[ocrDocument]}
        ocrInboxState="ready"
        progressState="ready"
        shareReport={null}
        shareReports={[]}
        shareState="idle"
        weeklyBriefing={null}
        onDeleteOcrReview={vi.fn()}
        onOpenOcrReview={vi.fn()}
        onRevokeShareReport={vi.fn()}
        onShareReport={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Avery 的數學成績' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '待確認與已確認' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '可重練的錯因' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Avery 的進步報告' })).toBeInTheDocument();
    expect(screen.getAllByText('分數').length).toBeGreaterThan(0);
  });
});
