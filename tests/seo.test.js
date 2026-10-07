import { describe, it, expect } from 'vitest';
import { analyzeSeo } from '../src/analyzers/seo/index.js';

describe('analyzeSeo pure analyzer', () => {
  const baseMockData = {
    title: 'WebXray — Advanced Website Diagnostics Tool', // 44 chars (30–60 optimal)
    metaDescription: 'Inspect performance, technical SEO, accessibility, and security in a single unified developer dashboard for faster web optimization.', // 134 chars (70–160 optimal)
    canonical: 'https://example.com/webxray',
    robotsMeta: 'index, follow',
    htmlLang: 'en',
    headings: [
      { id: 'h1', level: 1, tag: 'H1', text: 'WebXray Diagnostics' },
      { id: 'h2-1', level: 2, tag: 'H2', text: 'Performance Audits' },
      { id: 'h3-1', level: 3, tag: 'H3', text: 'Core Web Vitals' },
      { id: 'h2-2', level: 2, tag: 'H2', text: 'SEO Audits' },
    ],
    links: {
      total: 10,
      internal: 8,
      external: 2,
      emptyHref: 0,
      nonDescriptive: [],
    },
    images: {
      total: 4,
      missingAlt: 0,
      emptyAlt: 0,
      missingDimensions: 0,
      sampleMissingAlt: [],
    },
    openGraph: {
      title: 'WebXray — Advanced Website Diagnostics',
      description: 'Unified developer tool for performance, SEO, and security audits.',
      image: 'https://example.com/og-preview.png',
      url: 'https://example.com',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'WebXray Diagnostics',
    },
    url: 'https://example.com',
    domain: 'example.com',
  };

  it('evaluates an optimal page with a 100 score and all passed findings', () => {
    const result = analyzeSeo(baseMockData);

    expect(result.score).toBe(100);
    expect(result.breakdown.totalDeductions).toBe(0);
    expect(result.findings.every((f) => f.severity === 'passed')).toBe(true);

    // Rule 4 Contract Verification
    result.findings.forEach((finding) => {
      expect(finding).toHaveProperty('id');
      expect(finding).toHaveProperty('title');
      expect(finding).toHaveProperty('severity');
      expect(finding).toHaveProperty('evidence');
      expect(finding).toHaveProperty('whyItMatters');
      expect(finding).toHaveProperty('recommendation');
    });
  });

  describe('Title Length Checks', () => {
    it('flags missing title as critical', () => {
      const result = analyzeSeo({ ...baseMockData, title: '' });
      const finding = result.findings.find((f) => f.id === 'seo-title-missing');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('critical');
      expect(result.score).toBeLessThanOrEqual(80);
    });

    it('flags title under 30 characters as medium', () => {
      const result = analyzeSeo({ ...baseMockData, title: 'My Site' });
      const finding = result.findings.find((f) => f.id === 'seo-title-too-short');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('medium');
    });

    it('flags title over 60 characters as low', () => {
      const result = analyzeSeo({
        ...baseMockData,
        title: 'This is an excessively long title tag that extends far beyond the sixty character limit in search engines',
      });
      const finding = result.findings.find((f) => f.id === 'seo-title-too-long');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('low');
    });
  });

  describe('Meta Description Checks', () => {
    it('flags missing meta description as high', () => {
      const result = analyzeSeo({ ...baseMockData, metaDescription: '' });
      const finding = result.findings.find((f) => f.id === 'seo-desc-missing');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('high');
    });

    it('flags short description (< 70 chars) as medium', () => {
      const result = analyzeSeo({ ...baseMockData, metaDescription: 'Short description snippet.' });
      const finding = result.findings.find((f) => f.id === 'seo-desc-too-short');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('medium');
    });

    it('flags long description (> 160 chars) as low', () => {
      const longDesc = 'A'.repeat(175);
      const result = analyzeSeo({ ...baseMockData, metaDescription: longDesc });
      const finding = result.findings.find((f) => f.id === 'seo-desc-too-long');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('low');
    });
  });

  describe('H1 & Heading Hierarchy Checks', () => {
    it('flags missing H1 heading as high', () => {
      const result = analyzeSeo({
        ...baseMockData,
        headings: [{ id: 'h2', level: 2, tag: 'H2', text: 'Subtopic' }],
      });
      const finding = result.findings.find((f) => f.id === 'seo-h1-missing');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('high');
    });

    it('flags multiple H1 headings as medium', () => {
      const result = analyzeSeo({
        ...baseMockData,
        headings: [
          { id: 'h1-1', level: 1, tag: 'H1', text: 'Main Topic' },
          { id: 'h1-2', level: 1, tag: 'H1', text: 'Another Main Heading' },
        ],
      });
      const finding = result.findings.find((f) => f.id === 'seo-h1-multiple');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('medium');
    });

    it('detects and flags heading hierarchy skips (H2 -> H4)', () => {
      const result = analyzeSeo({
        ...baseMockData,
        headings: [
          { id: 'h1', level: 1, tag: 'H1', text: 'Title' },
          { id: 'h2', level: 2, tag: 'H2', text: 'Section' },
          { id: 'h4', level: 4, tag: 'H4', text: 'Jumped to Subsection 4' }, // Skip H3
        ],
      });
      const finding = result.findings.find((f) => f.id === 'seo-heading-skips');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('medium');
      expect(finding.evidence).toContain('H2 jumped directly to H4');
    });
  });

  describe('Canonical and Robots Directives', () => {
    it('flags missing canonical tag as medium', () => {
      const result = analyzeSeo({ ...baseMockData, canonical: '' });
      const finding = result.findings.find((f) => f.id === 'seo-canonical-missing');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('medium');
    });

    it('flags noindex in robots meta as high severity warning', () => {
      const result = analyzeSeo({ ...baseMockData, robotsMeta: 'noindex, nofollow' });
      const finding = result.findings.find((f) => f.id === 'seo-robots-noindex');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('high');
      expect(finding.evidence).toContain('noindex');
    });
  });

  describe('Social Tags, Images, and Links', () => {
    it('flags missing social share metadata as medium', () => {
      const result = analyzeSeo({
        ...baseMockData,
        openGraph: {},
        twitter: {},
      });
      const finding = result.findings.find((f) => f.id === 'seo-social-missing');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('medium');
    });

    it('flags images without alt text as high', () => {
      const result = analyzeSeo({
        ...baseMockData,
        images: {
          total: 5,
          missingAlt: 2,
          emptyAlt: 0,
          missingDimensions: 1,
          sampleMissingAlt: ['hero.jpg', 'banner.png'],
        },
      });
      const finding = result.findings.find((f) => f.id === 'seo-images-missing-alt');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('high');
      expect(finding.evidence).toContain('hero.jpg, banner.png');
    });

    it('flags non-descriptive link text as medium', () => {
      const result = analyzeSeo({
        ...baseMockData,
        links: {
          total: 12,
          internal: 10,
          external: 2,
          emptyHref: 0,
          nonDescriptive: [{ text: 'click here', href: '/link' }],
        },
      });
      const finding = result.findings.find((f) => f.id === 'seo-links-non-descriptive');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('medium');
      expect(finding.evidence).toContain('click here');
    });

    it('flags missing HTML lang attribute as medium', () => {
      const result = analyzeSeo({ ...baseMockData, htmlLang: '' });
      const finding = result.findings.find((f) => f.id === 'seo-lang-missing');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('medium');
    });
  });

  describe('Score & Deduction Transparency', () => {
    it('calculates total deductions correctly against baseScore', () => {
      const degraded = {
        ...baseMockData,
        title: '', // -20
        metaDescription: '', // -14
        canonical: '', // -8
      };
      const result = analyzeSeo(degraded);
      const sum = result.breakdown.deductions.reduce((a, b) => a + b.points, 0);

      expect(result.breakdown.totalDeductions).toBe(sum);
      expect(result.score).toBe(100 - sum);
    });
  });
});
