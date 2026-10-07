import { describe, it, expect } from 'vitest';
import { analyzeSecurity } from '../src/analyzers/security/index.js';

describe('analyzeSecurity pure analyzer', () => {
  it('conforms to AGENT_RULES.md (Rule 4) finding contract and severities', () => {
    const mockData = {
      isHttps: true,
      protocol: 'https:',
      mixedContent: { detected: false, count: 0, samples: [] },
      targetBlankLinks: { total: 2, vulnerableCount: 0, samples: [] },
      inlineScripts: { count: 0 },
      cookies: { clientAccessibleCount: 1, sampleNames: ['theme'], note: 'Note' },
      thirdPartyResources: { total: 10, thirdPartyTotal: 5, byCompany: { Google: 5 }, topDomains: [] },
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

    const result = analyzeSecurity(mockData);

    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('findings');
    expect(result).toHaveProperty('breakdown');
    expect(result).toHaveProperty('headersSummary');
    expect(result).toHaveProperty('thirdParty');
    expect(result).toHaveProperty('cookies');

    expect(result.score).toBe(100);
    expect(result.breakdown.totalDeductions).toBe(0);

    const allowedSeverities = ['critical', 'high', 'medium', 'low', 'passed'];
    result.findings.forEach((finding) => {
      expect(finding).toHaveProperty('id');
      expect(finding).toHaveProperty('title');
      expect(finding).toHaveProperty('severity');
      expect(allowedSeverities).toContain(finding.severity);
      expect(finding).toHaveProperty('evidence');
      expect(typeof finding.evidence).toBe('string');
      expect(finding).toHaveProperty('whyItMatters');
      expect(finding).toHaveProperty('recommendation');
    });
  });

  it('flags unencrypted HTTP protocol as critical (-25 pts)', () => {
    const mockData = {
      isHttps: false,
      protocol: 'http:',
      headers: { status: 'unverified', data: {} },
    };

    const result = analyzeSecurity(mockData);
    const httpsFinding = result.findings.find((f) => f.id === 'sec-https-missing');

    expect(httpsFinding).toBeDefined();
    expect(httpsFinding.severity).toBe('critical');
    expect(result.score).toBeLessThanOrEqual(75);
    expect(result.breakdown.deductions.some((d) => d.id === 'sec-https-missing' && d.points === 25)).toBe(true);
  });

  it('detects mixed content on HTTPS pages as high severity (-15 pts)', () => {
    const mockData = {
      isHttps: true,
      protocol: 'https:',
      mixedContent: {
        detected: true,
        count: 2,
        samples: [{ tag: 'img', url: 'http://insecure.example.com/logo.png' }],
      },
      headers: { status: 'unverified', data: {} },
    };

    const result = analyzeSecurity(mockData);
    const mixedFinding = result.findings.find((f) => f.id === 'sec-mixed-content');

    expect(mixedFinding).toBeDefined();
    expect(mixedFinding.severity).toBe('high');
    expect(result.breakdown.deductions.some((d) => d.id === 'sec-mixed-content' && d.points === 15)).toBe(true);
  });

  it('handles unverified headers gracefully without penalizing score', () => {
    const mockData = {
      isHttps: true,
      protocol: 'https:',
      mixedContent: { detected: false, count: 0, samples: [] },
      targetBlankLinks: { total: 0, vulnerableCount: 0, samples: [] },
      inlineScripts: { count: 0 },
      thirdPartyResources: { total: 5, thirdPartyTotal: 2, byCompany: {}, topDomains: [] },
      headers: { status: 'unverified', data: {} },
    };

    const result = analyzeSecurity(mockData);

    const unverifiedFinding = result.findings.find((f) => f.id === 'sec-headers-unverified');
    expect(unverifiedFinding).toBeDefined();
    expect(unverifiedFinding.severity).toBe('low');

    // No deductions should be levied for unverified headers
    expect(result.breakdown.deductions.some((d) => d.id.startsWith('sec-headers-'))).toBe(false);
    expect(result.score).toBe(100);

    // Headers checklist shows "unverified"
    result.headersSummary.forEach((header) => {
      expect(header.status).toBe('unverified');
    });
  });

  it('evaluates missing headers when verified and applies transparent deductions', () => {
    const mockData = {
      isHttps: true,
      protocol: 'https:',
      mixedContent: { detected: false, count: 0, samples: [] },
      targetBlankLinks: { total: 0, vulnerableCount: 0, samples: [] },
      inlineScripts: { count: 0 },
      thirdPartyResources: { total: 5, thirdPartyTotal: 2, byCompany: {}, topDomains: [] },
      headers: {
        status: 'verified',
        data: {
          csp: null, // -12
          hsts: null, // -8
          xContentType: null, // -6
          xFrameOptions: null, // -6
          referrerPolicy: null, // -4
          permissionsPolicy: null, // -4
        },
      },
    };

    const result = analyzeSecurity(mockData);

    expect(result.findings.some((f) => f.id === 'sec-csp-missing' && f.severity === 'high')).toBe(true);
    expect(result.findings.some((f) => f.id === 'sec-hsts-missing' && f.severity === 'medium')).toBe(true);
    expect(result.findings.some((f) => f.id === 'sec-nosniff-missing' && f.severity === 'medium')).toBe(true);
    expect(result.findings.some((f) => f.id === 'sec-frame-missing' && f.severity === 'medium')).toBe(true);
    expect(result.findings.some((f) => f.id === 'sec-referrer-missing' && f.severity === 'low')).toBe(true);
    expect(result.findings.some((f) => f.id === 'sec-permissions-missing' && f.severity === 'low')).toBe(true);

    // Total deductions = 12 + 8 + 6 + 6 + 4 + 4 = 40
    expect(result.breakdown.totalDeductions).toBe(40);
    expect(result.score).toBe(60);
  });

  it('accepts CSP frame-ancestors as valid clickjacking protection', () => {
    const mockData = {
      isHttps: true,
      headers: {
        status: 'verified',
        data: {
          csp: "default-src 'self'; frame-ancestors 'self'",
          xFrameOptions: null,
        },
      },
    };

    const result = analyzeSecurity(mockData);
    const frameFinding = result.findings.find((f) => f.id === 'sec-frame-passed');
    expect(frameFinding).toBeDefined();
    expect(frameFinding.severity).toBe('passed');
  });

  it('flags target="_blank" links missing rel="noopener" for reverse tabnabbing (-10 pts)', () => {
    const mockData = {
      isHttps: true,
      targetBlankLinks: {
        total: 5,
        vulnerableCount: 3,
        samples: [
          { href: 'https://external.com', text: 'External Page' },
        ],
      },
      headers: { status: 'unverified', data: {} },
    };

    const result = analyzeSecurity(mockData);
    const tabnabbingFinding = result.findings.find((f) => f.id === 'sec-tabnabbing-vulnerable');

    expect(tabnabbingFinding).toBeDefined();
    expect(tabnabbingFinding.severity).toBe('medium');
    expect(result.breakdown.deductions.some((d) => d.id === 'sec-tabnabbing-vulnerable' && d.points === 10)).toBe(true);
  });

  it('flags high third-party dependency surface (> 25 resources)', () => {
    const mockData = {
      isHttps: true,
      thirdPartyResources: {
        total: 50,
        thirdPartyTotal: 30,
        byCompany: { Google: 20, Cloudflare: 10 },
        topDomains: [{ domain: 'analytics.google.com', count: 20 }],
      },
      headers: { status: 'unverified', data: {} },
    };

    const result = analyzeSecurity(mockData);
    const thirdPartyFinding = result.findings.find((f) => f.id === 'sec-third-party-high');

    expect(thirdPartyFinding).toBeDefined();
    expect(thirdPartyFinding.severity).toBe('medium');
    expect(result.breakdown.deductions.some((d) => d.id === 'sec-third-party-high' && d.points === 10)).toBe(true);
  });

  it('emits informational CSP-readiness note for inline scripts with 0 penalty', () => {
    const mockData = {
      isHttps: true,
      inlineScripts: { count: 4 },
      headers: { status: 'unverified', data: {} },
    };

    const result = analyzeSecurity(mockData);
    const inlineFinding = result.findings.find((f) => f.id === 'sec-inline-scripts-warning');

    expect(inlineFinding).toBeDefined();
    expect(inlineFinding.severity).toBe('low');
    // Ensure no deduction penalty
    expect(result.breakdown.deductions.some((d) => d.id === 'sec-inline-scripts-warning')).toBe(false);
  });
});
