import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ChildProfile, PortfolioSectionDraft } from '../../types';
import { PortfolioView } from './PortfolioView';

const child: ChildProfile = {
  focus: '',
  grade: 'P3',
  id: 'child-test',
  language: '',
  name: 'Avery',
  passport: 'Learning Passport',
  school_type: '',
};

const sections: PortfolioSectionDraft[] = [
  {
    aiDraft: 'AI draft',
    body: 'Portfolio body',
    copy: 'Cover copy',
    evidence: ['功課證據'],
    icon: 'book',
    id: 'cover',
    requiredEvidence: 1,
    shortTitle: '封面',
    status: 'Completed',
    title: '封面設計',
    updatedAt: '6月4日',
  },
];

describe('PortfolioView', () => {
  it('renders portfolio sections and exports', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();

    render(
      <PortfolioView
        child={child}
        exportError={null}
        exportState="idle"
        sections={sections}
        onAddEvidence={vi.fn()}
        onEditPassportInfo={vi.fn()}
        onExport={onExport}
        onOpenUpload={vi.fn()}
        onPreviewEvidence={vi.fn()}
        onRemoveEvidence={vi.fn()}
        onUpdateSection={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: '學習護照' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /生成 PDF/ }));
    expect(onExport).toHaveBeenCalled();
  });
});
