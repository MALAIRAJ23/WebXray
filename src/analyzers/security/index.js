/**
 * WebXray - Security Analyzer (Defensive Checks Only)
 * Pure function adhering to AGENT_RULES.md (Rule 4)
 * Traces: Score -> Rules -> Evidence -> Recommendation
 * Contract: analyzeSecurity(data) -> { score, results, findings, breakdown, headersSummary, thirdParty, cookies }
 * Severities: 'critical' | 'high' | 'medium' | 'low' | 'passed'
 */

import { SECURITY_RULES_BY_ID } from '../rules/security.js';

/**
 * Pure function analyzing collected security data
 * @param {object} rawData - collected security metrics & headers
 * @returns {object}
 */
export function analyzeSecurity(rawData) {
  const data = rawData || {};
  const isHttps = Boolean(data.isHttps);
  const protocol = data.protocol || (isHttps ? 'https:' : 'http:');
  const mixedContent = data.mixedContent || { detected: false, count: 0, samples: [] };
  const targetBlankLinks = data.targetBlankLinks || { total: 0, vulnerableCount: 0, samples: [] };
  const inlineScripts = data.inlineScripts || { count: 0 };
  const cookies = data.cookies || { clientAccessibleCount: 0, sampleNames: [], note: '' };
  const thirdPartyResources = data.thirdPartyResources || { total: 0, thirdPartyTotal: 0, byCompany: {}, topDomains: [] };
  const headers = data.headers || { status: 'unverified', data: {} };

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
    const rule = SECURITY_RULES_BY_ID[ruleId];
    if (!rule) throw new Error(`Unknown security rule: ${ruleId}`);

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
      expected: String(expected || 'Secure configuration'),
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

  // 1. HTTPS Protocol Check
  const httpsRule = SECURITY_RULES_BY_ID['sec-https'];
  if (!isHttps) {
    recordResult({
      ruleId: 'sec-https',
      findingId: 'sec-https-missing',
      status: 'failed',
      severityOverride: 'critical',
      pointsEarned: 0,
      evidence: [`Page is served over plaintext ${protocol}`],
      observed: protocol,
      expected: 'https:',
    });
  } else {
    recordResult({
      ruleId: 'sec-https',
      findingId: 'sec-https-passed',
      status: 'passed',
      pointsEarned: httpsRule.weight,
      evidence: ['Page is served over encrypted HTTPS connection'],
      observed: 'https:',
      expected: 'https:',
    });
  }

  // 2. Mixed Content Detection (on HTTPS pages)
  const mixedRule = SECURITY_RULES_BY_ID['sec-mixed-content'];
  if (!isHttps) {
    recordResult({
      ruleId: 'sec-mixed-content',
      findingId: 'sec-mixed-content-na',
      status: 'not_applicable',
      pointsEarned: 0,
      evidence: ['Mixed content check is not applicable on plaintext HTTP pages'],
      observed: 'HTTP site',
      expected: 'N/A',
    });
  } else if (mixedContent.detected && mixedContent.count > 0) {
    const sampleUrls = mixedContent.samples?.slice(0, 3).map((s) => s.url).join(', ') || '';
    recordResult({
      ruleId: 'sec-mixed-content',
      findingId: 'sec-mixed-content',
      status: 'failed',
      severityOverride: 'high',
      pointsEarned: 0,
      evidence: [
        `${mixedContent.count} plaintext http:// subresource(s) loaded on HTTPS page${sampleUrls ? `: ${sampleUrls}` : ''}`,
      ],
      observed: `${mixedContent.count} insecure subresource(s)`,
      expected: '0 insecure subresources',
    });
  } else {
    recordResult({
      ruleId: 'sec-mixed-content',
      findingId: 'sec-mixed-content-passed',
      status: 'passed',
      pointsEarned: mixedRule.weight,
      evidence: ['All inspected subresources are loaded securely over HTTPS'],
      observed: '0 insecure subresources',
      expected: '0 insecure subresources',
    });
  }

  // 3. Security Headers Checklist
  const headersData = headers.data || {};
  const isVerified = headers.status === 'verified';

  // Build headers status summary for UI checklist table
  const headersSummary = [
    {
      name: 'Content-Security-Policy',
      status: !isVerified ? 'unverified' : headersData.csp ? 'configured' : 'missing',
      value: headersData.csp || null,
      recommendation: 'Add CSP to mitigate XSS and unauthorized script injection.',
    },
    {
      name: 'Strict-Transport-Security',
      status: !isVerified ? 'unverified' : headersData.hsts ? 'configured' : 'missing',
      value: headersData.hsts || null,
      recommendation: 'Enforce HTTPS connections and prevent SSL-stripping attacks.',
    },
    {
      name: 'X-Content-Type-Options',
      status: !isVerified ? 'unverified' : (headersData.xContentType || '').toLowerCase().includes('nosniff') ? 'configured' : 'missing',
      value: headersData.xContentType || null,
      recommendation: 'Send X-Content-Type-Options: nosniff to stop MIME-type sniffing.',
    },
    {
      name: 'Referrer-Policy',
      status: !isVerified ? 'unverified' : headersData.referrerPolicy ? 'configured' : 'missing',
      value: headersData.referrerPolicy || null,
      recommendation: 'Protect sensitive referral paths across cross-origin requests.',
    },
    {
      name: 'Permissions-Policy',
      status: !isVerified ? 'unverified' : headersData.permissionsPolicy ? 'configured' : 'missing',
      value: headersData.permissionsPolicy || null,
      recommendation: 'Explicitly disable unused hardware APIs like camera and microphone.',
    },
    {
      name: 'X-Frame-Options',
      status: !isVerified ? 'unverified' : (headersData.xFrameOptions || (headersData.csp || '').includes('frame-ancestors')) ? 'configured' : 'missing',
      value: headersData.xFrameOptions || (headersData.csp?.includes('frame-ancestors') ? 'CSP frame-ancestors' : null),
      recommendation: 'Defend against clickjacking attacks by restricting iframe framing.',
    },
  ];

  if (!isVerified) {
    findings.push({
      id: 'sec-headers-unverified',
      ruleId: 'sec-headers',
      title: 'Security Headers Could Not Be Verified',
      severity: 'low',
      evidence: 'HTTP response headers could not be read directly from the current extension context.',
      whyItMatters: 'Without host permissions or when blocked by CORS, background service workers cannot inspect raw response headers.',
      recommendation: 'Inspect headers in Chrome DevTools Network panel, or grant optional host permissions.',
    });

    // Each header rule is unverified and excluded from the score denominator
    ['sec-csp', 'sec-hsts', 'sec-nosniff', 'sec-frame', 'sec-referrer', 'sec-permissions'].forEach((id) => {
      recordResult({
        ruleId: id,
        findingId: `${id}-unverified`,
        status: 'unverified',
        pointsEarned: 0,
        evidence: ['Response headers could not be inspected in current execution context'],
        observed: 'Unverified',
        expected: 'Configured on HTTP response',
      });
    });
  } else {
    // Verified Headers Evaluations
    // CSP
    const cspRule = SECURITY_RULES_BY_ID['sec-csp'];
    if (headersData.csp) {
      recordResult({
        ruleId: 'sec-csp',
        findingId: 'sec-csp-passed',
        status: 'passed',
        pointsEarned: cspRule.weight,
        evidence: [`CSP directive present (${headersData.csp.slice(0, 60)}...)`],
        observed: 'Configured',
        expected: 'Content-Security-Policy header present',
      });
    } else {
      recordResult({
        ruleId: 'sec-csp',
        findingId: 'sec-csp-missing',
        status: 'failed',
        severityOverride: 'high',
        pointsEarned: 0,
        evidence: ['No Content-Security-Policy header detected in server response'],
        observed: 'Missing',
        expected: 'Content-Security-Policy header present',
      });
    }

    // HSTS
    const hstsRule = SECURITY_RULES_BY_ID['sec-hsts'];
    if (!isHttps) {
      recordResult({
        ruleId: 'sec-hsts',
        findingId: 'sec-hsts-na',
        status: 'not_applicable',
        pointsEarned: 0,
        evidence: ['HSTS is not applicable on unencrypted HTTP connections'],
        observed: 'HTTP site',
        expected: 'N/A',
      });
    } else if (headersData.hsts) {
      recordResult({
        ruleId: 'sec-hsts',
        findingId: 'sec-hsts-passed',
        status: 'passed',
        pointsEarned: hstsRule.weight,
        evidence: [`HSTS configured: ${headersData.hsts}`],
        observed: headersData.hsts,
        expected: 'Strict-Transport-Security header present',
      });
    } else {
      recordResult({
        ruleId: 'sec-hsts',
        findingId: 'sec-hsts-missing',
        status: 'failed',
        severityOverride: 'medium',
        pointsEarned: 0,
        evidence: ['No Strict-Transport-Security header detected on HTTPS response'],
        observed: 'Missing',
        expected: 'Strict-Transport-Security header present',
      });
    }

    // X-Content-Type-Options
    const nosniffRule = SECURITY_RULES_BY_ID['sec-nosniff'];
    if ((headersData.xContentType || '').toLowerCase().includes('nosniff')) {
      recordResult({
        ruleId: 'sec-nosniff',
        findingId: 'sec-nosniff-passed',
        status: 'passed',
        pointsEarned: nosniffRule.weight,
        evidence: ['Server explicitly sets X-Content-Type-Options: nosniff'],
        observed: 'nosniff',
        expected: 'X-Content-Type-Options: nosniff',
      });
    } else {
      recordResult({
        ruleId: 'sec-nosniff',
        findingId: 'sec-nosniff-missing',
        status: 'failed',
        severityOverride: 'medium',
        pointsEarned: 0,
        evidence: ['No nosniff directive found in X-Content-Type-Options header'],
        observed: 'Missing',
        expected: 'X-Content-Type-Options: nosniff',
      });
    }

    // Clickjacking (X-Frame-Options or frame-ancestors)
    const frameRule = SECURITY_RULES_BY_ID['sec-frame'];
    const hasFrameProtection = Boolean(headersData.xFrameOptions) || (headersData.csp || '').includes('frame-ancestors');
    if (hasFrameProtection) {
      recordResult({
        ruleId: 'sec-frame',
        findingId: 'sec-frame-passed',
        status: 'passed',
        pointsEarned: frameRule.weight,
        evidence: [
          headersData.xFrameOptions
            ? `X-Frame-Options: ${headersData.xFrameOptions}`
            : 'CSP frame-ancestors directive present',
        ],
        observed: headersData.xFrameOptions || 'CSP frame-ancestors',
        expected: 'X-Frame-Options or CSP frame-ancestors',
      });
    } else {
      recordResult({
        ruleId: 'sec-frame',
        findingId: 'sec-frame-missing',
        status: 'failed',
        severityOverride: 'medium',
        pointsEarned: 0,
        evidence: ['Neither X-Frame-Options nor CSP frame-ancestors detected'],
        observed: 'Missing',
        expected: 'X-Frame-Options or CSP frame-ancestors',
      });
    }

    // Referrer-Policy
    const refRule = SECURITY_RULES_BY_ID['sec-referrer'];
    if (headersData.referrerPolicy) {
      recordResult({
        ruleId: 'sec-referrer',
        findingId: 'sec-referrer-passed',
        status: 'passed',
        pointsEarned: refRule.weight,
        evidence: [`Referrer-Policy: ${headersData.referrerPolicy}`],
        observed: headersData.referrerPolicy,
        expected: 'Referrer-Policy declared',
      });
    } else {
      recordResult({
        ruleId: 'sec-referrer',
        findingId: 'sec-referrer-missing',
        status: 'failed',
        severityOverride: 'low',
        pointsEarned: 0,
        evidence: ['No Referrer-Policy header specified'],
        observed: 'Missing',
        expected: 'Referrer-Policy declared',
      });
    }

    // Permissions-Policy
    const permRule = SECURITY_RULES_BY_ID['sec-permissions'];
    if (headersData.permissionsPolicy) {
      recordResult({
        ruleId: 'sec-permissions',
        findingId: 'sec-permissions-passed',
        status: 'passed',
        pointsEarned: permRule.weight,
        evidence: [`Permissions-Policy: ${headersData.permissionsPolicy.slice(0, 50)}...`],
        observed: 'Configured',
        expected: 'Permissions-Policy declared',
      });
    } else {
      recordResult({
        ruleId: 'sec-permissions',
        findingId: 'sec-permissions-missing',
        status: 'failed',
        severityOverride: 'low',
        pointsEarned: 0,
        evidence: ['No Permissions-Policy header found'],
        observed: 'Missing',
        expected: 'Permissions-Policy declared',
      });
    }
  }

  // 4. Reverse Tabnabbing Audit (target="_blank" without rel="noopener")
  const tabRule = SECURITY_RULES_BY_ID['sec-tabnabbing'];
  if (targetBlankLinks.vulnerableCount > 0) {
    const sampleHrefs = targetBlankLinks.samples?.slice(0, 3).map((l) => l.href).join(', ') || '';
    recordResult({
      ruleId: 'sec-tabnabbing',
      findingId: 'sec-tabnabbing-vulnerable',
      status: 'warning',
      severityOverride: 'medium',
      pointsEarned: 0,
      evidence: [
        `${targetBlankLinks.vulnerableCount} link(s) open in new tabs without rel="noopener" or rel="noreferrer"${sampleHrefs ? `: ${sampleHrefs}` : ''}`,
      ],
      observed: `${targetBlankLinks.vulnerableCount} vulnerable link(s)`,
      expected: 'rel="noopener noreferrer" on all target="_blank"',
    });
  } else {
    recordResult({
      ruleId: 'sec-tabnabbing',
      findingId: 'sec-tabnabbing-passed',
      status: 'passed',
      pointsEarned: tabRule.weight,
      evidence: [
        targetBlankLinks.total > 0
          ? `All ${targetBlankLinks.total} target="_blank" link(s) include rel="noopener" or rel="noreferrer"`
          : 'No target="_blank" links detected on page',
      ],
      observed: '0 vulnerable links',
      expected: 'rel="noopener noreferrer" on all target="_blank"',
    });
  }

  // 5. Third-Party Dependency Surface
  const tpRule = SECURITY_RULES_BY_ID['sec-third-party'];
  if (thirdPartyResources.thirdPartyTotal > 25) {
    recordResult({
      ruleId: 'sec-third-party',
      findingId: 'sec-third-party-high',
      status: 'warning',
      severityOverride: 'medium',
      pointsEarned: 0,
      evidence: [
        `${thirdPartyResources.thirdPartyTotal} third-party resource(s) loaded from ${thirdPartyResources.topDomains?.length || 0} external domain(s).`,
      ],
      observed: `${thirdPartyResources.thirdPartyTotal} third-party resources`,
      expected: '≤ 25 third-party resources',
    });
  } else {
    recordResult({
      ruleId: 'sec-third-party',
      findingId: 'sec-third-party-passed',
      status: 'passed',
      pointsEarned: tpRule.weight,
      evidence: [`${thirdPartyResources.thirdPartyTotal} third-party resource(s) loaded`],
      observed: `${thirdPartyResources.thirdPartyTotal} third-party resources`,
      expected: '≤ 25 third-party resources',
    });
  }

  // 6. CSP Readiness (Inline Scripts - informational note)
  if (inlineScripts.count > 0) {
    findings.push({
      id: 'sec-inline-scripts-warning',
      ruleId: 'sec-inline-scripts',
      title: 'CSP Readiness: Inline Scripts Detected',
      severity: 'low',
      evidence: `${inlineScripts.count} inline <script> block(s) detected in page markup.`,
      whyItMatters: 'Strict Content-Security-Policy rules block inline script execution to prevent XSS. Migrating inline code is necessary for strict CSP.',
      recommendation: 'Refactor inline scripts into external bundled scripts or supply cryptographic sha256 nonces.',
    });
  } else {
    findings.push({
      id: 'sec-inline-scripts-passed',
      ruleId: 'sec-inline-scripts',
      title: 'No Inline Scripts Detected',
      severity: 'passed',
      evidence: 'All scripts are loaded via external source attributes',
      whyItMatters: 'Facilitates the deployment of a strict CSP without unsafe-inline.',
      recommendation: 'Continue avoiding inline script tags.',
    });
  }

  // Calculate score using standard model
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
    headersSummary,
    mixedContent,
    cookies,
    thirdParty: thirdPartyResources,
  };
}
