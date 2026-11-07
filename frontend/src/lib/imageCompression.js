import imageCompression from 'browser-image-compression';
import {
  MAX_PHOTO_BYTES,
  COMPRESS_TARGET_SIZE_MB,
  COMPRESS_MAX_SIDE,
} from './constants';

export async function compressPhoto(file) {
  // Reject non-image files
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Please select an image file (JPG, PNG, WebP).');
  }

  const primaryOptions = {
    maxSizeMB: COMPRESS_TARGET_SIZE_MB,
    maxWidthOrHeight: COMPRESS_MAX_SIDE,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.8,
  };

  let compressed = await imageCompression(file, primaryOptions);

  // HARD GUARD: If compressed file is still > 400 KB, retry with aggressive settings
  if (compressed.size > MAX_PHOTO_BYTES) {
    const aggressiveOptions = {
      maxSizeMB: 0.15, // ~150 KB
      maxWidthOrHeight: 800,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.6,
    };
    compressed = await imageCompression(file, aggressiveOptions);
  }

  // Final check: Never return a file that exceeds the backend 400 KB cap
  if (compressed.size > MAX_PHOTO_BYTES) {
    throw new Error('Photo could not be compressed under 400 KB. Please choose another image.');
  }

  return compressed;
}
