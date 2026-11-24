// Unit tests for image scaling mathematics, re-encode triggers, and caption rule determination.

import { describe, it, expect } from 'vitest';
import {
  calculateTargetDimensions,
  shouldReencodeImage,
  determineItemCreation,
  createFallbackPoster,
  ensureBlobMimeType,
  calculateVideoPosterSeekTime,
} from './media';
import { IMAGE_MAX_EDGE, IMAGE_REENCODE_BYTES } from '../config';

describe('Media Processing Logic', () => {
  it('preserves dimensions when image is already within max limits', () => {
    const result = calculateTargetDimensions(1200, 800, IMAGE_MAX_EDGE);
    expect(result.width).toBe(1200);
    expect(result.height).toBe(800);
  });

  it('downscales wide landscape images proportionally', () => {
    // 4800 x 2400 (2:1 aspect ratio) -> scaled to maxEdge 2400 x 1200
    const result = calculateTargetDimensions(4800, 2400, 2400);
    expect(result.width).toBe(2400);
    expect(result.height).toBe(1200);
  });

  it('downscales tall portrait images proportionally', () => {
    // 1600 x 3200 (1:2 aspect ratio) -> scaled to 1200 x 2400
    const result = calculateTargetDimensions(1600, 3200, 2400);
    expect(result.width).toBe(1200);
    expect(result.height).toBe(2400);
  });

  it('correctly decides when an image requires re-encoding', () => {
    // Normal small image
    expect(shouldReencodeImage(500_000, 'image/jpeg', 1200, 800)).toBe(false);

    // Oversized dimensions
    expect(shouldReencodeImage(500_000, 'image/jpeg', 3000, 2000)).toBe(true);

    // Large file size exceeding 3 MB
    expect(shouldReencodeImage(IMAGE_REENCODE_BYTES + 100, 'image/png', 1000, 1000)).toBe(true);

    // GIFs should never be re-encoded even if large
    expect(shouldReencodeImage(5_000_000, 'image/gif', 3000, 3000)).toBe(false);
  });

  it('enforces caption rule correctly', () => {
    // Text only
    const textOnly = determineItemCreation('Quiet strength', 0);
    expect(textOnly.type).toBe('text');
    expect(textOnly.text).toBe('Quiet strength');
    expect(textOnly.isMultiFile).toBe(false);

    // Single file with caption
    const singleWithCaption = determineItemCreation('Morning sunrise', 1);
    expect(singleWithCaption.type).toBe('media');
    expect(singleWithCaption.text).toBe('Morning sunrise');
    expect(singleWithCaption.isMultiFile).toBe(false);

    // Single file without caption
    const singleNoCaption = determineItemCreation('   ', 1);
    expect(singleNoCaption.type).toBe('media');
    expect(singleNoCaption.text).toBeUndefined();
    expect(singleNoCaption.isMultiFile).toBe(false);

    // Multiple files: captions are disabled
    const multiFiles = determineItemCreation('Some text ignored', 3);
    expect(multiFiles.type).toBe('media');
    expect(multiFiles.text).toBeUndefined();
    expect(multiFiles.isMultiFile).toBe(true);
  });

  it('generates a valid SVG fallback poster blob', () => {
    const blob = createFallbackPoster(400, 300);
    expect(blob).toBeDefined();
    expect(blob.type).toBe('image/svg+xml');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('preserves existing Blob MIME type and restores missing MIME type', () => {
    const typedBlob = new Blob(['video-bytes'], { type: 'video/quicktime' });
    expect(ensureBlobMimeType(typedBlob, 'video/mp4').type).toBe('video/quicktime');

    const untypedBlob = new Blob(['video-bytes']);
    const restored = ensureBlobMimeType(untypedBlob, 'video/mp4');
    expect(restored.type).toBe('video/mp4');
    expect(restored.size).toBe(untypedBlob.size);
  });

  it('seeks a few seconds into longer videos and halfway into short clips for thumbnails', () => {
    expect(calculateVideoPosterSeekTime(15)).toBe(3);
    expect(calculateVideoPosterSeekTime(6)).toBe(3);
    expect(calculateVideoPosterSeekTime(4)).toBe(2);
    expect(calculateVideoPosterSeekTime(0)).toBe(0);
    expect(calculateVideoPosterSeekTime(Number.NaN)).toBe(0);
  });
});
