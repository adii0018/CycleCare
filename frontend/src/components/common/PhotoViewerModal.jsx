import { useEffect } from 'react';
import { X } from 'lucide-react';

export function PhotoViewerModal({
  isOpen,
  onClose,
  photoUrl,
  altText = 'Bicycle photo',
}) {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !photoUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged photo viewer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close photo viewer"
        className="absolute top-4 right-4 p-2.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white z-10"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="relative max-w-4xl max-h-[90dvh] flex items-center justify-center">
        <img
          src={photoUrl}
          alt={altText}
          className="max-w-full max-h-[85dvh] object-contain rounded-lg shadow-2xl"
        />
      </div>
    </div>
  );
}
