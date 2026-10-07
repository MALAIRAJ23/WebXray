import React, { useState, useEffect } from 'react';
import { X, BookOpen, AlertCircle } from 'lucide-react';
import { RULES_BY_CATEGORY } from '../../analyzers/rules';
import { CATEGORY_WEIGHTS } from '../../analyzers/scoring';
import { Badge, IconButton } from '../../components/ui';

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

export default function AboutScoringModal({ isOpen, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Rules' },
    { id: 'performance', label: `Performance (${Math.round((CATEGORY_WEIGHTS.performance || 0.2) * 100)}%)` },
    { id: 'seo', label: `SEO (${Math.round((CATEGORY_WEIGHTS.seo || 0.2) * 100)}%)` },
    { id: 'accessibility', label: `Accessibility (${Math.round((CATEGORY_WEIGHTS.accessibility || 0.2) * 100)}%)` },
    { id: 'security', label: `Security (${Math.round((CATEGORY_WEIGHTS.security || 0.2) * 100)}%)` },
    { id: 'bestPractices', label: `Best Practices (${Math.round((CATEGORY_WEIGHTS.bestPractices || 0.2) * 100)}%)` },
  ];

  const rulesToShow = Object.entries(RULES_BY_CATEGORY).flatMap(([cat, list]) => {
    if (selectedCategory !== 'all' && selectedCategory !== cat) return [];
    return list.map((r) => ({ ...r, categoryKey: cat }));
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-scoring-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm"
    >
      <div className="bg-wl-surface border border-wl-border rounded-[8px] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans text-wl-text">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-wl-border bg-wl-bg">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#4f8cff]" />
            <div>
              <h2 id="about-scoring-title" className="text-[15px] font-semibold text-wl-text">
                About WebXray Scoring (v1.0)
              </h2>
              <p className="text-[11px] text-wl-muted">
                Transparent and auditable scoring specification and complete rule catalog
              </p>
            </div>
          </div>
          <IconButton icon={X} label="Close modal" variant="ghost" size="sm" onClick={onClose} />
        </div>

        {/* Modal Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Formula & Policy Card */}
          <div className="p-3.5 rounded-[6px] bg-wl-bg border border-wl-border space-y-2.5 text-[12px]">
            <div className="font-semibold text-wl-text text-[13px]">Scoring Model & Formulas</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-wl-muted">
              <div className="p-2.5 rounded-[4px] bg-wl-surface border border-wl-border">
                <span className="font-medium text-wl-text block mb-1">Category Score (0–100)</span>
                <code className="text-[11px] font-mono text-[#4f8cff] block">
                  round(sum(pointsEarned) / sum(pointsPossible) * 100)
                </code>
                <p className="text-[11px] mt-1 text-wl-muted">
                  Rules with status <em>not_applicable</em> or <em>unverified</em> are strictly excluded from both sides.
                </p>
              </div>

              <div className="p-2.5 rounded-[4px] bg-wl-surface border border-wl-border">
                <span className="font-medium text-wl-text block mb-1">Overall Health Score (0–100)</span>
                <code className="text-[11px] font-mono text-[#3fb950] block">
                  round(sum(categoryScore × weight))
                </code>
                <p className="text-[11px] mt-1 text-wl-muted">
                  Equal 20% weights across Performance, SEO, Accessibility, Security, and Best Practices.
                </p>
              </div>
            </div>

            {/* Honest Heuristic Disclaimer */}
            <div className="p-2.5 rounded-[4px] bg-[#d29922]/10 border border-[#d29922]/30 flex items-start gap-2 text-[12px] text-[#d29922]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Heuristic Thresholds Disclaimer: </span>
                Thresholds marked heuristic are opinionated defaults, not Lighthouse-equivalent scores. They are calibrated to highlight actionable bottlenecks without producing excessive noise.
              </div>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-wl-border">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`py-1 px-2.5 rounded-[4px] text-[11px] font-mono font-medium transition-colors shrink-0 ${
                  selectedCategory === c.id
                    ? 'bg-[#4f8cff] text-white'
                    : 'text-wl-muted hover:text-wl-text hover:bg-wl-raised'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Rules Table */}
          <div className="border border-wl-border rounded-[6px] overflow-hidden bg-wl-bg">
            <div className="overflow-x-auto max-h-[380px]">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-wl-raised border-b border-wl-border text-[11px] text-wl-muted font-medium sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Rule ID</th>
                    <th className="py-2 px-3">Title & Details</th>
                    <th className="py-2 px-3 text-center">Weight</th>
                    <th className="py-2 px-3">Threshold</th>
                    <th className="py-2 px-3">Source</th>
                    <th className="py-2 px-3">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-wl-border font-sans">
                  {rulesToShow.map((rule) => {
                    const srcStr = formatSource(rule);
                    const isStd = rule.source === 'standard';
                    return (
                      <tr key={rule.id} className="hover:bg-wl-raised/30 transition-colors">
                        <td className="py-2 px-3 font-mono text-[11px] text-[#4f8cff] align-top whitespace-nowrap">
                          {rule.id}
                        </td>
                        <td className="py-2 px-3 align-top">
                          <div className="font-medium text-wl-text">{rule.title}</div>
                          <div className="text-[11px] text-wl-muted mt-0.5">{rule.description}</div>
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-semibold text-wl-text align-top">
                          {rule.weight}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-wl-muted align-top whitespace-nowrap">
                          {formatThreshold(rule.threshold)}
                        </td>
                        <td className="py-2 px-3 align-top whitespace-nowrap">
                          <Badge variant={isStd ? 'neutral' : 'neutral'}>
                            {srcStr}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 align-top uppercase font-mono text-[10px] whitespace-nowrap">
                          <span
                            className={
                              rule.severityOnFail === 'critical'
                                ? 'text-[#f85149] font-bold'
                                : rule.severityOnFail === 'high'
                                ? 'text-[#d29922] font-semibold'
                                : rule.severityOnFail === 'medium'
                                ? 'text-[#e3b341]'
                                : 'text-wl-muted'
                            }
                          >
                            {rule.severityOnFail || 'medium'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-wl-border bg-wl-bg flex justify-between items-center text-[11px] text-wl-muted">
          <span>{rulesToShow.length} rules listed • Category weights: 20% each (sum to 100%)</span>
          <button
            type="button"
            onClick={onClose}
            className="py-1 px-3 rounded-[4px] bg-wl-surface hover:bg-wl-raised border border-wl-border text-wl-text text-[12px] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
