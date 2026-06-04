import { useEffect, useMemo, useState } from 'react';
import { getCourseTopicsForGradeAndSubject, type CourseTopic } from '../../data/courseContent';
import {
  curriculumStages,
  getStageForGrade,
  getSubjectsForGrade,
  isAcademicProgressSubject,
  normalizeGrade,
  type CurriculumSubject,
} from '../../data/curriculum';
import {
  activeCoachSubjectId,
  activeCoachSubjectName,
  displayKlaName,
  displayLearningText,
  displayLevelName,
  displayStageCaption,
  displayStrandName,
  displaySubjectName,
  displaySubjectStatus,
  displaySubjectUse,
  displayTopicName,
  filterLearningProgressForMvp,
  formatActivityDate,
  formatBriefDate,
  isMvpCurriculumSubject,
  isMvpLearningSubject,
  mistakeTagLabel,
  mvpLearningTopics,
  preferredProgressSubjectId,
} from '../../domain/learningDisplay';
import type {
  ChildProfile,
  LearningProgress,
  LearningTopicSummary,
  MistakeNotebookItem,
  OcrInboxDocument,
  PracticeStartOptions,
  ShareReport,
  ShareReportOptions,
  SubjectProgressSummary,
  WeeklyBriefing,
} from '../../types';
import { Icon } from '../shared/Icon';
import { Metric } from '../shared/Metric';

export function CoachView({
  child,
  learningProgress,
  mistakeNotebook,
  ocrInbox,
  ocrDeleteId,
  ocrInboxState,
  onDeleteOcrReview,
  onOpenOcrReview,
  onRevokeShareReport,
  onShareReport,
  progressState,
  shareReport,
  shareReports,
  shareState,
  weeklyBriefing,
}: {
  child: ChildProfile | null;
  learningProgress: LearningProgress | null;
  mistakeNotebook: MistakeNotebookItem[];
  ocrInbox: OcrInboxDocument[];
  ocrDeleteId: string | null;
  ocrInboxState: 'idle' | 'loading' | 'ready' | 'error';
  onDeleteOcrReview: (documentId: string, filename?: string) => Promise<void>;
  onOpenOcrReview: (document: OcrInboxDocument) => void;
  onRevokeShareReport: (shareId: string) => Promise<void>;
  onShareReport: (options?: ShareReportOptions) => void;
  progressState: 'idle' | 'loading' | 'ready' | 'error';
  shareReport: ShareReport | null;
  shareReports: ShareReport[];
  shareState: 'idle' | 'running' | 'done' | 'error';
  weeklyBriefing: WeeklyBriefing | null;
}) {
  const profileGrade = normalizeGrade(child?.grade);
  const gradeSubjects = useMemo(
    () => getSubjectsForGrade(profileGrade).filter(isAcademicProgressSubject).filter(isMvpCurriculumSubject),
    [profileGrade],
  );
  const visibleProgress = useMemo(() => filterLearningProgressForMvp(learningProgress), [learningProgress]);
  const visibleMistakeNotebook = useMemo(
    () => mistakeNotebook.filter((item) => isMvpLearningSubject(item.subject)),
    [mistakeNotebook],
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState(preferredProgressSubjectId(gradeSubjects));
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
      setSelectedSubjectId(preferredProgressSubjectId(gradeSubjects));
    }
  }, [gradeSubjects, selectedSubjectId]);

  return (
    <main
      className="content-stack coach-view"
      data-stitch-source="projects/10595017015370179580/screens/a592e20bc97e4cbfb85986527e821d31 projects/10595017015370179580/screens/14d41f421d024aac915984de00d1dea0"
    >
      <section className="page-intro tight">
        <h2>數學進度</h2>
        <p>{child?.name || 'Matthew'} 的數學掌握度、OCR 證據與弱項主題。</p>
      </section>

      <AcademicSubjectProgressPanel
        child={child}
        progress={visibleProgress}
        progressState={progressState}
        selectedSubject={selectedSubject}
        subjects={gradeSubjects}
        onSelectSubject={setSelectedSubjectId}
      />

      <WeeklyBriefingPanel briefing={weeklyBriefing} child={child} />

      <OcrReviewInboxPanel
        documents={ocrInbox}
        deletingDocumentId={ocrDeleteId}
        state={ocrInboxState}
        onDeleteReview={onDeleteOcrReview}
        onOpenReview={onOpenOcrReview}
      />

      <MistakeNotebookPanel items={visibleMistakeNotebook} />

      <CurriculumMapSection
        child={child}
        selectedSubjectId={selectedSubject?.id || ''}
        onSelectSubject={setSelectedSubjectId}
      />

      <LearningReportPanel
        child={child}
        progress={visibleProgress}
        progressState={progressState}
        shareReports={shareReports}
        shareReport={shareReport}
        shareState={shareState}
        onRevokeShareReport={onRevokeShareReport}
        onShareReport={onShareReport}
      />

      <section className="coach-grid">
        <article className="data-card">
          <div className="card-title-row">
            <h3>弱項主題</h3>
            <Icon name="bar_chart" />
          </div>
          {(visibleProgress?.weak_topics || []).slice(0, 4).map((topic) => (
            <Mastery
              key={`${topic.subject}-${topic.topic}`}
              label={displayTopicName(topic.topic)}
              value={topic.mastery}
              tone={topic.mastery >= 75 ? 'green' : topic.mastery >= 60 ? 'amber' : 'red'}
            />
          ))}
          {visibleProgress?.weak_topics?.length ? null : <p>暫時未有已評分數學主題。</p>}
        </article>

        <article className="data-card">
          <div className="card-title-row">
            <h3>分數來源</h3>
            <Icon name="fact_check" />
          </div>
          <p>基於已上載並確認的 OCR 檢視、測驗分數及已保存的數學練習紀錄。</p>
          <div className="mistake-tags">
            <span><Icon name="upload_file" /> {visibleProgress?.document_count || 0} 份上載</span>
            <span><Icon name="edit_note" /> {visibleProgress?.practice_count || 0} 次練習</span>
            <span className="amber"><Icon name="calculate" /> 數學 MVP</span>
          </div>
        </article>
      </section>

      <section className="history-section">
        <h3>近期紀錄</h3>
        {(visibleProgress?.recent_activity || []).slice(0, 3).map((activity, index) => (
          <HistoryCard
            key={`${activity.created_at || index}-${activity.title || 'activity'}`}
            score={`${activity.score ?? visibleProgress?.overall_mastery ?? 0}`}
            title={displayTopicName(String(activity.title || '學習證據'))}
            date={formatActivityDate(activity.created_at)}
            text={`${activity.type === 'practice_attempt' ? '數學練習' : 'OCR 證據'} · ${activity.count || 0} 項`}
            tone={Number(activity.score || visibleProgress?.overall_mastery || 0) >= 75 ? 'green' : 'gray'}
          />
        ))}
        {visibleProgress?.recent_activity?.length ? null : <p className="empty-report-note">上載有分數的數學作品後，這裡會顯示最新紀錄。</p>}
      </section>
    </main>
  );
}

