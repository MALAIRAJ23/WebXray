import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { getRule } from '../../analyzers/rules/index.js';

/**
 * Format ledger into clean plain-text output
 * Supports both options object or positional arguments:
 * formatScoreLedgerAsText({ title, score, results, recommendations })
 * formatScoreLedgerAsText(title, score, results, recommendations)
 *
 * @param {object|string} titleOrOptions
 * @param {number} [maybeScore]
 * @param {Array} [maybeResults]
 * @param {Array} [maybeRecommendations]
 * @returns {string} plain text report
 */
export function formatScoreLedgerAsText(titleOrOptions = 'Audit', maybeScore = 0, maybeResults = [], maybeRecommendations = []) {
  const options = (typeof titleOrOptions === 'object' && titleOrOptions !== null && !Array.isArray(titleOrOptions))
    ? titleOrOptions
    : { title: titleOrOptions, score: maybeScore, results: maybeResults, recommendations: maybeRecommendations };

  const { title = 'Audit', score = 0, results = [], recommendations = [] } = options;
  const lines = [];
  lines.push(`${title} ${score}/100`);
  lines.push('Evidence');

  const statusTags = {
    passed: 'pass',
    failed: 'fail',
    warning: 'warn',
    not_applicable: 'n/a',
    unverified: 'unverified',
  };

  for (const r of results) {
    const tag = statusTags[r.status] || r.status;
    const ruleInfo = getRule(r.ruleId);
    const ruleTitle = r.title || ruleInfo?.title || r.ruleId;
    const obs = r.observed ? ` (${r.observed})` : '';
    lines.push(`[${tag}] ${ruleTitle}${obs}`);
  }

  const recList = recommendations.length > 0
    ? recommendations
    : results
        .filter((r) => r.status === 'failed' || r.status === 'warning')
        .map((r) => {
          const ruleInfo = getRule(r.ruleId);
          return r.recommendation || ruleInfo?.recommendation;
        })
        .filter(Boolean);

  if (recList.length > 0) {
    lines.push('Recommendation');
    recList.forEach((rec) => {
      lines.push(typeof rec === 'string' ? rec : rec.recommendation || rec.title);
    });
  }

  return lines.join('\n');
}

/**
 * ScoreLedger Component
 * Fully transparent, auditable ledger: Score -> Rules -> Evidence -> Recommendation
 */
