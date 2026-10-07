/**
 * WebXray - Content Script Technology Collector
 * Injected on demand via chrome.scripting.executeScript
 * Collects script URLs, stylesheets, meta generator tags, DOM selector matches, and class names.
 * Follows Rule 2: Privacy-first (100% in-browser local collection)
 */

import { getAllDomSelectors } from '../services/detection/rules.js';

(() => {
  try {
    const doc = document;
    const win = window;

    // 1. Collect Script URLs (DOM + Performance Entries)
    const scriptUrls = new Set();
    const scriptElements = doc.querySelectorAll('script[src]');
    scriptElements.forEach((el) => {
      const src = el.getAttribute('src');
      if (src) {
        try {
          scriptUrls.add(new URL(src, win.location.href).href);
        } catch {
          scriptUrls.add(src);
        }
      }
    });

    if (win.performance?.getEntriesByType) {
      const resourceEntries = win.performance.getEntriesByType('resource');
      resourceEntries.forEach((res) => {
        if (res.initiatorType === 'script' || (res.name && res.name.includes('.js'))) {
          scriptUrls.add(res.name);
        }
      });
    }

    // 2. Collect Stylesheets
    const stylesheetUrls = new Set();
    const linkElements = doc.querySelectorAll('link[rel="stylesheet"], link[as="style"]');
    linkElements.forEach((el) => {
      const href = el.getAttribute('href');
      if (href) {
        try {
          stylesheetUrls.add(new URL(href, win.location.href).href);
        } catch {
          stylesheetUrls.add(href);
        }
      }
    });

    // 3. Collect Meta Generator Tags
    const metaGenerators = [];
    const metaElements = doc.querySelectorAll('meta[name="generator" i], meta[name="Generator" i]');
    metaElements.forEach((el) => {
      const content = el.getAttribute('content');
      if (content) {
        metaGenerators.push(content.trim());
      }
    });

    // 4. Test DOM Selectors from rules
    const selectorsToCheck = getAllDomSelectors();
    const matchedSelectors = {};

    for (const sel of selectorsToCheck) {
      try {
        matchedSelectors[sel] = Boolean(doc.querySelector(sel));
      } catch {
        matchedSelectors[sel] = false;
      }
    }

    // 5. Sample CSS Class Names from page elements
    const classNames = [];
    const sampleElements = doc.querySelectorAll('body, #root, #__next, header, nav, main, section, footer, div, button, input');
    const maxSamples = Math.min(sampleElements.length, 250);

    for (let i = 0; i < maxSamples; i++) {
      const cls = sampleElements[i].getAttribute('class');
      if (cls && typeof cls === 'string') {
        classNames.push(cls);
      }
    }

    return {
      ok: true,
      data: {
        scripts: Array.from(scriptUrls).slice(0, 500),
        stylesheets: Array.from(stylesheetUrls).slice(0, 500),
        metaGenerators,
        matchedSelectors,
        classNames,
        collectedAt: Date.now(),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: 'COLLECTION_FAILED',
      message: err.message || 'Failed to inspect technology signatures.',
    };
  }
})();
