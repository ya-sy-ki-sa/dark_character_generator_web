import { GenerationResponse } from '../types';
import { Modal } from './Modal';

interface ResultModalProps {
  response: GenerationResponse;
  onClose: () => void;
  onShowPrompt: () => void;
}

export function ResultModal({ response, onClose, onShowPrompt }: ResultModalProps) {
  return (
    <Modal onClose={onClose} className="result-modal">
      <h2>生成結果</h2>
      {!response.warning && (
        <p className="hint">
          {response.usedProvider
            ? '設定されたプロバイダで生成。'
            : 'デモモードのロジックで生成しました。外部プロバイダを設定すると切り替えられます。'}
        </p>
      )}
      {response.warning && <div className="toast info">{response.warning}</div>}
      <div className="result-block">
        <div className="result-text">
          {response.character.narrative
            .split(/\n{2,}/)
            .filter((paragraph) => paragraph.trim().length > 0)
            .map((paragraph, index) => (
              <p key={`${paragraph}-${index}`}>{paragraph.trim()}</p>
            ))}
        </div>
      </div>
      <div className="modal-actions">
        {response.prompt && (
          <button className="ghost" type="button" onClick={onShowPrompt}>
            プロンプトを表示
          </button>
        )}
        <button className="primary" type="button" onClick={onClose}>
          閉じる
        </button>
      </div>
    </Modal>
  );
}
