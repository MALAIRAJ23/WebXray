/**
 * WebXray - Performance Analyzer
 * Pure function adhering to AGENT_RULES.md (Rule 4)
 * Traces: Score -> Rules -> Evidence -> Recommendation
 * Contract: analyzePerformance(data) -> { score, results, findings, breakdown, metrics, resourcesSummary }
 * Severities: 'critical' | 'high' | 'medium' | 'low' | 'passed'
 */

import { PERFORMANCE_RULES_BY_ID } from '../rules/performance.js';

/**
 * Format bytes into human-readable string
 */
export function formatBytes(bytes) {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Pure function analyzing collected performance data
 * @param {object} rawData - collected performance metrics from performanceCollector
 * @returns {object}
 */
export function analyzePerformance(rawData) {
  const data = rawData || {};
  const timings = data.timings || {};
  const resources = Array.isArray(data.resources) ? data.resources : [];

  const results = [];
  const findings = [];
  const deductions = [];

  // Helper to record a rule evaluation result
  const recordResult = ({
    ruleId,
    findingId,
    status,
    pointsEarned,
    evidence = [],
    observed,
    expected,
    severityOverride,
  }) => {
    const rule = PERFORMANCE_RULES_BY_ID[ruleId];
    if (!rule) throw new Error(`Unknown performance rule: ${ruleId}`);

    const pointsPossible = rule.weight;
    const isApplicable = status !== 'not_applicable' && status !== 'unverified';
    const finalEarned = isApplicable ? Math.max(0, Math.min(pointsPossible, pointsEarned)) : 0;

    results.push({
      ruleId,
      status,
      pointsPossible,
      pointsEarned: finalEarned,
      evidence,
      observed: String(observed),
      expected: String(expected || 'Within performance budget'),
    });

    const isPassed = status === 'passed';
    const severity = isPassed ? 'passed' : (severityOverride || (status === 'warning' ? 'medium' : rule.severityOnFail));

    findings.push({
      id: findingId || ruleId,
      ruleId,
      title: rule.title,
      severity,
      evidence: evidence.join('; ') || String(observed),
      whyItMatters: rule.whyItMatters,
      recommendation: rule.recommendation,
    });

    if (isApplicable && pointsPossible > finalEarned) {
      deductions.push({
        id: findingId || ruleId,
        ruleId,
        reason: rule.title,
        points: pointsPossible - finalEarned,
      });
    }
  };

  // 1. Largest Contentful Paint (LCP)
  const lcp = timings.lcp;
  const lcpRule = PERFORMANCE_RULES_BY_ID['perf-lcp'];
  if (typeof lcp === 'number') {
    const lcpSec = (lcp / 1000).toFixed(2);
    if (lcp > lcpRule.threshold.needsImprovement) {
      recordResult({
        ruleId: 'perf-lcp',
        findingId: 'perf-lcp-slow',
        status: 'failed',
        severityOverride: 'high',
        pointsEarned: 0,
        evidence: [`LCP occurred at ${lcpSec}s (Google benchmark: ≤ 2.5s)`],
        observed: `${lcpSec}s`,
        expected: '≤ 2.50s',
      });
    } else if (lcp > lcpRule.threshold.good) {
      recordResult({
        ruleId: 'perf-lcp',
        findingId: 'perf-lcp-needs-improvement',
        status: 'warning',
        severityOverride: 'medium',
        pointsEarned: Math.round(lcpRule.weight * 0.5),
        evidence: [
          `LCP occurred at ${lcpSec}s (Target: ≤ 2.5s)`,
          'Partial credit (50%): LCP is acceptable but needs improvement',
        ],
        observed: `${lcpSec}s`,
        expected: '≤ 2.50s',
      });
    } else {
      recordResult({
        ruleId: 'perf-lcp',
        findingId: 'perf-lcp-good',
        status: 'passed',
        pointsEarned: lcpRule.weight,
        evidence: [`LCP rendered rapidly at ${lcpSec}s (Target: ≤ 2.5s)`],
        observed: `${lcpSec}s`,
        expected: '≤ 2.50s',
      });
    }
  } else {
    recordResult({
      ruleId: 'perf-lcp',
      findingId: 'perf-lcp-unverified',
      status: 'unverified',
      pointsEarned: 0,
      evidence: ['LCP timing could not be measured on this document'],
      observed: 'Not measured',
      expected: '≤ 2.50s',
    });
  }

  // 2. Cumulative Layout Shift (CLS)
  const cls = timings.cls;
  const clsRule = PERFORMANCE_RULES_BY_ID['perf-cls'];
  if (typeof cls === 'number') {
    const clsVal = cls.toFixed(3);
    if (cls > clsRule.threshold.needsImprovement) {
      recordResult({
        ruleId: 'perf-cls',
        findingId: 'perf-cls-high',
        status: 'failed',
        severityOverride: 'high',
        pointsEarned: 0,
        evidence: [`CLS score of ${clsVal} (Good threshold: ≤ 0.1)`],
        observed: clsVal,
        expected: '≤ 0.100',
      });
    } else if (cls > clsRule.threshold.good) {
      recordResult({
        ruleId: 'perf-cls',
        findingId: 'perf-cls-moderate',
        status: 'warning',
        severityOverride: 'medium',
        pointsEarned: Math.round(clsRule.weight * 0.5),
        evidence: [
          `CLS score of ${clsVal} (Target: ≤ 0.1)`,
          'Partial credit (50%): Layout shifts are moderate',
        ],
        observed: clsVal,
        expected: '≤ 0.100',
      });
    } else {
      recordResult({
        ruleId: 'perf-cls',
        findingId: 'perf-cls-passed',
        status: 'passed',
        pointsEarned: clsRule.weight,
        evidence: [`CLS score of ${clsVal} (Target: ≤ 0.1)`],
        observed: clsVal,
        expected: '≤ 0.100',
      });
    }
  } else {
    recordResult({
      ruleId: 'perf-cls',
      findingId: 'perf-cls-unverified',
      status: 'unverified',
      pointsEarned: 0,
      evidence: ['CLS metric could not be recorded'],
      observed: 'Not measured',
      expected: '≤ 0.100',
    });
  }

  // 3. Time to First Byte (TTFB)
  const ttfb = timings.ttfb;
  const ttfbRule = PERFORMANCE_RULES_BY_ID['perf-ttfb'];
  if (typeof ttfb === 'number') {
    if (ttfb > ttfbRule.threshold.needsImprovement) {
      recordResult({
        ruleId: 'perf-ttfb',
        findingId: 'perf-ttfb-slow',
        status: 'failed',
        severityOverride: 'high',
        pointsEarned: 0,
        evidence: [`Initial server response was ${ttfb}ms (Target: ≤ 800ms)`],
        observed: `${ttfb} ms`,
        expected: '≤ 800 ms',
      });
    } else if (ttfb > ttfbRule.threshold.good) {
      recordResult({
        ruleId: 'perf-ttfb',
        findingId: 'perf-ttfb-moderate',
        status: 'warning',
        severityOverride: 'medium',
        pointsEarned: Math.round(ttfbRule.weight * 0.5),
        evidence: [
          `Initial server response was ${ttfb}ms (Target: ≤ 800ms)`,
          'Partial credit (50%): Server response is acceptable but slow',
        ],
        observed: `${ttfb} ms`,
        expected: '≤ 800 ms',
      });
    } else {
      recordResult({
        ruleId: 'perf-ttfb',
        findingId: 'perf-ttfb-passed',
        status: 'passed',
        pointsEarned: ttfbRule.weight,
        evidence: [`Initial server response arrived in ${ttfb}ms`],
        observed: `${ttfb} ms`,
        expected: '≤ 800 ms',
      });
    }
  } else {
    recordResult({
      ruleId: 'perf-ttfb',
      findingId: 'perf-ttfb-unverified',
      status: 'unverified',
      pointsEarned: 0,
      evidence: ['TTFB timing was unavailable'],
      observed: 'Not measured',
      expected: '≤ 800 ms',
    });
  }

  // Aggregate resource statistics
  const byType = {
    js: { count: 0, bytes: 0 },
    css: { count: 0, bytes: 0 },
    images: { count: 0, bytes: 0 },
    fonts: { count: 0, bytes: 0 },
    media: { count: 0, bytes: 0 },
    fetch: { count: 0, bytes: 0 },
    other: { count: 0, bytes: 0 },
  };

  let totalKnownTransferBytes = 0;
  let unknownSizeCount = 0;
  const criticalImages = [];
  const highImages = [];
  const blockingResources = [];

  for (const res of resources) {
    const type = byType[res.type] ? res.type : 'other';
    byType[type].count += 1;

    if (typeof res.transferSize === 'number') {
      byType[type].bytes += res.transferSize;
      totalKnownTransferBytes += res.transferSize;
    } else if (res.transferSize === 'unknown' || res.isUnknownSize) {
      unknownSizeCount += 1;
    }

    if (res.type === 'images' && typeof res.transferSize === 'number') {
      const fileName = res.name.split('/').pop().split('?')[0] || res.name;
      if (res.transferSize > 1_000_000) {
        criticalImages.push(`${fileName} (${formatBytes(res.transferSize)})`);
      } else if (res.transferSize > 500_000) {
        highImages.push(`${fileName} (${formatBytes(res.transferSize)})`);
      }
    }

    if (res.renderBlockingStatus === 'blocking') {
      const fileName = res.name.split('/').pop().split('?')[0] || res.name;
      blockingResources.push(`${fileName} (${res.initiatorType})`);
    }
  }

  // 4. Large Image Audit
  const imgRule = PERFORMANCE_RULES_BY_ID['perf-images'];
  if (criticalImages.length > 0) {
    recordResult({
      ruleId: 'perf-images',
      findingId: 'perf-images-critical',
      status: 'failed',
      severityOverride: 'critical',
      pointsEarned: 0,
      evidence: [
        `${criticalImages.length} image(s) exceed 1 MB: ${criticalImages.slice(0, 3).join(', ')}${criticalImages.length > 3 ? '...' : ''}`,
      ],
      observed: `${criticalImages.length} oversized image(s) > 1 MB`,
      expected: 'All images ≤ 500 KB',
    });
  } else if (highImages.length > 0) {
    recordResult({
      ruleId: 'perf-images',
      findingId: 'perf-images-high',
      status: 'warning',
      severityOverride: 'high',
      pointsEarned: Math.round(imgRule.weight * 0.5),
      evidence: [
        `${highImages.length} image(s) exceed 500 KB: ${highImages.slice(0, 3).join(', ')}${highImages.length > 3 ? '...' : ''}`,
        'Partial credit (50%): No images exceed 1 MB, but some exceed 500 KB',
      ],
      observed: `${highImages.length} image(s) > 500 KB`,
      expected: 'All images ≤ 500 KB',
    });
  } else {
    recordResult({
      ruleId: 'perf-images',
      findingId: 'perf-images-passed',
      status: 'passed',
      pointsEarned: imgRule.weight,
      evidence: [
        byType.images.count > 0
          ? `All ${byType.images.count} loaded image(s) are under 500 KB`
          : 'No heavy image assets loaded on this page',
      ],
      observed: 'All images ≤ 500 KB',
      expected: 'All images ≤ 500 KB',
    });
  }

  // 5. JavaScript Request Count Audit
  const jsCount = byType.js.count;
  const jsRule = PERFORMANCE_RULES_BY_ID['perf-js-count'];
  if (jsCount > jsRule.threshold.criticalMax) {
    recordResult({
      ruleId: 'perf-js-count',
      findingId: 'perf-js-critical-count',
      status: 'failed',
      severityOverride: 'high',
      pointsEarned: 0,
      evidence: [`${jsCount} separate JavaScript files requested (threshold: 15)`],
      observed: `${jsCount} JS requests`,
      expected: '≤ 15 requests',
    });
  } else if (jsCount > jsRule.threshold.max) {
    recordResult({
      ruleId: 'perf-js-count',
      findingId: 'perf-js-high-count',
      status: 'warning',
      severityOverride: 'medium',
      pointsEarned: Math.round(jsRule.weight * 0.5),
      evidence: [
        `${jsCount} separate JavaScript files requested (recommended: ≤ 15)`,
        'Partial credit (50%): Moderately elevated script requests',
      ],
      observed: `${jsCount} JS requests`,
      expected: '≤ 15 requests',
    });
  } else {
    recordResult({
      ruleId: 'perf-js-count',
      findingId: 'perf-js-count-passed',
      status: 'passed',
      pointsEarned: jsRule.weight,
      evidence: [`${jsCount} JavaScript file(s) loaded (within ≤ 15 threshold)`],
      observed: `${jsCount} JS requests`,
      expected: '≤ 15 requests',
    });
  }

  // 6. Total Transfer Weight
  const weightRule = PERFORMANCE_RULES_BY_ID['perf-total-weight'];
  const formattedWeight = formatBytes(totalKnownTransferBytes);
  if (totalKnownTransferBytes > weightRule.threshold.criticalMax) {
    recordResult({
      ruleId: 'perf-total-weight',
      findingId: 'perf-total-weight-critical',
      status: 'failed',
      severityOverride: 'high',
      pointsEarned: 0,
      evidence: [`Total transferred resources: ${formattedWeight} across ${resources.length} requests`],
      observed: formattedWeight,
      expected: '≤ 3.0 MB',
    });
  } else if (totalKnownTransferBytes > weightRule.threshold.max) {
    recordResult({
      ruleId: 'perf-total-weight',
      findingId: 'perf-total-weight-medium',
      status: 'warning',
      severityOverride: 'medium',
      pointsEarned: Math.round(weightRule.weight * 0.5),
      evidence: [
        `Total transferred resources: ${formattedWeight} across ${resources.length} requests`,
        'Partial credit (50%): Page weight is between 3 MB and 5 MB',
      ],
      observed: formattedWeight,
      expected: '≤ 3.0 MB',
    });
  } else {
    recordResult({
      ruleId: 'perf-total-weight',
      findingId: 'perf-total-weight-passed',
      status: 'passed',
      pointsEarned: weightRule.weight,
      evidence: [`Total transferred resources: ${formattedWeight}`],
      observed: formattedWeight,
      expected: '≤ 3.0 MB',
    });
  }

  // 7. Render-Blocking Resources
  const renderRule = PERFORMANCE_RULES_BY_ID['perf-render-blocking'];
  if (blockingResources.length > 0) {
    recordResult({
      ruleId: 'perf-render-blocking',
      findingId: 'perf-render-blocking',
      status: 'warning',
      severityOverride: 'medium',
      pointsEarned: 0,
      evidence: [
        `${blockingResources.length} render-blocking asset(s): ${blockingResources.slice(0, 3).join(', ')}${blockingResources.length > 3 ? '...' : ''}`,
      ],
      observed: `${blockingResources.length} render-blocking asset(s)`,
      expected: '0 render-blocking assets',
    });
  } else {
    recordResult({
      ruleId: 'perf-render-blocking',
      findingId: 'perf-render-blocking-passed',
      status: 'passed',
      pointsEarned: renderRule.weight,
      evidence: ['All resources loaded asynchronously or without blocking flags'],
      observed: '0 render-blocking assets',
      expected: '0 render-blocking assets',
    });
  }

  // Calculate standard score model
  const applicable = results.filter((r) => r.status !== 'not_applicable' && r.status !== 'unverified');
  const totalPossible = applicable.reduce((acc, r) => acc + r.pointsPossible, 0);
  const totalEarned = applicable.reduce((acc, r) => acc + r.pointsEarned, 0);
  const score = totalPossible > 0 ? Math.max(0, Math.min(100, Math.round((totalEarned / totalPossible) * 100))) : 100;
  const totalDeductions = deductions.reduce((acc, d) => acc + d.points, 0);

  // Top 10 largest resources sorted by size
  const topLargest = [...resources]
    .filter((r) => typeof r.transferSize === 'number')
    .sort((a, b) => b.transferSize - a.transferSize)
    .slice(0, 10);

  return {
    score,
    results,
    findings,
    breakdown: {
      baseScore: 100,
      totalDeductions,
      deductions,
    },
    metrics: {
      ttfb,
      domContentLoaded: timings.domContentLoaded || null,
      loadEvent: timings.loadEvent || null,
      fcp: timings.fcp || null,
      lcp,
      cls: typeof cls === 'number' ? cls : null,
    },
    resourcesSummary: {
      totalCount: resources.length,
      totalKnownTransferBytes,
      unknownSizeCount,
      byType,
      topLargest,
    },
  };
}