function WeeklyBriefingPanel({ briefing, child }: { briefing: WeeklyBriefing | null; child: ChildProfile | null }) {
  return (
    <section className="weekly-briefing-panel" aria-label="每週家長簡報">
      <div className="weekly-briefing-head">
        <div>
          <span className="report-kicker"><Icon name="event_note" /> 每週簡報</span>
          <h2>{briefing?.headline ? displayLearningText(briefing.headline) : `${child?.name || '孩子'} 的每週學習摘要`}</h2>
          <p>{briefing?.summary ? displayLearningText(briefing.summary) : '完成 OCR 檢視或練習後，系統會整理本週重點。'}</p>
        </div>
        <Metric value={briefing?.week_end ? formatBriefDate(briefing.week_end) : '--'} label="至" />
      </div>
      <div className="briefing-columns">
        <BriefingColumn icon="trending_up" title="亮點" items={briefing?.wins || ['等待更多學習紀錄']} />
        <BriefingColumn icon="flag" title="焦點" items={briefing?.focus_areas || ['上載一份已批改功課']} />
        <BriefingColumn icon="task_alt" title="下步" items={briefing?.next_actions || ['確認 OCR 待確認清單']} />
      </div>
    </section>
  );
}

function BriefingColumn({ icon, items, title }: { icon: string; items: string[]; title: string }) {
  return (
    <article>
      <h3><Icon name={icon} /> {title}</h3>
      {items.slice(0, 3).map((item) => <p key={item}>{displayLearningText(item)}</p>)}
    </article>
  );
}

