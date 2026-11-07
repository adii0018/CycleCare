import { useState, useEffect, useRef, useCallback } from 'react';
import { compressPhoto } from '../lib/imageCompression';
import { MAX_PHOTOS } from '../lib/constants';

export function useImagePicker() {
  const [photos, setPhotos] = useState([]); // [{ id, file, previewUrl }]
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState(null);

  // Keep track of preview URLs to revoke on unmount
  const urlsRef = useRef(new Set());

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      // Revoke all active object URLs on unmount to prevent memory leaks
      urls.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Ignore
        }
      });
      urls.clear();
    };
  }, []);

  const addPhotos = useCallback(
    async (fileList) => {
      setError(null);
      if (!fileList || fileList.length === 0) return;

      const currentCount = photos.length;
      const incomingFiles = Array.from(fileList);

      if (currentCount + incomingFiles.length > MAX_PHOTOS) {
        setError(`You can only add up to ${MAX_PHOTOS} photos in total.`);
        return;
      }

      setCompressing(true);

      for (const rawFile of incomingFiles) {
        if (!rawFile.type.startsWith('image/')) {
          setError('Please select valid image files only (JPG, PNG, WebP).');
          continue;
        }

        try {
          const compressed = await compressPhoto(rawFile);
          const previewUrl = URL.createObjectURL(compressed);
          urlsRef.current.add(previewUrl);

          setPhotos((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              file: compressed,
              previewUrl,
            },
          ]);
        } catch (err) {
          setError(err.message || 'Failed to compress image.');
        }
      }

      setCompressing(false);
    },
    [photos.length]
  );

  const removePhoto = useCallback((photoId) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === photoId);
      if (target?.previewUrl) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {
          // Ignore
        }
        urlsRef.current.delete(target.previewUrl);
      }
      return prev.filter((p) => p.id !== photoId);
    });
    setError(null);
  }, []);

  const clearPhotos = useCallback(() => {
    photos.forEach((p) => {
      if (p.previewUrl) {
        try {
          URL.revokeObjectURL(p.previewUrl);
        } catch {
          // Ignore
        }
        urlsRef.current.delete(p.previewUrl);
      }
    });
    setPhotos([]);
    setError(null);
  }, [photos]);

  return {
    photos,
    files: photos.map((p) => p.file),
    compressing,
    error,
    addPhotos,
    removePhoto,
    clearPhotos,
  };
}
