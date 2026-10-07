/**
 * WebXray - Technology Rule Matcher
 * Evaluates collected DOM, script URLs, headers, and window globals against TECHNOLOGY_RULES
 * Follows Rule 4: Pure function returning evidence-backed detections
 */

import { TECHNOLOGY_RULES } from './rules.js';

/**
 * Matches collected page signals against technology rules
 * @param {object} collected - collected signals from content script, MAIN world, and headers
 * @returns {{ detections: Array, categories: object, totalCount: number }}
 */
export function matchTechnologies(collected = {}) {
  const {
    globals = {},
    scripts = [],
    stylesheets = [],
    metaGenerators = [],
    matchedSelectors = {},
    classNames = [],
    headers = {},
  } = collected;

  // Normalize headers to lowercase keys for case-insensitive matching
  const normalizedHeaders = {};
  if (headers && typeof headers === 'object') {
    for (const [key, val] of Object.entries(headers)) {
      if (val !== undefined && val !== null) {
        normalizedHeaders[key.toLowerCase()] = String(val);
      }
    }
  }

  const detections = [];

  for (const tech of TECHNOLOGY_RULES) {
    const evidence = [];
    const { rules } = tech;

    // 1. Check window globals (MAIN execution world)
    if (rules.globals && Array.isArray(rules.globals)) {
      for (const g of rules.globals) {
        if (globals[g] === true) {
          evidence.push({
            type: 'global',
            label: 'Window Global',
            value: `window.${g}`,
            detail: `Detected active global object: window.${g}`,
          });
        }
      }
    }

    // 2. Check meta generator tags
    if (rules.metaGenerators && Array.isArray(rules.metaGenerators)) {
      for (const pattern of rules.metaGenerators) {
        for (const meta of metaGenerators) {
          if (pattern.test(meta)) {
            evidence.push({
              type: 'meta',
              label: 'Meta Generator',
              value: `<meta name="generator" content="${meta}">`,
              detail: `Generator tag declared: "${meta}"`,
            });
            break;
          }
        }
      }
    }

    // 3. Check response headers
    if (rules.headers && Array.isArray(rules.headers)) {
      for (const h of rules.headers) {
        const headerKey = h.header.toLowerCase();
        const headerVal = normalizedHeaders[headerKey];
        if (headerVal && h.pattern.test(headerVal)) {
          evidence.push({
            type: 'header',
            label: 'HTTP Response Header',
            value: `${h.header}: ${headerVal}`,
            detail: `Server response header matches: ${h.header}: ${headerVal}`,
          });
        }
      }
    }

    // 4. Check DOM selectors
    if (rules.domSelectors && Array.isArray(rules.domSelectors)) {
      for (const selector of rules.domSelectors) {
        if (matchedSelectors[selector] === true) {
          evidence.push({
            type: 'dom',
            label: 'DOM Element',
            value: selector,
            detail: `Found element matching selector: "${selector}"`,
          });
        }
      }
    }

    // 5. Check script URL patterns
    if (rules.scriptPatterns && Array.isArray(rules.scriptPatterns)) {
      for (const pattern of rules.scriptPatterns) {
        for (const scriptUrl of scripts) {
          if (pattern.test(scriptUrl)) {
            evidence.push({
              type: 'script',
              label: 'Script Resource',
              value: scriptUrl,
              detail: `Matched script source: ${scriptUrl.slice(0, 100)}`,
            });
            break; // One match per pattern is sufficient
          }
        }
      }
    }

    // 6. Check stylesheet patterns
    if (rules.stylesheetPatterns && Array.isArray(rules.stylesheetPatterns)) {
      for (const pattern of rules.stylesheetPatterns) {
        for (const cssUrl of stylesheets) {
          if (pattern.test(cssUrl)) {
            evidence.push({
              type: 'stylesheet',
              label: 'CSS Stylesheet',
              value: cssUrl,
              detail: `Matched stylesheet: ${cssUrl.slice(0, 100)}`,
            });
            break;
          }
        }
      }
    }

    // 7. Check CSS class patterns
    if (rules.cssPatterns && Array.isArray(rules.cssPatterns)) {
      for (const pattern of rules.cssPatterns) {
        for (const cls of classNames) {
          if (pattern.test(cls)) {
            evidence.push({
              type: 'css',
              label: 'CSS Class Heuristic',
              value: cls.slice(0, 80),
              detail: `Matched class signature: "${cls.slice(0, 80)}"`,
            });
            break;
          }
        }
      }
    }

    // CRITICAL: Never report a technology without at least one piece of evidence
    if (evidence.length === 0) {
      continue;
    }

    // Determine confidence based on evidence quality
    let confidence = 'low';
    const hasDefinitiveEvidence = evidence.some(
      (e) => e.type === 'global' || e.type === 'meta' || e.type === 'header'
    );

    if (hasDefinitiveEvidence || evidence.length >= 2) {
      confidence = 'high';
    } else if (evidence.some((e) => e.type === 'dom' || e.type === 'script' || e.type === 'stylesheet')) {
      confidence = 'medium';
    }

    detections.push({
      id: tech.id,
      name: tech.name,
      category: tech.category,
      description: tech.description,
      confidence,
      evidence,
    });
  }

  // Sort detections: High confidence first, then by name
  detections.sort((a, b) => {
    const confScore = { high: 3, medium: 2, low: 1 };
    if (confScore[b.confidence] !== confScore[a.confidence]) {
      return confScore[b.confidence] - confScore[a.confidence];
    }
    return a.name.localeCompare(b.name);
  });

  // Group detections by category
  const categories = {};
  for (const det of detections) {
    if (!categories[det.category]) {
      categories[det.category] = [];
    }
    categories[det.category].push(det);
  }

  return {
    detections,
    categories,
    totalCount: detections.length,
  };
}
