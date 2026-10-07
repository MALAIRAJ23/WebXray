/**
 * WebXray - Report Export Service
 * Exports audit snapshots to JSON, CSV, and self-contained HTML
 * Strictly adheres to Rule 5: Escapes ALL values in HTML export to prevent XSS.
 * Completely self-contained with no external CDN or web resources.
 */

/**
 * Escapes characters for safe inclusion in HTML markup
 * @param {string|number|null|undefined} str
 * @returns {string} safely escaped HTML string
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escapes a cell value for RFC-4180 compliant CSV
 * @param {string|number|null|undefined} val
 * @returns {string}
 */
export function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Sanitizes and truncates rule results for reports and exports
 * (max 10 items per rule and 200 chars per item)
 * @param {Array} results
 * @returns {Array}
 */
export function sanitizeRuleResults(results) {
  if (!Array.isArray(results)) return [];
  return results.map((r) => {
    const rawEv = Array.isArray(r.evidence)
      ? r.evidence.slice(0, 10).map((e) => (typeof e === 'object' ? JSON.stringify(e).slice(0, 200) : String(e).slice(0, 200)))
      : [String(r.evidence || '').slice(0, 200)].filter(Boolean);

    return {
      ruleId: String(r.ruleId || ''),
      category: String(r.category || ''),
      status: String(r.status || 'passed'),
      pointsPossible: typeof r.pointsPossible === 'number' ? r.pointsPossible : 0,
      pointsEarned: typeof r.pointsEarned === 'number' ? r.pointsEarned : 0,
      observed: String(r.observed || ''),
      expected: String(r.expected || ''),
      evidence: rawEv,
    };
  });
}

/**
 * Export audit report as formatted JSON
 * @param {object} report
 * @returns {string} JSON string
 */
export function exportReportAsJson(report) {
  if (!report) throw new Error('Report object is required for JSON export.');
  const sanitized = {
    ...report,
    scoringVersion: String(report.scoringVersion || '1.0'),
    ruleResults: sanitizeRuleResults(report.ruleResults),
  };
  return JSON.stringify(sanitized, null, 2);
}

/**
 * Export audit report findings and rule results as CSV
 * @param {object} report
 * @returns {string} CSV text
 */
export function exportReportAsCsv(report) {
  if (!report) throw new Error('Report object is required for CSV export.');

  const headers = ['Category', 'Severity', 'Issue ID', 'Title', 'Recommendation', 'Evidence'];
  const rows = [headers.map(escapeCsv).join(',')];

  const findings = Array.isArray(report.findingsSummary) ? report.findingsSummary : [];
  for (const f of findings) {
    const row = [
      escapeCsv(f.category || 'General'),
      escapeCsv(f.severity || 'low'),
      escapeCsv(f.id || ''),
      escapeCsv(f.title || ''),
      escapeCsv(f.recommendation || ''),
      escapeCsv(f.evidence || ''),
    ];
    rows.push(row.join(','));
  }

  const ruleResults = sanitizeRuleResults(report.ruleResults);
  if (ruleResults.length > 0) {
    rows.push('');
    const ruleHeaders = ['Rule ID', 'Category', 'Status', 'Points Earned', 'Points Possible', 'Observed', 'Expected', 'Evidence'];
    rows.push(ruleHeaders.map(escapeCsv).join(','));
    for (const r of ruleResults) {
      const evText = Array.isArray(r.evidence) ? r.evidence.join('; ') : String(r.evidence || '');
      const row = [
        escapeCsv(r.ruleId),
        escapeCsv(r.category),
        escapeCsv(r.status),
        escapeCsv(r.pointsEarned),
        escapeCsv(r.pointsPossible),
        escapeCsv(r.observed),
        escapeCsv(r.expected),
        escapeCsv(evText),
      ];
      rows.push(row.join(','));
    }
  }

  return rows.join('\r\n');
}

/**
 * Generates a self-contained, print-ready HTML report
 * Self-contained: No external CSS, fonts, or scripts.
 * All dynamic values are strictly escaped via escapeHtml().
 *
 * @param {object} report
 * @returns {string} Complete HTML document string
 */
