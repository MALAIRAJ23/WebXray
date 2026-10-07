import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { analyzeAccessibility } from '../src/analyzers/accessibility/index.js';

describe('analyzeAccessibility with jsdom simulated DOM', () => {
  it('passes all checks for a fully accessible DOM structure', () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html lang="en">
        <head><title>Accessible Site</title></head>
        <body>
          <header role="banner"><nav aria-label="Main"><a href="/">Home</a></nav></header>
          <main>
            <h1>Main Topic</h1>
            <h2>Sub Topic</h2>
            <img src="banner.jpg" alt="Company banner" />
            <form>
              <label for="username">Username</label>
              <input id="username" type="text" />
              <button type="submit">Submit Form</button>
            </form>
          </main>
          <footer role="contentinfo"><p>Copyright 2026</p></footer>
        </body>
      </html>
    `);

    const doc = dom.window.document;

    // Simulate collection from the compliant DOM
    const mockData = {
      imagesCount: doc.querySelectorAll('img').length,
      imagesWithoutAlt: [],
      formControlsCount: 1,
      formControlsWithoutLabel: [],
      buttonsCount: 1,
      buttonsWithoutName: [],
      linksCount: 1,
      linksWithoutName: [],
      headings: [
        { level: 1, tag: 'H1', text: 'Main Topic', selector: 'h1' },
        { level: 2, tag: 'H2', text: 'Sub Topic', selector: 'h2' },
      ],
      htmlLang: doc.documentElement.lang,
      landmarks: {
        main: 1,
        nav: 1,
        header: 1,
        footer: 1,
      },
      unknownRoles: [],
      ariaHiddenFocusable: [],
      duplicateIds: [],
      positiveTabindices: [],
    };

    const result = analyzeAccessibility(mockData);

    expect(result.score).toBe(100);
    expect(result.breakdown.totalDeductions).toBe(0);
    expect(result.findings.every((f) => f.severity === 'passed')).toBe(true);

    // Rule 4 contract check
    result.findings.forEach((finding) => {
      expect(finding).toHaveProperty('id');
      expect(finding).toHaveProperty('title');
      expect(finding).toHaveProperty('severity');
      expect(finding).toHaveProperty('evidence');
      expect(finding).toHaveProperty('whyItMatters');
      expect(finding).toHaveProperty('recommendation');
    });
  });

  it('detects unlabeled form controls and flags critical with selectors', () => {
    const dom = new JSDOM(`
      <form>
        <input id="unlabeled-input" name="email" type="email" />
        <textarea id="unlabeled-text"></textarea>
      </form>
    `);
    const doc = dom.window.document;
    const inputs = Array.from(doc.querySelectorAll('input, textarea'));

    const mockData = {
      formControlsCount: inputs.length,
      formControlsWithoutLabel: [
        { selector: '#unlabeled-input', tag: 'input', type: 'email', name: 'email' },
        { selector: '#unlabeled-text', tag: 'textarea' },
      ],
      htmlLang: 'en',
      landmarks: { main: 1 },
    };

    const result = analyzeAccessibility(mockData);
    const finding = result.findings.find((f) => f.id === 'a11y-form-labels');

    expect(finding).toBeDefined();
    expect(finding.severity).toBe('critical');
    expect(finding.selectors).toEqual(['#unlabeled-input', '#unlabeled-text']);
    expect(result.score).toBeLessThanOrEqual(82);
  });

  it('detects buttons missing accessible names', () => {
    const mockData = {
      buttonsCount: 2,
      buttonsWithoutName: [
        { selector: 'button.icon-search', tag: 'button' },
        { selector: '#empty-cta', tag: 'button' },
      ],
      htmlLang: 'en',
      landmarks: { main: 1 },
    };

    const result = analyzeAccessibility(mockData);
    const finding = result.findings.find((f) => f.id === 'a11y-buttons-name');

    expect(finding).toBeDefined();
    expect(finding.severity).toBe('critical');
    expect(finding.selectors).toContain('button.icon-search');
  });

  it('detects images missing alt attributes', () => {
    const mockData = {
      imagesCount: 3,
      imagesWithoutAlt: [
        { selector: 'img#hero-img', src: 'hero.png' },
      ],
      htmlLang: 'en',
      landmarks: { main: 1 },
    };

    const result = analyzeAccessibility(mockData);
    const finding = result.findings.find((f) => f.id === 'a11y-images-alt');

    expect(finding).toBeDefined();
    expect(finding.severity).toBe('high');
    expect(finding.selectors).toContain('img#hero-img');
  });

  it('detects aria-hidden on focusable interactive elements', () => {
    const mockData = {
      ariaHiddenFocusable: [
        { selector: 'button#hidden-btn', tag: 'button' },
        { selector: 'a#hidden-link', tag: 'a' },
      ],
      htmlLang: 'en',
      landmarks: { main: 1 },
    };

    const result = analyzeAccessibility(mockData);
    const finding = result.findings.find((f) => f.id === 'a11y-aria-hidden-focusable');

    expect(finding).toBeDefined();
    expect(finding.severity).toBe('high');
    expect(finding.selectors).toContain('button#hidden-btn');
  });

  it('detects duplicate element IDs', () => {
    const mockData = {
      duplicateIds: [
        { id: 'duplicate-item', count: 3, selector: '#duplicate-item' },
      ],
      htmlLang: 'en',
      landmarks: { main: 1 },
    };

    const result = analyzeAccessibility(mockData);
    const finding = result.findings.find((f) => f.id === 'a11y-duplicate-ids');

    expect(finding).toBeDefined();
    expect(finding.severity).toBe('medium');
    expect(finding.evidence).toContain('#duplicate-item (3x)');
  });

  it('detects positive tabindex values', () => {
    const mockData = {
      positiveTabindices: [
        { selector: 'input#custom-order', tabindex: 3 },
      ],
      htmlLang: 'en',
      landmarks: { main: 1 },
    };

    const result = analyzeAccessibility(mockData);
    const finding = result.findings.find((f) => f.id === 'a11y-positive-tabindex');

    expect(finding).toBeDefined();
    expect(finding.severity).toBe('medium');
    expect(finding.selectors).toContain('input#custom-order');
  });

  it('detects missing <main> landmark', () => {
    const mockData = {
      landmarks: { main: 0, nav: 1, header: 1, footer: 1 },
      htmlLang: 'en',
    };

    const result = analyzeAccessibility(mockData);
    const finding = result.findings.find((f) => f.id === 'a11y-main-landmark-missing');

    expect(finding).toBeDefined();
    expect(finding.severity).toBe('medium');
  });

  it('calculates transparent deductions and clamps score between 0 and 100', () => {
    const severelyInaccessible = {
      formControlsWithoutLabel: [{ selector: '#input-1' }], // -18
      buttonsWithoutName: [{ selector: '#btn-1' }], // -16
      imagesWithoutAlt: [{ selector: '#img-1' }], // -15
      ariaHiddenFocusable: [{ selector: '#hidden-btn' }], // -12
      landmarks: { main: 0 }, // -8
      duplicateIds: [{ id: 'dup' }], // -8
      positiveTabindices: [{ selector: '#tab-1' }], // -6
      htmlLang: '', // -7
    };

    const result = analyzeAccessibility(severelyInaccessible);
    const sum = result.breakdown.deductions.reduce((a, b) => a + b.points, 0);

    expect(result.breakdown.totalDeductions).toBe(sum);
    expect(result.score).toBe(100 - sum);
    expect(result.score).toBeLessThanOrEqual(25);
  });
});
