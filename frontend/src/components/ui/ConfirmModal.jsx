import { Modal } from './Modal';
import { Button } from './Button';

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  loading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-base text-brand-muted mb-6">{message}</p>
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
