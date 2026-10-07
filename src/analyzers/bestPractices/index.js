/**
 * WebXray - Best Practices Analyzer
 * Evaluates website compliance against established modern web standards.
 * Pure function adhering to AGENT_RULES.md (Rule 4)
 * Traces: Score -> Rules -> Evidence -> Recommendation
 * Contract: analyzeBestPractices(allData) -> { score, results, findings, breakdown }
 */

import { BEST_PRACTICES_RULES_BY_ID } from '../rules/bestPractices.js';

export function analyzeBestPractices(allData = {}) {
  const perf = allData.performance || {};
  const seo = allData.seo || {};
  const a11y = allData.accessibility || {};
  const sec = allData.security || {};

  // Extract findings or raw flags from categories
  const perfFindings = Array.isArray(perf.findings) ? perf.findings : [];
  const seoFindings = Array.isArray(seo.findings) ? seo.findings : [];
  const a11yFindings = Array.isArray(a11y.findings) ? a11y.findings : [];
  const secFindings = Array.isArray(sec.findings) ? sec.findings : [];

  const results = [];
  const findings = [];
  const deductions = [];

  const recordResult = ({ ruleId, findingId, status, pointsEarned, evidence = [], observed, expected }) => {
    const rule = BEST_PRACTICES_RULES_BY_ID[ruleId];
    if (!rule) throw new Error(`Unknown best practices rule: ${ruleId}`);

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
      expected: String(expected || 'Compliant with web standards'),
    });

    const isPassed = status === 'passed';
    const severity = isPassed ? 'passed' : (status === 'warning' ? 'medium' : rule.severityOnFail);

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

  // 1. HTTPS Transport Security (25 pts)
  const isHttpsMissing = secFindings.some((f) => f.id === 'sec-https-missing') ||
    (typeof sec.isHttps === 'boolean' && !sec.isHttps);
  if (isHttpsMissing) {
    recordResult({
      ruleId: 'bp-https',
      findingId: 'bp-https',
      status: 'failed',
      pointsEarned: 0,
      evidence: ['Page served over unencrypted HTTP protocol'],
      observed: 'HTTP (unencrypted)',
      expected: 'HTTPS enforced',
    });
  } else {
    recordResult({
      ruleId: 'bp-https',
      findingId: 'bp-https-passed',
      status: 'passed',
      pointsEarned: BEST_PRACTICES_RULES_BY_ID['bp-https'].weight,
      evidence: ['Page served securely over encrypted HTTPS'],
      observed: 'HTTPS secured',
      expected: 'HTTPS enforced',
    });
  }

  // 2. Mixed Content (20 pts)
  const hasMixedContent = secFindings.some((f) => f.id === 'sec-mixed-content') ||
    Boolean(sec.mixedContent?.detected && sec.mixedContent?.count > 0);
  if (hasMixedContent) {
    recordResult({
      ruleId: 'bp-mixed-content',
      findingId: 'bp-mixed-content',
      status: 'failed',
      pointsEarned: 0,
      evidence: ['Insecure HTTP subresources requested on secure HTTPS page'],
      observed: 'Mixed content detected',
      expected: '0 insecure subresources',
    });
  } else {
    recordResult({
      ruleId: 'bp-mixed-content',
      findingId: 'bp-mixed-content-passed',
      status: 'passed',
      pointsEarned: BEST_PRACTICES_RULES_BY_ID['bp-mixed-content'].weight,
      evidence: ['All subresources loaded securely over HTTPS'],
      observed: '0 insecure subresources',
      expected: '0 insecure subresources',
    });
  }

  // 3. Tabnabbing Protection (rel="noopener") (15 pts)
  const hasTabnabbing = secFindings.some((f) => f.id === 'sec-tabnabbing-vulnerable') ||
    Boolean(sec.targetBlankLinks?.vulnerableCount > 0);
  if (hasTabnabbing) {
    recordResult({
      ruleId: 'bp-tabnabbing',
      findingId: 'bp-tabnabbing',
      status: 'warning',
      pointsEarned: 0,
      evidence: ['External target="_blank" links missing rel="noopener" or rel="noreferrer"'],
      observed: 'Vulnerable external new-tab links',
      expected: 'rel="noopener noreferrer" on all target="_blank"',
    });
  } else {
    recordResult({
      ruleId: 'bp-tabnabbing',
      findingId: 'bp-tabnabbing-passed',
      status: 'passed',
      pointsEarned: BEST_PRACTICES_RULES_BY_ID['bp-tabnabbing'].weight,
      evidence: ['All target="_blank" links protected with rel="noopener"'],
      observed: 'Protected links',
      expected: 'rel="noopener" configured',
    });
  }

  // 4. HTML Language Attribute (15 pts)
  const isLangMissing = a11yFindings.some((f) => f.id === 'a11y-html-lang-missing') ||
    seoFindings.some((f) => f.id === 'seo-lang-missing') ||
    (typeof a11y.htmlLang === 'string' && !a11y.htmlLang) ||
    (typeof seo.metadata?.htmlLang === 'string' && !seo.metadata?.htmlLang);

  if (isLangMissing) {
    recordResult({
      ruleId: 'bp-html-lang',
      findingId: 'bp-lang',
      status: 'warning',
      pointsEarned: 0,
      evidence: ['HTML document <html> element does not specify a lang attribute'],
      observed: 'Missing lang attribute',
      expected: '<html lang="..."> present',
    });
  } else {
    recordResult({
      ruleId: 'bp-html-lang',
      findingId: 'bp-lang-passed',
      status: 'passed',
      pointsEarned: BEST_PRACTICES_RULES_BY_ID['bp-html-lang'].weight,
      evidence: ['HTML document declares language attribute'],
      observed: 'lang attribute present',
      expected: '<html lang="..."> present',
    });
  }

  // 5. Visual Layout Stability (CLS) (15 pts)
  const hasClsIssue = perfFindings.some((f) => f.id === 'perf-cls-high' || f.id === 'perf-cls-poor') ||
    (typeof perf.metrics?.cls === 'number' && perf.metrics.cls > 0.1);
  if (hasClsIssue) {
    recordResult({
      ruleId: 'bp-cls',
      findingId: 'bp-cls',
      status: 'warning',
      pointsEarned: 0,
      evidence: ['Cumulative Layout Shift exceeds the 0.1 good threshold'],
      observed: typeof perf.metrics?.cls === 'number' ? `CLS ${perf.metrics.cls.toFixed(3)}` : 'CLS > 0.1',
      expected: 'CLS ≤ 0.100',
    });
  } else {
    recordResult({
      ruleId: 'bp-cls',
      findingId: 'bp-cls-passed',
      status: 'passed',
      pointsEarned: BEST_PRACTICES_RULES_BY_ID['bp-cls'].weight,
      evidence: ['Layout shifts remain stable during load'],
      observed: typeof perf.metrics?.cls === 'number' ? `CLS ${perf.metrics.cls.toFixed(3)}` : 'CLS ≤ 0.100',
      expected: 'CLS ≤ 0.100',
    });
  }

  // 6. Descriptive Link Anchors (10 pts)
  const hasGenericLinks = seoFindings.some((f) => f.id === 'seo-links-non-descriptive') ||
    Boolean(seo.links?.nonDescriptive?.length > 0);
  if (hasGenericLinks) {
    recordResult({
      ruleId: 'bp-links',
      findingId: 'bp-links',
      status: 'warning',
      pointsEarned: 0,
      evidence: ['Generic anchor text (e.g. "click here", "read more") used for links'],
      observed: 'Non-descriptive link anchors',
      expected: 'Descriptive link destination text',
    });
  } else {
    recordResult({
      ruleId: 'bp-links',
      findingId: 'bp-links-passed',
      status: 'passed',
      pointsEarned: BEST_PRACTICES_RULES_BY_ID['bp-links'].weight,
      evidence: ['All link anchors provide descriptive context'],
      observed: 'Descriptive anchors',
      expected: 'Descriptive link destination text',
    });
  }

  // Calculate score using standard model
  const applicable = results.filter((r) => r.status !== 'not_applicable' && r.status !== 'unverified');
  const pointsPossible = applicable.reduce((acc, r) => acc + r.pointsPossible, 0);
  const pointsEarned = applicable.reduce((acc, r) => acc + r.pointsEarned, 0);
  const score = pointsPossible > 0 ? Math.max(0, Math.min(100, Math.round((pointsEarned / pointsPossible) * 100))) : 100;
  const totalDeductions = deductions.reduce((acc, d) => acc + d.points, 0);

  return {
    score,
    results,
    findings,
    breakdown: {
      baseScore: 100,
      totalDeductions,
      deductions,
    },
  };
}
