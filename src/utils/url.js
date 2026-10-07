/**
 * Utility functions for URL and hostname parsing
 */
export function getDomain(urlString) {
  if (!urlString) return '';
  try {
    const url = new URL(urlString);
    return url.hostname;
  } catch {
    return '';
  }
}

export function isInspectableUrl(urlString) {
  if (!urlString) return false;
  try {
    const url = new URL(urlString);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}
