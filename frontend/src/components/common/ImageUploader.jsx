import { useRef } from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';
import { Spinner } from '../ui/Spinner';
import { MAX_PHOTOS } from '../../lib/constants';

export function ImageUploader({
  photos = [],
  compressing = false,
  error = null,
  onAddPhotos,
  onRemovePhoto,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddPhotos(e.target.files);
      // Reset input value so re-selecting the same file triggers change
      e.target.value = '';
    }
  };

  const isMaxReached = photos.length >= MAX_PHOTOS;

  return (
    <div className="space-y-3">
      {/* Upload button area */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={isMaxReached || compressing}
        onChange={handleFileChange}
        className="hidden"
        id="bicycle-photo-input"
      />

      <div className="grid grid-cols-3 gap-2.5">
        {photos.map((item, index) => (
          <div
            key={item.id}
            className="relative aspect-square rounded-xl overflow-hidden border border-brand-border bg-gray-100 group shadow-sm"
          >
            <img
              src={item.previewUrl}
              alt={`Bicycle photo preview ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemovePhoto(item.id)}
              aria-label={`Remove photo ${index + 1}`}
              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-brand-navy/80 text-white hover:bg-brand-navy transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {!isMaxReached && (
          <button
            type="button"
            disabled={compressing}
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-brand-border bg-brand-bg-secondary/40 hover:bg-brand-bg-secondary flex flex-col items-center justify-center p-2 text-brand-muted hover:text-brand-navy transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring disabled:opacity-50"
            aria-label="Add bicycle photo"
          >
            {compressing ? (
              <div className="flex flex-col items-center gap-1">
                <Spinner size="sm" className="text-brand-navy" />
                <span className="text-[11px] font-medium text-brand-navy">
                  Compressing...
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1 mb-1 text-brand-navy">
                  <Camera className="w-4 h-4" />
                  <ImagePlus className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-brand-navy">Add Photo</span>
                <span className="text-[10px] text-brand-muted">
                  ({photos.length}/{MAX_PHOTOS})
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-brand-error">
          {error}
        </p>
      )}

      <p className="text-xs text-brand-muted">
        Optional: Upload up to {MAX_PHOTOS} photos of your bicycle (JPG, PNG, WebP).
        Photos are automatically compressed under 400 KB and deleted after 30 days.
      </p>
    </div>
  );
}