function OcrReviewInboxPanel({
  deletingDocumentId,
  documents,
  onDeleteReview,
  onOpenReview,
  state,
}: {
  deletingDocumentId: string | null;
  documents: OcrInboxDocument[];
  onDeleteReview: (documentId: string, filename?: string) => Promise<void>;
  onOpenReview: (document: OcrInboxDocument) => void;
  state: 'idle' | 'loading' | 'ready' | 'error';
}) {
  const pendingCount = documents.filter((document) => !document.parent_confirmed_at).length;
  return (
    <section className="review-inbox-panel" aria-label="OCR 記錄">
      <div className="report-panel-head">
        <div>
          <span className="report-kicker"><Icon name="rule" /> OCR 記錄</span>
          <h2>待確認與已確認</h2>
          <p>{state === 'loading' ? '讀取上載紀錄中...' : `${pendingCount} 份待確認 · ${documents.length} 份近期記錄`}</p>
        </div>
        <Metric value={`${pendingCount}`} label="待處理" />
      </div>
      <div className="review-inbox-list">
        {documents.map((document) => {
          const questions = document.review.extracted_questions || [];
          const topics = document.review.topics || [];
          const lowConfidence = questions.filter((question) => question.confidence < 0.76).length;
          const confirmed = Boolean(document.parent_confirmed_at);
          const deleting = deletingDocumentId === document.id;
          return (
            <article key={document.id} className="review-inbox-row">
              <div>
                <span>{formatActivityDate(document.created_at)} · {document.page_count} 頁 · {confirmed ? '已確認' : '待確認'}</span>
                <strong>{displayTopicName(document.filename)}</strong>
                <p>
                  {topics.slice(0, 2).map((topic) => displayTopicName(topic.topic)).join(' / ') || '未分類'}
                  {lowConfidence ? ` · ${lowConfidence} 題低信心` : ''}
                </p>
              </div>
              <div className="review-inbox-actions">
                <button
                  className="secondary-action"
                  type="button"
                  disabled={!questions.length || deleting}
                  onClick={() => onOpenReview(document)}
                >
                  <Icon name={confirmed ? 'visibility' : 'fact_check'} />
                  {confirmed ? '查看' : '檢視'}
                </button>
                <button
                  aria-label={`刪除 OCR 記錄 ${document.filename}`}
                  className="secondary-action icon-only destructive-action"
                  title="刪除 OCR 記錄"
                  type="button"
                  disabled={deleting}
                  onClick={() => onDeleteReview(document.id, document.filename)}
                >
                  <Icon name={deleting ? 'sync' : 'delete'} />
                </button>
              </div>
            </article>
          );
        })}
        {!documents.length ? <p className="empty-report-note">暫時沒有 OCR 記錄。</p> : null}
      </div>
    </section>
  );
}

function MistakeNotebookPanel({ items }: { items: MistakeNotebookItem[] }) {
  return (
    <section className="mistake-notebook-panel" aria-label="錯題簿">
      <div className="report-panel-head">
        <div>
          <span className="report-kicker"><Icon name="menu_book" /> 錯題簿</span>
          <h2>可重練的錯因</h2>
          <p>OCR 檢視與練習答錯項目會自動整理到這裡。</p>
        </div>
        <Metric value={`${items.length}`} label="項目" />
      </div>
      <div className="notebook-list">
        {items.slice(0, 5).map((item) => (
          <article className="notebook-row" key={item.id}>
            <span className="notebook-source"><Icon name={item.source_type === 'ocr_review' ? 'document_scanner' : 'edit_note'} /> {displaySubjectName(item.subject)}</span>
            <div>
              <strong>{displayTopicName(item.topic)}</strong>
              <p>{displayLearningText(item.question_text || item.recommendation)}</p>
              <small>{mistakeTagLabel(item.mistake_tag)} · 掌握度 {item.mastery}% · {formatActivityDate(item.last_seen_at)}</small>
            </div>
            <b>{item.mastery}%</b>
          </article>
        ))}
        {!items.length ? <p className="empty-report-note">暫時沒有錯題；完成練習或確認 OCR 後會自動加入。</p> : null}
      </div>
    </section>
  );
}

type AcademicSubjectProgressRow = {
  subject: CurriculumSubject;
  mastery: number | null;
  evidenceCount: number;
  practiceCount: number;
  topicCount: number;
  lastSeenAt?: string | null;
};

