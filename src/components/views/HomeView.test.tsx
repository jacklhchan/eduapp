import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { images } from '../../config/assets';
import type { HomeViewContent } from './HomeView';
import { HomeView } from './HomeView';

const content: HomeViewContent = {
  actionDescription: '上載第一份數學功課。',
  actionIcon: 'add_a_photo',
  actionKicker: '下一步',
  actionLabel: '開始上載',
  actionTitle: '上載功課',
  actionView: 'upload',
  coachIcon: 'monitoring',
  coachText: '查看數學進度。',
  coachTitle: '數學教練',
  goals: [{ completed: true, label: '完成一題' }, { actionLabel: '前往', actionView: 'coach', label: '查看進度' }],
  masteryLabel: '數學紀錄',
  masteryScore: 20,
  portfolioText: '已有一項證據。',
  portfolioTitle: '數學學習檔案',
  progress: 25,
  progressItems: [{ icon: 'calculate', label: '分數', tone: 'primary', value: 20 }],
  progressText: '開始建立紀錄。',
  progressTitle: '數學進度',
  recentUploads: [{ image: images.homework, time: '今天', title: '數學小測' }],
  tags: ['分數'],
  trendLabel: '剛開始',
};

describe('HomeView', () => {
  it('renders home content and opens upload', async () => {
    const user = userEvent.setup();
    const setActiveView = vi.fn();

    render(<HomeView content={content} setActiveView={setActiveView} />);

    expect(screen.getByRole('heading', { name: '數學進度' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /開始上載/ }));
    expect(setActiveView).toHaveBeenCalledWith('upload');
  });
});
