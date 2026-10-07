import { describe, it, expect } from 'vitest';
import {
  CATEGORY_WEIGHTS,
  SEVERITY_RANK,
  deriveBestPracticesScore,
  aggregateRecommendations,
  calculateOverallScore,
} from '../src/analyzers/scoring.js';

describe('Scoring Engine - Constants & Weights', () => {
  it('defines documented weights totaling 1.0 (20% for each of the 5 categories)', () => {
    expect(CATEGORY_WEIGHTS).toBeDefined();
    expect(CATEGORY_WEIGHTS.performance).toBe(0.20);
    expect(CATEGORY_WEIGHTS.seo).toBe(0.20);
    expect(CATEGORY_WEIGHTS.accessibility).toBe(0.20);
    expect(CATEGORY_WEIGHTS.security).toBe(0.20);
    expect(CATEGORY_WEIGHTS.bestPractices).toBe(0.20);

    const sum = Object.values(CATEGORY_WEIGHTS).reduce((acc, w) => acc + w, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('defines severity ranks in priority order: critical > high > medium > low', () => {
    expect(SEVERITY_RANK.critical).toBeLessThan(SEVERITY_RANK.high);
    expect(SEVERITY_RANK.high).toBeLessThan(SEVERITY_RANK.medium);
    expect(SEVERITY_RANK.medium).toBeLessThan(SEVERITY_RANK.low);
  });
});

describe('deriveBestPracticesScore helper', () => {
  it('returns a perfect score of 100 when all best practices checks pass', () => {
    const cleanCategories = {
      security: { findings: [{ id: 'sec-https-passed', severity: 'passed' }] },
      seo: { findings: [{ id: 'seo-links-passed', severity: 'passed' }] },
      accessibility: { findings: [{ id: 'a11y-html-lang-passed', severity: 'passed' }] },
      performance: { findings: [{ id: 'perf-cls-passed', severity: 'passed' }] },
    };

    const result = deriveBestPracticesScore(cleanCategories);
    expect(result.score).toBe(100);
    expect(result.deductions).toHaveLength(0);
  });

  it('deducts points for specific compliance violations', () => {
    const violations = {
      security: {
        findings: [
          { id: 'sec-https-missing', severity: 'critical' },
          { id: 'sec-tabnabbing-vulnerable', severity: 'medium' },
        ],
      },
      seo: {
        findings: [
          { id: 'seo-links-non-descriptive', severity: 'medium' },
        ],
      },
      accessibility: {
        findings: [
          { id: 'a11y-html-lang-missing', severity: 'high' },
        ],
      },
      performance: {
        findings: [
          { id: 'perf-cls-poor', severity: 'high' },
        ],
      },
    };

    const result = deriveBestPracticesScore(violations);
    // Deductions: HTTPS (25) + tabnabbing (15) + links (10) + lang (15) + CLS (15) = 80
    expect(result.deductions).toHaveLength(5);
    expect(result.score).toBe(20);
  });

  it('clamps best practices score to minimum 0', () => {
    const manyViolations = {
      security: {
        findings: [
          { id: 'sec-https-missing', severity: 'critical' }, // 25
          { id: 'sec-tabnabbing-vulnerable', severity: 'medium' }, // 15
          { id: 'sec-mixed-content', severity: 'critical' }, // 20
        ],
      },
      seo: {
        findings: [
          { id: 'seo-links-non-descriptive', severity: 'medium' }, // 10
        ],
      },
      accessibility: {
        findings: [
          { id: 'a11y-html-lang-missing', severity: 'high' }, // 15
        ],
      },
      performance: {
        findings: [
          { id: 'perf-cls-poor', severity: 'high' }, // 15
        ],
      },
    };

    const result = deriveBestPracticesScore(manyViolations);
    expect(result.score).toBe(0);
  });
});

describe('aggregateRecommendations engine', () => {
  const mockCategories = {
    performance: {
      findings: [
        { id: 'p1', title: 'Large Images', severity: 'high', recommendation: 'Compress images' },
        { id: 'p2', title: 'Fast LCP', severity: 'passed', recommendation: 'None' },
      ],
    },
    seo: {
      findings: [
        { id: 's1', title: 'Missing Meta Description', severity: 'medium', recommendation: 'Add meta description' },
      ],
    },
    accessibility: {
      findings: [
        { id: 'a1', title: 'Unlabeled Input', severity: 'critical', recommendation: 'Add aria-label' },
      ],
    },
    security: {
      findings: [
        { id: 'sec1', title: 'Missing CSP', severity: 'high', recommendation: 'Configure CSP header' },
        { id: 'sec2', title: 'Inline Script', severity: 'low', recommendation: 'Refactor inline script' },
      ],
    },
  };

  it('aggregates non-passed findings across all modules', () => {
    const recs = aggregateRecommendations(mockCategories);
    expect(recs).toHaveLength(5);
    expect(recs.every((r) => r.severity !== 'passed')).toBe(true);
  });

  it('strictly prioritizes recommendations by severity (critical > high > medium > low)', () => {
    const recs = aggregateRecommendations(mockCategories);

    expect(recs[0].severity).toBe('critical');
    expect(recs[0].id).toBe('a1');
    expect(recs[0].category).toBe('Accessibility');

    // High severity items next
    expect(recs[1].severity).toBe('high');
    expect(recs[2].severity).toBe('high');

    // Medium severity items next
    expect(recs[3].severity).toBe('medium');

    // Low severity items last
    expect(recs[4].severity).toBe('low');
  });

  it('respects the limit option', () => {
    const top2 = aggregateRecommendations(mockCategories, { limit: 2 });
    expect(top2).toHaveLength(2);
    expect(top2[0].severity).toBe('critical');
    expect(top2[1].severity).toBe('high');
  });

  it('handles empty category findings gracefully', () => {
    const recs = aggregateRecommendations({});
    expect(recs).toEqual([]);
  });
});

describe('calculateOverallScore pure scoring engine', () => {
  it('calculates weighted overall score with default weights', () => {
    const mockAudit = {
      performance: { score: 90, findings: [], breakdown: { deductions: [] } },
      seo: { score: 80, findings: [], breakdown: { deductions: [] } },
      accessibility: { score: 70, findings: [], breakdown: { deductions: [] } },
      security: { score: 100, findings: [], breakdown: { deductions: [] } },
      bestPractices: { score: 90, findings: [], breakdown: { deductions: [] } },
    };

    // Expected: 0.2*90 + 0.2*80 + 0.2*70 + 0.2*100 + 0.2*90 = 18 + 16 + 14 + 20 + 18 = 86
    const result = calculateOverallScore(mockAudit);
    expect(result.overallScore).toBe(86);
    expect(result.grade).toBe('B');
    expect(result.rating).toBe('Good');
  });

  it('supports custom category weight overrides', () => {
    const mockAudit = {
      performance: { score: 100, findings: [] },
      seo: { score: 50, findings: [] },
      accessibility: { score: 50, findings: [] },
      security: { score: 50, findings: [] },
      bestPractices: { score: 50, findings: [] },
    };

    // Performance weighted at 60%, others 10% each
    const customWeights = {
      performance: 0.60,
      seo: 0.10,
      accessibility: 0.10,
      security: 0.10,
      bestPractices: 0.10,
    };

    // 0.6*100 + 0.1*50 + 0.1*50 + 0.1*50 + 0.1*50 = 60 + 5 + 5 + 5 + 5 = 80
    const result = calculateOverallScore(mockAudit, customWeights);
    expect(result.overallScore).toBe(80);
    expect(result.grade).toBe('B');
  });

  it('assigns accurate letter grades based on overall score thresholds', () => {
    const makeScore = (val) => ({
      performance: { score: val, findings: [] },
      seo: { score: val, findings: [] },
      accessibility: { score: val, findings: [] },
      security: { score: val, findings: [] },
      bestPractices: { score: val, findings: [] },
    });

    expect(calculateOverallScore(makeScore(95)).grade).toBe('A');
    expect(calculateOverallScore(makeScore(85)).grade).toBe('B');
    expect(calculateOverallScore(makeScore(75)).grade).toBe('C');
    expect(calculateOverallScore(makeScore(65)).grade).toBe('D');
    expect(calculateOverallScore(makeScore(50)).grade).toBe('F');
  });

  it('accurately counts issues by severity and total', () => {
    const mockAudit = {
      performance: {
        score: 80,
        findings: [
          { id: 'p1', severity: 'critical' },
          { id: 'p2', severity: 'passed' },
        ],
      },
      seo: {
        score: 85,
        findings: [
          { id: 's1', severity: 'high' },
          { id: 's2', severity: 'medium' },
        ],
      },
      accessibility: {
        score: 75,
        findings: [
          { id: 'a1', severity: 'medium' },
          { id: 'a2', severity: 'low' },
        ],
      },
      security: {
        score: 90,
        findings: [
          { id: 'sec1', severity: 'critical' },
        ],
      },
    };

    const result = calculateOverallScore(mockAudit);
    expect(result.issueCounts.critical).toBe(2);
    expect(result.issueCounts.high).toBe(1);
    expect(result.issueCounts.medium).toBe(2);
    expect(result.issueCounts.low).toBe(1);
    expect(result.issueCounts.total).toBe(6);
  });

  it('compiles deductions for the "Why this score?" panel with points and finding evidence', () => {
    const mockAudit = {
      performance: {
        score: 85,
        breakdown: {
          deductions: [{ id: 'perf-lcp', reason: 'Slow LCP', points: 15 }],
        },
        findings: [
          { id: 'perf-lcp', title: 'Slow LCP', severity: 'high', evidence: 'LCP at 4.2s' },
        ],
      },
      security: {
        score: 88,
        breakdown: {
          deductions: [{ id: 'sec-csp', reason: 'Missing CSP', points: 12 }],
        },
        findings: [
          { id: 'sec-csp', title: 'Missing CSP', severity: 'high', evidence: 'No CSP header' },
        ],
      },
    };

    const result = calculateOverallScore(mockAudit);
    expect(result.allDeductions.length).toBeGreaterThanOrEqual(2);

    // Deductions should be sorted descending by points lost
    expect(result.allDeductions[0].points).toBeGreaterThanOrEqual(result.allDeductions[1].points);

    // Checks that matched finding details were attached
    const lcpDeduction = result.allDeductions.find((d) => d.id === 'perf-lcp');
    expect(lcpDeduction).toBeDefined();
    expect(lcpDeduction.points).toBe(15);
    expect(lcpDeduction.evidence).toBe('LCP at 4.2s');
  });

  it('handles empty or missing input without crashing', () => {
    const result = calculateOverallScore({});
    expect(result).toHaveProperty('overallScore');
    expect(result).toHaveProperty('grade');
    expect(result).toHaveProperty('rating');
    expect(result).toHaveProperty('categoryScores');
    expect(result).toHaveProperty('issueCounts');
    expect(result).toHaveProperty('allDeductions');
    expect(result).toHaveProperty('topRecommendations');
  });
});
