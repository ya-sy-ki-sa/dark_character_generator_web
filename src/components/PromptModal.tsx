import { Modal } from './Modal';

interface PromptModalProps {
  prompt: string;
  onClose: () => void;
}

export function PromptModal({ prompt, onClose }: PromptModalProps) {
  return (
    <Modal onClose={onClose}>
      <h2>送信プロンプト</h2>
      <p className="hint">ブラウザ内で構築したテンプレートです。LLM 連携時にそのまま送信できます。</p>
      <textarea className="textarea prompt" readOnly value={prompt} />
      <div className="modal-actions">
        <button className="secondary" type="button" onClick={onClose}>
          閉じる
        </button>
      </div>
    </Modal>
  );
}
