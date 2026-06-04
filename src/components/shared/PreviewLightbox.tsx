import { Icon } from './Icon';

export function PreviewLightbox({ image, onClose }: { image: string; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="功課預覽">
      <section className="preview-lightbox">
        <button className="symbol-button" type="button" aria-label="關閉預覽" onClick={onClose}>
          <Icon name="close" />
        </button>
        <img src={image} alt="功課完整預覽" />
      </section>
    </div>
  );
}