export default function ScoreLedger({
  title = 'Diagnostic Audit',
  score = 0,
  results = [],
  isOverall = false,
  overallData = null,
  onSelectTab,
}) {
  const [expandedRows, setExpandedRows] = useState({});
  const [copied, setCopied] = useState(false);

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Sort results:
  // 1. failed first (by points lost descending)
  // 2. warnings second (by points lost descending)
  // 3. passed third
  // 4. not_applicable and unverified at the bottom
  const sortedResults = [...results].sort((a, b) => {
    const rank = (status) => {
      if (status === 'failed') return 1;
      if (status === 'warning') return 2;
      if (status === 'passed') return 3;
      return 4; // not_applicable, unverified
    };

    const rankA = rank(a.status);
    const rankB = rank(b.status);
    if (rankA !== rankB) return rankA - rankB;

    const lostA = (a.pointsPossible || 0) - (a.pointsEarned || 0);
    const lostB = (b.pointsPossible || 0) - (b.pointsEarned || 0);
    return lostB - lostA;
  });

  const passedCount = results.filter((r) => r.status === 'passed').length;
  const naCount = results.filter((r) => r.status === 'not_applicable').length;
  const unverifiedCount = results.filter((r) => r.status === 'unverified').length;
  const applicableCount = results.length - naCount - unverifiedCount;

  let summarySentence = `${passedCount} of ${applicableCount > 0 ? applicableCount : results.length} checks passed.`;
  if (naCount > 0) summarySentence += ` ${naCount} not applicable.`;
  if (unverifiedCount > 0) summarySentence += ` ${unverifiedCount} unverified.`;

  const handleCopy = async () => {
    const text = formatScoreLedgerAsText({
      title,
      score,
      results: sortedResults,
    });

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[ScoreLedger] Failed to copy text:', err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#3fb950]">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Passed</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#f85149]">
            <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Failed</span>
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#d29922]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Warning</span>
          </span>
        );
      case 'not_applicable':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-wl-muted">
            <MinusCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>N/A</span>
          </span>
        );
      case 'unverified':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#4f8cff]">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Unverified</span>
          </span>
        );
    }
  };

  // OVERVIEW MODE: Overall Category Ledger + Biggest Point Losses
  if (isOverall && overallData) {
    const contributions = overallData.categoryContributions || {};
    const topLosses = overallData.topPointLossRules || [];

    const categoryList = [
      { key: 'performance', name: 'Performance' },
      { key: 'seo', name: 'SEO' },
      { key: 'accessibility', name: 'Accessibility' },
      { key: 'security', name: 'Security' },
      { key: 'bestPractices', name: 'Best Practices' },
    ];

    return (
      <div className="border border-wl-border rounded-[6px] bg-wl-surface p-4 text-wl-text font-sans space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-wl-border">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold text-wl-text">{title}</span>
              <span className="text-[16px] font-mono font-bold text-wl-text">
                {score} <span className="text-[12px] font-sans font-normal text-wl-muted">/ 100</span>
              </span>
            </div>
            <p className="text-[12px] text-wl-muted mt-0.5">
              Weighted composite of 5 independent diagnostic categories
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border border-wl-border text-[12px] font-medium text-wl-muted hover:text-wl-text hover:bg-wl-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff] transition-colors"
            title="Copy plain-text score ledger to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#3fb950]" />
                <span className="text-[#3fb950]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy as text</span>
              </>
            )}
          </button>
        </div>

        {/* Category Contribution Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-wl-border text-wl-muted font-medium text-[11px]">
                <th className="py-1.5 pr-3">Category</th>
                <th className="py-1.5 px-3 text-right">Weight</th>
                <th className="py-1.5 px-3 text-right">Score</th>
                <th className="py-1.5 pl-3 text-right">Points Contributed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wl-border/50">
              {categoryList.map((cat) => {
                const info = contributions[cat.key] || { weight: 0.2, score: 0, pointsContributed: 0 };
                const pct = Math.round((info.weight || 0.2) * 100);

                return (
                  <tr
                    key={cat.key}
                    onClick={() => onSelectTab && onSelectTab(cat.key === 'bestPractices' ? 'overview' : cat.key)}
                    className="hover:bg-wl-raised/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2 pr-3 font-medium text-wl-text">{cat.name}</td>
                    <td className="py-2 px-3 text-right font-mono text-wl-muted">{pct}%</td>
                    <td className="py-2 px-3 text-right font-mono text-wl-text font-semibold">{info.score}</td>
                    <td className="py-2 pl-3 text-right font-mono text-[#3fb950] font-semibold">
                      +{info.pointsContributed}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Biggest Point Losses */}
        {topLosses.length > 0 && (
          <div className="pt-3 border-t border-wl-border space-y-2">
            <h4 className="text-[12px] font-semibold text-wl-text flex items-center justify-between">
              <span>Biggest point losses (Top {topLosses.length})</span>
              <span className="text-[11px] font-normal text-wl-muted">Rules costing the most points</span>
            </h4>

            <div className="divide-y divide-wl-border/50 border border-wl-border rounded-[4px] bg-wl-bg/40">
              {topLosses.map((item, idx) => {
                const rowKey = `loss-${item.ruleId}-${idx}`;
                const isExpanded = Boolean(expandedRows[rowKey]);

                return (
                  <div key={rowKey} className="text-[12px]">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => toggleRow(rowKey)}
                      className="w-full text-left py-2 px-2.5 flex items-center justify-between gap-3 hover:bg-wl-raised/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff] rounded-[4px] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-wl-muted" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-wl-muted" />
                        )}
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-wl-raised text-wl-muted shrink-0">
                          {item.category}
                        </span>
                        <span className="font-medium text-wl-text truncate">{item.title}</span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-wl-muted text-[11px] hidden sm:inline">
                          {item.observed || 'Degraded'}
                        </span>
                        <span className="font-mono text-[#f85149] font-semibold">
                          -{item.pointsLost} pts
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-3 bg-wl-raised/40 border-t border-wl-border/50 space-y-2 text-[12px]">
                        {item.evidence && item.evidence.length > 0 && (
                          <div>
                            <span className="text-[11px] font-semibold text-wl-muted block mb-0.5">Evidence</span>
                            <ul className="list-disc list-inside space-y-0.5 text-wl-text">
                              {item.evidence.map((ev, eIdx) => (
                                <li key={eIdx} className="text-[11px] text-wl-text/90">
                                  {typeof ev === 'object' ? JSON.stringify(ev) : ev}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {item.whyItMatters && (
                          <div>
                            <span className="text-[11px] font-semibold text-wl-muted block mb-0.5">Why it matters</span>
                            <p className="text-[11px] text-wl-text leading-relaxed">{item.whyItMatters}</p>
                          </div>
                        )}

                        {item.recommendation && (
                          <div>
                            <span className="text-[11px] font-semibold text-[#3fb950] block mb-0.5">Recommendation</span>
                            <p className="text-[11px] text-wl-text leading-relaxed">{item.recommendation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // STANDARD CATEGORY LEDGER MODE
  return (
    <div className="border border-wl-border rounded-[6px] bg-wl-surface p-4 text-wl-text font-sans space-y-3">
      {/* 1. Header Row */}
      <div className="flex items-start justify-between pb-3 border-b border-wl-border">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-semibold text-wl-text">{title}</span>
            <span className="text-[16px] font-mono font-bold text-wl-text">
              {score} <span className="text-[12px] font-sans font-normal text-wl-muted">/ 100</span>
            </span>
          </div>
          <p className="text-[12px] text-wl-muted mt-0.5">{summarySentence}</p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border border-wl-border text-[12px] font-medium text-wl-muted hover:text-wl-text hover:bg-wl-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff] transition-colors shrink-0"
          title="Copy plain-text score ledger to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#3fb950]" />
              <span className="text-[#3fb950]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy as text</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Rules Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px] border-collapse">
          <thead>
            <tr className="border-b border-wl-border text-wl-muted font-medium text-[11px]">
              <th className="py-1.5 pr-2 w-28">Status</th>
              <th className="py-1.5 px-2">Rule Check</th>
              <th className="py-1.5 px-2 hidden sm:table-cell">Observed vs Expected</th>
              <th className="py-1.5 pl-2 text-right w-20">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-wl-border/50">
            {sortedResults.map((r) => {
              const ruleInfo = getRule(r.ruleId);
              const isExpanded = Boolean(expandedRows[r.ruleId]);
              const pointsLost = (r.pointsPossible || 0) - (r.pointsEarned || 0);

              return (
                <React.Fragment key={r.ruleId}>
                  <tr className="hover:bg-wl-raised/40 transition-colors">
                    <td className="py-2 pr-2 whitespace-nowrap">{getStatusBadge(r.status)}</td>
                    <td className="py-2 px-2">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => toggleRow(r.ruleId)}
                        className="text-left font-medium text-wl-text hover:text-[#4f8cff] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff] rounded-[2px] transition-colors group w-full"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-wl-muted" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-wl-muted group-hover:text-wl-text" />
                        )}
                        <span className="leading-snug">{ruleInfo?.title || r.title || r.ruleId}</span>
                      </button>
                    </td>
                    <td className="py-2 px-2 text-wl-muted text-[11px] hidden sm:table-cell">
                      <span className="text-wl-text font-mono">{r.observed}</span>
                      <span className="text-wl-muted ml-1">/ {r.expected}</span>
                    </td>
                    <td className="py-2 pl-2 text-right font-mono whitespace-nowrap">
                      {r.status === 'not_applicable' || r.status === 'unverified' ? (
                        <span className="text-wl-muted">—</span>
                      ) : (
                        <span className={pointsLost > 0 ? 'text-[#f85149] font-medium' : 'text-[#3fb950] font-medium'}>
                          {r.pointsEarned} / {r.pointsPossible}
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Expanded Row */}
                  {isExpanded && (
                    <tr className="bg-wl-raised/30">
                      <td colSpan={4} className="p-3 border-t border-wl-border/50 space-y-2.5">
                        {/* Evidence list */}
                        {r.evidence && r.evidence.length > 0 && (
                          <div>
                            <span className="text-[11px] font-semibold text-wl-muted block mb-1">Observed Evidence</span>
                            <ul className="list-disc list-inside space-y-1">
                              {r.evidence.map((item, idx) => (
                                <li key={idx} className="text-[12px] text-wl-text">
                                  {typeof item === 'object' ? (
                                    <span>
                                      {item.label}:{' '}
                                      {item.selector ? (
                                        <code className="font-mono bg-wl-surface px-1 py-0.5 rounded text-[11px] border border-wl-border">
                                          {item.selector}
                                        </code>
                                      ) : (
                                        item.value
                                      )}
                                    </span>
                                  ) : (
                                    <span>{item}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Why it matters */}
                        {ruleInfo?.whyItMatters && (
                          <div>
                            <span className="text-[11px] font-semibold text-wl-muted block mb-0.5">Why it matters</span>
                            <p className="text-[12px] text-wl-text leading-relaxed">{ruleInfo.whyItMatters}</p>
                          </div>
                        )}

                        {/* Recommendation */}
                        {ruleInfo?.recommendation && (
                          <div>
                            <span className="text-[11px] font-semibold text-[#3fb950] block mb-0.5">Recommendation</span>
                            <p className="text-[12px] text-wl-text leading-relaxed">{ruleInfo.recommendation}</p>
                          </div>
                        )}

                        {/* Rule Details Badge Row */}
                        <div className="pt-2 border-t border-wl-border/40 flex flex-wrap items-center gap-2 text-[11px] text-wl-muted">
                          <span>
                            Rule ID: <code className="font-mono text-wl-text">{r.ruleId}</code>
                          </span>
                          <span>•</span>
                          <span>Weight: {r.pointsPossible} pts</span>
                          {ruleInfo?.source && (
                            <>
                              <span>•</span>
                              <span>
                                Source:{' '}
                                <span className="capitalize text-wl-text">
                                  {ruleInfo.source}
                                  {ruleInfo.reference ? ` (${ruleInfo.reference})` : ''}
                                </span>
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
