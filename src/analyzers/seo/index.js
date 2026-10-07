/**
 * WebXray - SEO Analyzer
 * Pure function adhering to AGENT_RULES.md (Rule 4)
 * Traces: Score -> Rules -> Evidence -> Recommendation
 * Contract: analyzeSeo(data) -> { score, results, findings, breakdown, metadata, headingsTree, linksSummary, imagesSummary }
 * Severities: 'critical' | 'high' | 'medium' | 'low' | 'passed'
 */

import { SEO_RULES_BY_ID } from '../rules/seo.js';

/**
 * Pure function analyzing collected SEO data
 * @param {object} rawData - collected SEO metrics from seoCollector
 * @returns {object}
 */
export function analyzeSeo(rawData) {
  const data = rawData || {};
  const title = (data.title || '').trim();
  const metaDescription = (data.metaDescription || '').trim();
  const canonical = (data.canonical || '').trim();
  const robotsMeta = (data.robotsMeta || '').trim();
  const htmlLang = (data.htmlLang || '').trim();
  const headings = Array.isArray(data.headings) ? data.headings : [];
  const links = data.links || { total: 0, internal: 0, external: 0, emptyHref: 0, nonDescriptive: [] };
  const images = data.images || { total: 0, missingAlt: 0, emptyAlt: 0, missingDimensions: 0, sampleMissingAlt: [] };
  const openGraph = data.openGraph || {};
  const twitter = data.twitter || {};

  const results = [];
  const findings = [];
  const deductions = [];

  const recordResult = ({
    ruleId,
    findingId,
    status,
    pointsEarned,
    evidence = [],
    observed,
    expected,
    severityOverride,
  }) => {
    const rule = SEO_RULES_BY_ID[ruleId];
    if (!rule) throw new Error(`Unknown SEO rule: ${ruleId}`);

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
      expected: String(expected || 'Compliant with SEO guidelines'),
    });

    const isPassed = status === 'passed';
    const severity = isPassed ? 'passed' : (severityOverride || (status === 'warning' ? 'medium' : rule.severityOnFail));

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

  // 1. Title Length Audit (30–60 characters)
  const titleRule = SEO_RULES_BY_ID['seo-title-length'];
  if (!title) {
    recordResult({
      ruleId: 'seo-title-length',
      findingId: 'seo-title-missing',
      status: 'failed',
      severityOverride: 'critical',
      pointsEarned: 0,
      evidence: ['No <title> tag found on the page'],
      observed: '0 characters (missing)',
      expected: '30–60 characters',
    });
  } else if (title.length < 30) {
    recordResult({
      ruleId: 'seo-title-length',
      findingId: 'seo-title-too-short',
      status: 'warning',
      severityOverride: 'medium',
      pointsEarned: Math.round(titleRule.weight * 0.5),
      evidence: [
        `Title is only ${title.length} characters: "${title}" (recommended: 30–60)`,
        'Partial credit (50%): Title exists but is too short for search preview',
      ],
      observed: `${title.length} characters`,
      expected: '30–60 characters',
    });
  } else if (title.length > 60) {
    recordResult({
      ruleId: 'seo-title-length',
      findingId: 'seo-title-too-long',
      status: 'warning',
      severityOverride: 'low',
      pointsEarned: Math.round(titleRule.weight * 0.5),
      evidence: [
        `Title is ${title.length} characters: "${title}" (recommended: 30–60)`,
        'Partial credit (50%): Title exists but may truncate with ellipses in SERPs',
      ],
      observed: `${title.length} characters`,
      expected: '30–60 characters',
    });
  } else {
    recordResult({
      ruleId: 'seo-title-length',
      findingId: 'seo-title-optimal',
      status: 'passed',
      pointsEarned: titleRule.weight,
      evidence: [`${title.length} characters: "${title}"`],
      observed: `${title.length} characters`,
      expected: '30–60 characters',
    });
  }

  // 2. Meta Description Audit (70–160 characters)
  const descRule = SEO_RULES_BY_ID['seo-meta-description'];
  if (!metaDescription) {
    recordResult({
      ruleId: 'seo-meta-description',
      findingId: 'seo-desc-missing',
      status: 'failed',
      severityOverride: 'high',
      pointsEarned: 0,
      evidence: ['No <meta name="description"> tag found in <head>'],
      observed: 'Missing description',
      expected: '70–160 characters',
    });
  } else if (metaDescription.length < 70) {
    recordResult({
      ruleId: 'seo-meta-description',
      findingId: 'seo-desc-too-short',
      status: 'warning',
      severityOverride: 'medium',
      pointsEarned: Math.round(descRule.weight * 0.5),
      evidence: [
        `Description is ${metaDescription.length} characters (recommended: 70–160)`,
        'Partial credit (50%): Brief description snippet',
      ],
      observed: `${metaDescription.length} characters`,
      expected: '70–160 characters',
    });
  } else if (metaDescription.length > 160) {
    recordResult({
      ruleId: 'seo-meta-description',
      findingId: 'seo-desc-too-long',
      status: 'warning',
      severityOverride: 'low',
      pointsEarned: Math.round(descRule.weight * 0.5),
      evidence: [
        `Description is ${metaDescription.length} characters (recommended: 70–160)`,
        'Partial credit (50%): Meta description exceeds SERP snippet length',
      ],
      observed: `${metaDescription.length} characters`,
      expected: '70–160 characters',
    });
  } else {
    recordResult({
      ruleId: 'seo-meta-description',
      findingId: 'seo-desc-optimal',
      status: 'passed',
      pointsEarned: descRule.weight,
      evidence: [`${metaDescription.length} characters (within 70–160 range)`],
      observed: `${metaDescription.length} characters`,
      expected: '70–160 characters',
    });
  }

  // 3. H1 Heading Audit (Exactly one H1)
  const h1Elements = headings.filter((h) => h.level === 1);
  const h1Rule = SEO_RULES_BY_ID['seo-h1'];
  if (h1Elements.length === 0) {
    recordResult({
      ruleId: 'seo-h1',
      findingId: 'seo-h1-missing',
      status: 'failed',
      severityOverride: 'high',
      pointsEarned: 0,
      evidence: ['No <h1> heading element found in the document'],
      observed: '0 H1 headings',
      expected: '1 H1 heading',
    });
  } else if (h1Elements.length > 1) {
    recordResult({
      ruleId: 'seo-h1',
      findingId: 'seo-h1-multiple',
      status: 'warning',
      severityOverride: 'medium',
      pointsEarned: Math.round(h1Rule.weight * 0.5),
      evidence: [
        `${h1Elements.length} <h1> tags found: ${h1Elements.map((h) => `"${h.text}"`).slice(0, 3).join(', ')}`,
        'Partial credit (50%): Multiple H1 headings present',
      ],
      observed: `${h1Elements.length} H1 headings`,
      expected: '1 H1 heading',
    });
  } else {
    recordResult({
      ruleId: 'seo-h1',
      findingId: 'seo-h1-passed',
      status: 'passed',
      pointsEarned: h1Rule.weight,
      evidence: [`1 <h1> heading: "${h1Elements[0].text}"`],
      observed: '1 H1 heading',
      expected: '1 H1 heading',
    });
  }

  // 4. Heading Hierarchy Skip Audit (e.g. H2 -> H4)
  const hierarchyRule = SEO_RULES_BY_ID['seo-heading-hierarchy'];
  const skips = [];
  let previousLevel = 0;
  for (const h of headings) {
    if (previousLevel > 0 && h.level > previousLevel + 1) {
      skips.push(`H${previousLevel} jumped directly to H${h.level} ("${h.text}")`);
    }
    previousLevel = h.level;
  }

  if (skips.length > 0) {
    recordResult({
      ruleId: 'seo-heading-hierarchy',
      findingId: 'seo-heading-skips',
      status: 'warning',
      severityOverride: 'medium',
      pointsEarned: 0,
      evidence: [`${skips.length} hierarchy skip(s): ${skips.slice(0, 2).join('; ')}${skips.length > 2 ? '...' : ''}`],
      observed: `${skips.length} heading level skip(s)`,
      expected: '0 hierarchy skips',
    });
  } else {
    recordResult({
      ruleId: 'seo-heading-hierarchy',
      findingId: 'seo-heading-hierarchy-passed',
      status: 'passed',
      pointsEarned: hierarchyRule.weight,
      evidence: [
        headings.length > 0
          ? `All ${headings.length} headings follow a consecutive descending order`
          : 'No heading hierarchy skips detected',
      ],
      observed: '0 hierarchy skips',
      expected: '0 hierarchy skips',
    });
  }

  // 5. Canonical URL Audit
  const canonicalRule = SEO_RULES_BY_ID['seo-canonical'];
  if (!canonical) {
    recordResult({
      ruleId: 'seo-canonical',
      findingId: 'seo-canonical-missing',
      status: 'failed',
      severityOverride: 'medium',
      pointsEarned: 0,
      evidence: ['No <link rel="canonical"> tag detected in <head>'],
      observed: 'Missing canonical link',
      expected: 'rel="canonical" declared',
    });
  } else {
    recordResult({
      ruleId: 'seo-canonical',
      findingId: 'seo-canonical-passed',
      status: 'passed',
      pointsEarned: canonicalRule.weight,
      evidence: [`Canonical URL: ${canonical}`],
      observed: canonical,
      expected: 'rel="canonical" declared',
    });
  }

  // 6. Robots / Noindex Directive Audit
  const isNoindex = robotsMeta.toLowerCase().includes('noindex');
  const robotsRule = SEO_RULES_BY_ID['seo-robots'];
  if (isNoindex) {
    recordResult({
      ruleId: 'seo-robots',
      findingId: 'seo-robots-noindex',
      status: 'failed',
      severityOverride: 'high',
      pointsEarned: 0,
      evidence: [`Robots meta tag contains noindex: "${robotsMeta}"`],
      observed: 'noindex active',
      expected: 'Indexing allowed',
    });
  } else {
    recordResult({
      ruleId: 'seo-robots',
      findingId: 'seo-robots-passed',
      status: 'passed',
      pointsEarned: robotsRule.weight,
      evidence: [robotsMeta ? `Robots directive: "${robotsMeta}"` : 'Indexing allowed (no restrictive robots meta tag)'],
      observed: 'Indexing allowed',
      expected: 'Indexing allowed',
    });
  }

  // 7. Social Metadata (Open Graph & Twitter)
  const socialRule = SEO_RULES_BY_ID['seo-social-metadata'];
  const hasOgTitle = Boolean(openGraph.title);
  const hasOgDesc = Boolean(openGraph.description);
  const hasOgImage = Boolean(openGraph.image);
  const hasTwitterCard = Boolean(twitter.card);

  const missingSocial = [];
  if (!hasOgTitle) missingSocial.push('og:title');
  if (!hasOgDesc) missingSocial.push('og:description');
  if (!hasOgImage) missingSocial.push('og:image');
  if (!hasTwitterCard) missingSocial.push('twitter:card');

  if (missingSocial.length >= 3) {
    recordResult({
      ruleId: 'seo-social-metadata',
      findingId: 'seo-social-missing',
      status: 'failed',
      severityOverride: 'medium',
      pointsEarned: 0,
      evidence: [`Missing essential tags: ${missingSocial.join(', ')}`],
      observed: `${missingSocial.length} missing social tags`,
      expected: 'Open Graph and Twitter Card tags configured',
    });
  } else if (missingSocial.length > 0) {
    recordResult({
      ruleId: 'seo-social-metadata',
      findingId: 'seo-social-incomplete',
      status: 'warning',
      severityOverride: 'low',
      pointsEarned: Math.round(socialRule.weight * 0.5),
      evidence: [
        `Missing social tag(s): ${missingSocial.join(', ')}`,
        'Partial credit (50%): Core social card partially configured',
      ],
      observed: `${missingSocial.length} missing tag(s)`,
      expected: 'All 4 social tags configured',
    });
  } else {
    recordResult({
      ruleId: 'seo-social-metadata',
      findingId: 'seo-social-passed',
      status: 'passed',
      pointsEarned: socialRule.weight,
      evidence: ['Open Graph (og:title, og:description, og:image) and Twitter Card tags are configured'],
      observed: 'Full social card metadata',
      expected: 'All social tags configured',
    });
  }

  // 8. Image ALT Text Audit
  const imgAltRule = SEO_RULES_BY_ID['seo-image-alt'];
  if (images.missingAlt > 0) {
    const sample = images.sampleMissingAlt?.slice(0, 3).join(', ') || '';
    const totalImg = images.total || images.missingAlt;
    const withAlt = Math.max(0, totalImg - images.missingAlt);
    const fraction = totalImg > 0 ? withAlt / totalImg : 0;
    const earned = Math.round(imgAltRule.weight * fraction);

    recordResult({
      ruleId: 'seo-image-alt',
      findingId: 'seo-images-missing-alt',
      status: fraction === 0 ? 'failed' : 'warning',
      severityOverride: 'high',
      pointsEarned: earned,
      evidence: [
        `${images.missingAlt} image(s) lack an alt attribute${sample ? `: ${sample}` : ''}`,
        `Partial credit (${Math.round(fraction * 100)}%): ${withAlt} of ${totalImg} image(s) include alt attributes`,
      ],
      observed: `${images.missingAlt} of ${totalImg} missing alt`,
      expected: 'All images declare alt text',
    });
  } else {
    recordResult({
      ruleId: 'seo-image-alt',
      findingId: 'seo-images-alt-passed',
      status: 'passed',
      pointsEarned: imgAltRule.weight,
      evidence: [
        images.total > 0
          ? `All ${images.total} image(s) contain alt attributes`
          : 'No images detected on this page',
      ],
      observed: '0 images missing alt',
      expected: 'All images declare alt text',
    });
  }

  // 9. Non-Descriptive Links Audit
  const linksRule = SEO_RULES_BY_ID['seo-link-anchors'];
  if (links.nonDescriptive?.length > 0) {
    const samplePhrases = links.nonDescriptive.slice(0, 3).map((l) => `"${l.text}"`).join(', ');
    recordResult({
      ruleId: 'seo-link-anchors',
      findingId: 'seo-links-non-descriptive',
      status: 'warning',
      severityOverride: 'medium',
      pointsEarned: 0,
      evidence: [`${links.nonDescriptive.length} link(s) use generic labels (${samplePhrases})`],
      observed: `${links.nonDescriptive.length} generic link(s)`,
      expected: 'Descriptive keyword anchor text',
    });
  } else {
    recordResult({
      ruleId: 'seo-link-anchors',
      findingId: 'seo-links-descriptive-passed',
      status: 'passed',
      pointsEarned: linksRule.weight,
      evidence: [`No generic link anchors ("click here", "read more") found among ${links.total} link(s)`],
      observed: '0 generic link anchors',
      expected: 'Descriptive keyword anchor text',
    });
  }

  // 10. HTML Language Attribute
  const langRule = SEO_RULES_BY_ID['seo-html-lang'];
  if (!htmlLang) {
    recordResult({
      ruleId: 'seo-html-lang',
      findingId: 'seo-lang-missing',
      status: 'warning',
      severityOverride: 'medium',
      pointsEarned: 0,
      evidence: ['The <html> root element does not declare a lang attribute'],
      observed: 'Missing lang attribute',
      expected: '<html lang="..."> declared',
    });
  } else {
    recordResult({
      ruleId: 'seo-html-lang',
      findingId: 'seo-lang-passed',
      status: 'passed',
      pointsEarned: langRule.weight,
      evidence: [`Document language set to "${htmlLang}"`],
      observed: `lang="${htmlLang}"`,
      expected: '<html lang="..."> declared',
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
    metadata: {
      title,
      metaDescription,
      canonical,
      robotsMeta,
      htmlLang,
      openGraph,
      twitter,
      url: data.url || '',
      domain: data.domain || '',
    },
    headings,
    links,
    images,
  };
}
