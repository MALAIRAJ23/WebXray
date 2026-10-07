/**
 * WebXray - Best Practices Rule Catalog
 * Single source of truth for modern web standards and general compliance.
 * Category weights sum to 100.
 */

export const BEST_PRACTICES_RULES = [
  {
    id: 'bp-https',
    category: 'bestPractices',
    title: 'Website enforces HTTPS transport security',
    description: 'Ensures the site communicates securely over HTTPS to protect data integrity.',
    weight: 25,
    severityOnFail: 'critical',
    whyItMatters: 'Unencrypted sites trigger browser security warnings, compromise visitor trust, and lack transport confidentiality.',
    recommendation: 'Configure an SSL/TLS certificate and enforce HTTPS redirects.',
    source: 'standard',
    reference: 'RFC 2818 (HTTP Over TLS)',
  },
  {
    id: 'bp-mixed-content',
    category: 'bestPractices',
    title: 'No insecure HTTP subresources loaded on secure pages',
    description: 'Verifies that no active or passive mixed content is fetched over plaintext HTTP.',
    weight: 20,
    severityOnFail: 'high',
    whyItMatters: 'Mixed content introduces vulnerabilities into otherwise encrypted connections and triggers modern browser blocking.',
    recommendation: 'Ensure all subresources (scripts, images, stylesheets) load via HTTPS.',
    threshold: { maxInsecureResources: 0 },
    source: 'standard',
    reference: 'W3C Mixed Content Specification',
  },
  {
    id: 'bp-tabnabbing',
    category: 'bestPractices',
    title: 'External target="_blank" links include rel="noopener"',
    description: 'Guarantees that new tabs opened by links cannot control the origin window.',
    weight: 15,
    severityOnFail: 'medium',
    whyItMatters: 'Links without noopener leave the opener window accessible to window.opener manipulation and phishing redirections.',
    recommendation: 'Add rel="noopener noreferrer" to external links opening with target="_blank".',
    threshold: { maxVulnerable: 0 },
    source: 'standard',
    reference: 'HTML Living Standard (Link types: noopener)',
  },
  {
    id: 'bp-html-lang',
    category: 'bestPractices',
    title: 'HTML document declares lang attribute',
    description: 'Validates that the root document element specifies a valid language code.',
    weight: 15,
    severityOnFail: 'medium',
    whyItMatters: 'Screen readers and translation tools depend on the lang attribute to accurately parse and vocalize page content.',
    recommendation: 'Add a lang attribute to the <html> tag (e.g. <html lang="en">).',
    source: 'standard',
    reference: 'W3C Internationalization / BCP 47',
  },
  {
    id: 'bp-cls',
    category: 'bestPractices',
    title: 'Visual layout remains stable during page load (CLS ≤ 0.1)',
    description: 'Checks that visual shift does not disorient visitors or cause accidental interactions.',
    weight: 15,
    severityOnFail: 'medium',
    whyItMatters: 'Unstable visual layouts frustrate visitors by moving interactive elements unexpectedly while reading or tapping.',
    recommendation: 'Reserve aspect-ratio dimensions for media and embed elements.',
    threshold: { maxCls: 0.1 },
    source: 'standard',
    reference: 'Web Vitals CLS (Google)',
  },
  {
    id: 'bp-links',
    category: 'bestPractices',
    title: 'Links use descriptive keyword anchor text',
    description: 'Ensures links provide clear context about their destination rather than generic text.',
    weight: 10,
    severityOnFail: 'medium',
    whyItMatters: 'Generic anchor labels like "click here" or "learn more" hurt usability and crawlability for search bots and screen readers.',
    recommendation: 'Replace generic anchor text with descriptive destinations.',
    threshold: { maxNonDescriptive: 0 },
    source: 'heuristic',
    reference: 'Google Search Central Link Best Practices',
  },
];

export const BEST_PRACTICES_RULES_BY_ID = Object.fromEntries(
  BEST_PRACTICES_RULES.map((rule) => [rule.id, rule])
);
