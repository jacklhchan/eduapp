import { Fragment, useEffect, useState } from 'react';
import { images } from '../../config/assets';
import { normalizeGrade } from '../../data/curriculum';
import type { ChildProfile, ExportState, PortfolioSectionDraft, PortfolioStatus, PortfolioTone } from '../../types';
import { Icon } from '../shared/Icon';
import { StatusChip } from '../shared/StatusChip';

const defaultPassportName = '學習護照';

function displayPassportName(value?: string | null) {
  if (!value || value === 'Learning Passport') return defaultPassportName;
  return value;
}

function portfolioStatusLabel(status: string) {
  if (status === 'Completed') return '已完成';
  if (status === 'AI Ready') return 'AI 草稿';
  if (status === 'Drafting') return '草稿中';
  return status;
}

function portfolioTone(status: PortfolioStatus): PortfolioTone {
  if (status === 'Completed') return 'complete';
  if (status === 'AI Ready') return 'ready';
  return 'draft';
}

function isEarlyYearsGrade(grade: string | undefined) {
  return ['K1', 'K2', 'K3'].includes(normalizeGrade(grade));
}

function portfolioStageCopy(child: ChildProfile | null) {
  if (isEarlyYearsGrade(child?.grade)) {
    return {
      badge: '幼兒數學檔案',
      pdfLabel: '可匯出檔案',
      tipEmpty: '尚未加入數學章節內容或證據。',
      tipReady: '個數學章節已有 AI 草稿，可由家長確認。',
      tipDone: '幼兒數學檔案已可直接匯出 PDF。',
    };
  }
  return {
    badge: '數學學習護照',
    pdfLabel: '可匯出 PDF',
    tipEmpty: '尚未加入數學章節內容或證據。',
    tipReady: '個數學章節已有 AI 草稿，可由家長確認。',
    tipDone: '所有數學章節已可直接匯出 PDF。',
  };
}

function calculatePortfolioProgress(sections: PortfolioSectionDraft[]) {
  if (!sections.length) return 0;
  const score = sections.reduce((total, section) => {
    const evidenceScore = Math.min(section.evidence.length / Math.max(section.requiredEvidence, 1), 1) * 0.25;
    const statusScore = section.status === 'Completed' ? 0.75 : section.status === 'AI Ready' ? 0.5 : 0;
    return total + statusScore + evidenceScore;
  }, 0);
  return Math.min(100, Math.round((score / sections.length) * 100));
}

