// Media processing utilities for resizing images, extracting video thumbnails, and enforcing storage limits.

import {
  IMAGE_MAX_EDGE,
  IMAGE_REENCODE_BYTES,
  JPEG_QUALITY,
  VIDEO_WARN_BYTES,
  VIDEO_MAX_BYTES,
} from '../config';

export interface ProcessedMedia {
  blob: Blob;
  posterBlob: Blob;
  width: number;
  height: number;
  durationSec?: number;
  mime: string;
  size: number;
  warnLarge?: boolean;
}

// Ensures a media Blob carries its stored MIME type before creating an object URL (e.g. after IndexedDB or backup round-trips).
export function ensureBlobMimeType(blob: Blob, mime?: string): Blob {
  if (blob.type || !mime) {
    return blob;
  }
  return blob.slice(0, blob.size, mime);
}

// Pure function: Calculates scaled dimensions keeping aspect ratio within maxEdge.
export function calculateTargetDimensions(
  width: number,
  height: number,
  maxEdge: number = IMAGE_MAX_EDGE
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: maxEdge, height: maxEdge };
  }

  const longEdge = Math.max(width, height);
  if (longEdge <= maxEdge) {
    return { width, height };
  }

  const scale = maxEdge / longEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

// Pure function: Checks whether an image exceeds size or dimension limits and requires re-encoding.
export function shouldReencodeImage(
  sizeBytes: number,
  mime: string,
  width: number,
  height: number
): boolean {
  // Never re-encode GIFs to preserve frame animation
  if (mime === 'image/gif') {
    return false;
  }

  return (
    Math.max(width, height) > IMAGE_MAX_EDGE ||
    sizeBytes > IMAGE_REENCODE_BYTES
  );
}

// Pure function: Implements the caption rule: text only, 1 file with caption, or multiple files without caption.
export function determineItemCreation(
  text: string,
  filesCount: number
): {
  type: 'text' | 'media';
  text?: string;
  isMultiFile: boolean;
} {
  const cleanText = text.trim();

  if (filesCount === 0) {
    return {
      type: 'text',
      text: cleanText,
      isMultiFile: false,
    };
  }

  if (filesCount === 1) {
    return {
      type: 'media',
      text: cleanText.length > 0 ? cleanText : undefined,
      isMultiFile: false,
    };
  }

  // Multiple files: captions are disabled and items are created individually
  return {
    type: 'media',
    text: undefined,
    isMultiFile: true,
  };
}

// Generates a soft fallback gradient thumbnail if video poster generation is unsupported by the browser.
export function createFallbackPoster(width = 480, height = 320): Blob {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="grad" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#1F1F2B"/>
      <stop offset="100%" stop-color="#0B0B10"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#grad)"/>
  <circle cx="${width / 2}" cy="${height / 2}" r="32" fill="#F0A35B" opacity="0.3"/>
  <polygon points="${width / 2 - 8},${height / 2 - 12} ${width / 2 + 14},${height / 2} ${width / 2 - 8},${height / 2 + 12}" fill="#F3EFE8"/>
</svg>
`.trim();

  return new Blob([svg], { type: 'image/svg+xml' });
}

// Processes an image file: resizes if oversized and generates a thumbnail poster.
export async function processImage(file: File): Promise<ProcessedMedia> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;

  const needsReencode = shouldReencodeImage(
    file.size,
    file.type,
    originalWidth,
    originalHeight
  );

  let finalBlob: Blob = file;
  let finalWidth = originalWidth;
  let finalHeight = originalHeight;

  // Re-encode main media if needed
  if (needsReencode && typeof document !== 'undefined') {
    const target = calculateTargetDimensions(originalWidth, originalHeight, IMAGE_MAX_EDGE);
    finalWidth = target.width;
    finalHeight = target.height;

    const canvas = document.createElement('canvas');
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0, finalWidth, finalHeight);
      finalBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b || file), 'image/jpeg', JPEG_QUALITY);
      });
    }
  }

  // Generate thumbnail poster (max 400px edge)
  let posterBlob: Blob = finalBlob;
  if (typeof document !== 'undefined') {
    const posterTarget = calculateTargetDimensions(originalWidth, originalHeight, 400);
    const pCanvas = document.createElement('canvas');
    pCanvas.width = posterTarget.width;
    pCanvas.height = posterTarget.height;
    const pCtx = pCanvas.getContext('2d');
    if (pCtx) {
      pCtx.drawImage(bitmap, 0, 0, posterTarget.width, posterTarget.height);
      posterBlob = await new Promise<Blob>((resolve) => {
        pCanvas.toBlob((b) => resolve(b || finalBlob), 'image/jpeg', 0.8);
      });
    }
  }

  bitmap.close();

  return {
    blob: finalBlob,
    posterBlob,
    width: finalWidth,
    height: finalHeight,
    mime: finalBlob.type || 'image/jpeg',
    size: finalBlob.size,
  };
}

// Pure function: Chooses a timestamp a few seconds into a video for poster extraction so black intros are skipped.
export function calculateVideoPosterSeekTime(durationSec: number): number {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return 0;
  }
  return Math.min(3, durationSec / 2);
}

// Processes a video file: reads duration, extracts dimensions, generates a JPEG poster frame, and checks size limits.
export async function processVideo(file: File): Promise<ProcessedMedia> {
  if (file.size > VIDEO_MAX_BYTES) {
    throw new Error(
      `File exceeds the ${Math.round(VIDEO_MAX_BYTES / (1024 * 1024))} MB maximum video limit.`
    );
  }

  const warnLarge = file.size > VIDEO_WARN_BYTES;

  if (typeof document === 'undefined') {
    return {
      blob: file,
      posterBlob: createFallbackPoster(),
      width: 1280,
      height: 720,
      durationSec: 10,
      mime: file.type || 'video/mp4',
      size: file.size,
      warnLarge,
    };
  }

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.src = objectUrl;
  video.muted = true;
  video.playsInline = true;

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => resolve(), 3000);
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Cannot read video metadata'));
      };
    });

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const durationSec = video.duration || 0;

    // Seek a few seconds in (or halfway for very short clips) so black intros aren't captured
    const seekTime = calculateVideoPosterSeekTime(durationSec);
    video.currentTime = seekTime;

    let posterBlob: Blob = createFallbackPoster(width, height);

    try {
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 3500);
        video.onseeked = () => {
          clearTimeout(timeout);
          resolve();
        };
      });

      const pTarget = calculateTargetDimensions(width, height, 720);
      const canvas = document.createElement('canvas');
      canvas.width = pTarget.width;
      canvas.height = pTarget.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, pTarget.width, pTarget.height);
        const generated = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', 0.85);
        });
        if (generated) {
          posterBlob = generated;
        }
      }
    } catch {
      // Fallback poster remains
    }

    return {
      blob: file,
      posterBlob,
      width,
      height,
      durationSec: Math.round(durationSec),
      mime: file.type || 'video/mp4',
      size: file.size,
      warnLarge,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
