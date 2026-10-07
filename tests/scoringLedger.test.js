import { describe, it, expect } from 'vitest';
import {
  ALL_RULES,
  RULES_BY_CATEGORY,
  RULES_BY_ID,
  getRule,
} from '../src/analyzers/rules/index.js';
import { analyzePerformance } from '../src/analyzers/performance/index.js';
import { analyzeSeo } from '../src/analyzers/seo/index.js';
import { analyzeAccessibility } from '../src/analyzers/accessibility/index.js';
import { analyzeSecurity } from '../src/analyzers/security/index.js';
import { analyzeBestPractices } from '../src/analyzers/bestPractices/index.js';
import {
  CATEGORY_WEIGHTS,
  calculateOverallScore,
} from '../src/analyzers/scoring.js';
import { formatScoreLedgerAsText } from '../src/components/ui/ScoreLedger.jsx';
import { compareReports } from '../src/services/storage/compareReports.js';
import {
  exportReportAsJson,
  exportReportAsCsv,
  exportReportAsHtml,
} from '../src/services/storage/exportReport.js';

describe('Rule Catalog Integrity (Step 1 & Step 7)', () => {
  const categories = ['performance', 'seo', 'accessibility', 'security', 'bestPractices'];

  it('contains all 5 core categories in RULES_BY_CATEGORY', () => {
    expect(Object.keys(RULES_BY_CATEGORY).sort()).toEqual(categories.sort());
  });

  it('defines documented weights in CATEGORY_WEIGHTS summing to 1.0', () => {
    expect(CATEGORY_WEIGHTS).toBeDefined();
    const sum = Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('guarantees unique rule IDs across the entire catalog with no collisions', () => {
    const ids = new Set();
    for (const rule of ALL_RULES) {
      expect(ids.has(rule.id)).toBe(false);
      ids.add(rule.id);
    }
    expect(ALL_RULES.length).toBe(ids.size);
    expect(Object.keys(RULES_BY_ID).length).toBe(ids.size);
  });

  categories.forEach((cat) => {
    describe(`Category: ${cat}`, () => {
      const rules = RULES_BY_CATEGORY[cat];

      it('has non-empty rules list', () => {
        expect(rules.length).toBeGreaterThan(0);
      });

      it('guarantees weights per category sum to exactly 100', () => {
        const sum = rules.reduce((acc, r) => acc + r.weight, 0);
        expect(sum).toBe(100);
      });

      it('guarantees every rule has weight > 0', () => {
        for (const rule of rules) {
          expect(rule.weight).toBeGreaterThan(0);
          expect(Number.isInteger(rule.weight)).toBe(true);
        }
      });

      it('guarantees required copy fields and schema attributes are valid and non-empty', () => {
        const validSeverities = ['critical', 'high', 'medium', 'low'];
        const validSources = ['heuristic', 'standard'];

        for (const rule of rules) {
          expect(typeof rule.id).toBe('string');
          expect(rule.id.trim().length).toBeGreaterThan(0);
          expect(rule.category).toBe(cat);

          expect(typeof rule.title).toBe('string');
          expect(rule.title.trim().length).toBeGreaterThan(0);

          expect(typeof rule.description).toBe('string');
          expect(rule.description.trim().length).toBeGreaterThan(0);

          expect(typeof rule.whyItMatters).toBe('string');
          expect(rule.whyItMatters.trim().length).toBeGreaterThan(0);

          expect(typeof rule.recommendation).toBe('string');
          expect(rule.recommendation.trim().length).toBeGreaterThan(0);

          expect(validSeverities).toContain(rule.severityOnFail);
          expect(validSources).toContain(rule.source);

          if (rule.source === 'standard') {
            expect(typeof rule.reference).toBe('string');
            expect(rule.reference.trim().length).toBeGreaterThan(0);
          }
        }
      });
    });
  });

  it('resolves individual rules via getRule helper', () => {
    expect(getRule('perf-lcp')).toBeDefined();
    expect(getRule('perf-lcp').title).toContain('LCP');
    expect(getRule('non-existent-rule-id')).toBeUndefined();
  });
});

describe('Analyzer Results Model & Determinism (Step 2 & Step 7)', () => {
  const passingPerformanceData = {
    timings: { ttfb: 200, domContentLoaded: 500, loadEvent: 1000, fcp: 400, lcp: 1200, cls: 0.01 },
    resources: [
      { name: 'https://example.com/app.js', type: 'js', transferSize: 50000, duration: 50 },
      { name: 'https://example.com/hero.webp', type: 'images', transferSize: 80000, duration: 80 },
    ],
  };

  const passingSeoData = {
    title: 'WebXray — Auditable Diagnostics Tool',
    metaDescription: 'Inspect performance, technical SEO, accessibility, and security in a single unified developer dashboard for faster web optimization.',
    canonical: 'https://example.com',
    robotsMeta: 'index, follow',
    htmlLang: 'en',
    headings: [
      { id: 'h1', level: 1, tag: 'H1', text: 'WebXray' },
      { id: 'h2', level: 2, tag: 'H2', text: 'Features' },
    ],
    links: { total: 5, internal: 5, external: 0, emptyHref: 0, nonDescriptive: [] },
    images: { total: 2, missingAlt: 0, emptyAlt: 0, missingDimensions: 0, sampleMissingAlt: [] },
    openGraph: { title: 'WebXray', description: 'Audits', image: 'https://example.com/og.png', url: 'https://example.com' },
    twitter: { card: 'summary_large_image', title: 'WebXray' },
    url: 'https://example.com',
    domain: 'example.com',
  };

  const passingA11yData = {
    imagesCount: 2,
    imagesWithoutAlt: [],
    formControlsCount: 1,
    formControlsWithoutLabel: [],
    buttonsCount: 2,
    buttonsWithoutName: [],
    linksCount: 3,
    linksWithoutName: [],
    headings: [
      { level: 1, tag: 'H1', text: 'Heading 1', selector: 'h1' },
      { level: 2, tag: 'H2', text: 'Heading 2', selector: 'h2' },
    ],
    htmlLang: 'en',
    landmarks: { main: 1, nav: 1, header: 1, footer: 1 },
    unknownRoles: [],
    ariaHiddenFocusable: [],
    duplicateIds: [],
    positiveTabindices: [],
  };

  const passingSecurityData = {
    isHttps: true,
    protocol: 'https:',
    mixedContent: { detected: false, count: 0, samples: [] },
    targetBlankLinks: { total: 2, vulnerableCount: 0, samples: [] },
    inlineScripts: { count: 0 },
    cookies: { clientAccessibleCount: 0, sampleNames: [], note: '' },
    thirdPartyResources: { total: 2, thirdPartyTotal: 1, byCompany: {}, topDomains: [] },
    headers: {
      status: 'verified',
      data: {
        csp: "default-src 'self'",
        hsts: 'max-age=31536000',
        xContentType: 'nosniff',
        referrerPolicy: 'strict-origin-when-cross-origin',
        permissionsPolicy: 'geolocation=()',
        xFrameOptions: 'DENY',
      },
    },
  };

  it('awards 100 score for optimal inputs across all analyzers', () => {
    const perf = analyzePerformance(passingPerformanceData);
    expect(perf.score).toBe(100);
    expect(perf.results.every((r) => r.status === 'passed')).toBe(true);

    const seo = analyzeSeo(passingSeoData);
    expect(seo.score).toBe(100);
    expect(seo.results.every((r) => r.status === 'passed')).toBe(true);

    const a11y = analyzeAccessibility(passingA11yData);
    expect(a11y.score).toBe(100);
    expect(a11y.results.every((r) => r.status === 'passed')).toBe(true);

    const sec = analyzeSecurity(passingSecurityData);
    expect(sec.score).toBe(100);
    expect(sec.results.every((r) => r.status === 'passed')).toBe(true);

    const bp = analyzeBestPractices({
      security: sec,
      seo,
      accessibility: a11y,
      performance: perf,
    });
    expect(bp.score).toBe(100);
    expect(bp.results.every((r) => r.status === 'passed')).toBe(true);
  });

  it('ensures analyzers are pure and deterministic (run twice -> deep equal)', () => {
    const perf1 = analyzePerformance(passingPerformanceData);
    const perf2 = analyzePerformance(passingPerformanceData);
    expect(perf1).toEqual(perf2);

    const seo1 = analyzeSeo(passingSeoData);
    const seo2 = analyzeSeo(passingSeoData);
    expect(seo1).toEqual(seo2);

    const a11y1 = analyzeAccessibility(passingA11yData);
    const a11y2 = analyzeAccessibility(passingA11yData);
    expect(a11y1).toEqual(a11y2);

    const sec1 = analyzeSecurity(passingSecurityData);
    const sec2 = analyzeSecurity(passingSecurityData);
    expect(sec1).toEqual(sec2);
  });

  it('deducts exact rule weight points when a rule fails', () => {
    // Failing LCP rule (weight = 20)
    const failingLcpData = {
      ...passingPerformanceData,
      timings: { ...passingPerformanceData.timings, lcp: 5000 },
    };
    const perfResult = analyzePerformance(failingLcpData);
    const lcpRule = perfResult.results.find((r) => r.ruleId === 'perf-lcp');
    expect(lcpRule).toBeDefined();
    expect(lcpRule.status).toBe('failed');
    expect(lcpRule.pointsPossible).toBe(20);
    expect(lcpRule.pointsEarned).toBe(0);
    // Total score should be 100 - 20 = 80
    expect(perfResult.score).toBe(80);

    // Failing Meta Description in SEO (weight = 15)
    const failingSeoData = {
      ...passingSeoData,
      metaDescription: '',
    };
    const seoResult = analyzeSeo(failingSeoData);
    const descRule = seoResult.results.find((r) => r.ruleId === 'seo-meta-description');
    expect(descRule).toBeDefined();
    expect(descRule.status).toBe('failed');
    expect(descRule.pointsPossible).toBe(15);
    expect(descRule.pointsEarned).toBe(0);
    // Total score should be 100 - 15 = 85
    expect(seoResult.score).toBe(85);
  });

  it('excludes not_applicable or unverified rules from both pointsEarned and pointsPossible', () => {
    // Security with unverified headers:
    // Header rules (CSP: 12, HSTS: 8, nosniff: 6, frame: 6, referrer: 4, permissions: 4 = 40 pts) become 'unverified'
    // Applicable rules: HTTPS (25), Mixed content (15), Tabnabbing (10), Third party (10) = 60 pts
    const unverifiedSecData = {
      ...passingSecurityData,
      headers: { status: 'unverified', data: {} },
    };
    const secResult = analyzeSecurity(unverifiedSecData);

    const unverifiedRules = secResult.results.filter((r) => r.status === 'unverified');
    expect(unverifiedRules.length).toBe(6);

    // Points possible for verified checks = 60, points earned = 60 -> score = 100
    expect(secResult.score).toBe(100);

    // Now fail HTTPS (weight 25) while headers are unverified
    const failHttpsUnverified = {
      ...unverifiedSecData,
      isHttps: false,
      protocol: 'http:',
    };
    const failResult = analyzeSecurity(failHttpsUnverified);
    // Applicable rules: HTTPS (25 failed), Tabnabbing (10 passed), Third-party (10 passed) = 45 possible.
    // Excluded: Mixed content (15 NA on HTTP) and 6 headers (40 unverified) = 55 excluded.
    // Points earned = 20. Score = round(20/45 * 100) = 44
    expect(failResult.score).toBe(44);
  });

  it('awards partial credit proportionally and logs calculation in evidence', () => {
    // 2 out of 4 form controls missing label in A11y (form-labels weight = 18)
    const partialA11yData = {
      ...passingA11yData,
      formControlsCount: 4,
      formControlsWithoutLabel: [
        { selector: '#email', type: 'input' },
        { selector: '#phone', type: 'input' },
      ],
    };
    const a11yResult = analyzeAccessibility(partialA11yData);
    const formRule = a11yResult.results.find((r) => r.ruleId === 'a11y-form-labels');
    expect(formRule).toBeDefined();
    expect(formRule.status).toBe('warning');
    expect(formRule.pointsPossible).toBe(18);
    // (2 / 4) * 18 = 9 points earned
    expect(formRule.pointsEarned).toBe(9);
    expect(formRule.evidence.some((e) => typeof e === 'string' && e.includes('2 of 4'))).toBe(true);
    expect(a11yResult.score).toBe(91); // 100 - 9 = 91
  });
});

describe('Overall Scoring Engine & Contributions (Step 3 & Step 7)', () => {
  it('combines categories with equal 20% weights and calculates point contributions', () => {
    const mockAudit = {
      performance: {
        score: 90,
        results: [{ ruleId: 'perf-lcp', pointsPossible: 20, pointsEarned: 10, status: 'warning', observed: '3.5s', expected: '<=2.5s' }],
        findings: [],
        breakdown: { deductions: [] },
      },
      seo: {
        score: 80,
        results: [{ ruleId: 'seo-title', pointsPossible: 20, pointsEarned: 0, status: 'failed', observed: '10 chars', expected: '30-60 chars' }],
        findings: [],
        breakdown: { deductions: [] },
      },
      accessibility: {
        score: 70,
        results: [{ ruleId: 'a11y-image-alt', pointsPossible: 15, pointsEarned: 0, status: 'failed', observed: '3 missing', expected: '0 missing' }],
        findings: [],
        breakdown: { deductions: [] },
      },
      security: {
        score: 100,
        results: [{ ruleId: 'sec-https', pointsPossible: 25, pointsEarned: 25, status: 'passed', observed: 'https:', expected: 'https:' }],
        findings: [],
        breakdown: { deductions: [] },
      },
      bestPractices: {
        score: 95,
        results: [{ ruleId: 'bp-links', pointsPossible: 10, pointsEarned: 5, status: 'warning', observed: '1 generic', expected: '0 generic' }],
        findings: [],
        breakdown: { deductions: [] },
      },
    };

    const result = calculateOverallScore(mockAudit);

    // Expected: 0.2*90 (18) + 0.2*80 (16) + 0.2*70 (14) + 0.2*100 (20) + 0.2*95 (19) = 87
    expect(result.overallScore).toBe(87);
    expect(result.grade).toBe('B');

    // Contributions should add up to the overall score within rounding (±1)
    const sumContributions = Object.values(result.categoryContributions).reduce(
      (sum, c) => sum + c.pointsContributed,
      0
    );
    expect(Math.abs(sumContributions - result.overallScore)).toBeLessThanOrEqual(1);

    // Top rules losing points across categories
    expect(result.topPointLossRules.length).toBeGreaterThan(0);
    expect(result.topPointLossRules[0].pointsLost).toBeGreaterThanOrEqual(result.topPointLossRules[1].pointsLost);
  });
});

describe('ScoreLedger Formatter (Step 4 & Step 7)', () => {
  it('formats plain-text copy string according to required specification', () => {
    const mockResults = [
      {
        ruleId: 'seo-title',
        title: 'Title exists',
        status: 'passed',
        pointsEarned: 20,
        pointsPossible: 20,
        observed: '42 chars',
        expected: '30-60 chars',
        evidence: ['Page title is 42 chars'],
        recommendation: 'Title is within optimal length.',
      },
      {
        ruleId: 'seo-image-alt',
        title: 'Image alt text provided',
        status: 'warning',
        pointsEarned: 2,
        pointsPossible: 4,
        observed: '2 images missing alt',
        expected: '0 missing alt',
        evidence: ['2 images missing alt'],
        recommendation: 'Add descriptive alt text to the 2 affected images.',
      },
      {
        ruleId: 'seo-canonical',
        title: 'Canonical link tag',
        status: 'not_applicable',
        pointsEarned: 0,
        pointsPossible: 0,
        observed: 'Not present',
        expected: 'Valid URL',
        evidence: ['Single page without alternates'],
        recommendation: 'Add canonical tag if hosting duplicates.',
      },
    ];

    const text = formatScoreLedgerAsText('SEO', 91, mockResults);

    expect(text).toContain('SEO 91/100');
    expect(text).toContain('Evidence');
    expect(text).toContain('[pass] Title exists (42 chars)');
    expect(text).toContain('[warn] Image alt text provided (2 images missing alt)');
    expect(text).toContain('Recommendation');
    expect(text).toContain('Add descriptive alt text to the 2 affected images.');
  });
});

describe('Reports & Versioning Auditing (Step 5 & Step 7)', () => {
  it('emits comparability warning when comparing reports with different scoring versions', () => {
    const reportV1 = {
      id: 'rep-v1',
      scoringVersion: '1.0',
      timestamp: 1000,
      url: 'https://example.com',
      scores: { overall: 80, performance: 80, seo: 80, accessibility: 80, security: 80, bestPractices: 80 },
      findingsSummary: [],
    };

    const reportV2 = {
      id: 'rep-v2',
      scoringVersion: '2.0',
      timestamp: 2000,
      url: 'https://example.com',
      scores: { overall: 90, performance: 90, seo: 90, accessibility: 90, security: 90, bestPractices: 90 },
      findingsSummary: [],
    };

    const diff = compareReports(reportV1, reportV2);
    expect(diff.versionMismatch).toBe(true);
    expect(diff.versionWarning).toContain('scores are not directly comparable');
  });

  it('compares by ruleId when comparing reports with matching versions', () => {
    const report1 = {
      id: 'rep-1',
      scoringVersion: '1.0',
      timestamp: 1000,
      url: 'https://example.com',
      scores: { overall: 75, performance: 75, seo: 75, accessibility: 75, security: 75, bestPractices: 75 },
      findingsSummary: [],
      ruleResults: [
        { ruleId: 'perf-lcp', status: 'failed', pointsEarned: 0, pointsPossible: 20 },
        { ruleId: 'seo-title', status: 'passed', pointsEarned: 20, pointsPossible: 20 },
      ],
    };

    const report2 = {
      id: 'rep-2',
      scoringVersion: '1.0',
      timestamp: 2000,
      url: 'https://example.com',
      scores: { overall: 95, performance: 95, seo: 95, accessibility: 95, security: 95, bestPractices: 95 },
      findingsSummary: [],
      ruleResults: [
        { ruleId: 'perf-lcp', status: 'passed', pointsEarned: 20, pointsPossible: 20 }, // resolved
        { ruleId: 'seo-title', status: 'passed', pointsEarned: 20, pointsPossible: 20 },
      ],
    };

    const diff = compareReports(report1, report2);
    expect(diff.versionMismatch).toBe(false);
    expect(diff.versionWarning).toBeNull();
    expect(diff.ruleComparison.resolved).toContain('perf-lcp');
  });

  it('includes scoringVersion and sanitized ruleResults in JSON, CSV, and HTML exports', () => {
    const sampleReport = {
      id: 'rep-full',
      scoringVersion: '1.0',
      timestamp: 1710000000000,
      url: 'https://example.com',
      domain: 'example.com',
      scores: { overall: 90 },
      findingsSummary: [{ id: 'f-1', title: 'Slow Asset', severity: 'medium', category: 'Performance' }],
      ruleResults: [
        {
          ruleId: 'perf-lcp',
          category: 'performance',
          status: 'passed',
          pointsEarned: 20,
          pointsPossible: 20,
          observed: '1800 ms',
          expected: '<= 2500 ms',
          evidence: ['Hero rendered in 1.8s'],
        },
      ],
    };

    // JSON export
    const jsonStr = exportReportAsJson(sampleReport);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.scoringVersion).toBe('1.0');
    expect(parsed.ruleResults).toHaveLength(1);
    expect(parsed.ruleResults[0].ruleId).toBe('perf-lcp');

    // CSV export
    const csvStr = exportReportAsCsv(sampleReport);
    expect(csvStr).toContain('Rule ID');
    expect(csvStr).toContain('perf-lcp');
    expect(csvStr).toContain('1800 ms');

    // HTML export
    const htmlStr = exportReportAsHtml(sampleReport);
    expect(htmlStr).toContain('Scoring Engine v1.0');
    expect(htmlStr).toContain('perf-lcp');
    expect(htmlStr).toContain('1800 ms');
  });
});

describe('Scoring Integrity Audit (Part C)', () => {
  const samplePerformanceData = {
    timings: { ttfb: 400, domContentLoaded: 1200, loadEvent: 2500, fcp: 1400, lcp: 3200, cls: 0.08 },
    resources: [
      { name: 'https://example.com/app.js', type: 'js', transferSize: 450000, duration: 250 },
      { name: 'https://example.com/hero.png', type: 'images', transferSize: 850000, duration: 400 },
    ],
  };

  const sampleSeoData = {
    title: 'Short',
    metaDescription: 'A valid description within the 70 to 160 character boundary that describes the page accurately.',
    canonical: 'https://example.com',
    robotsMeta: 'index, follow',
    htmlLang: 'en',
    headings: [
      { id: 'h1', level: 1, tag: 'H1', text: 'Sample Title' },
      { id: 'h3', level: 3, tag: 'H3', text: 'Skipped to H3' },
    ],
    links: {
      total: 10,
      internal: 8,
      external: 2,
      emptyHref: 1,
      nonDescriptive: [{ text: 'click here', href: '/link' }],
    },
    images: { total: 4, missingAlt: 1, emptyAlt: 0, missingDimensions: 1, sampleMissingAlt: [] },
    openGraph: { title: 'Sample' },
    twitter: {},
    url: 'https://example.com',
    domain: 'example.com',
  };

  const sampleA11yData = {
    imagesCount: 5,
    imagesWithoutAlt: [{ selector: 'img.banner' }],
    formControlsCount: 2,
    formControlsWithoutLabel: [{ selector: '#email' }],
    buttonsCount: 3,
    buttonsWithoutName: [],
    linksCount: 4,
    linksWithoutName: [],
    headings: [{ level: 1, tag: 'H1', text: 'Heading 1', selector: 'h1' }],
    htmlLang: 'en',
    landmarks: { main: 1, nav: 1, header: 1, footer: 1 },
    unknownRoles: [],
    ariaHiddenFocusable: [],
    duplicateIds: [],
    positiveTabindices: [],
  };

  const sampleSecurityData = {
    isHttps: true,
    protocol: 'https:',
    mixedContent: { detected: false, count: 0, samples: [] },
    targetBlankLinks: { total: 4, vulnerableCount: 1, samples: [] },
    inlineScripts: { count: 3 },
    cookies: { clientAccessibleCount: 1, sampleNames: ['sid'], note: '' },
    thirdPartyResources: { total: 10, thirdPartyTotal: 4, byCompany: {}, topDomains: [] },
    headers: {
      status: 'verified',
      data: {
        csp: "default-src 'self'",
        hsts: 'max-age=31536000',
        xContentType: 'nosniff',
        referrerPolicy: null,
        permissionsPolicy: null,
        xFrameOptions: 'DENY',
      },
    },
  };

  it('verifies for each category that sum(pointsEarned)/sum(applicable pointsPossible) equals displayed score within rounding', () => {
    const perf = analyzePerformance(samplePerformanceData);
    const seo = analyzeSeo(sampleSeoData);
    const a11y = analyzeAccessibility(sampleA11yData);
    const sec = analyzeSecurity(sampleSecurityData);
    const bp = analyzeBestPractices({ performance: perf, seo, accessibility: a11y, security: sec });

    const categories = [
      { name: 'performance', data: perf },
      { name: 'seo', data: seo },
      { name: 'accessibility', data: a11y },
      { name: 'security', data: sec },
      { name: 'bestPractices', data: bp },
    ];

    for (const cat of categories) {
      const applicableRules = cat.data.results.filter(
        (r) => r.status !== 'not_applicable' && r.status !== 'unverified'
      );
      const pointsEarnedSum = applicableRules.reduce((sum, r) => sum + r.pointsEarned, 0);
      const pointsPossibleSum = applicableRules.reduce((sum, r) => sum + r.pointsPossible, 0);

      expect(pointsPossibleSum).toBeGreaterThan(0);
      const computedScore = Math.round((pointsEarnedSum / pointsPossibleSum) * 100);

      // Displayed score matches the ledger calculation within rounding
      expect(cat.data.score).toBe(computedScore);
    }
  });

  it('verifies that the overall score equals the weighted sum of category scores within rounding', () => {
    const perf = analyzePerformance(samplePerformanceData);
    const seo = analyzeSeo(sampleSeoData);
    const a11y = analyzeAccessibility(sampleA11yData);
    const sec = analyzeSecurity(sampleSecurityData);

    const overall = calculateOverallScore({
      performance: perf,
      seo,
      accessibility: a11y,
      security: sec,
    });

    const expectedWeightedSum = Math.round(
      perf.score * CATEGORY_WEIGHTS.performance +
      seo.score * CATEGORY_WEIGHTS.seo +
      a11y.score * CATEGORY_WEIGHTS.accessibility +
      sec.score * CATEGORY_WEIGHTS.security +
      overall.categoryScores.bestPractices * CATEGORY_WEIGHTS.bestPractices
    );

    expect(overall.overallScore).toBe(expectedWeightedSum);
  });

  it('guarantees that unverified and not_applicable rules never change the category score', () => {
    // 1. Security with unverified headers: unverified headers are excluded from denominator
    const secUnverified = analyzeSecurity({
      ...sampleSecurityData,
      headers: { status: 'unverified', data: {} },
      targetBlankLinks: { total: 0, vulnerableCount: 0, samples: [] },
      inlineScripts: { count: 0 },
      thirdPartyResources: { total: 0, thirdPartyTotal: 0, byCompany: {}, topDomains: [] },
    });
    expect(secUnverified.score).toBe(100);

    // 2. HTTP page where mixed content is not_applicable
    const secHttp = analyzeSecurity({
      isHttps: false,
      protocol: 'http:',
      mixedContent: { detected: false, count: 0, samples: [] },
      targetBlankLinks: { total: 0, vulnerableCount: 0, samples: [] },
      inlineScripts: { count: 0 },
      thirdPartyResources: { total: 0, thirdPartyTotal: 0, byCompany: {}, topDomains: [] },
      headers: {
        status: 'verified',
        data: {
          csp: "default-src 'self'",
          hsts: 'max-age=31536000',
          xContentType: 'nosniff',
          referrerPolicy: 'strict-origin-when-cross-origin',
          permissionsPolicy: 'geolocation=()',
          xFrameOptions: 'DENY',
        },
      },
    });

    const mixedContentRule = secHttp.results.find((r) => r.ruleId === 'sec-mixed-content');
    expect(mixedContentRule.status).toBe('not_applicable');
    expect(mixedContentRule.pointsEarned).toBe(0);
    expect(mixedContentRule.pointsPossible).toBe(15);

    // Check that excluded rule does not penalize score:
    const applicable = secHttp.results.filter(
      (r) => r.status !== 'not_applicable' && r.status !== 'unverified'
    );
    const earned = applicable.reduce((s, r) => s + r.pointsEarned, 0);
    const possible = applicable.reduce((s, r) => s + r.pointsPossible, 0);
    expect(secHttp.score).toBe(Math.round((earned / possible) * 100));
  });
});

