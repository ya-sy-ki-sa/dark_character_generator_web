import { useEffect, useRef, type ReactNode, type SyntheticEvent } from 'react';

type ModalProps = {
  children: ReactNode;
  onClose: () => void;
  className?: string;
  ariaLabel?: string;
};

export function Modal({ children, onClose, className, ariaLabel = '詳細' }: ModalProps) {
  const modalClassName = className ? `modal ${className}` : 'modal';
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <dialog
        ref={dialogRef}
        className={modalClassName}
        aria-label={ariaLabel}
        onCancel={handleCancel}
      >
        <button className="ghost close" onClick={onClose} aria-label="閉じる">
          ×
        </button>
        <div className="modal-content">{children}</div>
      </dialog>
    </div>
  );
}
