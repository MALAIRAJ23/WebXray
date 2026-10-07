/**
 * WebXray - Local Reports Storage Service
 * Manages persistent storage of audit snapshots in chrome.storage.local
 * Adheres to Privacy-First (Rule 2) & Minimal Permissions (Rule 3)
 * Stores ONLY metadata, scores, and findings summary (NO full page/DOM/sensitive content)
 */

const STORAGE_KEY_REPORTS = 'webxray_reports';
const STORAGE_KEY_SETTINGS = 'webxray_settings';
const LEGACY_STORAGE_KEY_REPORTS = 'websitelab_reports';
const LEGACY_STORAGE_KEY_SETTINGS = 'websitelab_settings';

export const SCORING_VERSION = '1.0';

export const DEFAULT_SETTINGS = {
  autoSave: false,
  retentionLimit: 25,
};

/**
 * Format bytes into human-readable unit
 */
export function formatBytes(bytes) {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Helper to check if chrome.storage.local is accessible
 */
function hasChromeStorage() {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

/**
 * Get current settings
 * @returns {Promise<object>}
 */
export async function getSettings() {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY_SETTINGS, LEGACY_STORAGE_KEY_SETTINGS], (res) => {
        if (chrome.runtime.lastError) {
          resolve({ ...DEFAULT_SETTINGS });
        } else {
          const settings = res?.[STORAGE_KEY_SETTINGS] || res?.[LEGACY_STORAGE_KEY_SETTINGS];
          if (!settings) {
            resolve({ ...DEFAULT_SETTINGS });
          } else {
            resolve({ ...DEFAULT_SETTINGS, ...settings });
          }
        }
      });
    });
  }

  // Local dev / fallback
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS) || localStorage.getItem(LEGACY_STORAGE_KEY_SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save updated settings
 * @param {object} settings
 * @returns {Promise<object>}
 */
export async function saveSettings(settings) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };

  if (hasChromeStorage()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: merged }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(merged);
        }
      });
    });
  }

  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.error('[WebXray] Failed to save settings to localStorage:', err);
    return merged;
  }
}

/**
 * Sanitizes and migrates older or corrupted report records
 * @param {object} r
 * @returns {object|null}
 */
export function migrateReportRecord(r) {
  if (!r || typeof r !== 'object') return null;
  return {
    id: String(r.id || `migrated-${Math.random().toString(36).substring(2, 7)}`),
    scoringVersion: String(r.scoringVersion || SCORING_VERSION),
    url: String(r.url || ''),
    domain: String(r.domain || (r.url ? (() => { try { return new URL(r.url).hostname; } catch { return 'Unknown'; } })() : 'Unknown')),
    title: String(r.title || r.domain || 'Audit Snapshot'),
    timestamp: typeof r.timestamp === 'number' ? r.timestamp : Date.now(),
    scores: {
      overall: r.scores?.overall ?? 0,
      grade: r.scores?.grade || 'N/A',
      rating: r.scores?.rating || 'N/A',
      performance: r.scores?.performance ?? 0,
      seo: r.scores?.seo ?? 0,
      accessibility: r.scores?.accessibility ?? 0,
      security: r.scores?.security ?? 0,
      bestPractices: r.scores?.bestPractices ?? 0,
    },
    issueCounts: {
      critical: r.issueCounts?.critical || 0,
      high: r.issueCounts?.high || 0,
      medium: r.issueCounts?.medium || 0,
      low: r.issueCounts?.low || 0,
      total: r.issueCounts?.total || 0,
    },
    ruleResults: Array.isArray(r.ruleResults) ? r.ruleResults : [],
    findingsSummary: Array.isArray(r.findingsSummary) ? r.findingsSummary : [],
    technologies: Array.isArray(r.technologies) ? r.technologies : [],
  };
}

/**
 * Retrieve all saved reports sorted newest first
 * @returns {Promise<Array>}
 */
