/**
 * WebXray - Unified Scoring & Recommendation Engine
 * Combines Performance, SEO, Accessibility, Security, and Best Practices
 * into an overall website health score using documented transparent weights.
 * Follows Rule 4: Pure function returning deterministic scores and findings.
 */

import { analyzeBestPractices } from './bestPractices/index.js';

/**
 * Documented weights for the 5 core diagnostic categories.
 *
 * Rationale:
 * - Performance (20%): Dictates loading responsiveness, Core Web Vitals, visitor drop-off, and conversion rates.
 * - SEO (20%): Governs search discoverability, indexability, canonical routing, and social card previews.
 * - Accessibility (20%): Ensures inclusivity, keyboard accessibility, screen reader fidelity, and WCAG compliance.
 * - Security (20%): Guarantees TLS transport encryption, defense-in-depth HTTP headers, and origin isolation.
 * - Best Practices (20%): Enforces adherence to modern web standards, resilient linking, and document structure.
 *
 * All 5 categories are weighted equally (20% each), totaling 1.0 (100%).
 */
export const CATEGORY_WEIGHTS = {
  performance: 0.20,
  seo: 0.20,
  accessibility: 0.20,
  security: 0.20,
  bestPractices: 0.20,
};

/**
 * Severity ranking for recommendation prioritization
 * Critical > High > Medium > Low
 */
export const SEVERITY_RANK = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

/**
 * Helper to safely extract a numeric score (0-100) from a category result
 */
function extractScore(val) {
  if (typeof val === 'number') {
    return Math.max(0, Math.min(100, Math.round(val)));
  }
  if (val && typeof val.score === 'number') {
    return Math.max(0, Math.min(100, Math.round(val.score)));
  }
  return null;
}

/**
 * Helper to extract findings array from a category result
 */
function extractFindings(val) {
  if (val && Array.isArray(val.findings)) {
    return val.findings;
  }
  return [];
}

/**
 * Helper to extract deductions array from a category result
 */
function extractDeductions(val) {
  if (val && val.breakdown && Array.isArray(val.breakdown.deductions)) {
    return val.breakdown.deductions;
  }
  return [];
}

/**
 * Helper to extract rule results array from a category result
 */
function extractResults(val) {
  if (val && Array.isArray(val.results)) {
    return val.results;
  }
  return [];
}

/**
 * Derives Best Practices score and rule results by evaluating against the Best Practices rule catalog.
 * @param {object} categoryResults
 * @returns {object} { score, deductions, results, findings, breakdown }
 */
export function deriveBestPracticesScore(categoryResults = {}) {
  const evaluated = analyzeBestPractices(categoryResults);
  return {
    score: evaluated.score,
    deductions: evaluated.breakdown?.deductions || [],
    results: evaluated.results,
    findings: evaluated.findings,
    breakdown: evaluated.breakdown,
  };
}

/**
 * Aggregates all non-passed findings across all diagnostic modules,
 * tagged with their category and sorted by severity (critical > high > medium > low).
 *
 * @param {object} categoryResults - object containing performance, seo, accessibility, security, bestPractices
 * @param {object} options - { limit: number }
 * @returns {Array} sorted recommendations
 */
export function aggregateRecommendations(categoryResults = {}, options = {}) {
  const { limit = 10 } = options;
  const categories = [
    { key: 'Performance', data: categoryResults.performance },
    { key: 'SEO', data: categoryResults.seo },
    { key: 'Accessibility', data: categoryResults.accessibility },
    { key: 'Security', data: categoryResults.security },
    { key: 'Best Practices', data: categoryResults.bestPractices },
  ];

  const recommendations = [];

  for (const cat of categories) {
    const findings = extractFindings(cat.data);
    for (const f of findings) {
      if (f.severity !== 'passed') {
        recommendations.push({
          ...f,
          category: cat.key,
          rank: SEVERITY_RANK[f.severity] || 99,
        });
      }
    }
  }

  // Sort by severity rank (critical: 1, high: 2, medium: 3, low: 4)
  recommendations.sort((a, b) => {
    if (a.rank !== b.rank) {
      return a.rank - b.rank;
    }
    return String(a.title || '').localeCompare(String(b.title || ''));
  });

  return typeof limit === 'number' && limit > 0
    ? recommendations.slice(0, limit)
    : recommendations;
}

/**
 * Evaluates overall website health score from category results
 *
 * @param {object} categoryResults - { performance, seo, accessibility, security, bestPractices? }
 * @param {object} customWeights - optional overrides for category weights
 * @returns {object} unified score summary matching Section 24 of PROJECT.md
 */
