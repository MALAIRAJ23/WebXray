import { describe, it, expect } from 'vitest';
import { compareReports } from '../src/services/storage/compareReports.js';
import {
  escapeHtml,
  escapeCsv,
  exportReportAsJson,
  exportReportAsCsv,
  exportReportAsHtml,
} from '../src/services/storage/exportReport.js';
import { formatBytes } from '../src/services/storage/reportsStorage.js';

describe('compareReports engine', () => {
  const reportBefore = {
    id: 'report-1',
    timestamp: 1710000000000,
    url: 'https://example.com',
    domain: 'example.com',
    scores: {
      overall: 70,
      performance: 65,
      seo: 80,
      accessibility: 75,
      security: 60,
      bestPractices: 70,
    },
    issueCounts: {
      critical: 2,
      high: 3,
      medium: 4,
      low: 1,
      total: 10,
    },
    findingsSummary: [
      { id: 'f-resolved-1', title: 'Slow LCP', severity: 'high', category: 'Performance' },
      { id: 'f-resolved-2', title: 'Insecure HTTP', severity: 'critical', category: 'Security' },
      { id: 'f-unchanged-1', title: 'Missing Alt Attribute', severity: 'medium', category: 'SEO' },
    ],
  };

  const reportAfter = {
    id: 'report-2',
    timestamp: 1710086400000,
    url: 'https://example.com',
    domain: 'example.com',
    scores: {
      overall: 88,
      performance: 85,
      seo: 80,
      accessibility: 85,
      security: 95,
      bestPractices: 95,
    },
    issueCounts: {
      critical: 0,
      high: 1,
      medium: 3,
      low: 1,
      total: 5,
    },
    findingsSummary: [
      { id: 'f-unchanged-1', title: 'Missing Alt Attribute', severity: 'medium', category: 'SEO' },
      { id: 'f-new-1', title: 'High Memory Footprint', severity: 'high', category: 'Performance' },
    ],
  };

  it('calculates score deltas correctly between two audits', () => {
    const comparison = compareReports(reportBefore, reportAfter);

    expect(comparison.scoreDeltas.overall).toBe(18); // 88 - 70 = +18
    expect(comparison.scoreDeltas.performance).toBe(20); // 85 - 65 = +20
    expect(comparison.scoreDeltas.seo).toBe(0); // 80 - 80 = 0
    expect(comparison.scoreDeltas.accessibility).toBe(10); // 85 - 75 = +10
    expect(comparison.scoreDeltas.security).toBe(35); // 95 - 60 = +35
    expect(comparison.scoreDeltas.bestPractices).toBe(25); // 95 - 70 = +25
  });

  it('correctly identifies resolved findings (present in before, missing in after)', () => {
    const comparison = compareReports(reportBefore, reportAfter);
    const resolved = comparison.findingsComparison.resolved;

    expect(resolved).toHaveLength(2);
    expect(resolved.map((f) => f.id)).toContain('f-resolved-1');
    expect(resolved.map((f) => f.id)).toContain('f-resolved-2');
    expect(comparison.findingsComparison.counts.resolved).toBe(2);
  });

  it('correctly identifies newly introduced findings (present in after, missing in before)', () => {
    const comparison = compareReports(reportBefore, reportAfter);
    const newlyIntroduced = comparison.findingsComparison.newlyIntroduced;

    expect(newlyIntroduced).toHaveLength(1);
    expect(newlyIntroduced[0].id).toBe('f-new-1');
    expect(newlyIntroduced[0].title).toBe('High Memory Footprint');
    expect(comparison.findingsComparison.counts.newlyIntroduced).toBe(1);
  });

  it('correctly identifies unchanged findings (present in both before and after)', () => {
    const comparison = compareReports(reportBefore, reportAfter);
    const unchanged = comparison.findingsComparison.unchanged;

    expect(unchanged).toHaveLength(1);
    expect(unchanged[0].id).toBe('f-unchanged-1');
    expect(comparison.findingsComparison.counts.unchanged).toBe(1);
  });

  it('calculates issue count deltas', () => {
    const comparison = compareReports(reportBefore, reportAfter);
    expect(comparison.issueCountDeltas.total).toBe(-5); // 5 - 10 = -5
    expect(comparison.issueCountDeltas.critical).toBe(-2); // 0 - 2 = -2
  });

  it('throws an error if either report argument is missing', () => {
    expect(() => compareReports(null, reportAfter)).toThrow();
    expect(() => compareReports(reportBefore, null)).toThrow();
  });
});

describe('escapeHtml & XSS sanitization', () => {
  it('escapes dangerous HTML characters', () => {
    expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
      '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
    );
    expect(escapeHtml("Tom & Jerry's")).toBe('Tom &amp; Jerry&#39;s');
    expect(escapeHtml('"><img src=x onerror=alert(1)>')).toBe(
      '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;'
    );
  });

  it('handles null, undefined, and non-string values gracefully', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(123)).toBe('123');
    expect(escapeHtml(0)).toBe('0');
  });
});

