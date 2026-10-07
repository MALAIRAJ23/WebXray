/**
 * WebXray - Technology Analyzer
 * Pure function adhering to AGENT_RULES.md (Rule 4)
 * Contract: analyzeTechnology(rawData) -> { score, findings, detections, categories, totalCount }
 */

import { matchTechnologies } from '../../services/detection/matcher.js';

/**
 * Evaluates collected technological signals and generates findings
 * @param {object} rawData - collected page signals
 * @returns {object}
 */
export function analyzeTechnology(rawData) {
  const result = matchTechnologies(rawData || {});
  const { detections, categories, totalCount } = result;

  const findings = [];

  if (totalCount === 0) {
    findings.push({
      id: 'tech-none-detected',
      title: 'Standard Web Stack (No Major Frameworks Detected)',
      severity: 'passed',
      evidence: 'No common frontend frameworks, CMS, or tracking platforms matched observable signatures.',
      whyItMatters: 'Page appears to be built using vanilla HTML/JS/CSS or custom proprietary architectures.',
      recommendation: 'Ensure standard web performance and accessibility practices are maintained.',
    });
  } else {
    for (const det of detections) {
      findings.push({
        id: `tech-${det.id}`,
        title: `${det.name} Detected (${det.confidence.toUpperCase()} Confidence)`,
        severity: 'passed',
        evidence: `${det.evidence.length} evidence signal(s) observed: ${det.evidence.map((e) => e.label).join(', ')}`,
        whyItMatters: det.description || `Active ${det.category} component detected in page architecture.`,
        recommendation: `Keep ${det.name} dependencies up to date with regular maintenance cycles.`,
      });
    }
  }

  // Base score 100 for observable tech stack
  const score = totalCount > 0 ? 100 : 85;

  return {
    score,
    totalCount,
    detections,
    categories,
    findings,
  };
}
