import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Keydown escape listener
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Focus inside modal
    if (modalRef.current) {
      modalRef.current.focus();
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-xl border border-brand-border overflow-hidden focus:outline-none`}
      >
        <div className="flex items-center justify-between p-4 border-b border-brand-border">
          {title && (
            <h2 id="modal-title" className="text-lg font-bold text-brand-navy">
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 ml-auto text-brand-muted hover:text-brand-navy rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 max-h-[80dvh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