describe('escapeCsv helper', () => {
  it('wraps values in quotes and escapes internal quotes', () => {
    expect(escapeCsv('Hello, World')).toBe('"Hello, World"');
    expect(escapeCsv('Say "hello"')).toBe('"Say ""hello"""');
    expect(escapeCsv(null)).toBe('""');
  });
});

describe('exportReportAsJson', () => {
  const sampleReport = {
    id: 'rep-1',
    url: 'https://example.com',
    domain: 'example.com',
    timestamp: 1710000000000,
    scores: { overall: 85 },
    findingsSummary: [{ id: '1', title: 'Issue 1' }],
  };

  it('produces valid parseable JSON identical to the source report', () => {
    const jsonStr = exportReportAsJson(sampleReport);
    expect(typeof jsonStr).toBe('string');
    const parsed = JSON.parse(jsonStr);
    expect(parsed.id).toBe('rep-1');
    expect(parsed.scores.overall).toBe(85);
    expect(parsed.findingsSummary).toHaveLength(1);
  });

  it('throws when report is missing', () => {
    expect(() => exportReportAsJson(null)).toThrow();
  });
});

describe('exportReportAsCsv', () => {
  const sampleReport = {
    id: 'rep-1',
    url: 'https://example.com',
    domain: 'example.com',
    findingsSummary: [
      {
        id: 'f-1',
        category: 'Security',
        severity: 'high',
        title: 'Missing "CSP" Header, Important',
        recommendation: 'Add CSP; see docs',
        evidence: 'Header was null',
      },
    ],
  };

  it('generates a CSV with headers and properly escaped cells', () => {
    const csv = exportReportAsCsv(sampleReport);
    const lines = csv.split('\r\n');

    expect(lines[0]).toBe('"Category","Severity","Issue ID","Title","Recommendation","Evidence"');
    expect(lines[1]).toContain('"Security"');
    expect(lines[1]).toContain('"high"');
    expect(lines[1]).toContain('"Missing ""CSP"" Header, Important"');
  });
});

describe('exportReportAsHtml (Self-Contained & Secure)', () => {
  const sampleReportWithXssPayload = {
    id: 'rep-xss',
    url: 'https://evil.com/<script>alert("url")</script>',
    domain: 'evil.com',
    title: 'Evil Page <img src=x onerror=alert(1)>',
    timestamp: 1710000000000,
    scores: {
      overall: 45,
      grade: 'F',
      rating: 'Critical Attention Needed',
      performance: 40,
      seo: 50,
      accessibility: 40,
      security: 30,
      bestPractices: 65,
    },
    issueCounts: {
      critical: 2,
      high: 1,
      medium: 0,
      low: 0,
      total: 3,
    },
    findingsSummary: [
      {
        id: 'f-xss',
        category: 'Security',
        severity: 'critical',
        title: 'Exploit <script>alert(document.cookie)</script>',
        evidence: 'Vulnerable param: "?q=<svg onload=alert(1)>"',
        recommendation: 'Sanitize input using <b>htmlspecialchars</b>',
      },
    ],
    technologies: [
      {
        name: 'React <script>bad()</script>',
        category: 'Framework',
        confidence: 'high',
      },
    ],
  };

  it('generates a self-contained HTML document', () => {
    const html = exportReportAsHtml(sampleReportWithXssPayload);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('</html>');
    expect(html).toContain('<style>');

    // Must be self-contained: NO external stylesheet or script references
    expect(html).not.toContain('<link rel="stylesheet"');
    expect(html).not.toContain('<script src=');
    expect(html).not.toContain('http://');
    expect(html).not.toContain('https://fonts.googleapis.com');
  });

  it('escapes ALL page-derived values to prevent HTML injection / XSS', () => {
    const html = exportReportAsHtml(sampleReportWithXssPayload);

    // Unescaped script tags must NOT exist in the body
    expect(html).not.toContain('<script>alert("url")</script>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>alert(document.cookie)</script>');
    expect(html).not.toContain('<svg onload=alert(1)>');
    expect(html).not.toContain('<b>htmlspecialchars</b>');
    expect(html).not.toContain('<script>bad()</script>');

    // Escaped entities MUST exist
    expect(html).toContain('&lt;script&gt;alert(&quot;url&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;script&gt;alert(document.cookie)&lt;/script&gt;');
    expect(html).toContain('&lt;svg onload=alert(1)&gt;');
    expect(html).toContain('&lt;b&gt;htmlspecialchars&lt;/b&gt;');
    expect(html).toContain('React &lt;script&gt;bad()&lt;/script&gt;');
  });

  it('renders overall score and category breakdown', () => {
    const html = exportReportAsHtml(sampleReportWithXssPayload);
    expect(html).toContain('45'); // overall score
    expect(html).toContain('Grade F');
    expect(html).toContain('Performance');
    expect(html).toContain('40');
    expect(html).toContain('Critical Attention Needed');
  });
});

describe('formatBytes helper in reportsStorage', () => {
  it('formats byte numbers into human readable units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(2048576)).toBe('2 MB');
    expect(formatBytes(-50)).toBe('0 B');
    expect(formatBytes(null)).toBe('0 B');
  });
});