export function calculateOverallScore(categoryResults = {}, customWeights = CATEGORY_WEIGHTS) {
  const weights = { ...CATEGORY_WEIGHTS, ...customWeights };

  // 1. Extract or derive scores for all 5 categories
  const perfScore = extractScore(categoryResults.performance) ?? 85;
  const seoScore = extractScore(categoryResults.seo) ?? 85;
  const a11yScore = extractScore(categoryResults.accessibility) ?? 85;
  const secScore = extractScore(categoryResults.security) ?? 85;

  let bpData = categoryResults.bestPractices;
  if (!bpData || typeof bpData.score !== 'number') {
    bpData = deriveBestPracticesScore(categoryResults);
  }
  const bpScore = extractScore(bpData) ?? 85;
  const bpDeductions = extractDeductions(bpData);

  const categoryScores = {
    performance: perfScore,
    seo: seoScore,
    accessibility: a11yScore,
    security: secScore,
    bestPractices: bpScore,
  };

  // 2. Weighted overall score and per-category points contribution calculation
  let totalWeightedScore = 0;
  let totalWeight = 0;
  const categoryContributions = {};

  for (const [cat, weight] of Object.entries(weights)) {
    if (typeof categoryScores[cat] === 'number') {
      const score = categoryScores[cat];
      totalWeightedScore += score * weight;
      totalWeight += weight;

      categoryContributions[cat] = {
        weight,
        score,
        pointsContributed: Math.round(score * weight),
      };
    }
  }

  const overallScore = totalWeight > 0
    ? Math.max(0, Math.min(100, Math.round(totalWeightedScore / totalWeight)))
    : 85;

  // 3. Issue counts by severity
  const issueCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: 0,
  };

  const allFindings = [
    ...extractFindings(categoryResults.performance),
    ...extractFindings(categoryResults.seo),
    ...extractFindings(categoryResults.accessibility),
    ...extractFindings(categoryResults.security),
    ...extractFindings(bpData),
  ];

  for (const f of allFindings) {
    if (f.severity !== 'passed' && issueCounts[f.severity] !== undefined) {
      issueCounts[f.severity] += 1;
      issueCounts.total += 1;
    }
  }

  // 4. Collect deductions for "Why this score?" panel
  const deductionsByCategory = {
    performance: extractDeductions(categoryResults.performance),
    seo: extractDeductions(categoryResults.seo),
    accessibility: extractDeductions(categoryResults.accessibility),
    security: extractDeductions(categoryResults.security),
    bestPractices: bpDeductions,
  };

  const allDeductions = [];
  for (const [catName, list] of Object.entries(deductionsByCategory)) {
    const findingsList = extractFindings(catName === 'bestPractices' ? bpData : categoryResults[catName]);
    for (const d of list) {
      const matchedFinding = findingsList.find((f) => f.id === d.id || f.ruleId === d.ruleId);
      allDeductions.push({
        ...d,
        category: catName,
        title: matchedFinding?.title || d.reason,
        evidence: matchedFinding?.evidence || '',
        severity: matchedFinding?.severity || 'medium',
        whyItMatters: matchedFinding?.whyItMatters || '',
        recommendation: matchedFinding?.recommendation || '',
      });
    }
  }

  // Sort deductions by points impact descending
  allDeductions.sort((a, b) => (b.points || 0) - (a.points || 0));

  // 5. Expose top rules that cost the most points across all categories
  const ruleResultsByCategory = {
    performance: extractResults(categoryResults.performance),
    seo: extractResults(categoryResults.seo),
    accessibility: extractResults(categoryResults.accessibility),
    security: extractResults(categoryResults.security),
    bestPractices: extractResults(bpData),
  };

  const allLosingRules = [];
  for (const [catName, rList] of Object.entries(ruleResultsByCategory)) {
    const catWeight = weights[catName] || 0.20;
    const findingsList = extractFindings(catName === 'bestPractices' ? bpData : categoryResults[catName]);

    for (const r of rList) {
      if (r.status !== 'not_applicable' && r.status !== 'unverified' && r.pointsPossible > r.pointsEarned) {
        const pointsLost = r.pointsPossible - r.pointsEarned;
        const weightedLoss = pointsLost * catWeight;
        const matchedFinding = findingsList.find((f) => f.ruleId === r.ruleId || f.id === r.ruleId);

        allLosingRules.push({
          ruleId: r.ruleId,
          category: catName,
          title: matchedFinding?.title || r.ruleId,
          pointsLost,
          weightedLoss,
          pointsPossible: r.pointsPossible,
          pointsEarned: r.pointsEarned,
          status: r.status,
          observed: r.observed,
          expected: r.expected,
          evidence: r.evidence,
          whyItMatters: matchedFinding?.whyItMatters || '',
          recommendation: matchedFinding?.recommendation || '',
        });
      }
    }
  }

  // Sort by points lost (or weighted loss) descending
  allLosingRules.sort((a, b) => (b.weightedLoss || 0) - (a.weightedLoss || 0) || (b.pointsLost || 0) - (a.pointsLost || 0));
  const topPointLossRules = allLosingRules.slice(0, 5);

  // 6. Overall letter grade & rating
  let grade = 'A';
  let rating = 'Excellent';

  if (overallScore < 60) {
    grade = 'F';
    rating = 'Critical Attention Needed';
  } else if (overallScore < 70) {
    grade = 'D';
    rating = 'Needs Improvement';
  } else if (overallScore < 80) {
    grade = 'C';
    rating = 'Fair';
  } else if (overallScore < 90) {
    grade = 'B';
    rating = 'Good';
  }

  // 7. Top prioritized recommendations
  const topRecommendations = aggregateRecommendations(
    { ...categoryResults, bestPractices: bpData },
    { limit: 8 }
  );

  return {
    overallScore,
    grade,
    rating,
    weights,
    categoryScores,
    categoryContributions,
    topPointLossRules,
    ruleResultsByCategory,
    issueCounts,
    deductionsByCategory,
    allDeductions,
    topRecommendations,
  };
}
