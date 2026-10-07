/**
 * WebXray - Report Comparison Engine
 * Compares two audit snapshots (Before vs After)
 * Follows Rule 4: Pure function returning deterministic deltas and findings analysis.
 */

/**
 * Compare two website audit reports
 *
 * @param {object} reportBefore - earlier audit report
 * @param {object} reportAfter - later audit report
 * @returns {object} comparison result
 */
export function compareReports(reportBefore, reportAfter) {
  if (!reportBefore || !reportAfter) {
    throw new Error('Both reportBefore and reportAfter are required for comparison.');
  }

  const beforeScores = reportBefore.scores || {};
  const afterScores = reportAfter.scores || {};

  // 1. Scoring Version Check
  const versionBefore = String(reportBefore.scoringVersion || '1.0');
  const versionAfter = String(reportAfter.scoringVersion || '1.0');
  const isVersionMismatch = versionBefore !== versionAfter;
  const versionWarning = isVersionMismatch ? 'scores are not directly comparable' : null;

  // 2. Calculate Score Differences (After - Before)
  const scoreDeltas = {
    overall: (afterScores.overall ?? 0) - (beforeScores.overall ?? 0),
    performance: (afterScores.performance ?? 0) - (beforeScores.performance ?? 0),
    seo: (afterScores.seo ?? 0) - (beforeScores.seo ?? 0),
    accessibility: (afterScores.accessibility ?? 0) - (beforeScores.accessibility ?? 0),
    security: (afterScores.security ?? 0) - (beforeScores.security ?? 0),
    bestPractices: (afterScores.bestPractices ?? 0) - (beforeScores.bestPractices ?? 0),
  };

  // 3. Extract non-passed findings lists
  const beforeList = Array.isArray(reportBefore.findingsSummary)
    ? reportBefore.findingsSummary.filter((f) => f && f.severity !== 'passed')
    : [];

  const afterList = Array.isArray(reportAfter.findingsSummary)
    ? reportAfter.findingsSummary.filter((f) => f && f.severity !== 'passed')
    : [];

  const beforeMap = new Map();
  for (const f of beforeList) {
    if (f.id) beforeMap.set(f.id, f);
  }

  const afterMap = new Map();
  for (const f of afterList) {
    if (f.id) afterMap.set(f.id, f);
  }

  // 4. Classify findings into:
  // - Resolved: present in before, but absent in after
  // - Newly Introduced: present in after, but absent in before
  // - Unchanged: present in both before and after
  const resolved = [];
  const newlyIntroduced = [];
  const unchanged = [];

  for (const [id, fBefore] of beforeMap.entries()) {
    if (!afterMap.has(id)) {
      resolved.push({
        ...fBefore,
        status: 'resolved',
      });
    } else {
      const fAfter = afterMap.get(id);
      unchanged.push({
        ...fAfter,
        status: 'unchanged',
        severityBefore: fBefore.severity,
        severityAfter: fAfter.severity,
      });
    }
  }

  for (const [id, fAfter] of afterMap.entries()) {
    if (!beforeMap.has(id)) {
      newlyIntroduced.push({
        ...fAfter,
        status: 'new',
      });
    }
  }

  // 5. Compare by ruleId when available and versions match
  const beforeRules = Array.isArray(reportBefore.ruleResults) ? reportBefore.ruleResults : [];
  const afterRules = Array.isArray(reportAfter.ruleResults) ? reportAfter.ruleResults : [];
  const ruleResultsComparison = {
    improved: [],
    regressed: [],
    unchanged: [],
    resolved: [],
    newlyFailed: [],
  };

  if (!isVersionMismatch && beforeRules.length > 0 && afterRules.length > 0) {
    const afterRuleMap = new Map(afterRules.map((r) => [r.ruleId, r]));
    for (const rBefore of beforeRules) {
      const rAfter = afterRuleMap.get(rBefore.ruleId);
      if (rAfter) {
        const deltaPoints = (rAfter.pointsEarned || 0) - (rBefore.pointsEarned || 0);
        if (deltaPoints > 0 || (rBefore.status !== 'passed' && rAfter.status === 'passed')) {
          ruleResultsComparison.improved.push({
            ruleId: rBefore.ruleId,
            category: rBefore.category || rAfter.category,
            before: rBefore,
            after: rAfter,
            deltaPoints,
          });
          ruleResultsComparison.resolved.push(rBefore.ruleId);
        } else if (deltaPoints < 0 || (rBefore.status === 'passed' && rAfter.status !== 'passed')) {
          ruleResultsComparison.regressed.push({
            ruleId: rBefore.ruleId,
            category: rBefore.category || rAfter.category,
            before: rBefore,
            after: rAfter,
            deltaPoints,
          });
          ruleResultsComparison.newlyFailed.push(rBefore.ruleId);
        } else {
          ruleResultsComparison.unchanged.push({
            ruleId: rBefore.ruleId,
            category: rBefore.category || rAfter.category,
            before: rBefore,
            after: rAfter,
            deltaPoints: 0,
          });
        }
      }
    }
  }

  // 6. Issue count deltas
  const issueCountDeltas = {
    critical: (reportAfter.issueCounts?.critical || 0) - (reportBefore.issueCounts?.critical || 0),
    high: (reportAfter.issueCounts?.high || 0) - (reportBefore.issueCounts?.high || 0),
    medium: (reportAfter.issueCounts?.medium || 0) - (reportBefore.issueCounts?.medium || 0),
    low: (reportAfter.issueCounts?.low || 0) - (reportBefore.issueCounts?.low || 0),
    total: (reportAfter.issueCounts?.total || 0) - (reportBefore.issueCounts?.total || 0),
  };

  return {
    before: {
      id: reportBefore.id,
      timestamp: reportBefore.timestamp,
      url: reportBefore.url,
      domain: reportBefore.domain,
      scores: beforeScores,
      issueCounts: reportBefore.issueCounts || {},
      scoringVersion: versionBefore,
    },
    after: {
      id: reportAfter.id,
      timestamp: reportAfter.timestamp,
      url: reportAfter.url,
      domain: reportAfter.domain,
      scores: afterScores,
      issueCounts: reportAfter.issueCounts || {},
      scoringVersion: versionAfter,
    },
    scoringVersion: {
      before: versionBefore,
      after: versionAfter,
      isVersionMismatch,
      versionMismatch: isVersionMismatch,
      warning: versionWarning,
    },
    versionWarning,
    isVersionMismatch,
    versionMismatch: isVersionMismatch,
    scoreDeltas,
    issueCountDeltas,
    findingsComparison: {
      resolved,
      newlyIntroduced,
      unchanged,
      counts: {
        resolved: resolved.length,
        newlyIntroduced: newlyIntroduced.length,
        unchanged: unchanged.length,
      },
    },
    ruleResultsComparison,
    ruleComparison: ruleResultsComparison,
  };
}
