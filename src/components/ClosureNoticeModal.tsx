import { Modal } from './Modal';

type ClosureNoticeModalProps = {
  onClose: () => void;
};

export function ClosureNoticeModal({ onClose }: ClosureNoticeModalProps) {
  return (
    <Modal onClose={onClose} ariaLabel="サイト終了のお知らせ" className="notice-modal">
      <h2>サイト終了のお知らせ</h2>
      <p>本サイトは2026年10月31日をもって公開を終了します。</p>
      <p>これまでご利用いただき、ありがとうございました。</p>
      <p>
        本サイトのコード資産は
        <a
          className="notice-text-link"
          href="https://github.com/ya-sy-ki-sa/dark_character_generator_web"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        で公開しています。
      </p>
      <p>
        また、精神的後継サイトの
        <a
          className="notice-text-link"
          href="https://character-taste-analyzer.veliaro-universal-service.workers.dev/"
          target="_blank"
          rel="noreferrer"
        >
          キャラ好みラボ
        </a>
        もどうぞよろしくお願いいたします。
      </p>
      <div className="modal-actions">
        <button className="secondary" type="button" onClick={onClose}>
          閉じる
        </button>
      </div>
    </Modal>
  );
}