export function PortfolioView({
  child,
  exportError,
  exportState,
  onAddEvidence,
  onEditPassportInfo,
  onExport,
  onOpenUpload,
  onPreviewEvidence,
  onRemoveEvidence,
  onUpdateSection,
  sections,
}: {
  child: ChildProfile | null;
  exportError: string | null;
  exportState: ExportState;
  onAddEvidence: (sectionId: string) => void;
  onEditPassportInfo: () => void;
  onExport: () => void;
  onOpenUpload: () => void;
  onPreviewEvidence: (image: string) => void;
  onRemoveEvidence: (sectionId: string, evidence: string) => void;
  onUpdateSection: (sectionId: string, updates: Partial<PortfolioSectionDraft>) => void;
  sections: PortfolioSectionDraft[];
}) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id || '');
  const progress = calculatePortfolioProgress(sections);
  const completedCount = sections.filter((section) => section.status === 'Completed').length;
  const readyCount = sections.filter((section) => section.status === 'AI Ready').length;
  const evidenceCount = sections.reduce((total, section) => total + section.evidence.length, 0);
  const copy = portfolioStageCopy(child);
  const portfolioTipText = progress === 0 ? copy.tipEmpty : readyCount ? `${readyCount} ${copy.tipReady}` : copy.tipDone;
  const canExportPortfolio = progress > 0;
  const statusOptions: PortfolioStatus[] = ['Completed', 'AI Ready', 'Drafting'];
  const renderEditorPanel = (section: PortfolioSectionDraft) => (
    <section className="passport-editor-panel" aria-label={`${section.title} 編輯區`}>
      <div className="editor-head">
        <span className="portfolio-icon">
          <Icon name={section.icon} filled />
        </span>
        <div className="editor-title">
          <span>{section.shortTitle} · 更新 {section.updatedAt}</span>
          <h2>{section.title}</h2>
        </div>
        <StatusChip label={portfolioStatusLabel(section.status)} tone={portfolioTone(section.status)} />
      </div>

      <div className="status-segments" role="group" aria-label="章節狀態">
        {statusOptions.map((status) => (
          <button
            className={section.status === status ? 'active' : ''}
            key={status}
            type="button"
            onClick={() => onUpdateSection(section.id, { status })}
          >
            {portfolioStatusLabel(status)}
          </button>
        ))}
      </div>

      <label className="draft-textarea">
        家長確認草稿
        <textarea
          value={section.body}
          onChange={(event) => onUpdateSection(section.id, { body: event.target.value })}
        />
      </label>

      {section.aiDraft ? (
        <div className="ai-draft-panel">
          <div>
            <span><Icon name="auto_awesome" filled /> AI 草稿</span>
            <p>{section.aiDraft}</p>
          </div>
          <button
            className="secondary-action"
            type="button"
            onClick={() => onUpdateSection(section.id, { body: section.aiDraft, status: 'Completed' })}
          >
            <Icon name="task_alt" />
            確認採用
          </button>
        </div>
      ) : null}

      <div className="evidence-tools">
        <div className="evidence-head">
          <h3>證據庫</h3>
          <span>{section.evidence.length}/{section.requiredEvidence}</span>
        </div>
        <div className="evidence-list">
          {section.evidence.length ? section.evidence.map((item) => (
            <span className="evidence-chip" key={item}>
              {item}
              <button type="button" aria-label={`移除 ${item}`} onClick={() => onRemoveEvidence(section.id, item)}>
                <Icon name="close" />
              </button>
            </span>
          )) : (
            <span className="empty-evidence">尚未加入證據</span>
          )}
        </div>

        <div className="editor-button-row">
          <button className="secondary-action" type="button" onClick={() => onAddEvidence(section.id)}>
            <Icon name="add_circle" />
            新增證據
          </button>
          <button className="secondary-action" type="button" onClick={onOpenUpload}>
            <Icon name="upload_file" />
            上載作品
          </button>
          {section.image ? (
            <button className="secondary-action" type="button" onClick={() => onPreviewEvidence(section.image || '')}>
              <Icon name="fullscreen" />
              預覽相片
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );

  useEffect(() => {
    if (!sections.length) return;
    if (!sections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(sections[0].id);
    }
  }, [activeSectionId, sections]);

  return (
    <main className="content-stack portfolio-view">
      <section className="portfolio-tip">
        <Icon name="auto_awesome" />
        <div>
          <h3>AI 協助中</h3>
          <p>{portfolioTipText}</p>
        </div>
      </section>

      <section className="passport-overview">
        <div>
          <span className="verified-label"><Icon name="verified" filled /> {copy.badge}</span>
          <div className="passport-title-row">
            <h2>{displayPassportName(child?.passport)}</h2>
            <button type="button" onClick={onEditPassportInfo}>
              <Icon name="edit" />
              編輯資料
            </button>
          </div>
          <p>{child?.name || '孩子'} · {child?.grade || 'P3'} · {child?.focus || '尚未設定學習焦點'}</p>
        </div>
        <div className="passport-progress-meter" aria-label={`學習護照完成度 ${progress}%`}>
          <strong>{progress}%</strong>
          <span>{copy.pdfLabel}</span>
        </div>
        <div className="passport-stat-row">
          <span><b>{completedCount}</b> 已完成</span>
          <span><b>{evidenceCount}</b> 證據</span>
          <span><b>{sections.length}</b> 章節</span>
        </div>
      </section>

      <section className="portfolio-grid">
        {sections.map((section) => (
          <Fragment key={section.id}>
            <button
              className={`portfolio-card ${section.id === activeSectionId ? 'active' : ''} ${section.id === 'artworks' ? 'wide' : ''}`}
              type="button"
              onClick={() => setActiveSectionId(section.id)}
            >
              <div className="portfolio-card-top">
                <span className="portfolio-icon">
                  <Icon name={section.icon} filled />
                </span>
                <StatusChip label={portfolioStatusLabel(section.status)} tone={portfolioTone(section.status)} />
              </div>
              <div className={section.id === 'artworks' ? 'art-row' : undefined}>
                <div>
                  <h3>{section.title}</h3>
                  <p>{section.copy}</p>
                </div>
                {section.image ? (
                  <div className="art-thumbs">
                    <img src={section.image} alt={section.title} />
                    <span>
                      <img src={section.id === 'artworks' ? images.blocks : section.image} alt="" />
                      <b>+{Math.max(section.evidence.length - 1, 1)}</b>
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="portfolio-card-actions">
                <span><Icon name="edit_note" /> 編輯</span>
                <span>{section.evidence.length}/{section.requiredEvidence} 證據</span>
              </div>
            </button>
            {section.id === activeSectionId ? renderEditorPanel(section) : null}
          </Fragment>
        ))}
      </section>

      {exportState === 'done' || exportState === 'error' ? (
        <div className={`export-toast ${exportState}`}>
          {exportState === 'done' ? 'PDF 已準備好' : exportError}
        </div>
      ) : null}

      <button className="generate-fab" type="button" onClick={onExport} disabled={exportState === 'running' || !canExportPortfolio}>
        <Icon name="picture_as_pdf" filled />
        {exportState === 'running' ? '生成中' : canExportPortfolio ? '生成 PDF' : '加入內容後匯出'}
      </button>
    </main>
  );
}
