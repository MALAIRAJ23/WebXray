/**
 * Consistent formatting utilities for WebXray
 * - Sizes: KB/MB, 1 decimal
 * - Times: ms under 1s, otherwise s with 2 decimals
 */

export function formatSize(bytes) {
  if (bytes === null || bytes === undefined || bytes === 'unknown') return 'N/A';
  const num = typeof bytes === 'number' ? bytes : Number(bytes);
  if (isNaN(num) || num < 0) return 'N/A';
  if (num === 0) return '0 B';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatTime(ms) {
  if (ms === null || ms === undefined || ms === 'unknown') return 'N/A';
  const num = typeof ms === 'number' ? ms : Number(ms);
  if (isNaN(num) || num < 0) return 'N/A';
  if (num < 1000) return `${Math.round(num)} ms`;
  return `${(num / 1000).toFixed(2)} s`;
}

export function formatCls(cls) {
  if (cls === null || cls === undefined) return 'N/A';
  const num = typeof cls === 'number' ? cls : Number(cls);
  if (isNaN(num) || num < 0) return 'N/A';
  return num.toFixed(3);
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
