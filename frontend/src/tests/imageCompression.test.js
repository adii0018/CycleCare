import { describe, it, expect, vi } from 'vitest';
import { compressPhoto } from '../lib/imageCompression';
import { MAX_PHOTO_BYTES } from '../lib/constants';

vi.mock('browser-image-compression', () => {
  return {
    default: vi.fn(async (file, options) => {
      // Return simulated compressed blob
      return new File(['simulated-compressed-bytes'], file.name, {
        type: 'image/jpeg',
      });
    }),
  };
});

describe('Image Compression Helper', () => {
  it('rejects non-image files with friendly error', async () => {
    const textFile = new File(['hello'], 'document.pdf', { type: 'application/pdf' });
    await expect(compressPhoto(textFile)).rejects.toThrow(
      'Please select an image file (JPG, PNG, WebP).'
    );
  });

  it('compresses valid image file under 400 KB', async () => {
    const fakeImage = new File(['fake-raw-image-content'], 'cycle.jpg', {
      type: 'image/jpeg',
    });
    const result = await compressPhoto(fakeImage);
    expect(result).toBeDefined();
    expect(result.size).toBeLessThanOrEqual(MAX_PHOTO_BYTES);
  });
});