function normalizeSubjectLabel(value: string) {
  return value.trim().toLowerCase();
}

function buildAcademicSubjectRows(
  progress: LearningProgress | null,
  subjects: CurriculumSubject[],
): AcademicSubjectProgressRow[] {
  const scoreBySubject = new Map((progress?.subject_scores || []).map((score) => [normalizeSubjectLabel(score.subject), score]));
  return subjects.map((subject) => {
    const subjectKeys = [subject.id, subject.name, subject.displayNameZh].map(normalizeSubjectLabel);
    const score = subjectKeys.map((key) => scoreBySubject.get(key)).find(Boolean);
    const topicMatches = (progress?.all_topics || []).filter((topic) => subjectKeys.includes(normalizeSubjectLabel(topic.subject)));
    const evidenceCount = score?.evidence_count ?? topicMatches.reduce((total, topic) => total + topic.evidence_count, 0);
    const practiceCount = score?.practice_count ?? topicMatches.reduce((total, topic) => total + topic.practice_count, 0);
    const mastery = score?.mastery ?? (
      topicMatches.length
        ? Math.round(topicMatches.reduce((total, topic) => total + topic.mastery, 0) / topicMatches.length)
        : null
    );
    const sortedDates = topicMatches.map((topic) => topic.last_seen_at || '').sort();
    const lastSeenAt = score?.last_seen_at || sortedDates[sortedDates.length - 1] || null;
    return {
      subject,
      mastery,
      evidenceCount,
      practiceCount,
      topicCount: topicMatches.length,
      lastSeenAt,
    };
  });
}

function AcademicSubjectProgressPanel({
  child,
  onSelectSubject,
  progress,
  progressState,
  selectedSubject,
  subjects,
}: {
  child: ChildProfile | null;
  onSelectSubject: (subjectId: string) => void;
  progress: LearningProgress | null;
  progressState: 'idle' | 'loading' | 'ready' | 'error';
  selectedSubject: CurriculumSubject | null;
  subjects: CurriculumSubject[];
}) {
  const rows = buildAcademicSubjectRows(progress, subjects);
  const scoredRows = rows.filter((row) => row.mastery !== null);
  const mastery = progressState === 'loading' ? '...' : `${progress?.overall_mastery || 0}%`;
  const selectedRow = rows.find((row) => row.subject.id === selectedSubject?.id) || rows[0];

  return (
    <section
      className="academic-progress-panel"
      aria-label="數學成績進度"
      data-stitch-source="projects/10595017015370179580/screens/a592e20bc97e4cbfb85986527e821d31"
    >
      <div className="academic-progress-hero">
        <div>
          <span className="report-kicker"><Icon name="monitoring" /> 數學進度</span>
          <h2>{child?.name || '孩子'} 的數學成績</h2>
          <p>{progress?.report_month || '今個月'} · 數學主題與 OCR 證據</p>
        </div>
        <div className="report-mastery-card">
          <strong>{mastery}</strong>
          <small>整體</small>
        </div>
      </div>

      <div className="subject-score-summary">
        <Metric value={`${scoredRows.length}/${subjects.length}`} label="已評分" />
        <Metric value={`${progress?.document_count || 0}`} label="上載" />
        <Metric value={`${progress?.all_topics?.length || 0}`} label="主題" />
      </div>

      {selectedRow ? (
        <article className="selected-subject-score">
          <div>
            <span>學習範疇</span>
            <h3>{selectedRow.subject.displayNameZh}</h3>
            <p>{displaySubjectUse(selectedRow.subject)}</p>
          </div>
          <strong>{selectedRow.mastery === null ? '--' : `${selectedRow.mastery}%`}</strong>
        </article>
      ) : null}

      <div className="subject-score-list">
        {rows.map((row) => (
          <button
            className={row.subject.id === selectedSubject?.id ? 'subject-score-row active' : 'subject-score-row'}
            key={row.subject.id}
            type="button"
            onClick={() => onSelectSubject(row.subject.id)}
          >
            <span className="subject-score-icon"><Icon name={row.mastery === null ? 'pending' : 'query_stats'} /></span>
            <div>
              <strong>{row.subject.displayNameZh}</strong>
              <span>{row.evidenceCount} 項證據 · {row.practiceCount} 次練習 · {row.topicCount} 個主題</span>
            </div>
            <b>{row.mastery === null ? '--' : `${row.mastery}%`}</b>
          </button>
        ))}
      </div>
    </section>
  );
}

