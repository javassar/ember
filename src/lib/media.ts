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

// Pure function: Chooses a timestamp well into a video for poster extraction so black intros are skipped.
export function calculateVideoPosterSeekTime(durationSec: number): number {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return 0;
  }
  return Math.min(durationSec * 0.5, Math.min(10, Math.max(4, durationSec * 0.35)));
}

// Pure function: Returns ordered candidate timestamps to try when extracting a non-black video poster frame.
export function getVideoPosterCandidateTimes(durationSec: number): number[] {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return [0];
  }

  const maxSeek = Math.max(0, durationSec - 0.1);
  const raw = [
    calculateVideoPosterSeekTime(durationSec),
    durationSec * 0.5,
    durationSec * 0.75,
    Math.min(2, durationSec * 0.2),
  ];

  const unique: number[] = [];
  for (const t of raw) {
    const clamped = Math.min(maxSeek, Math.max(0, Number(t.toFixed(2))));
    if (!unique.some((existing) => Math.abs(existing - clamped) < 0.25)) {
      unique.push(clamped);
    }
  }
  return unique;
}

// Pure function: Detects whether an RGBA pixel buffer is almost completely black (e.g. black intro or undecoded frame).
export function isFrameMostlyBlack(rgbaData: Uint8ClampedArray): boolean {
  const pixelCount = Math.floor(rgbaData.length / 4);
  if (pixelCount === 0) {
    return true;
  }

  const step = Math.max(1, Math.floor(pixelCount / 256));
  let sampled = 0;
  let black = 0;

  for (let p = 0; p < pixelCount; p += step) {
    const offset = p * 4;
    const r = rgbaData[offset];
    const g = rgbaData[offset + 1];
    const b = rgbaData[offset + 2];
    const a = rgbaData[offset + 3];
    sampled++;
    if (a === 0 || (r < 20 && g < 20 && b < 20)) {
      black++;
    }
  }

  return sampled === 0 || black / sampled >= 0.95;
}

async function seekVideoForFrame(video: HTMLVideoElement, targetTime: number): Promise<void> {
  if (Math.abs(video.currentTime - targetTime) > 0.05) {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 3500);
      video.addEventListener(
        'seeked',
        () => {
          clearTimeout(timeout);
          resolve();
        },
        { once: true }
      );
      video.currentTime = targetTime;
    });
  }

  // Ensure hardware decoder has a decoded frame ready (critical on iOS Safari)
  if (video.readyState < 2) {
    try {
      await video.play();
      video.pause();
    } catch {
      // Ignore autoplay errors; drawImage still attempts capture
    }
  }

  await new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 50);
    }
  });
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
  // Temporarily attach offscreen so iOS WebKit decodes frames instead of painting black
  video.style.position = 'fixed';
  video.style.left = '-9999px';
  video.style.top = '-9999px';
  video.style.width = '2px';
  video.style.height = '2px';
  video.style.opacity = '0.01';
  video.style.pointerEvents = 'none';
  document.body?.appendChild(video);

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => resolve(), 4000);
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

    // Prime the muted inline decoder on iOS WebKit before seeking
    try {
      await video.play();
      video.pause();
    } catch {
      // Ignore if browser blocks play before user gesture
    }

    let posterBlob: Blob = createFallbackPoster(width, height);

    try {
      const pTarget = calculateTargetDimensions(width, height, 720);
      const canvas = document.createElement('canvas');
      canvas.width = pTarget.width;
      canvas.height = pTarget.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        const candidateTimes = getVideoPosterCandidateTimes(durationSec);
        for (const candidateTime of candidateTimes) {
          await seekVideoForFrame(video, candidateTime);
          ctx.drawImage(video, 0, 0, pTarget.width, pTarget.height);

          let mostlyBlack = false;
          try {
            const imageData = ctx.getImageData(0, 0, pTarget.width, pTarget.height);
            mostlyBlack = isFrameMostlyBlack(imageData.data);
          } catch {
            mostlyBlack = false;
          }

          const generated = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, 'image/jpeg', 0.85);
          });

          if (generated) {
            posterBlob = generated;
            if (!mostlyBlack) {
              break;
            }
          }
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
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.remove();
    URL.revokeObjectURL(objectUrl);
  }
}
