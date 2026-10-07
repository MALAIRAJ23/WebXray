import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Crosshair, X } from 'lucide-react';
import {
  Stat,
  Section,
  FindingRow,
  Badge,
  ScoreRing,
  ScoreLedger,
  Button,
  LoadingRow,
  ErrorState,
  EmptyState,
} from '../ui';
import { pluralize } from '../../utils/format';

export default function AccessibilityView({
  data,
  tabId,
  isLoading = false,
  error = null,
  onReanalyze,
}) {
  const [showPassed, setShowPassed] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [activeHighlighted, setActiveHighlighted] = useState(null);

  const handleHighlight = (selector) => {
    if (!selector || !tabId) return;
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'HIGHLIGHT_ELEMENT', tabId, selector }, (res) => {
        if (res?.ok) setActiveHighlighted(selector);
      });
    } else {
      setActiveHighlighted(selector);
    }
  };

  const handleClearHighlight = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage && tabId) {
      chrome.runtime.sendMessage({ type: 'CLEAR_HIGHLIGHT', tabId }, () => {
        setActiveHighlighted(null);
      });
    } else {
      setActiveHighlighted(null);
    }
  };

  if (error) {
    return <ErrorState title="Accessibility inspection failed" message={error} onRetry={onReanalyze} />;
  }

  if (isLoading && !data) {
    return <LoadingRow count={5} />;
  }

  if (!data) {
    return (
      <EmptyState
        title="Accessibility audit not run"
        description="Run an analysis to inspect form labels, ARIA landmarks, image text alternatives, and button names."
      />
    );
  }

  const { score = 0, breakdown = {}, summary = {}, findings = [] } = data;

  const issueFindings = findings.filter((f) => f.severity !== 'passed');
  const passedFindings = findings.filter((f) => f.severity === 'passed');
  const deductions = breakdown.deductions || [];

  const criticalAndHigh = issueFindings.filter((f) => f.severity === 'critical' || f.severity === 'high');
  const mediumAndLow = issueFindings.filter((f) => f.severity === 'medium' || f.severity === 'low');

  return (
    <div className="space-y-5 font-sans">
      {/* 1. One-line Summary Row */}
      <div className="flex items-center justify-between border-b border-wl-border pb-3">
        <div className="flex items-center gap-3">
          <ScoreRing score={score} size="md" />
          <div>
            <h2 className="text-[16px] font-semibold text-wl-text">Accessibility</h2>
            <p className="text-[12px] text-wl-muted">
              {issueFindings.length === 0
                ? 'All accessibility checks passed'
                : pluralize(issueFindings.length, 'issue detected', 'issues detected')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {criticalAndHigh.length > 0 && (
            <Badge variant="critical">
              {pluralize(criticalAndHigh.length, 'high priority', 'high priority')}
            </Badge>
          )}
          {mediumAndLow.length > 0 && (
            <Badge variant="medium">{pluralize(mediumAndLow.length, 'moderate', 'moderate')}</Badge>
          )}
        </div>
      </div>

      {/* Score Ledger */}
      {data.results && data.results.length > 0 && (
        <ScoreLedger title="Accessibility" score={score} results={data.results} />
      )}

      {/* 2. Key Metrics Grid (max 6 stats) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <Stat
          label="Missing Alt"
          value={summary.missingAltCount ?? 0}
          status={summary.missingAltCount > 0 ? 'error' : 'good'}
          hint={`Of ${summary.imagesCount ?? 0} images`}
        />
        <Stat
          label="Unlabeled Inputs"
          value={summary.missingLabelsCount ?? 0}
          status={summary.missingLabelsCount > 0 ? 'error' : 'good'}
          hint={`Of ${summary.formControlsCount ?? 0} controls`}
        />
        <Stat
          label="Nameless Buttons"
          value={summary.missingButtonNamesCount ?? 0}
          status={summary.missingButtonNamesCount > 0 ? 'warning' : 'good'}
          hint={`Of ${summary.buttonsCount ?? 0} buttons`}
        />
        <Stat
          label="Main Landmark"
          value={summary.landmarks?.main > 0 ? 'Present' : 'Missing'}
          status={summary.landmarks?.main > 0 ? 'good' : 'warning'}
          mono={false}
          hint={summary.landmarks?.main > 0 ? '<main> detected' : 'No <main> tag'}
        />
        <Stat
          label="Duplicate IDs"
          value={summary.duplicateIdsCount ?? 0}
          status={summary.duplicateIdsCount > 0 ? 'warning' : 'good'}
          hint="ID collisions"
        />
        <Stat
          label="Positive Tabindex"
          value={summary.positiveTabindexCount ?? 0}
          status={summary.positiveTabindexCount > 0 ? 'warning' : 'good'}
          hint="tabindex > 0"
        />
      </div>

      {/* Active element highlight banner */}
      {activeHighlighted && (
        <div className="flex items-center justify-between p-2 rounded-[6px] bg-[#4f8cff]/10 border border-[#4f8cff]/30 text-[12px] text-wl-text">
          <div className="flex items-center gap-2 truncate">
            <Crosshair className="w-3.5 h-3.5 text-[#4f8cff] shrink-0" />
            <span>Highlighting on page:</span>
            <code className="font-mono text-[11px] text-[#4f8cff] truncate">{activeHighlighted}</code>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClearHighlight}>
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        </div>
      )}

      {/* 3. Findings Grouped by Severity */}
      <Section title="Findings" description="Identified WCAG compliance issues and remediation steps">
        {issueFindings.length === 0 ? (
          <EmptyState
            title="No accessibility issues found"
            description="Form controls, interactive names, and structural landmarks meet WCAG criteria."
          />
        ) : (
          <div className="space-y-2">
            {criticalAndHigh.map((f) => (
              <div key={f.id} className="space-y-1">
                <FindingRow finding={f} defaultExpanded={true} />
                {Array.isArray(f.selectors) && f.selectors.length > 0 && (
                  <div className="pl-4 flex flex-wrap gap-1">
                    {f.selectors.map((sel, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleHighlight(sel)}
                        className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-wl-surface hover:bg-wl-raised text-wl-muted hover:text-wl-text border border-wl-border flex items-center gap-1 transition-colors"
                        title="Highlight element on page"
                      >
                        <Crosshair className="w-3 h-3 text-[#4f8cff]" />
                        <span className="truncate max-w-xs">{sel}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {mediumAndLow.map((f) => (
              <FindingRow key={f.id} finding={f} defaultExpanded={false} />
            ))}
          </div>
        )}
      </Section>

      {/* 4. Collapsible Passed Checks */}
      {passedFindings.length > 0 && (
        <div className="border border-wl-border rounded-[6px] overflow-hidden bg-wl-surface">
          <button
            type="button"
            onClick={() => setShowPassed(!showPassed)}
            className="w-full text-left py-2 px-3 flex items-center justify-between text-[12px] font-medium text-wl-muted hover:text-wl-text transition-colors select-none"
          >
            <span>Passed checks ({passedFindings.length})</span>
            {showPassed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {showPassed && (
            <div className="p-3 border-t border-wl-border space-y-2 bg-wl-bg/50">
              {passedFindings.map((f) => (
                <FindingRow key={f.id} finding={f} defaultExpanded={false} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Collapsible Score Breakdown */}
      {deductions.length > 0 && (
        <div className="border border-wl-border rounded-[6px] overflow-hidden bg-wl-surface">
          <button
            type="button"
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full text-left py-2 px-3 flex items-center justify-between text-[12px] font-medium text-wl-muted hover:text-wl-text transition-colors select-none"
          >
            <span>Score breakdown ({deductions.length} deductions)</span>
            {showBreakdown ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {showBreakdown && (
            <div className="p-3 border-t border-wl-border space-y-1.5 bg-wl-bg/50 text-[12px]">
              {deductions.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-wl-border/50 last:border-0">
                  <span className="text-wl-muted">{d.reason || d.id}</span>
                  <span className="font-mono text-[#f85149] font-medium">-{d.points} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
