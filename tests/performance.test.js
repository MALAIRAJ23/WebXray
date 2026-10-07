import { describe, it, expect } from 'vitest';
import { analyzePerformance, formatBytes } from '../src/analyzers/performance/index.js';

describe('formatBytes helper', () => {
  it('formats byte numbers into human readable units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(2621440)).toBe('2.5 MB');
  });

  it('handles invalid numbers safely', () => {
    expect(formatBytes(null)).toBe('0 B');
    expect(formatBytes(-100)).toBe('0 B');
    expect(formatBytes(NaN)).toBe('0 B');
  });
});

describe('analyzePerformance pure analyzer', () => {
  const baseMockData = {
    timings: {
      ttfb: 120,
      domContentLoaded: 450,
      loadEvent: 1100,
      fcp: 500,
      lcp: 1800,
      cls: 0.02,
    },
    resources: [
      { name: 'https://example.com/app.js', type: 'js', transferSize: 150000, duration: 100 },
      { name: 'https://example.com/styles.css', type: 'css', transferSize: 45000, duration: 50 },
      { name: 'https://example.com/logo.png', type: 'images', transferSize: 80000, duration: 80 },
    ],
  };

  it('returns a high score and passed findings for an optimized site', () => {
    const result = analyzePerformance(baseMockData);

    expect(result.score).toBe(100);
    expect(result.breakdown.totalDeductions).toBe(0);
    expect(result.findings.every((f) => f.severity === 'passed')).toBe(true);

    // Verify all findings adhere to the analyzer contract (Rule 4)
    result.findings.forEach((finding) => {
      expect(finding).toHaveProperty('id');
      expect(finding).toHaveProperty('title');
      expect(finding).toHaveProperty('severity');
      expect(finding).toHaveProperty('evidence');
      expect(finding).toHaveProperty('whyItMatters');
      expect(finding).toHaveProperty('recommendation');
    });
  });

  it('flags large images (> 500 KB high, > 1 MB critical)', () => {
    // 1. Critical Image (> 1MB)
    const criticalData = {
      ...baseMockData,
      resources: [
        { name: 'https://example.com/hero-giant.png', type: 'images', transferSize: 1500000, duration: 400 },
      ],
    };
    const criticalResult = analyzePerformance(criticalData);
    const criticalFinding = criticalResult.findings.find((f) => f.id === 'perf-images-critical');
    expect(criticalFinding).toBeDefined();
    expect(criticalFinding.severity).toBe('critical');
    expect(criticalFinding.evidence).toContain('hero-giant.png (1.43 MB)');
    expect(criticalResult.score).toBeLessThan(100);

    // 2. High Image (> 500KB and <= 1MB)
    const highData = {
      ...baseMockData,
      resources: [
        { name: 'https://example.com/banner.jpg', type: 'images', transferSize: 750000, duration: 250 },
      ],
    };
    const highResult = analyzePerformance(highData);
    const highFinding = highResult.findings.find((f) => f.id === 'perf-images-high');
    expect(highFinding).toBeDefined();
    expect(highFinding.severity).toBe('high');
    expect(highFinding.evidence).toContain('banner.jpg (732.42 KB)');
  });

  it('flags too many JS files (> 15)', () => {
    // Create 18 JS files
    const manyScripts = Array.from({ length: 18 }, (_, i) => ({
      name: `https://example.com/chunk-${i}.js`,
      type: 'js',
      transferSize: 20000,
      duration: 30,
    }));

    const result = analyzePerformance({
      ...baseMockData,
      resources: manyScripts,
    });

    const jsFinding = result.findings.find((f) => f.id === 'perf-js-high-count');
    expect(jsFinding).toBeDefined();
    expect(jsFinding.severity).toBe('medium');
    expect(jsFinding.evidence).toContain('18 separate JavaScript files');
    expect(result.score).toBeLessThan(100);
  });

  it('flags slow LCP (> 2.5s medium, > 4s high)', () => {
    // Medium LCP (3.2s)
    const mediumLcpResult = analyzePerformance({
      ...baseMockData,
      timings: { ...baseMockData.timings, lcp: 3200 },
    });
    const mediumFinding = mediumLcpResult.findings.find((f) => f.id === 'perf-lcp-needs-improvement');
    expect(mediumFinding).toBeDefined();
    expect(mediumFinding.severity).toBe('medium');
    expect(mediumFinding.evidence).toContain('3.20s');

    // High LCP (4.8s)
    const highLcpResult = analyzePerformance({
      ...baseMockData,
      timings: { ...baseMockData.timings, lcp: 4800 },
    });
    const highFinding = highLcpResult.findings.find((f) => f.id === 'perf-lcp-slow');
    expect(highFinding).toBeDefined();
    expect(highFinding.severity).toBe('high');
    expect(highFinding.evidence).toContain('4.80s');
  });

  it('flags high CLS (> 0.1 medium, > 0.25 high)', () => {
    // Medium CLS (0.18)
    const mediumClsResult = analyzePerformance({
      ...baseMockData,
      timings: { ...baseMockData.timings, cls: 0.18 },
    });
    const mediumFinding = mediumClsResult.findings.find((f) => f.id === 'perf-cls-moderate');
    expect(mediumFinding).toBeDefined();
    expect(mediumFinding.severity).toBe('medium');

    // High CLS (0.35)
    const highClsResult = analyzePerformance({
      ...baseMockData,
      timings: { ...baseMockData.timings, cls: 0.35 },
    });
    const highFinding = highClsResult.findings.find((f) => f.id === 'perf-cls-high');
    expect(highFinding).toBeDefined();
    expect(highFinding.severity).toBe('high');
  });

  it('flags render-blocking CSS/JS when detectable', () => {
    const blockingData = {
      ...baseMockData,
      resources: [
        {
          name: 'https://example.com/blocking.css',
          type: 'css',
          transferSize: 30000,
          initiatorType: 'link',
          renderBlockingStatus: 'blocking',
        },
      ],
    };

    const result = analyzePerformance(blockingData);
    const blockingFinding = result.findings.find((f) => f.id === 'perf-render-blocking');
    expect(blockingFinding).toBeDefined();
    expect(blockingFinding.severity).toBe('medium');
    expect(blockingFinding.evidence).toContain('blocking.css');
  });

  it('handles cross-origin resources with unknown transferSize gracefully', () => {
    const crossOriginData = {
      ...baseMockData,
      resources: [
        {
          name: 'https://cdn.thirdparty.com/library.js',
          type: 'js',
          transferSize: 'unknown',
          isUnknownSize: true,
          duration: 120,
        },
        {
          name: 'https://example.com/app.js',
          type: 'js',
          transferSize: 100000,
          duration: 50,
        },
      ],
    };

    const result = analyzePerformance(crossOriginData);
    expect(result.resourcesSummary.unknownSizeCount).toBe(1);
    expect(result.resourcesSummary.totalKnownTransferBytes).toBe(100000);
    expect(result.score).toBe(100);
  });

  it('calculates transparent score breakdown matching total deductions', () => {
    const degradedData = {
      timings: {
        ttfb: 1200, // -10 pts
        lcp: 4500,  // -15 pts
        cls: 0.3,   // -12 pts
      },
      resources: [
        { name: 'https://example.com/heavy.jpg', type: 'images', transferSize: 1200000 }, // -20 pts
      ],
    };

    const result = analyzePerformance(degradedData);
    const sumDeductions = result.breakdown.deductions.reduce((s, d) => s + d.points, 0);

    expect(result.breakdown.totalDeductions).toBe(sumDeductions);
    expect(result.score).toBe(100 - sumDeductions);
    expect(result.score).toBeLessThan(50);
  });
});
