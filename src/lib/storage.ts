// Helpers for persistent storage requests and quota estimation.

export interface StorageEstimateInfo {
  usedBytes: number;
  quotaBytes: number;
  percentage: number;
  formattedUsed: string;
  formattedQuota: string;
}

// Request persistent storage permission from the browser so site data is protected from eviction.
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

// Check whether persistent storage has already been granted.
export async function checkPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }
  return false;
}

// Format byte counts into human-readable strings (KB, MB, GB).
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// Get the current storage usage and available quota estimates.
export async function getStorageEstimate(): Promise<StorageEstimateInfo> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage ?? 0;
      const quota = estimate.quota ?? 0;
      const percentage = quota > 0 ? (used / quota) * 100 : 0;

      return {
        usedBytes: used,
        quotaBytes: quota,
        percentage: Math.min(percentage, 100),
        formattedUsed: formatBytes(used),
        formattedQuota: formatBytes(quota),
      };
    } catch {
      // Fallback if estimate fails
    }
  }

  return {
    usedBytes: 0,
    quotaBytes: 0,
    percentage: 0,
    formattedUsed: '0 B',
    formattedQuota: 'Unknown',
  };
}
