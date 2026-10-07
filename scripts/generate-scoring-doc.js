import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { RULES_BY_CATEGORY } from '../src/analyzers/rules/index.js';
import { CATEGORY_WEIGHTS } from '../src/analyzers/scoring.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const docsDir = resolve(__dirname, '../docs');
const targetFile = resolve(docsDir, 'SCORING.md');

function formatThreshold(t) {
  if (!t) return '—';
  if (typeof t !== 'object') return String(t);
  const parts = [];
  if (t.min !== undefined && t.max !== undefined) return `${t.min} – ${t.max}`;
  if (t.good !== undefined) {
    const unit = t.unit ? ` ${t.unit}` : '';
    return `good: ≤ ${t.good}${unit}` + (t.needsImprovement !== undefined ? `, fair: ≤ ${t.needsImprovement}${unit}` : '');
  }
  if (t.min !== undefined) parts.push(`min: ${t.min}`);
  if (t.max !== undefined) parts.push(`max: ${t.max}${t.unit ? ` ${t.unit}` : ''}`);
  if (t.target !== undefined) parts.push(`target: ${t.target}`);
  if (parts.length > 0) return parts.join(', ');
  return JSON.stringify(t);
}

function formatSource(rule) {
  if (rule.source === 'standard') {
    return rule.reference ? `Standard (${rule.reference})` : 'Standard';
  }
  return 'Heuristic';
}

function generateMarkdown() {
  let md = `# WebXray Scoring Engine Specification & Rule Catalog

> **Version:** 1.0  
> **Architecture:** Fully transparent, deterministic, auditable scoring trace:  
> \`Score -> Rules -> Evidence -> Recommendation\`

---

## 1. Scoring Formula & Model

Every category score and the overall health score are computed deterministically from evaluated rules:

### Category Score Formula
\`\`\`text
Category Score = Math.round(
  ( sum(pointsEarned) / sum(pointsPossible of applicable rules) ) * 100
)
\`\`\`

- **Applicability Guarantee:** Any rule marked \`not_applicable\` or \`unverified\` is **strictly excluded** from both pointsEarned and pointsPossible. They are listed transparently in the ledger but never penalize or artificially inflate the score.
- **Partial Credit:** Where appropriate (e.g., partial image alt text compliance, partial button accessibility), points are awarded proportionally:
  \`\`\`text
  pointsEarned = Math.round((passingCount / totalEvaluated) * rule.weight)
  \`\`\`
  The exact evaluation formula and ratios are published in the audit ledger evidence.
- **Deduction Derivation:** Breakdown deductions are strictly derived from rule results (\`pointsPossible - pointsEarned\`), eliminating ad-hoc penalties.

### Overall Score Formula
The overall score is a weighted composite of the five diagnostic categories:

\`\`\`text
Overall Score = Math.round(
  (Performance × 0.20) +
  (SEO × 0.20) +
  (Accessibility × 0.20) +
  (Security × 0.20) +
  (Best Practices × 0.20)
)
\`\`\`

| Category | Category Weight | Description |
| :--- | :--- | :--- |
| **Performance** | ${CATEGORY_WEIGHTS.performance * 100}% (0.20) | Core Web Vitals (LCP, CLS, TTFB), asset hygiene, and render-blocking scripts |
| **SEO** | ${CATEGORY_WEIGHTS.seo * 100}% (0.20) | Metadata presence, heading hierarchy, canonicalization, robots, and open graph |
| **Accessibility** | ${CATEGORY_WEIGHTS.accessibility * 100}% (0.20) | WCAG 2.1 AA foundation: labels, alternative text, landmarks, and keyboard hygiene |
| **Security** | ${CATEGORY_WEIGHTS.security * 100}% (0.20) | Transport security (HTTPS), mixed content, headers (CSP, HSTS), tabnabbing protection |
| **Best Practices** | ${CATEGORY_WEIGHTS.bestPractices * 100}% (0.20) | Cross-domain reliability, protocol standards, secure links, and web standards |

---

## 2. Heuristic Thresholds Disclaimer

**Thresholds marked heuristic are opinionated defaults, not Lighthouse-equivalent scores.**

While standard rules adhere to published specifications (e.g., WCAG 2.1 AA criteria, HTTP RFCs, WHATWG standards), heuristic rules represent pragmatic engineering thresholds tailored for real-world web auditing. They are calibrated to highlight actionable bottlenecks without triggering false alarms.

---

## 3. Complete Rule Catalog by Category

`;

  const categoryNames = {
    performance: 'Performance',
    seo: 'Search Engine Optimization (SEO)',
    accessibility: 'Accessibility (A11y)',
    security: 'Security',
    bestPractices: 'Best Practices',
  };

  for (const [catKey, rules] of Object.entries(RULES_BY_CATEGORY)) {
    const totalWeight = rules.reduce((acc, r) => acc + (r.weight || 0), 0);
    const catName = categoryNames[catKey] || catKey;

    md += `### ${catName} (Total Weight: ${totalWeight} pts)\n\n`;
    md += `| Rule ID | Title | Weight | Threshold | Source / Ref | Severity |\n`;
    md += `| :--- | :--- | :---: | :--- | :--- | :---: |\n`;

    for (const rule of rules) {
      const th = formatThreshold(rule.threshold);
      const src = formatSource(rule);
      const sev = rule.severityOnFail || 'medium';
      md += `| \`${rule.id}\` | ${rule.title} | **${rule.weight}** | ${th} | ${src} | \`${sev}\` |\n`;
    }

    md += `\n#### Detailed Check Definitions:\n\n`;
    for (const rule of rules) {
      md += `##### \`${rule.id}\`: ${rule.title}\n`;
      md += `- **Description:** ${rule.description}\n`;
      md += `- **Why It Matters:** ${rule.whyItMatters}\n`;
      md += `- **Recommendation:** ${rule.recommendation}\n`;
      if (rule.threshold) {
        md += `- **Threshold:** \`${formatThreshold(rule.threshold)}\`\n`;
      }
      md += `- **Source:** ${formatSource(rule)}\n\n`;
    }

    md += `---\n\n`;
  }

  md += `## 4. Report Storage & Audit Ledger Verification

1. **Storage Hygiene:** Reports persist rule outcomes (\`ruleId\`, \`status\`, \`pointsEarned\`, \`pointsPossible\`, \`observed\`, \`expected\`, and evidence truncated to at most 10 items and 200 characters). Full DOM content and sensitive attributes are **never** retained.
2. **Scoring Versioning (\`scoringVersion: "1.0"\`):** Whenever weights or rule thresholds are adjusted, the version identifier increments. Report comparisons between differing versions emit an explicit comparability warning:
   > *"Scoring model version mismatch (v1.0 vs v...): scores are not directly comparable."*
3. **Deterministic Output:** Given identical collector input payloads, analyzer output is pure, deterministic, and free of arbitrary timestamps or random values.
`;

  return md;
}

if (!existsSync(docsDir)) {
  mkdirSync(docsDir, { recursive: true });
}

const content = generateMarkdown();
writeFileSync(targetFile, content, 'utf-8');
console.log(`[generate-scoring-doc] Successfully generated ${targetFile}`);
