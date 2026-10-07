/**
 * WebXray - Unified Rule Catalog
 * Central registry of all diagnostic rules across the 5 core categories.
 */

import { PERFORMANCE_RULES, PERFORMANCE_RULES_BY_ID } from './performance.js';
import { SEO_RULES, SEO_RULES_BY_ID } from './seo.js';
import { ACCESSIBILITY_RULES, ACCESSIBILITY_RULES_BY_ID } from './accessibility.js';
import { SECURITY_RULES, SECURITY_RULES_BY_ID } from './security.js';
import { BEST_PRACTICES_RULES, BEST_PRACTICES_RULES_BY_ID } from './bestPractices.js';

export * from './performance.js';
export * from './seo.js';
export * from './accessibility.js';
export * from './security.js';
export * from './bestPractices.js';

export const ALL_RULES = [
  ...PERFORMANCE_RULES,
  ...SEO_RULES,
  ...ACCESSIBILITY_RULES,
  ...SECURITY_RULES,
  ...BEST_PRACTICES_RULES,
];

export const RULES_BY_CATEGORY = {
  performance: PERFORMANCE_RULES,
  seo: SEO_RULES,
  accessibility: ACCESSIBILITY_RULES,
  security: SECURITY_RULES,
  bestPractices: BEST_PRACTICES_RULES,
};

export const CATEGORY_RULES = RULES_BY_CATEGORY;

export const RULES_BY_ID = {
  ...PERFORMANCE_RULES_BY_ID,
  ...SEO_RULES_BY_ID,
  ...ACCESSIBILITY_RULES_BY_ID,
  ...SECURITY_RULES_BY_ID,
  ...BEST_PRACTICES_RULES_BY_ID,
};

/**
 * Helper to fetch a rule by ID
 * @param {string} id
 * @returns {object|undefined}
 */
export function getRule(id) {
  return RULES_BY_ID[id];
}