function LearningReportPanel({
  child,
  onShareReport,
  onRevokeShareReport,
  progress,
  progressState,
  shareReport,
  shareReports,
  shareState,
}: {
  child: ChildProfile | null;
  onShareReport: (options?: ShareReportOptions) => void;
  onRevokeShareReport: (shareId: string) => Promise<void>;
  progress: LearningProgress | null;
  progressState: 'idle' | 'loading' | 'ready' | 'error';
  shareReport: ShareReport | null;
  shareReports: ShareReport[];
  shareState: 'idle' | 'running' | 'done' | 'error';
}) {
  const [teacherName, setTeacherName] = useState('補習老師 / 班主任');
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const trend = progress?.trend_points?.length ? progress.trend_points : [42, 48, 55, progress?.overall_mastery || 0].filter(Boolean);
  const weakTopics = mvpLearningTopics(progress?.weak_topics || []);
  const improvedTopics = mvpLearningTopics(progress?.improved_topics || []);
  const visibleTopics = mvpLearningTopics(progress?.all_topics || []);
  const shareHref = shareReport?.share_url ? `${window.location.origin}${shareReport.share_url}` : '';
  const mastery = progressState === 'loading' ? '...' : `${progress?.overall_mastery || 0}%`;
  const reportMonth = progress?.report_month || '今個月';
  const copyShareHref = () => {
    if (shareHref && navigator.clipboard) {
      void navigator.clipboard.writeText(shareHref);
    }
  };
  async function revoke(shareId: string) {
    setRevokingId(shareId);
    try {
      await onRevokeShareReport(shareId);
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <section
      className={shareState === 'done' ? 'learning-report-panel share-ready' : 'learning-report-panel'}
      aria-label="進度報告與教師分享"
      data-stitch-source="projects/7550425496525656523/screens/1fb93eb80a3b493a96781f530ba50099"
    >
      <div className="report-panel-head">
        <div>
          <span className="report-kicker"><Icon name="analytics" /> 進度報告</span>
          <h2>{child?.name || '孩子'} 的進步報告</h2>
          <p>{reportMonth} · OCR 證據 + 數學分數</p>
        </div>
        <div className="report-mastery-card" aria-label={`掌握度 ${mastery}`}>
          <strong>{mastery}</strong>
          <small>掌握度</small>
        </div>
      </div>

      <div className="report-dashboard">
        <div className="report-trend-card">
          <span>整體掌握度</span>
          <strong>{mastery}</strong>
          <div className="trend-line" aria-label="近期進度走勢">
            {trend.map((point, index) => (
              <i
                key={`${point}-${index}`}
                style={{ height: `${Math.max(18, Math.min(96, point))}%`, animationDelay: `${index * 80}ms` }}
              />
            ))}
          </div>
        </div>
        <div className="report-metrics">
          <Metric value={`${progress?.document_count || 0}`} label="上載" />
          <Metric value={`${progress?.practice_count || 0}`} label="練習" />
          <Metric value={`${visibleTopics.length}`} label="主題" />
        </div>
      </div>

      <div className="topic-report-grid">
        <article>
          <h3><Icon name="flag" /> 三個主要弱項</h3>
          {weakTopics.length ? weakTopics.map((topic) => (
            <TopicReportRow key={`${topic.subject}-${topic.topic}`} topic={topic} />
          )) : <p className="empty-report-note">完成 OCR 檢視或輸入測驗分數後會整理弱項。</p>}
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
          <p>連結只包含學習弱項、改善項目與分數紀錄摘要；不公開原始相片。</p>
        </div>
        <div className="share-control-grid">
          <label>
            分享對象
            <input value={teacherName} onChange={(event) => setTeacherName(event.target.value)} />
          </label>
          <label>
            有效期
            <select value={expiresInDays} onChange={(event) => setExpiresInDays(Number(event.target.value))}>
              <option value={7}>7 日</option>
              <option value={30}>30 日</option>
              <option value={90}>90 日</option>
            </select>
          </label>
          <label className="share-evidence-toggle">
            <input checked={includeEvidence} type="checkbox" onChange={(event) => setIncludeEvidence(event.target.checked)} />
            <span>包含證據摘要</span>
          </label>
        </div>
        <div className="teacher-share-actions">
          <button
            className="primary-action report-share-button"
            type="button"
            disabled={shareState === 'running'}
            onClick={() => onShareReport({ expiresInDays, includeUploadEvidence: includeEvidence, teacherName })}
          >
            <Icon name={shareState === 'done' ? 'task_alt' : 'ios_share'} filled />
            {shareState === 'running' ? '準備中...' : shareState === 'done' ? '已分享給老師' : '分享給補習老師'}
          </button>
          {shareHref ? (
            <div className="teacher-share-link-row" aria-label="教師報告連結已建立">
              <button type="button" aria-label="複製教師報告連結" onClick={copyShareHref}>
                <Icon name="content_copy" />
              </button>
              <a href={shareHref} target="_blank" rel="noreferrer">{shareHref}</a>
              <a className="open-report-link" href={shareHref} target="_blank" rel="noreferrer" aria-label="開啟教師報告">
                <Icon name="open_in_new" />
              </a>
            </div>
          ) : null}
        </div>
      </div>

      <div className="share-link-manager" aria-label="分享連結管理">
        <div className="share-link-manager-head">
          <h3><Icon name="link" /> 分享連結</h3>
          <span>{shareReports.length} 條</span>
        </div>
        {shareReports.slice(0, 4).map((share) => {
          const href = `${window.location.origin}${share.share_url}`;
          const revoked = Boolean(share.revoked_at);
          return (
            <article className={revoked ? 'share-link-item revoked' : 'share-link-item'} key={share.id}>
              <div>
                <strong>{share.teacher_name || '補習老師 / 班主任'}</strong>
                <span>{share.scope === 'summary_with_evidence' ? '摘要 + 證據' : '只限摘要'} · 至 {share.expires_at ? formatBriefDate(share.expires_at) : '未設定'}</span>
                <a href={href} target="_blank" rel="noreferrer">{href}</a>
              </div>
              <button type="button" disabled={revoked || revokingId === share.id} onClick={() => revoke(share.id)}>
                <Icon name={revoked ? 'block' : 'link_off'} />
                {revoked ? '已撤回' : revokingId === share.id ? '撤回中' : '撤回'}
              </button>
            </article>
          );
        })}
        {!shareReports.length ? <p className="empty-report-note">建立分享後，這裡可查看有效期與撤回連結。</p> : null}
      </div>
    </section>
  );
}

function TopicReportRow({ topic }: { topic: LearningTopicSummary }) {
  return (
    <div className={`topic-report-row ${topic.trend}`}>
      <div>
        <strong>{displayTopicName(topic.topic)}</strong>
        <span>{displaySubjectName(topic.subject)} · 證據 {topic.evidence_count} · 練習 {topic.practice_count}</span>
      </div>
      <b>{topic.mastery}%</b>
    </div>
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
  const academicSubjects = useMemo(
    () => getSubjectsForGrade(profileGrade).filter(isAcademicProgressSubject).filter(isMvpCurriculumSubject),
    [profileGrade],
  );
  const notices = useMemo(() => gradeNotices(profileGrade), [profileGrade]);

  useEffect(() => {
    if (academicSubjects.length && !academicSubjects.some((subject) => subject.id === selectedSubjectId)) {
      onSelectSubject(preferredProgressSubjectId(academicSubjects));
    }
  }, [academicSubjects, onSelectSubject, selectedSubjectId]);

  return (
    <section className="curriculum-map" aria-label="HKEDB 數學課程地圖">
      <div className="curriculum-head">
        <div>
          <span className="verified-label"><Icon name="verified" filled /> 數學課程 · {profileGrade}</span>
          <h2>{child?.name || '孩子'} 的數學地圖</h2>
        </div>
      </div>

      <div className="profile-grade-lock">
        <span className="grade-token"><Icon name="badge" /> {profileGrade}</span>
        <div>
          <strong>{stage.label} · {displayStageCaption(stage.caption)}</strong>
          <p>{child?.school_type || '香港學校'} · MVP 先聚焦數學證據與練習</p>
        </div>
      </div>

      <section className="stage-summary">
        <div>
          <span>{displayStageCaption(stage.caption)}</span>
          <h3>{profileGrade} 數學主題會連接 OCR 證據、弱項追蹤與個人化練習。</h3>
        </div>
        <div className="curriculum-metrics">
          <Metric value="成績" label="模式" />
          <Metric value={`${academicSubjects.length}`} label="科目" />
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

      {academicSubjects.length ? (
        <div className="subject-list">
          {academicSubjects.map((subject) => (
            <CurriculumSubjectCard
              grade={profileGrade}
              key={subject.id}
              selected={subject.id === selectedSubjectId}
              subject={subject}
              roadmap={false}
              onSelect={() => onSelectSubject(subject.id)}
            />
          ))}
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
  const activeSubject = selectedSubject && isMvpCurriculumSubject(selectedSubject) ? selectedSubject : null;
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
      <section className="course-planner roadmap-only" aria-label="數學主題提示">
        <div className="course-head">
          <div>
            <span><Icon name="calculate" filled /> 數學</span>
            <h2>{profileGrade} 數學學習主題</h2>
          </div>
          <b>數學優先</b>
        </div>
        <p className="roadmap-note">正在載入數學課程節點；練習生成、弱項追蹤與報告目前都以數學為主。</p>
      </section>
    );
  }

  return (
    <section className="course-planner" aria-label="學習主題與課程內容">
      <div className="course-head">
        <div>
          <span><Icon name="auto_stories" filled /> 課程內容草稿</span>
          <h2>{profileGrade} {activeSubject.displayNameZh} 學習主題</h2>
        </div>
        <b>019e81ae</b>
      </div>

      <div className="topic-rail" role="tablist" aria-label="課程主題">
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
              <span>{topic.subjectNameZh} · {displayStrandName(topic.strand)}</span>
              <strong>{topic.titleZh}</strong>
            </button>
          </article>
        ))}
      </div>

      <article className="topic-detail-card">
        <div className="topic-detail-top">
          <div>
            <span>{selectedTopic.subjectNameZh} · {displayStrandName(selectedTopic.strand)}</span>
            <h3>{selectedTopic.titleZh}</h3>
            <p>{selectedTopic.outcomes[0] || '按課程目標整理練習重點。'}</p>
          </div>
          <Metric value={`${selectedTopic.lessonCount}`} label="課節" />
        </div>

        <div className="topic-stats">
          <span><Icon name="schedule" /> {selectedTopic.durationMinutes} 分鐘</span>
          <span><Icon name="signal_cellular_alt" /> {displayLevelName(selectedTopic.level)}</span>
          <span><Icon name="sell" /> 學習證據標籤</span>
        </div>

        <section className="practice-builder" aria-label="練習題數分配">
          <div className="builder-head">
            <div>
              <span>練習設定</span>
              <h4>按主題 / 範疇分配題數</h4>
            </div>
            <Metric value={`${totalQuestions}`} label="題目" />
          </div>
          <div className="allocation-list">
            {topics.map((topic) => (
              <div className={topic.id === selectedTopic.id ? 'allocation-row active' : 'allocation-row'} key={topic.id}>
                <button type="button" onClick={() => setSelectedTopicId(topic.id)}>
                  <span>{displayStrandName(topic.strand)}</span>
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
          生成 {totalQuestions || 0} 題
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
    <div className="question-stepper" aria-label={`題數 ${count}`}>
      <button type="button" aria-label="減少題數" onClick={() => onChange(Math.max(0, count - 1))}>
        <Icon name="remove" />
      </button>
      <span><b>{count}</b>{label}</span>
      <button type="button" aria-label="增加題數" onClick={() => onChange(Math.min(10, count + 1))}>
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
          <span>{displayKlaName(subject)}</span>
          <h3>{subject.displayNameZh}</h3>
          <p>{displaySubjectUse(subject)}</p>
        </div>
        <b>{roadmap ? '路線圖' : grade}</b>
      </div>
      <div className="strand-tags">
        {subject.strands.slice(0, 3).map((strand) => (
          <span key={strand}>{displayStrandName(strand)}</span>
        ))}
      </div>
      <p className="app-use">
        <Icon name={roadmap ? 'map' : 'auto_awesome'} />
        {roadmap ? '暫未在原型啟用。' : displaySubjectUse(subject)}
      </p>
      {subject.status ? <p className="subject-status">{displaySubjectStatus(subject.status)}</p> : null}
    </button>
  );
}

function gradeNotices(grade: string) {
  return [
    { icon: 'school', text: `${grade} 數學` },
    { icon: 'calculate', text: 'MVP 目前聚焦數學' },
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
