import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UploadView } from './UploadView';

describe('UploadView', () => {
  it('renders upload idle state and starts analysis action', async () => {
    const user = userEvent.setup();
    const analyzeUpload = vi.fn();

    render(
      <UploadView
        activePreviewIndex={0}
        analyzeUpload={analyzeUpload}
        canViewPreview
        confidenceLabel={() => '高信心'}
        displayTopicName={(value) => value || '未分類'}
        handleFileChange={vi.fn()}
        inputRef={createRef<HTMLInputElement>()}
        ocrConfirmState="idle"
        ocrDeleteId={null}
        ocrResult={null}
        ocrState="idle"
        previewItems={[]}
        previewUrl="/preview.png"
        questionLikelyCorrect={() => false}
        selectedFiles={[]}
        onConfirmReview={vi.fn()}
        onDeleteReview={vi.fn()}
        onSelectPreviewPage={vi.fn()}
        onViewPreview={vi.fn()}
        onViewProgress={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: '作業預覽' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /選擇功課相片/ }));
    expect(analyzeUpload).toHaveBeenCalled();
  });
});
