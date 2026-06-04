import { useState, type ReactNode } from 'react';
import type { View } from '../../types';
import { Icon } from '../shared/Icon';
import { RecentThumb } from '../shared/RecentThumb';

export type HomeViewContent = {
  actionDescription: string;
  actionIcon: string;
  actionKicker: string;
  actionLabel: string;
  actionTitle: string;
  actionView: View;
  coachIcon: string;
  coachText: string;
  coachTitle: string;
  goals: Array<{ actionLabel?: string; actionView?: View; completed?: boolean; label: string }>;
  masteryLabel: string;
  masteryScore: number;
  portfolioText: string;
  portfolioTitle: string;
  progress: number;
  progressItems: Array<{ icon: string; label: string; tone: string; value: number }>;
  progressText: string;
  progressTitle: string;
  recentUploads: Array<{ image: string; time: string; title: string }>;
  summaryBody?: ReactNode;
  tags: string[];
  trendLabel: string;
};

export function HomeView({
  content,
  setActiveView,
}: {
  content: HomeViewContent;
  setActiveView: (view: View) => void;
}) {
  const [showAllUploads, setShowAllUploads] = useState(false);
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