export async function getReports() {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY_REPORTS, LEGACY_STORAGE_KEY_REPORTS], (res) => {
        if (chrome.runtime.lastError) {
          resolve([]);
        } else {
          const list = Array.isArray(res?.[STORAGE_KEY_REPORTS])
            ? res[STORAGE_KEY_REPORTS]
            : (Array.isArray(res?.[LEGACY_STORAGE_KEY_REPORTS]) ? res[LEGACY_STORAGE_KEY_REPORTS] : []);
          const sanitized = list.map(migrateReportRecord).filter(Boolean);
          sanitized.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          resolve(sanitized);
        }
      });
    });
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTS) || localStorage.getItem(LEGACY_STORAGE_KEY_REPORTS);
    const list = raw ? JSON.parse(raw) : [];
    if (Array.isArray(list)) {
      const sanitized = list.map(migrateReportRecord).filter(Boolean);
      sanitized.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return sanitized;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Retrieve single report by ID
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getReportById(id) {
  const reports = await getReports();
  return reports.find((r) => r.id === id) || null;
}

/**
 * Save an audit report snapshot
 * Enforces retention limit and prunes oldest reports if exceeded
 * @param {object} reportData
 * @returns {Promise<object>} saved report
 */
export async function saveReport(reportData) {
  const settings = await getSettings();
  const existingReports = await getReports();

  // Create lightweight sanitized report record (no full page or sensitive content)
  const newReport = {
    id: reportData.id || `report-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    scoringVersion: String(reportData.scoringVersion || SCORING_VERSION),
    url: String(reportData.url || ''),
    domain: String(reportData.domain || ''),
    title: String(reportData.title || ''),
    timestamp: typeof reportData.timestamp === 'number' ? reportData.timestamp : Date.now(),
    scores: {
      overall: reportData.scores?.overall ?? 85,
      grade: reportData.scores?.grade || 'B',
      rating: reportData.scores?.rating || 'Good',
      performance: reportData.scores?.performance ?? 85,
      seo: reportData.scores?.seo ?? 85,
      accessibility: reportData.scores?.accessibility ?? 85,
      security: reportData.scores?.security ?? 85,
      bestPractices: reportData.scores?.bestPractices ?? 85,
    },
    issueCounts: {
      critical: reportData.issueCounts?.critical || 0,
      high: reportData.issueCounts?.high || 0,
      medium: reportData.issueCounts?.medium || 0,
      low: reportData.issueCounts?.low || 0,
      total: reportData.issueCounts?.total || 0,
    },
    ruleResults: Array.isArray(reportData.ruleResults)
      ? reportData.ruleResults.map((r) => ({
          ruleId: String(r.ruleId || ''),
          category: String(r.category || ''),
          status: String(r.status || 'passed'),
          pointsPossible: typeof r.pointsPossible === 'number' ? r.pointsPossible : 0,
          pointsEarned: typeof r.pointsEarned === 'number' ? r.pointsEarned : 0,
          observed: String(r.observed || ''),
          expected: String(r.expected || ''),
          evidence: Array.isArray(r.evidence)
            ? r.evidence.slice(0, 10).map((e) => (typeof e === 'object' ? JSON.stringify(e).slice(0, 200) : String(e).slice(0, 200)))
            : [String(r.evidence || '').slice(0, 200)].filter(Boolean),
        }))
      : [],
    findingsSummary: Array.isArray(reportData.findingsSummary)
      ? reportData.findingsSummary.map((f) => ({
          id: String(f.id || ''),
          category: String(f.category || 'General'),
          title: String(f.title || ''),
          severity: String(f.severity || 'medium'),
          evidence: String(f.evidence || ''),
          recommendation: String(f.recommendation || ''),
        }))
      : [],
    technologies: Array.isArray(reportData.technologies)
      ? reportData.technologies.map((t) => ({
          name: String(t.name || ''),
          category: String(t.category || ''),
          confidence: String(t.confidence || 'high'),
        }))
      : [],
  };

  // Prepend new report and prune by retention limit
  const limit = Math.max(1, settings.retentionLimit || 25);
  const updatedReports = [newReport, ...existingReports.filter((r) => r.id !== newReport.id)].slice(0, limit);

  if (hasChromeStorage()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEY_REPORTS]: updatedReports }, () => {
        if (chrome.runtime.lastError) {
          const err = chrome.runtime.lastError;
          const msg = (err.message || '').toLowerCase();
          // If quota exceeded or limit reached, prune older reports and retry
          if (updatedReports.length > 1 && (msg.includes('quota') || msg.includes('limit') || msg.includes('exceeded'))) {
            const pruned = [newReport, ...updatedReports.slice(1, Math.max(1, Math.floor(updatedReports.length / 2)))];
            chrome.storage.local.set({ [STORAGE_KEY_REPORTS]: pruned }, () => {
              if (chrome.runtime.lastError) {
                // Final attempt: save only the latest report
                chrome.storage.local.set({ [STORAGE_KEY_REPORTS]: [newReport] }, () => {
                  if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                  } else {
                    resolve(newReport);
                  }
                });
              } else {
                resolve(newReport);
              }
            });
          } else {
            reject(err);
          }
        } else {
          resolve(newReport);
        }
      });
    });
  }

  try {
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(updatedReports));
    return newReport;
  } catch (err) {
    // If quota error in localStorage, prune and retry
    if (updatedReports.length > 1) {
      try {
        const pruned = [newReport, ...updatedReports.slice(1, Math.max(1, Math.floor(updatedReports.length / 2)))];
        localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(pruned));
        return newReport;
      } catch {
        try {
          localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify([newReport]));
          return newReport;
        } catch {
          // Keep fallback
        }
      }
    }
    console.error('[WebXray] Failed to save report to localStorage:', err);
    return newReport;
  }
}

/**
 * Delete a single report by ID
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteReport(id) {
  const reports = await getReports();
  const filtered = reports.filter((r) => r.id !== id);

  if (hasChromeStorage()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEY_REPORTS]: filtered }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(true);
        }
      });
    });
  }

  try {
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear all saved reports
 * @returns {Promise<boolean>}
 */
export async function clearAllReports() {
  if (hasChromeStorage()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEY_REPORTS]: [] }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(true);
        }
      });
    });
  }

  try {
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify([]));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear all extension data (reports and settings)
 * @returns {Promise<boolean>}
 */
export async function clearAllData() {
  if (hasChromeStorage()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(true);
        }
      });
    });
  }

  try {
    localStorage.removeItem(STORAGE_KEY_REPORTS);
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    localStorage.removeItem(LEGACY_STORAGE_KEY_REPORTS);
    localStorage.removeItem(LEGACY_STORAGE_KEY_SETTINGS);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current storage utilization stats
 * @returns {Promise<{ bytesUsed: number, formatted: string, count: number }>}
 */
export async function getStorageUsage() {
  const reports = await getReports();

  if (hasChromeStorage() && chrome.storage.local.getBytesInUse) {
    return new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(null, (bytes) => {
        const bytesUsed = bytes || 0;
        resolve({
          bytesUsed,
          formatted: formatBytes(bytesUsed),
          count: reports.length,
        });
      });
    });
  }

  // Fallback estimation using JSON length in UTF-8
  try {
    const rawReports = localStorage.getItem(STORAGE_KEY_REPORTS) || localStorage.getItem(LEGACY_STORAGE_KEY_REPORTS) || '[]';
    const rawSettings = localStorage.getItem(STORAGE_KEY_SETTINGS) || localStorage.getItem(LEGACY_STORAGE_KEY_SETTINGS) || '{}';
    const bytesUsed = new Blob([rawReports, rawSettings]).size;
    return {
      bytesUsed,
      formatted: formatBytes(bytesUsed),
      count: reports.length,
    };
  } catch {
    return {
      bytesUsed: 0,
      formatted: '0 B',
      count: reports.length,
    };
  }
}
