import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import SeverityDot from './SeverityDot';
import Badge from './Badge';

export default function FindingRow({
  finding,
  defaultExpanded = false,
  className = '',
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!finding) return null;

  const {
    title,
    severity = 'low',
    evidence,
    whyItMatters,
    recommendation,
    selectors = [],
    details,
  } = finding;

  const evidenceString =
    typeof evidence === 'string'
      ? evidence
      : evidence && typeof evidence === 'object'
      ? JSON.stringify(evidence)
      : '';

  return (
    <div
      className={`border border-wl-border rounded-[6px] bg-wl-surface transition-colors duration-120 ${
        isExpanded ? 'bg-wl-surface/90' : 'hover:bg-wl-raised/30'
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="w-full text-left py-2 px-3 flex items-center justify-between gap-2.5 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff] rounded-[6px]"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <SeverityDot severity={severity} size="md" />
          <span className="text-[13px] font-sans font-medium text-wl-text truncate">
            {title}
          </span>
          {!isExpanded && evidenceString && (
            <span
              className="text-[11px] font-mono text-wl-muted truncate max-w-[200px] sm:max-w-xs hidden sm:inline"
              title={evidenceString}
            >
              — {evidenceString}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={severity} mono={false}>
            {severity}
          </Badge>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-wl-muted" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-wl-muted" aria-hidden="true" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-wl-border space-y-2.5 text-[12px] font-sans">
          {whyItMatters && (
            <div>
              <span className="text-[11px] font-medium text-wl-muted block mb-0.5">
                Why it matters:
              </span>
              <p className="text-wl-muted leading-relaxed">{whyItMatters}</p>
            </div>
          )}

          {recommendation && (
            <div className="p-2.5 rounded-[4px] bg-wl-raised/50 border border-wl-border">
              <span className="text-[11px] font-medium text-wl-text block mb-0.5">
                Recommendation:
              </span>
              <p className="text-wl-text leading-relaxed">{recommendation}</p>
            </div>
          )}

          {evidenceString && (
            <div>
              <span className="text-[11px] font-medium text-wl-muted block mb-0.5">
                Evidence:
              </span>
              <div className="p-2 rounded-[4px] bg-wl-bg border border-wl-border font-mono text-[11px] text-wl-text break-all">
                {evidenceString}
              </div>
            </div>
          )}

          {Array.isArray(selectors) && selectors.length > 0 && (
            <div>
              <span className="text-[11px] font-medium text-wl-muted block mb-0.5">
                Affected selectors ({selectors.length}):
              </span>
              <div className="p-2 rounded-[4px] bg-wl-bg border border-wl-border font-mono text-[11px] text-wl-text space-y-1 max-h-36 overflow-y-auto">
                {selectors.map((sel, idx) => (
                  <div key={idx} className="break-all">
                    {sel}
                  </div>
                ))}
              </div>
            </div>
          )}

          {details && typeof details === 'object' && (
            <div>
              <span className="text-[11px] font-medium text-wl-muted block mb-0.5">
                Additional Details:
              </span>
              <pre className="p-2 rounded-[4px] bg-wl-bg border border-wl-border font-mono text-[11px] text-wl-muted overflow-x-auto">
                {JSON.stringify(details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
