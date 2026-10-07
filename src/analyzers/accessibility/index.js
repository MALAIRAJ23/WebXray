/**
 * WebXray - Accessibility (a11y) Analyzer
 * Pure function adhering to AGENT_RULES.md (Rule 4)
 * Traces: Score -> Rules -> Evidence -> Recommendation
 * Contract: analyzeAccessibility(data) -> { score, results, findings, breakdown, summary }
 * Severities: 'critical' | 'high' | 'medium' | 'low' | 'passed'
 */

import { ACCESSIBILITY_RULES_BY_ID } from '../rules/accessibility.js';

/**
 * Pure function analyzing collected accessibility data
 * @param {object} rawData - collected data from a11yCollector
 * @returns {object}
 */
export function analyzeAccessibility(rawData) {
  const data = rawData || {};
  const imagesWithoutAlt = Array.isArray(data.imagesWithoutAlt) ? data.imagesWithoutAlt : [];
  const formControlsWithoutLabel = Array.isArray(data.formControlsWithoutLabel) ? data.formControlsWithoutLabel : [];
  const buttonsWithoutName = Array.isArray(data.buttonsWithoutName) ? data.buttonsWithoutName : [];
  const linksWithoutName = Array.isArray(data.linksWithoutName) ? data.linksWithoutName : [];
  const headings = Array.isArray(data.headings) ? data.headings : [];
  const landmarks = data.landmarks || { main: 0, nav: 0, header: 0, footer: 0 };
  const htmlLang = (data.htmlLang || '').trim();
  const ariaHiddenFocusable = Array.isArray(data.ariaHiddenFocusable) ? data.ariaHiddenFocusable : [];
  const unknownRoles = Array.isArray(data.unknownRoles) ? data.unknownRoles : [];
  const duplicateIds = Array.isArray(data.duplicateIds) ? data.duplicateIds : [];
  const positiveTabindices = Array.isArray(data.positiveTabindices) ? data.positiveTabindices : [];

  const results = [];
  const findings = [];
  const deductions = [];

  const recordResult = ({
    ruleId,
    findingId,
    status,
    pointsEarned,
    evidence = [],
    selectors = [],
    observed,
    expected,
    severityOverride,
  }) => {
    const rule = ACCESSIBILITY_RULES_BY_ID[ruleId];
    if (!rule) throw new Error(`Unknown accessibility rule: ${ruleId}`);

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
      expected: String(expected || 'WCAG 2.1 AA Conformant'),
    });

    const isPassed = status === 'passed';
    const severity = isPassed ? 'passed' : (severityOverride || (status === 'warning' ? 'medium' : rule.severityOnFail));

    findings.push({
      id: findingId || ruleId,
      ruleId,
      title: rule.title,
      severity,
      evidence: evidence.join('; ') || String(observed),
      selectors,
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

  // 1. Form Controls without Labels
  const formRule = ACCESSIBILITY_RULES_BY_ID['a11y-form-labels'];
  const totalFormControls = data.formControlsCount || formControlsWithoutLabel.length;
  if (formControlsWithoutLabel.length > 0) {
    const selectors = formControlsWithoutLabel.map((c) => c.selector).filter(Boolean);
    const validCount = Math.max(0, totalFormControls - formControlsWithoutLabel.length);
    const fraction = totalFormControls > 0 ? validCount / totalFormControls : 0;
    const earned = Math.round(formRule.weight * fraction);

    recordResult({
      ruleId: 'a11y-form-labels',
      findingId: 'a11y-form-labels',
      status: fraction === 0 ? 'failed' : 'warning',
      severityOverride: 'critical',
      pointsEarned: earned,
      evidence: [
        `${formControlsWithoutLabel.length} input(s) do not have an associated <label>, aria-label, or title attribute.`,
        totalFormControls > 0
          ? `Partial credit (${Math.round(fraction * 100)}%): ${validCount} of ${totalFormControls} inputs properly labeled`
          : 'All checked inputs missing labels',
      ],
      selectors,
      observed: `${formControlsWithoutLabel.length} unlabeled input(s)`,
      expected: 'All form inputs have associated labels',
    });
  } else {
    recordResult({
      ruleId: 'a11y-form-labels',
      findingId: 'a11y-form-labels-passed',
      status: 'passed',
      pointsEarned: formRule.weight,
      evidence: [`All ${totalFormControls} form input(s) are properly labeled`],
      observed: '0 unlabeled inputs',
      expected: 'All form inputs have associated labels',
    });
  }

  // 2. Buttons without an Accessible Name
  const btnRule = ACCESSIBILITY_RULES_BY_ID['a11y-buttons-name'];
  const totalButtons = data.buttonsCount || buttonsWithoutName.length;
  if (buttonsWithoutName.length > 0) {
    const selectors = buttonsWithoutName.map((b) => b.selector).filter(Boolean);
    const validCount = Math.max(0, totalButtons - buttonsWithoutName.length);
    const fraction = totalButtons > 0 ? validCount / totalButtons : 0;
    const earned = Math.round(btnRule.weight * fraction);

    recordResult({
      ruleId: 'a11y-buttons-name',
      findingId: 'a11y-buttons-name',
      status: fraction === 0 ? 'failed' : 'warning',
      severityOverride: 'critical',
      pointsEarned: earned,
      evidence: [
        `${buttonsWithoutName.length} button(s) lack accessible text or aria-label.`,
        totalButtons > 0
          ? `Partial credit (${Math.round(fraction * 100)}%): ${validCount} of ${totalButtons} buttons have accessible names`
          : 'All checked buttons lack accessible names',
      ],
      selectors,
      observed: `${buttonsWithoutName.length} nameless button(s)`,
      expected: 'All buttons have accessible names',
    });
  } else {
    recordResult({
      ruleId: 'a11y-buttons-name',
      findingId: 'a11y-buttons-passed',
      status: 'passed',
      pointsEarned: btnRule.weight,
      evidence: [`All ${totalButtons} button(s) have accessible text or aria-label`],
      observed: '0 nameless buttons',
      expected: 'All buttons have accessible names',
    });
  }

  // 3. Images without ALT Attributes
  const imgAltRule = ACCESSIBILITY_RULES_BY_ID['a11y-images-alt'];
  const totalImages = data.imagesCount || imagesWithoutAlt.length;
  if (imagesWithoutAlt.length > 0) {
    const selectors = imagesWithoutAlt.map((i) => i.selector).filter(Boolean);
    const validCount = Math.max(0, totalImages - imagesWithoutAlt.length);
    const fraction = totalImages > 0 ? validCount / totalImages : 0;
    const earned = Math.round(imgAltRule.weight * fraction);

    recordResult({
      ruleId: 'a11y-images-alt',
      findingId: 'a11y-images-alt',
      status: fraction === 0 ? 'failed' : 'warning',
      severityOverride: 'high',
      pointsEarned: earned,
      evidence: [
        `${imagesWithoutAlt.length} image(s) lack an alt attribute entirely.`,
        totalImages > 0
          ? `Partial credit (${Math.round(fraction * 100)}%): ${validCount} of ${totalImages} images have alt attributes`
          : 'All checked images lack alt attributes',
      ],
      selectors,
      observed: `${imagesWithoutAlt.length} image(s) missing alt`,
      expected: 'All images have alt attributes',
    });
  } else {
    recordResult({
      ruleId: 'a11y-images-alt',
      findingId: 'a11y-images-passed',
      status: 'passed',
      pointsEarned: imgAltRule.weight,
      evidence: [`All ${totalImages} image(s) have alt attributes`],
      observed: '0 images missing alt',
      expected: 'All images have alt attributes',
    });
  }

  // 4. Links without an Accessible Name
  const linksRule = ACCESSIBILITY_RULES_BY_ID['a11y-links-name'];
  const totalLinks = data.linksCount || linksWithoutName.length;
  if (linksWithoutName.length > 0) {
    const selectors = linksWithoutName.map((l) => l.selector).filter(Boolean);
    const validCount = Math.max(0, totalLinks - linksWithoutName.length);
    const fraction = totalLinks > 0 ? validCount / totalLinks : 0;
    const earned = Math.round(linksRule.weight * fraction);

    recordResult({
      ruleId: 'a11y-links-name',
      findingId: 'a11y-links-name',
      status: fraction === 0 ? 'failed' : 'warning',
      severityOverride: 'high',
      pointsEarned: earned,
      evidence: [
        `${linksWithoutName.length} link(s) lack text or aria-label.`,
        totalLinks > 0
          ? `Partial credit (${Math.round(fraction * 100)}%): ${validCount} of ${totalLinks} links have accessible names`
          : 'All checked links lack accessible names',
      ],
      selectors,
      observed: `${linksWithoutName.length} empty link(s)`,
      expected: 'All links have accessible text',
    });
  } else {
    recordResult({
      ruleId: 'a11y-links-name',
      findingId: 'a11y-links-passed',
      status: 'passed',
      pointsEarned: linksRule.weight,
      evidence: [`All ${totalLinks} link(s) have accessible names`],
      observed: '0 empty links',
      expected: 'All links have accessible text',
    });
  }

  // 5. aria-hidden on Focusable Elements
  const hiddenRule = ACCESSIBILITY_RULES_BY_ID['a11y-aria-hidden-focusable'];
  if (ariaHiddenFocusable.length > 0) {
    const selectors = ariaHiddenFocusable.map((a) => a.selector).filter(Boolean);
    recordResult({
      ruleId: 'a11y-aria-hidden-focusable',
      findingId: 'a11y-aria-hidden-focusable',
      status: 'failed',
      severityOverride: 'high',
      pointsEarned: 0,
      evidence: [`${ariaHiddenFocusable.length} focusable element(s) are marked aria-hidden="true".`],
      selectors,
      observed: `${ariaHiddenFocusable.length} focusable element(s) hidden by aria-hidden`,
      expected: '0 focusable elements with aria-hidden="true"',
    });
  } else {
    recordResult({
      ruleId: 'a11y-aria-hidden-focusable',
      findingId: 'a11y-aria-hidden-passed',
      status: 'passed',
      pointsEarned: hiddenRule.weight,
      evidence: ['No focusable interactive elements are obscured by aria-hidden'],
      observed: '0 obscured focusable elements',
      expected: '0 focusable elements with aria-hidden="true"',
    });
  }

  // 6. Landmark Elements (<main>)
  const mainRule = ACCESSIBILITY_RULES_BY_ID['a11y-main-landmark'];
  if (landmarks.main === 0) {
    recordResult({
      ruleId: 'a11y-main-landmark',
      findingId: 'a11y-main-landmark-missing',
      status: 'failed',
      severityOverride: 'medium',
      pointsEarned: 0,
      evidence: ['No <main> or role="main" element found on this page.'],
      observed: 'Missing <main> landmark',
      expected: '1 primary <main> landmark present',
    });
  } else {
    recordResult({
      ruleId: 'a11y-main-landmark',
      findingId: 'a11y-main-landmark-passed',
      status: 'passed',
      pointsEarned: mainRule.weight,
      evidence: ['<main> landmark detected'],
      observed: 'Main landmark configured',
      expected: '1 primary <main> landmark present',
    });
  }

  // 7. Duplicate IDs
  const dupRule = ACCESSIBILITY_RULES_BY_ID['a11y-duplicate-ids'];
  if (duplicateIds.length > 0) {
    const selectors = duplicateIds.map((d) => d.selector).filter(Boolean);
    recordResult({
      ruleId: 'a11y-duplicate-ids',
      findingId: 'a11y-duplicate-ids',
      status: 'warning',
      severityOverride: 'medium',
      pointsEarned: 0,
      evidence: [`${duplicateIds.length} duplicate ID(s) found: ${duplicateIds.map((d) => `#${d.id} (${d.count}x)`).join(', ')}`],
      selectors,
      observed: `${duplicateIds.length} duplicate ID attribute(s)`,
      expected: '0 duplicate IDs',
    });
  } else {
    recordResult({
      ruleId: 'a11y-duplicate-ids',
      findingId: 'a11y-duplicate-ids-passed',
      status: 'passed',
      pointsEarned: dupRule.weight,
      evidence: ['No duplicate ID attributes detected'],
      observed: '0 duplicate IDs',
      expected: '0 duplicate IDs',
    });
  }

  // 8. Positive Tabindex Values
  const tabRule = ACCESSIBILITY_RULES_BY_ID['a11y-positive-tabindex'];
  if (positiveTabindices.length > 0) {
    const selectors = positiveTabindices.map((p) => p.selector).filter(Boolean);
    recordResult({
      ruleId: 'a11y-positive-tabindex',
      findingId: 'a11y-positive-tabindex',
      status: 'warning',
      severityOverride: 'medium',
      pointsEarned: 0,
      evidence: [`${positiveTabindices.length} element(s) specify tabindex > 0.`],
      selectors,
      observed: `${positiveTabindices.length} positive tabindex element(s)`,
      expected: '0 positive tabindex attributes',
    });
  } else {
    recordResult({
      ruleId: 'a11y-positive-tabindex',
      findingId: 'a11y-positive-tabindex-passed',
      status: 'passed',
      pointsEarned: tabRule.weight,
      evidence: ['No positive tabindex values found'],
      observed: '0 positive tabindex elements',
      expected: '0 positive tabindex attributes',
    });
  }

  // 9. Document Language Attribute
  const langRule = ACCESSIBILITY_RULES_BY_ID['a11y-html-lang'];
  if (!htmlLang) {
    recordResult({
      ruleId: 'a11y-html-lang',
      findingId: 'a11y-html-lang-missing',
      status: 'warning',
      severityOverride: 'medium',
      pointsEarned: 0,
      evidence: ['<html> tag does not declare a lang attribute.'],
      observed: 'Missing lang attribute',
      expected: '<html lang="..."> present',
    });
  } else {
    recordResult({
      ruleId: 'a11y-html-lang',
      findingId: 'a11y-html-lang-passed',
      status: 'passed',
      pointsEarned: langRule.weight,
      evidence: [`Document language set to "${htmlLang}"`],
      observed: `lang="${htmlLang}"`,
      expected: '<html lang="..."> present',
    });
  }

  // 10. Heading Hierarchy Skips
  const a11yHeadingRule = ACCESSIBILITY_RULES_BY_ID['a11y-heading-skips'];
  const headingSkips = [];
  let prevLevel = 0;
  for (const h of headings) {
    if (prevLevel > 0 && h.level > prevLevel + 1) {
      headingSkips.push(`H${prevLevel} skipped directly to H${h.level} ("${h.text}")`);
    }
    prevLevel = h.level;
  }

  if (headingSkips.length > 0) {
    recordResult({
      ruleId: 'a11y-heading-skips',
      findingId: 'a11y-heading-skips',
      status: 'warning',
      severityOverride: 'medium',
      pointsEarned: 0,
      evidence: [`${headingSkips.length} heading level skip(s): ${headingSkips.slice(0, 2).join('; ')}`],
      observed: `${headingSkips.length} hierarchy skip(s)`,
      expected: '0 heading level skips',
    });
  } else {
    recordResult({
      ruleId: 'a11y-heading-skips',
      findingId: 'a11y-heading-passed',
      status: 'passed',
      pointsEarned: a11yHeadingRule.weight,
      evidence: [
        headings.length > 0
          ? `All ${headings.length} headings follow a consecutive descending order`
          : 'No heading hierarchy skips detected',
      ],
      observed: '0 heading level skips',
      expected: '0 heading level skips',
    });
  }

  // 11. Invalid ARIA Roles
  const rolesRule = ACCESSIBILITY_RULES_BY_ID['a11y-unknown-roles'];
  if (unknownRoles.length > 0) {
    const selectors = unknownRoles.map((r) => r.selector).filter(Boolean);
    recordResult({
      ruleId: 'a11y-unknown-roles',
      findingId: 'a11y-unknown-roles',
      status: 'warning',
      severityOverride: 'medium',
      pointsEarned: 0,
      evidence: [`${unknownRoles.length} element(s) define unrecognized ARIA roles: ${unknownRoles.map((r) => `"${r.role}"`).join(', ')}`],
      selectors,
      observed: `${unknownRoles.length} invalid ARIA role(s)`,
      expected: 'All roles conform to WAI-ARIA',
    });
  } else {
    recordResult({
      ruleId: 'a11y-unknown-roles',
      findingId: 'a11y-unknown-roles-passed',
      status: 'passed',
      pointsEarned: rolesRule.weight,
      evidence: ['No unrecognized ARIA roles found on page elements'],
      observed: '0 invalid roles',
      expected: 'All roles conform to WAI-ARIA',
    });
  }

  // Score Calculation
  const applicable = results.filter((r) => r.status !== 'not_applicable' && r.status !== 'unverified');
  const totalPossible = applicable.reduce((acc, r) => acc + r.pointsPossible, 0);
  const totalEarned = applicable.reduce((acc, r) => acc + r.pointsEarned, 0);
  const score = totalPossible > 0 ? Math.max(0, Math.min(100, Math.round((totalEarned / totalPossible) * 100))) : 100;
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
    summary: {
      imagesCount: totalImages,
      missingAltCount: imagesWithoutAlt.length,
      formControlsCount: totalFormControls,
      missingLabelsCount: formControlsWithoutLabel.length,
      buttonsCount: totalButtons,
      missingButtonNamesCount: buttonsWithoutName.length,
      landmarks,
      duplicateIdsCount: duplicateIds.length,
      positiveTabindexCount: positiveTabindices.length,
    },
  };
}
