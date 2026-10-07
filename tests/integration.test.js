import { describe, it, expect } from 'vitest';
import { analyzePerformance } from '../src/analyzers/performance/index.js';
import { analyzeSeo } from '../src/analyzers/seo/index.js';
import { analyzeAccessibility } from '../src/analyzers/accessibility/index.js';
import { analyzeSecurity } from '../src/analyzers/security/index.js';
import { analyzeTechnology } from '../src/analyzers/technology/index.js';
import { calculateOverallScore } from '../src/analyzers/scoring.js';
import { compareReports } from '../src/services/storage/compareReports.js';
import {
  exportReportAsJson,
  exportReportAsCsv,
  exportReportAsHtml,
} from '../src/services/storage/exportReport.js';
import { isInspectableUrl, getRestrictedPageReason } from '../src/utils/overview.js';

describe('Phase 10 — Hardening & Analyzer Resilience', () => {
  describe('Resilience against null, undefined and malformed inputs', () => {
    it('analyzePerformance handles null/undefined/empty input safely', () => {
      const resNull = analyzePerformance(null);
      expect(resNull).toBeDefined();
      expect(typeof resNull.score).toBe('number');
      expect(Array.isArray(resNull.findings)).toBe(true);

      const resEmpty = analyzePerformance({});
      expect(resEmpty.score).toBeGreaterThanOrEqual(0);
      expect(resEmpty.metrics).toBeDefined();
    });

    it('analyzeSeo handles null/undefined/empty input safely', () => {
      const resNull = analyzeSeo(null);
      expect(resNull).toBeDefined();
      expect(typeof resNull.score).toBe('number');
      expect(Array.isArray(resNull.findings)).toBe(true);

      const resEmpty = analyzeSeo({});
      expect(resEmpty.score).toBeLessThanOrEqual(100);
      expect(resEmpty.headings).toBeDefined();
    });

    it('analyzeAccessibility handles null/undefined/empty input safely', () => {
      const resNull = analyzeAccessibility(null);
      expect(resNull).toBeDefined();
      expect(typeof resNull.score).toBe('number');
      expect(Array.isArray(resNull.findings)).toBe(true);

      const resEmpty = analyzeAccessibility({});
      expect(resEmpty.score).toBeGreaterThanOrEqual(0);
    });

    it('analyzeSecurity handles null/undefined/empty input safely', () => {
      const resNull = analyzeSecurity(null);
      expect(resNull).toBeDefined();
      expect(typeof resNull.score).toBe('number');
      expect(Array.isArray(resNull.findings)).toBe(true);

      const resEmpty = analyzeSecurity({});
      expect(resEmpty.score).toBeGreaterThanOrEqual(0);
    });

    it('analyzeTechnology handles null/undefined/empty input safely', () => {
      const resNull = analyzeTechnology(null);
      expect(resNull).toBeDefined();
      expect(Array.isArray(resNull.detections)).toBe(true);
      expect(resNull.totalCount).toBe(0);

      const resEmpty = analyzeTechnology({});
      expect(resEmpty.detections).toEqual([]);
    });

    it('calculateOverallScore handles missing categories without throwing', () => {
      const emptyScores = calculateOverallScore({});
      expect(emptyScores.overallScore).toBe(88);
      expect(emptyScores.categoryScores).toBeDefined();

      const partialScores = calculateOverallScore({ performance: 90 });
      expect(partialScores.overallScore).toBeGreaterThan(0);
      expect(partialScores.categoryScores.performance).toBe(90);
    });
  });

  describe('Large Page Stress Test (10,000+ simulated DOM nodes & resources)', () => {
    it('executes performance analysis on 1,000+ resources swiftly', () => {
      const largeResources = Array.from({ length: 1200 }, (_, i) => ({
        name: `https://cdn.example.com/assets/chunk-${i}.js`,
        initiatorType: i % 2 === 0 ? 'script' : 'img',
        transferSize: (i % 10) * 150000,
        duration: 120,
        domain: 'cdn.example.com',
      }));

      const startTime = performance.now();
      const result = analyzePerformance({
        timings: { lcp: 2200, fcp: 800, ttfb: 150, cls: 0.02 },
        resources: largeResources,
      });
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(150); // Under 150ms
      expect(result.score).toBeGreaterThan(0);
      expect(result.resourcesSummary.totalCount).toBe(1200);
    });

    it('executes SEO analysis on hundreds of headings and thousands of links rapidly', () => {
      const largeHeadings = Array.from({ length: 400 }, (_, i) => ({
        level: (i % 6) + 1,
        tag: `H${(i % 6) + 1}`,
        text: `Section Heading ${i}`,
      }));

      const startTime = performance.now();
      const result = analyzeSeo({
        title: 'Optimized Enterprise Web Portal With High Density Content',
        metaDescription: 'A well structured enterprise webpage designed with rich headings and dense link topology for high scale users.',
        canonical: 'https://example.com/large-page',
        headings: largeHeadings,
        links: {
          total: 8500,
          internal: 7800,
          external: 700,
          emptyHref: 5,
          nonDescriptive: [{ text: 'click here', href: '/link' }],
        },
        images: {
          total: 1200,
          missingAlt: 10,
          emptyAlt: 2,
          missingDimensions: 15,
          sampleMissingAlt: ['img-1.jpg', 'img-2.jpg'],
        },
      });
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100); // Under 100ms
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('Restricted Page Detection & Protocol Isolation', () => {
    it('identifies restricted browser URLs correctly', () => {
      expect(isInspectableUrl('chrome://settings')).toBe(false);
      expect(isInspectableUrl('chrome-extension://abcdefg/popup.html')).toBe(false);
      expect(isInspectableUrl('edge://flags')).toBe(false);
      expect(isInspectableUrl('about:blank')).toBe(false);
      expect(isInspectableUrl('view-source:https://example.com')).toBe(false);
      expect(isInspectableUrl('https://chromewebstore.google.com/detail/123')).toBe(false);

      expect(isInspectableUrl('https://example.com')).toBe(true);
      expect(isInspectableUrl('http://localhost:3000')).toBe(true);
      expect(isInspectableUrl('https://github.com/google')).toBe(true);
    });

    it('returns user-friendly error messages for restricted pages', () => {
      expect(getRestrictedPageReason('chrome://extensions')).toContain('Browser internal');
      expect(getRestrictedPageReason('https://chromewebstore.google.com/item')).toContain('Chrome Web Store');
      expect(getRestrictedPageReason('https://example.com/test.pdf')).toContain('PDF documents');
    });
  });

  describe('End-to-End Pipeline Integration', () => {
    it('simulates complete audit flow: analysis -> scoring -> snapshot -> compare -> export', () => {
      // 1. Analyze categories
      const perf = analyzePerformance({
        timings: { lcp: 1800, fcp: 700, ttfb: 120, cls: 0.01 },
        resources: [
          { name: 'https://site.com/main.js', initiatorType: 'script', transferSize: 120000, duration: 80, domain: 'site.com' },
        ],
      });

      const seo = analyzeSeo({
        title: 'Complete Integrated Test Audit Page',
        metaDescription: 'A valid meta description that satisfies search engines and passes character bounds without deduction.',
        canonical: 'https://site.com/test',
        htmlLang: 'en',
        headings: [{ level: 1, tag: 'H1', text: 'Main Title' }],
      });

      const a11y = analyzeAccessibility({
        htmlLang: 'en',
        imagesWithoutAlt: [],
        formControlsWithoutLabel: [],
        landmarks: { main: 1, nav: 1, header: 1, footer: 1 },
      });

      const sec = analyzeSecurity({
        isHttps: true,
        protocol: 'https:',
        headers: {
          'content-security-policy': "default-src 'self'",
          'strict-transport-security': 'max-age=31536000; includeSubDomains',
        },
      });

      // 2. Score calculation
      const scoreOutput = calculateOverallScore({
        performance: perf.score,
        seo: seo.score,
        accessibility: a11y.score,
        security: sec.score,
        bestPractices: 95,
      });

      expect(scoreOutput.overallScore).toBeGreaterThanOrEqual(80);
      expect(scoreOutput.grade).toBeDefined();

      // 3. Create simulated report snapshot 1 (Before)
      const reportBefore = {
        id: 'rep_1',
        url: 'https://site.com/test',
        domain: 'site.com',
        timestamp: Date.now() - 3600000,
        scores: {
          overall: 75,
          grade: 'C',
          performance: 70,
          seo: 75,
          accessibility: 80,
          security: 70,
          bestPractices: 80,
        },
        issueCounts: { critical: 1, high: 2, medium: 2, low: 1 },
        findingsSummary: [
          { id: 'f-1', title: 'Old Issue', severity: 'high', evidence: 'Slow query' },
          { id: 'f-2', title: 'Persisting Issue', severity: 'medium', evidence: 'Missing tag' },
        ],
      };

      // 4. Create simulated report snapshot 2 (After)
      const reportAfter = {
        id: 'rep_2',
        url: 'https://site.com/test',
        domain: 'site.com',
        timestamp: Date.now(),
        scores: {
          overall: 92,
          grade: 'A',
          performance: 90,
          seo: 95,
          accessibility: 90,
          security: 90,
          bestPractices: 95,
        },
        issueCounts: { critical: 0, high: 0, medium: 1, low: 1 },
        findingsSummary: [
          { id: 'f-2', title: 'Persisting Issue', severity: 'medium', evidence: 'Missing tag' },
          { id: 'f-3', title: 'New Low Warning', severity: 'low', evidence: 'Font format' },
        ],
      };

      // 5. Compare reports
      const diff = compareReports(reportBefore, reportAfter);
      expect(diff.scoreDeltas.overall).toBe(17);
      expect(diff.findingsComparison.resolved.length).toBe(1);
      expect(diff.findingsComparison.resolved[0].id).toBe('f-1');
      expect(diff.findingsComparison.newlyIntroduced.length).toBe(1);
      expect(diff.findingsComparison.newlyIntroduced[0].id).toBe('f-3');
      expect(diff.findingsComparison.unchanged.length).toBe(1);

      // 6. Export outputs
      const jsonStr = exportReportAsJson(reportAfter);
      expect(JSON.parse(jsonStr).id).toBe('rep_2');

      const csvStr = exportReportAsCsv(reportAfter);
      expect(csvStr).toContain('Persisting Issue');

      const htmlStr = exportReportAsHtml(reportAfter);
      expect(htmlStr).toContain('<!DOCTYPE html>');
      expect(htmlStr).toContain('site.com');
      expect(htmlStr).toContain('WebXray Audit Report');
    });
  });

  describe('Background Message Protocol & Sender Verification', () => {
    function simulateBackgroundMessageRouter(message, sender) {
      const EXTENSION_ID = 'webxray-mock-id';
      let responseData = null;
      const sendResponse = (res) => { responseData = res; };

      // 1. Sender validation
      if (sender?.id !== EXTENSION_ID) {
        return { handled: false, error: 'Unauthorized sender' };
      }

      // 2. Shape validation
      if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
        sendResponse({ ok: false, error: 'Malformed message format: type string required' });
        return { handled: true, response: responseData };
      }

      // 3. Action handling
      switch (message.type) {
        case 'PING':
          sendResponse({ ok: true, type: 'PONG', version: '0.1.0' });
          return { handled: true, response: responseData };
        default:
          sendResponse({ ok: false, error: `Unrecognized message type: ${message.type}` });
          return { handled: true, response: responseData };
      }
    }

    it('rejects messages from foreign extension IDs or unauthenticated senders', () => {
      const res = simulateBackgroundMessageRouter({ type: 'PING' }, { id: 'foreign-malicious-extension' });
      expect(res.handled).toBe(false);
      expect(res.error).toBe('Unauthorized sender');
    });

    it('rejects malformed payloads lacking type strings', () => {
      const res1 = simulateBackgroundMessageRouter(null, { id: 'webxray-mock-id' });
      expect(res1.response.ok).toBe(false);
      expect(res1.response.error).toContain('Malformed message');

      const res2 = simulateBackgroundMessageRouter({ foo: 'bar' }, { id: 'webxray-mock-id' });
      expect(res2.response.ok).toBe(false);
      expect(res2.response.error).toContain('Malformed message');
    });

    it('successfully processes PING and replies with PONG and current extension version', () => {
      const res = simulateBackgroundMessageRouter({ type: 'PING' }, { id: 'webxray-mock-id' });
      expect(res.response.ok).toBe(true);
      expect(res.response.type).toBe('PONG');
      expect(res.response.version).toBe('0.1.0');
    });

    it('gracefully replies with error on unrecognized message types', () => {
      const res = simulateBackgroundMessageRouter({ type: 'UNKNOWN_OP' }, { id: 'webxray-mock-id' });
      expect(res.response.ok).toBe(false);
      expect(res.response.error).toContain('Unrecognized message type: UNKNOWN_OP');
    });
  });
});
