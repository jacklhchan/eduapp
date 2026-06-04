import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import type { ChildProfile, LearningProgress, ParentProfile, PrivacySettings, WeeklyBriefing } from './types';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

const privacySettings: PrivacySettings = {
  ai_processing_consent: true,
  consent_version: 'test',
  portfolio_export_consent: true,
  product_updates_consent: false,
  retention_days: 365,
  upload_storage_consent: true,
};

const child: ChildProfile = {
  focus: '',
  grade: 'P3',
  id: 'child-test',
  language: '繁體中文',
  name: 'Avery',
  passport: 'Learning Passport',
  school_type: '香港主流小學',
};

const parent: ParentProfile = {
  children: [child],
  display_name: 'Chan Family',
  email: 'parent@example.com',
  id: 'parent-test',
  onboarding_complete: true,
  privacy_settings: privacySettings,
};

const progress: LearningProgress = {
  all_topics: [],
  child,
  document_count: 0,
  improved_topics: [],
  overall_mastery: 0,
  practice_count: 0,
  recent_activity: [],
  report_month: '2026-06',
  subject_scores: [],
  trend_points: [],
  weak_topics: [],
};

const briefing: WeeklyBriefing = {
  focus_areas: [],
  generated_at: '2026-06-04T00:00:00+08:00',
  headline: 'Ready',
  next_actions: [],
  report_month: '2026-06',
  summary: '',
  week_end: '2026-06-07',
  week_start: '2026-06-01',
  wins: [],
};

describe('App smoke states', () => {
  it('renders the loading state while session is pending', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)));

    render(<App />);

    expect(screen.getByText('正在載入安全學習工作區...')).toBeInTheDocument();
  });

  it('renders anonymous login state when auth me fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ detail: 'Not authenticated' }, 401)));

    render(<App />);

    expect(await screen.findByRole('button', { name: '登入' })).toBeInTheDocument();
    expect(screen.getByText('新家長？建立帳戶')).toBeInTheDocument();
  });

  it('renders authenticated home state', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/auth/me') return Promise.resolve(jsonResponse({ ok: true, parent }));
      if (url.startsWith('/api/learning/progress')) return Promise.resolve(jsonResponse(progress));
      if (url.startsWith('/api/ocr-review/inbox')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/mistake-notebook')) return Promise.resolve(jsonResponse({ items: [] }));
      if (url.startsWith('/api/weekly-briefing')) return Promise.resolve(jsonResponse(briefing));
      if (url.startsWith('/api/reports/share')) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse({ ok: true }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Avery' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '主要導覽' })).toBeInTheDocument();
  });
});
