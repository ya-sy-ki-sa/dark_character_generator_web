import { ReactNode } from 'react';

type ModalProps = {
  children: ReactNode;
  onClose: () => void;
  className?: string;
};

export function Modal({ children, onClose, className }: ModalProps) {
  const modalClassName = className ? `modal ${className}` : 'modal';

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className={modalClassName}>
        <button className="ghost close" onClick={onClose} aria-label="閉じる">
          ×
        </button>
        <div className="modal-content">{children}</div>
      </div>
    </div>
  );
}