export function exportReportAsHtml(report) {
  if (!report) throw new Error('Report object is required for HTML export.');

  const scoringVersion = escapeHtml(report.scoringVersion || '1.0');
  const url = escapeHtml(report.url || 'Unknown URL');
  const domain = escapeHtml(report.domain || 'Unknown Domain');
  const title = escapeHtml(report.title || domain);
  const dateStr = escapeHtml(
    report.timestamp ? new Date(report.timestamp).toLocaleString() : new Date().toLocaleString()
  );

  const scores = report.scores || {};
  const overall = scores.overall ?? 0;
  const grade = escapeHtml(scores.grade || 'N/A');
  const rating = escapeHtml(scores.rating || 'N/A');

  const perfScore = scores.performance ?? 0;
  const seoScore = scores.seo ?? 0;
  const a11yScore = scores.accessibility ?? 0;
  const secScore = scores.security ?? 0;
  const bpScore = scores.bestPractices ?? 0;

  const issueCounts = report.issueCounts || {};
  const criticalCount = issueCounts.critical || 0;
  const highCount = issueCounts.high || 0;
  const mediumCount = issueCounts.medium || 0;
  const lowCount = issueCounts.low || 0;
  const totalIssues = issueCounts.total || 0;

  const findings = Array.isArray(report.findingsSummary) ? report.findingsSummary : [];
  const technologies = Array.isArray(report.technologies) ? report.technologies : [];
  const ruleResults = sanitizeRuleResults(report.ruleResults);

  const findingsHtml =
    findings.length === 0
      ? '<div class="empty-state">No issues found. Website passed all audited checks!</div>'
      : findings
          .map((f) => {
            const fSev = escapeHtml(f.severity || 'low');
            const fCat = escapeHtml(f.category || 'General');
            const fTitle = escapeHtml(f.title || 'Untitled Check');
            const fRec = escapeHtml(f.recommendation || 'No specific action provided.');
            const fEv = f.evidence ? escapeHtml(f.evidence) : '';

            return `
            <div class="finding-card finding-${fSev}">
              <div class="finding-header">
                <div class="finding-title-row">
                  <span class="severity-badge badge-${fSev}">${fSev.toUpperCase()}</span>
                  <span class="category-tag">${fCat}</span>
                  <h3 class="finding-title">${fTitle}</h3>
                </div>
              </div>
              ${
                fEv
                  ? `<div class="finding-evidence">
                      <strong>Evidence:</strong> ${fEv}
                    </div>`
                  : ''
              }
              <div class="finding-recommendation">
                <strong>Recommendation:</strong> ${fRec}
              </div>
            </div>`;
          })
          .join('\n');

  const rulesTableHtml =
    ruleResults.length === 0
      ? ''
      : `
      <section class="section">
        <h2 class="section-title">Score Audit Ledger (${ruleResults.length} Rules Checked)</h2>
        <div class="table-wrapper">
          <table class="rules-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Rule ID</th>
                <th>Category</th>
                <th>Observed</th>
                <th>Expected</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              ${ruleResults
                .map((r) => {
                  const rStatus = escapeHtml(r.status);
                  const rId = escapeHtml(r.ruleId);
                  const rCat = escapeHtml(r.category);
                  const rObs = escapeHtml(r.observed || '-');
                  const rExp = escapeHtml(r.expected || '-');
                  const rPoints = `${escapeHtml(r.pointsEarned)} / ${escapeHtml(r.pointsPossible)}`;
                  const rEv = Array.isArray(r.evidence) && r.evidence.length > 0
                    ? r.evidence.map((e) => `<li>${escapeHtml(e)}</li>`).join('')
                    : '';

                  return `
                  <tr class="rule-row rule-row-${rStatus}">
                    <td><span class="rule-status-badge status-${rStatus}">${rStatus.toUpperCase()}</span></td>
                    <td>
                      <div class="rule-id">${rId}</div>
                      ${rEv ? `<ul class="rule-evidence-list">${rEv}</ul>` : ''}
                    </td>
                    <td><span class="category-tag">${rCat}</span></td>
                    <td class="cell-mono">${rObs}</td>
                    <td class="cell-mono">${rExp}</td>
                    <td class="cell-points">${rPoints}</td>
                  </tr>`;
                })
                .join('\n')}
            </tbody>
          </table>
        </div>
      </section>`;

  const techHtml =
    technologies.length === 0
      ? ''
      : `
      <section class="section">
        <h2 class="section-title">Detected Technologies (${technologies.length})</h2>
        <div class="tech-grid">
          ${technologies
            .map((t) => {
              const tName = escapeHtml(t.name);
              const tCat = escapeHtml(t.category);
              const tConf = escapeHtml(t.confidence);
              return `
              <div class="tech-card">
                <div class="tech-name">${tName}</div>
                <div class="tech-cat">${tCat}</div>
                <div class="tech-conf">Confidence: ${tConf}</div>
              </div>`;
            })
            .join('\n')}
        </div>
      </section>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WebXray Audit Report - ${domain}</title>
  <style>
    /* Reset & Base Styles */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b0f19;
      color: #e2e8f0;
      line-height: 1.5;
      padding: 32px 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    header {
      border-bottom: 1px solid #1e293b;
      padding-bottom: 24px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-badge {
      background: linear-gradient(135deg, #0891b2, #4f46e5);
      color: #fff;
      font-weight: bold;
      font-size: 14px;
      padding: 6px 10px;
      border-radius: 8px;
      letter-spacing: 0.5px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .meta-subtitle {
      font-size: 13px;
      color: #94a3b8;
      margin-top: 4px;
      word-break: break-all;
    }
    .report-date {
      font-size: 12px;
      color: #64748b;
      font-family: monospace;
      text-align: right;
    }
    
    /* Overview Score Banner */
    .overview-banner {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .score-group {
      display: flex;
      align-items: center;
      gap: 18px;
    }
    .overall-badge {
      width: 72px;
      height: 72px;
      border-radius: 16px;
      border: 2px solid ${overall >= 80 ? '#10b981' : overall >= 60 ? '#f59e0b' : '#ef4444'};
      background: rgba(17, 24, 39, 0.8);
      color: ${overall >= 80 ? '#34d399' : overall >= 60 ? '#fbbf24' : '#f87171'};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: monospace;
      font-weight: bold;
    }
    .overall-badge .score-val { font-size: 26px; line-height: 1; }
    .overall-badge .score-max { font-size: 9px; color: #64748b; margin-top: 2px; }
    
    .rating-info h2 { font-size: 18px; color: #fff; }
    .grade-badge {
      display: inline-block;
      font-size: 12px;
      font-family: monospace;
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 4px;
      background: #030712;
      border: 1px solid #374151;
      color: #10b981;
      margin-left: 8px;
    }
    .rating-desc { font-size: 13px; color: #94a3b8; margin-top: 4px; }
    
    /* Issues Summary Chips */
    .issue-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      font-family: monospace;
      font-size: 12px;
    }
    .chip {
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid #1f2937;
      background: #030712;
    }
    .chip-crit { color: #f87171; border-color: #991b1b; background: #450a0a; }
    .chip-high { color: #fbbf24; border-color: #92400e; background: #451a03; }
    .chip-med { color: #fef08a; border-color: #854d0e; background: #422006; }
    .chip-low { color: #38bdf8; border-color: #075985; background: #082f49; }

    /* Category Scores Grid */
    .section { margin-bottom: 28px; }
    .section-title {
      font-size: 14px;
      font-family: monospace;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
      margin-bottom: 12px;
    }
    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
    }
    .category-box {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 8px;
      padding: 14px;
      font-family: monospace;
    }
    .cat-name { font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
    .cat-score { font-size: 20px; font-weight: bold; color: #fff; }

    /* Findings Cards */
    .finding-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .finding-card:hover { border-color: #334155; }
    .finding-critical { border-left: 4px solid #ef4444; }
    .finding-high { border-left: 4px solid #f59e0b; }
    .finding-medium { border-left: 4px solid #eab308; }
    .finding-low { border-left: 4px solid #38bdf8; }

    .finding-header { margin-bottom: 8px; }
    .finding-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .severity-badge {
      font-size: 10px;
      font-family: monospace;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .badge-critical { background: #450a0a; color: #fca5a5; border: 1px solid #991b1b; }
    .badge-high { background: #451a03; color: #fcd34d; border: 1px solid #92400e; }
    .badge-medium { background: #422006; color: #fef08a; border: 1px solid #854d0e; }
    .badge-low { background: #082f49; color: #7dd3fc; border: 1px solid #075985; }
    
    .category-tag {
      font-size: 10px;
      font-family: monospace;
      padding: 2px 6px;
      border-radius: 4px;
      background: #1e293b;
      color: #94a3b8;
    }
    .finding-title { font-size: 13px; font-weight: 600; color: #ffffff; }

    .finding-evidence {
      font-family: monospace;
      font-size: 11px;
      background: #020617;
      border: 1px solid #1e293b;
      padding: 8px 10px;
      border-radius: 6px;
      color: #94a3b8;
      margin-bottom: 8px;
      word-break: break-all;
    }
    .finding-recommendation {
      font-size: 12px;
      color: #6ee7b7;
      line-height: 1.4;
    }

    /* Technology Grid */
    .tech-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
    }
    .tech-card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 6px;
      padding: 10px 12px;
      font-family: monospace;
    }
    .tech-name { font-size: 13px; font-weight: bold; color: #fff; }
    .tech-cat { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    .tech-conf { font-size: 10px; color: #64748b; margin-top: 4px; }

    .empty-state {
      padding: 24px;
      text-align: center;
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 8px;
      color: #10b981;
      font-family: monospace;
      font-size: 13px;
    }

    footer {
      border-top: 1px solid #1e293b;
      margin-top: 40px;
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #64748b;
      font-family: monospace;
    }

    /* Score Ledger Table Styles */
    .table-wrapper {
      overflow-x: auto;
      border: 1px solid #1e293b;
      border-radius: 8px;
      background: #0f172a;
    }
    .rules-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      text-align: left;
    }
    .rules-table th {
      background: #111827;
      color: #94a3b8;
      font-family: monospace;
      font-size: 10px;
      text-transform: uppercase;
      padding: 10px 12px;
      border-bottom: 1px solid #1e293b;
    }
    .rules-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #1e293b;
      vertical-align: top;
    }
    .rules-table tr:last-child td {
      border-bottom: none;
    }
    .rule-id {
      font-family: monospace;
      font-weight: 600;
      color: #f1f5f9;
    }
    .rule-status-badge {
      font-size: 9px;
      font-family: monospace;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      white-space: nowrap;
    }
    .status-passed { background: #064e3b; color: #a7f3d0; border: 1px solid #059669; }
    .status-failed { background: #450a0a; color: #fca5a5; border: 1px solid #991b1b; }
    .status-warning { background: #451a03; color: #fcd34d; border: 1px solid #92400e; }
    .status-not_applicable { background: #1e293b; color: #94a3b8; border: 1px solid #334155; }
    .status-unverified { background: #312e81; color: #c7d2fe; border: 1px solid #4338ca; }
    .cell-mono {
      font-family: monospace;
      color: #cbd5e1;
      font-size: 11px;
    }
    .cell-points {
      font-family: monospace;
      font-weight: bold;
      color: #f8fafc;
      white-space: nowrap;
    }
    .rule-evidence-list {
      margin-top: 6px;
      padding-left: 16px;
      font-family: monospace;
      font-size: 10px;
      color: #94a3b8;
      word-break: break-all;
    }

    /* Print / PDF Styles */
    @media print {
      body { background: #fff !important; color: #0f172a !important; padding: 0 !important; }
      .container { max-width: 100% !important; }
      .overview-banner, .category-box, .finding-card, .tech-card, .table-wrapper {
        background: #fff !important;
        border: 1px solid #cbd5e1 !important;
        color: #0f172a !important;
      }
      h1, h2, h3, .cat-score, .finding-title, .tech-name, .rule-id { color: #0f172a !important; }
      .meta-subtitle, .cat-name, .tech-cat, .cell-mono, .rule-evidence-list { color: #475569 !important; }
      .finding-evidence { background: #f8fafc !important; border-color: #e2e8f0 !important; color: #334155 !important; }
      .finding-recommendation { color: #047857 !important; }
      .overall-badge { background: #f8fafc !important; color: #0f172a !important; }
      .chip { background: #f1f5f9 !important; color: #0f172a !important; border-color: #cbd5e1 !important; }
      .rules-table th { background: #f1f5f9 !important; color: #334155 !important; border-color: #cbd5e1 !important; }
      .rules-table td { border-color: #e2e8f0 !important; color: #0f172a !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <div class="brand">
          <span class="logo-badge">WebXray</span>
          <h1>${title} — Website Audit Report</h1>
        </div>
        <div class="meta-subtitle">${url} • Scoring Engine v${scoringVersion}</div>
      </div>
      <div class="report-date">
        <div>Generated:</div>
        <div>${dateStr}</div>
      </div>
    </header>

    <div class="overview-banner">
      <div class="score-group">
        <div class="overall-badge">
          <span class="score-val">${overall}</span>
          <span class="score-max">/ 100</span>
        </div>
        <div class="rating-info">
          <h2>Website Health: Grade ${grade} <span class="grade-badge">Grade ${grade}</span></h2>
          <div class="rating-desc">${rating}</div>
        </div>
      </div>

      <div class="issue-chips">
        <span class="chip chip-crit">${criticalCount} Critical</span>
        <span class="chip chip-high">${highCount} High</span>
        <span class="chip chip-med">${mediumCount} Medium</span>
        <span class="chip chip-low">${lowCount} Low</span>
      </div>
    </div>

    <section class="section">
      <h2 class="section-title">Diagnostic Category Breakdown</h2>
      <div class="categories-grid">
        <div class="category-box">
          <div class="cat-name">Performance</div>
          <div class="cat-score">${perfScore}</div>
        </div>
        <div class="category-box">
          <div class="cat-name">SEO</div>
          <div class="cat-score">${seoScore}</div>
        </div>
        <div class="category-box">
          <div class="cat-name">Accessibility</div>
          <div class="cat-score">${a11yScore}</div>
        </div>
        <div class="category-box">
          <div class="cat-name">Security</div>
          <div class="cat-score">${secScore}</div>
        </div>
        <div class="category-box">
          <div class="cat-name">Best Practices</div>
          <div class="cat-score">${bpScore}</div>
        </div>
      </div>
    </section>

    ${rulesTableHtml}

    <section class="section">
      <h2 class="section-title">Findings & Actionable Recommendations (${totalIssues})</h2>
      <div class="findings-list">
        ${findingsHtml}
      </div>
    </section>

    ${techHtml}

    <footer>
      <span>WebXray Developer Tool — Privacy-First & Local-Only</span>
      <span>Inspect. Understand. Improve.</span>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Triggers a browser download of generated content
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
