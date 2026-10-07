import { describe, it, expect } from 'vitest';
import {
  isInspectableUrl,
  getRestrictedPageReason,
  normalizeDoctype,
  validateOverviewData,
  formatCount,
  extractOverviewFromDom,
} from '../src/utils/overview.js';

describe('isInspectableUrl', () => {
  it('allows valid http and https URLs', () => {
    expect(isInspectableUrl('https://example.com')).toBe(true);
    expect(isInspectableUrl('http://localhost:3000')).toBe(true);
    expect(isInspectableUrl('https://github.com/facebook/react')).toBe(true);
    expect(isInspectableUrl('https://sub.domain.org/path?query=1#hash')).toBe(true);
  });

  it('rejects browser internal chrome:// and edge:// schemes', () => {
    expect(isInspectableUrl('chrome://extensions')).toBe(false);
    expect(isInspectableUrl('chrome://settings')).toBe(false);
    expect(isInspectableUrl('edge://settings')).toBe(false);
    expect(isInspectableUrl('about:blank')).toBe(false);
    expect(isInspectableUrl('devtools://devtools/bundled/inspector.html')).toBe(false);
  });

  it('rejects chrome-extension:// internal pages', () => {
    expect(isInspectableUrl('chrome-extension://abcdefghijklmnop/popup.html')).toBe(false);
  });

  it('rejects Chrome Web Store pages due to browser security restrictions', () => {
    expect(isInspectableUrl('https://chromewebstore.google.com/detail/webxray')).toBe(false);
    expect(isInspectableUrl('https://chrome.google.com/webstore/category/extensions')).toBe(false);
  });

  it('rejects direct PDF URLs', () => {
    expect(isInspectableUrl('https://example.com/manual.pdf')).toBe(false);
  });

  it('rejects empty, null, and malformed URLs', () => {
    expect(isInspectableUrl('')).toBe(false);
    expect(isInspectableUrl(null)).toBe(false);
    expect(isInspectableUrl(undefined)).toBe(false);
    expect(isInspectableUrl('not-a-valid-url')).toBe(false);
  });
});

describe('getRestrictedPageReason', () => {
  it('gives explanatory message for chrome:// and browser settings', () => {
    const reason = getRestrictedPageReason('chrome://extensions');
    expect(reason).toContain('Browser internal settings');
  });

  it('gives explanatory message for Chrome Web Store', () => {
    const reason = getRestrictedPageReason('https://chromewebstore.google.com/detail/123');
    expect(reason).toContain('Chrome Web Store');
  });

  it('gives explanatory message for PDFs', () => {
    const reason = getRestrictedPageReason('https://example.com/test.pdf');
    expect(reason).toContain('PDF documents');
  });

  it('gives explanatory message for local file:// urls', () => {
    const reason = getRestrictedPageReason('file:///C:/Users/file.html');
    expect(reason).toContain('file://');
  });
});

describe('normalizeDoctype', () => {
  it('normalizes html to HTML5', () => {
    expect(normalizeDoctype('html')).toBe('HTML5');
    expect(normalizeDoctype('HTML')).toBe('HTML5');
  });

  it('handles missing or quirks doctype', () => {
    expect(normalizeDoctype(null)).toBe('None (Quirks Mode)');
    expect(normalizeDoctype(undefined)).toBe('None (Quirks Mode)');
    expect(normalizeDoctype('')).toBe('None (Quirks Mode)');
  });

  it('preserves other doctypes', () => {
    expect(normalizeDoctype('xhtml')).toBe('xhtml');
  });
});

describe('validateOverviewData', () => {
  const validData = {
    title: 'Test Page',
    url: 'https://example.com',
    domain: 'example.com',
    protocol: 'https:',
    htmlLang: 'en',
    viewportMeta: 'width=device-width, initial-scale=1',
    doctype: 'HTML5',
    counts: {
      domElements: 50,
      images: 5,
      links: 10,
      forms: 1,
      scripts: 4,
      stylesheets: 2,
    },
  };

  it('accepts well-formed overview data', () => {
    expect(validateOverviewData(validData)).toBe(true);
  });

  it('rejects null or non-object payloads', () => {
    expect(validateOverviewData(null)).toBe(false);
    expect(validateOverviewData(undefined)).toBe(false);
    expect(validateOverviewData('string')).toBe(false);
  });

  it('rejects payload with missing string metadata', () => {
    expect(validateOverviewData({ ...validData, title: 123 })).toBe(false);
    expect(validateOverviewData({ ...validData, domain: null })).toBe(false);
  });

  it('rejects payload with invalid or negative element counts', () => {
    expect(validateOverviewData({ ...validData, counts: { ...validData.counts, images: -1 } })).toBe(false);
    expect(validateOverviewData({ ...validData, counts: { ...validData.counts, links: NaN } })).toBe(false);
    expect(validateOverviewData({ ...validData, counts: null })).toBe(false);
  });
});

describe('formatCount', () => {
  it('formats large numbers with commas', () => {
    expect(formatCount(1234)).toBe('1,234');
    expect(formatCount(1000000)).toBe('1,000,000');
    expect(formatCount(0)).toBe('0');
  });

  it('safely handles NaN and non-numbers', () => {
    expect(formatCount(NaN)).toBe('0');
    expect(formatCount(null)).toBe('0');
  });
});

describe('extractOverviewFromDom', () => {
  it('extracts metrics accurately from mock DOM and window', () => {
    const mockElements = {
      '*': new Array(42),
      img: new Array(4),
      'a[href]': new Array(8),
      form: new Array(2),
      script: new Array(5),
      'link[rel="stylesheet"], style': new Array(3),
    };

    const mockDoc = {
      title: 'Mock Website',
      doctype: { name: 'html' },
      documentElement: {
        getAttribute: (attr) => (attr === 'lang' ? 'fr' : null),
        lang: 'fr',
      },
      querySelector: (selector) => {
        if (selector === 'meta[name="viewport"]') {
          return { getAttribute: (attr) => (attr === 'content' ? 'width=device-width' : null) };
        }
        return null;
      },
      querySelectorAll: (selector) => mockElements[selector] || [],
    };

    const mockWin = {
      location: {
        href: 'https://mocksite.org/page',
        hostname: 'mocksite.org',
        protocol: 'https:',
      },
    };

    const result = extractOverviewFromDom(mockDoc, mockWin);

    expect(result.title).toBe('Mock Website');
    expect(result.domain).toBe('mocksite.org');
    expect(result.protocol).toBe('https:');
    expect(result.htmlLang).toBe('fr');
    expect(result.viewportMeta).toBe('width=device-width');
    expect(result.doctype).toBe('HTML5');
    expect(result.counts.domElements).toBe(42);
    expect(result.counts.images).toBe(4);
    expect(result.counts.links).toBe(8);
    expect(result.counts.forms).toBe(2);
    expect(result.counts.scripts).toBe(5);
    expect(result.counts.stylesheets).toBe(3);
  });
});
