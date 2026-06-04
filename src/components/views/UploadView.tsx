import { type ChangeEvent, type RefObject, useEffect, useMemo, useState } from 'react';
import type { OcrResult, OcrReviewQuestionDraft, UploadPreviewItem } from '../../types';
import { Icon } from '../shared/Icon';

export function UploadView({
  activePreviewIndex,
  analyzeUpload,
  canViewPreview,
  confidenceLabel,
  displayTopicName,
  handleFileChange,
  inputRef,
  ocrConfirmState,
  ocrDeleteId,
  onSelectPreviewPage,
  onConfirmReview,
  onDeleteReview,
  onViewPreview,
  onViewProgress,
  ocrResult,
  ocrState,
  previewItems,
  previewUrl,
  selectedFiles,
  questionLikelyCorrect,
}: {
  activePreviewIndex: number;
  analyzeUpload: () => void;
  canViewPreview: boolean;
  confidenceLabel: (value: number) => string;
  displayTopicName: (value?: string | null) => string;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  ocrConfirmState: 'idle' | 'running' | 'done' | 'error';
  ocrDeleteId: string | null;
  onConfirmReview: (documentId: string, questions: OcrReviewQuestionDraft[], parentNotes?: string) => Promise<void>;
  onDeleteReview: (documentId: string, filename?: string) => Promise<void>;
  onSelectPreviewPage: (index: number) => void;
  onViewPreview: (image: string) => void;
  onViewProgress: () => void;
  ocrResult: OcrResult | null;
  ocrState: 'idle' | 'running' | 'done' | 'error';
  previewItems: UploadPreviewItem[];
  previewUrl: string;
  selectedFiles: File[];
  questionLikelyCorrect: (question: { detected_answer?: string | null; is_correct?: boolean | null; mistake_tags?: string[]; max_score?: number | null; question_text: string; score?: number | null }) => boolean;
}) {
  const detectedQuestions = useMemo(() => ocrResult?.review?.extracted_questions || [], [ocrResult]);
  const detectedTopics = useMemo(() => ocrResult?.review?.topics || [], [ocrResult]);
  const savedPreviewItems = useMemo<UploadPreviewItem[]>(() => {
    const previews = ocrResult?.file_previews || ocrResult?.document?.file_previews || [];
    return previews.map((preview) => ({
      fileKind: preview.file_kind,
      name: preview.filename || `P${preview.page_number}`,
      pageNumber: preview.page_number,
      type: preview.mime_type,
      url: preview.preview_url,
    }));
  }, [ocrResult]);
  const [questionDrafts, setQuestionDrafts] = useState<OcrReviewQuestionDraft[]>([]);
  const [reviewNotes, setReviewNotes] = useState('');
  const pageCount = ocrResult?.review?.page_count || ocrResult?.page_count || Math.max(selectedFiles.length, 1);
  const selectedFileCount = selectedFiles.length;
  const documentId = ocrResult?.document?.id || ocrResult?.document_id || '';
  const effectivePreviewItems = previewItems.length ? previewItems : savedPreviewItems;
  const previewItemCount = effectivePreviewItems.length;
  const effectivePreviewIndex = Math.min(activePreviewIndex, Math.max(previewItemCount - 1, 0));
  const activePreviewItem = effectivePreviewItems[effectivePreviewIndex] || null;
  const activePreviewKind = previewItemKind(activePreviewItem);
  const effectivePreviewUrl = activePreviewItem?.url || previewUrl;
  const canOpenImagePreview = Boolean(activePreviewItem?.url && activePreviewKind === 'image');
  const canOpenPreviewLightbox = activePreviewItem ? canOpenImagePreview : canViewPreview;
  const hasSavedReviewPreview = !selectedFileCount && Boolean(documentId) && ocrState === 'done';
  const topicValue = detectedTopics.length
    ? detectedTopics.map((topic) => displayTopicName(topic.topic)).join(' / ')
    : ocrState === 'done'
      ? '未能穩定判定主題，請家長確認'
      : 'AI 會自動辨識多個主題';
  const statusLabel = ocrState === 'running'
    ? 'AI 分析中'
    : ocrState === 'done'
      ? 'Hybrid 已校正'
      : selectedFileCount
        ? '等待分析'
        : '可多頁上載';
  const reviewConfirmed = Boolean(ocrResult?.document?.parent_confirmed_at);
  const deleteInProgress = Boolean(documentId && ocrDeleteId === documentId);

  useEffect(() => {
    setQuestionDrafts(detectedQuestions.map((question, index) => {
      const isCorrect = questionLikelyCorrect(question);
      return {
        confidence: question.confidence ?? 0.5,
        detected_answer: question.detected_answer ?? '',
        id: question.id || `q${index + 1}`,
        is_correct: isCorrect,
        max_score: question.max_score ?? (isCorrect ? 1 : null),
        mistake_tags: isCorrect ? [] : (question.mistake_tags || ['concept']),
        page_number: question.page_number ?? index + 1,
        question_text: question.question_text || '',
        score: question.score ?? (isCorrect ? 1 : null),
        topic: question.topic || '',
        topic_ids: question.topic_ids || [],
      };
    }));
    setReviewNotes('');
  }, [detectedQuestions]);

  function updateQuestionDraft(id: string, updates: Partial<OcrReviewQuestionDraft>) {
    setQuestionDrafts((items) => items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }

  return (
    <>
      <main className="upload-content">
        <input ref={inputRef} className="hidden-file" type="file" accept="image/*,.pdf" multiple onChange={handleFileChange} />

        <section className="upload-preview">
          <h2>作業預覽</h2>
          <div className={ocrState === 'running' ? 'preview-frame scanning' : 'preview-frame'}>
            {hasSavedReviewPreview && !previewItemCount ? (
              <div className="preview-placeholder">
                <Icon name="image_not_supported" filled />
                <strong>{ocrResult?.document?.filename || '已保存 OCR 記錄'}</strong>
                <span>此記錄未有保存原相片</span>
              </div>
            ) : activePreviewKind === 'pdf' ? (
              <div className="preview-placeholder">
                <Icon name="picture_as_pdf" filled />
                <strong>{activePreviewItem?.name || '已上載 PDF'}</strong>
                {activePreviewItem?.url ? <a href={activePreviewItem.url} target="_blank" rel="noreferrer">開啟 PDF 原檔</a> : <span>PDF 已加入分析佇列</span>}
              </div>
            ) : activePreviewItem && !activePreviewItem.url ? (
              <div className="preview-placeholder">
                <Icon name="picture_as_pdf" filled />
                <strong>{activePreviewItem.name}</strong>
                <span>PDF 已加入分析佇列</span>
              </div>
            ) : (
              <img src={effectivePreviewUrl} alt={activePreviewItem?.name || '已掃描功課'} />
            )}
            {previewItemCount ? (
              <span className="page-stack-badge">
                <Icon name="filter_none" />
                {previewItemCount} 頁
              </span>
            ) : null}
            {previewItemCount ? <span className="preview-page-label">P{activePreviewItem?.pageNumber || effectivePreviewIndex + 1}</span> : null}
            <div className="page-stack-shadow" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <button type="button" aria-label="查看大圖" onClick={() => onViewPreview(effectivePreviewUrl)} disabled={!canOpenPreviewLightbox}>
              <Icon name="fullscreen" />
            </button>
          </div>
          {previewItemCount ? (
            <div className="selected-file-strip" aria-label="已選上載頁面">
              {effectivePreviewItems.map((item, index) => (
                <button
                  className={index === effectivePreviewIndex ? 'active' : ''}
                  key={`${item.name}-${index}`}
                  type="button"
                  onClick={() => onSelectPreviewPage(index)}
                >
                  <Icon name="check_circle" filled />
                  <b>P{item.pageNumber || index + 1}</b>
                  {item.url && previewItemKind(item) === 'image' ? <img src={item.url} alt="" /> : <Icon name={previewItemKind(item) === 'pdf' ? 'picture_as_pdf' : 'draft'} />}
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="ocr-panel">
          <div className="ocr-panel-head">
            <h2><Icon name="document_scanner" filled /> 擷取資料</h2>
            <span>{statusLabel}</span>
          </div>

          <FormDisplay icon="stacks" label="頁數 / 檔案" value={selectedFileCount ? `${selectedFileCount} 個檔案，共 ${pageCount} 頁` : hasSavedReviewPreview ? `${previewItemCount || pageCount} 個已保存檔案，共 ${pageCount} 頁` : '可一次選多張相片或 PDF'} />
          <FormDisplay icon="category" label="學習主題（AI 多主題）" value={topicValue} />

          <div className="parent-confirmation-notice">
            <Icon name="info" filled />
            <p>{ocrState === 'done' ? 'AI 檢視結果已匯入學生學習進度。' : '確認並分析後，AI 檢視結果會儲存到學生學習進度。'}</p>
          </div>

          {detectedTopics.length ? (
            <div className="detected-topic-grid" aria-label="已辨識主題">
              {detectedTopics.map((topic, index) => (
                <span
                  className={(topic.confidence || 0) >= 0.9 ? 'high-confidence' : ''}
                  key={topic.id || `${topic.topic}-${index}`}
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <b>{displayTopicName(topic.topic)}</b>
                  <small>
                    {topic.confidence !== undefined ? `${Math.round(topic.confidence * 100)}%` : 'AI'}
                    {topic.page_numbers?.length ? ` · P${topic.page_numbers.join(',')}` : ''}
                  </small>
                </span>
              ))}
            </div>
          ) : null}

          <div className="mistake-list">
            <label>OCR 待確認</label>
            {!questionDrafts.length && ocrState !== 'done' && ocrState !== 'error' ? (
              <div className="analysis-result neutral">
                <strong>等待 AI 分析</strong>
                <p>選擇作業頁面並開始分析後，才會列出需家長確認的錯誤題型。</p>
              </div>
            ) : null}

            {ocrState === 'done' && questionDrafts.length ? (
              <div className={reviewConfirmed ? 'ocr-review-inbox confirmed' : 'ocr-review-inbox'}>
                <div className="ocr-review-head">
                  <div>
                    <strong>家長確認 · {questionDrafts.length} 題</strong>
                    <p>{reviewConfirmed ? '此 OCR 檢視已確認。' : '請修正 AI 擷取文字、答案與錯因，再確認入學習檔案。'}</p>
                  </div>
                  <span><Icon name={reviewConfirmed ? 'verified' : 'rule'} filled /> {reviewConfirmed ? '已確認' : '待確認'}</span>
                </div>
                {questionDrafts.map((question, index) => (
                  <article className="ocr-question-editor" key={question.id}>
                    <div className="question-meta-row">
                      <span>P{question.page_number || index + 1}</span>
                      <em>{displayTopicName(question.topic || '未分類')}</em>
                      <small>{confidenceLabel(question.confidence)} · {Math.round(question.confidence * 100)}%</small>
                    </div>
                    <textarea
                      aria-label={`第 ${index + 1} 題 OCR 文字`}
                      readOnly={reviewConfirmed}
                      value={question.question_text}
                      onChange={(event) => updateQuestionDraft(question.id, { question_text: event.target.value })}
                    />
                    <div className="ocr-correction-grid">
                      <label>
                        學生答案
                        <input
                          readOnly={reviewConfirmed}
                          value={question.detected_answer || ''}
                          onChange={(event) => updateQuestionDraft(question.id, { detected_answer: event.target.value })}
                        />
                      </label>
                      <label>
                        判定
                        <select
                          disabled={reviewConfirmed}
                          value={question.is_correct ? 'correct' : question.mistake_tags[0] || 'concept'}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateQuestionDraft(question.id, value === 'correct'
                              ? { is_correct: true, mistake_tags: [] }
                              : { is_correct: false, mistake_tags: [value] });
                          }}
                        >
                          <option value="correct">正確 / 無錯因</option>
                          <option value="concept">概念</option>
                          <option value="calculation">計算</option>
                          <option value="reading">審題</option>
                          <option value="unit_conversion">單位換算</option>
                          <option value="careless">粗心</option>
                        </select>
                      </label>
                    </div>
                  </article>
                ))}
                <label className="review-notes-field">
                  家長備註
                  <textarea disabled={reviewConfirmed} value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} />
                </label>
                <button
                  className="secondary-action full"
                  type="button"
                  disabled={!documentId || ocrConfirmState === 'running' || reviewConfirmed}
                  onClick={() => onConfirmReview(documentId, questionDrafts, reviewNotes)}
                >
                  <Icon name={reviewConfirmed ? 'verified' : 'fact_check'} />
                  {ocrConfirmState === 'running' ? '確認中...' : reviewConfirmed ? '已完成確認' : '確認 OCR 結果'}
                </button>
                <button
                  className="danger-outline-action full"
                  type="button"
                  disabled={!documentId || deleteInProgress}
                  onClick={() => onDeleteReview(documentId, ocrResult?.document?.filename)}
                >
                  <Icon name={deleteInProgress ? 'sync' : 'delete'} />
                  {deleteInProgress ? '刪除中...' : '刪除此 OCR 記錄'}
                </button>
              </div>
            ) : null}
            {ocrState === 'error' ? (
              <div className="analysis-result error">
                <strong>GCP OCR 錯誤</strong>
                <p>{ocrResult?.detail || 'OCR 分析失敗'}</p>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <footer className={selectedFileCount ? 'upload-footer dual-actions' : 'upload-footer'}>
        <button className="secondary-action add-pages-action" type="button" onClick={() => inputRef.current?.click()}>
          <Icon name="add_photo_alternate" />
          加入更多頁面
        </button>
        <button
          className={ocrState === 'done' ? 'primary-action full save-ready' : 'primary-action full'}
          type="button"
          onClick={ocrState === 'done' ? onViewProgress : analyzeUpload}
          disabled={ocrState === 'running'}
        >
          <span aria-hidden="true" />
          <Icon name={ocrState === 'done' ? 'stacked_line_chart' : selectedFileCount ? 'document_scanner' : 'upload_file'} filled />
          {ocrState === 'running'
            ? '正在分析多頁...'
            : ocrState === 'done'
              ? '已匯入，查看進度'
              : selectedFileCount
                ? `確認並分析 ${selectedFileCount} 頁`
                : '選擇功課相片 / PDF'}
        </button>
      </footer>
    </>
  );
}

function previewItemKind(item: UploadPreviewItem | null): 'image' | 'pdf' | 'file' {
  if (!item) return 'file';
  if (item.fileKind) return item.fileKind;
  if (item.type === 'application/pdf') return 'pdf';
  if (item.type.startsWith('image/')) return 'image';
  return 'file';
}

function FormDisplay({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <label className="form-display">
      <span>{label}</span>
      <div>
        <Icon name={icon} />
        <input readOnly value={value} />
        <Icon name="edit" />
      </div>
    </label>
  );
}
