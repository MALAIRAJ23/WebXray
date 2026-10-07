import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  Stat,
  Section,
  FindingRow,
  DataTable,
  Badge,
  ScoreRing,
  ScoreLedger,
  LoadingRow,
  ErrorState,
  EmptyState,
} from '../ui';
import { pluralize } from '../../utils/format';

export default function SecurityView({
  data,
  tabUrl,
  isLoading = false,
  error = null,
  onReanalyze,
}) {
  const [showPassed, setShowPassed] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (error) {
    return <ErrorState title="Security inspection failed" message={error} onRetry={onReanalyze} />;
  }

  if (isLoading && !data) {
    return <LoadingRow count={5} />;
  }

  if (!data) {
    return (
      <EmptyState
        title="Security audit not run"
        description="Run an analysis to inspect HTTP security headers, transport encryption, and third-party isolation."
      />
    );
  }

  const {
    score = 0,
    breakdown = {},
    headersSummary = [],
    mixedContent = { detected: false, count: 0 },
    targetBlankLinks = { total: 0, vulnerableCount: 0 },
    thirdParty = { total: 0, thirdPartyTotal: 0 },
    cookies = { clientAccessibleCount: 0 },
    findings = [],
  } = data;

  const issueFindings = findings.filter((f) => f.severity !== 'passed');
  const passedFindings = findings.filter((f) => f.severity === 'passed');
  const deductions = breakdown.deductions || [];

  const criticalAndHigh = issueFindings.filter((f) => f.severity === 'critical' || f.severity === 'high');
  const mediumAndLow = issueFindings.filter((f) => f.severity === 'medium' || f.severity === 'low');

  const isHttps = tabUrl ? tabUrl.startsWith('https://') : true;
  const configuredHeaders = headersSummary.filter((h) => h.status === 'configured').length;

  const headerColumns = [
    {
      key: 'name',
      header: 'Security Header',
      mono: true,
      render: (val) => <span className="font-mono text-wl-text">{val}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '90px',
      render: (val) => (
        <Badge variant={val === 'configured' ? 'passed' : 'critical'} mono={false}>
          {val === 'configured' ? 'Active' : 'Missing'}
        </Badge>
      ),
    },
    {
      key: 'recommendation',
      header: 'Recommendation / Value',
      render: (val, row) => (
        <span className="text-[11px] text-wl-muted truncate block" title={row.value || val}>
          {row.value ? `Value: ${row.value}` : val}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5 font-sans">
      {/* 1. One-line Summary Row */}
      <div className="flex items-center justify-between border-b border-wl-border pb-3">
        <div className="flex items-center gap-3">
          <ScoreRing score={score} size="md" />
          <div>
            <h2 className="text-[16px] font-semibold text-wl-text">Defensive Security</h2>
            <p className="text-[12px] text-wl-muted">
              {issueFindings.length === 0
                ? 'All security checks passed'
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
        <ScoreLedger title="Security" score={score} results={data.results} />
      )}

      {/* 2. Key Metrics Grid (max 6 stats) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <Stat
          label="HTTPS"
          value={isHttps ? 'Encrypted' : 'Insecure'}
          status={isHttps ? 'good' : 'error'}
          mono={false}
          hint={isHttps ? 'TLS Active' : 'Plain HTTP'}
        />
        <Stat
          label="Security Headers"
          value={`${configuredHeaders}/${headersSummary.length}`}
          status={configuredHeaders >= 4 ? 'good' : 'warning'}
          hint="Configured"
        />
        <Stat
          label="Mixed Content"
          value={mixedContent.count}
          status={mixedContent.count > 0 ? 'error' : 'good'}
          hint={mixedContent.count > 0 ? 'Insecure resources' : 'None detected'}
        />
        <Stat
          label="Tabnabbing"
          value={targetBlankLinks.vulnerableCount}
          status={targetBlankLinks.vulnerableCount > 0 ? 'warning' : 'good'}
          hint={`Of ${targetBlankLinks.total} new-tab links`}
        />
        <Stat
          label="Third-Party"
          value={thirdParty.thirdPartyTotal}
          status={thirdParty.thirdPartyTotal > 20 ? 'warning' : 'normal'}
          hint="External domains"
        />
        <Stat
          label="Visible Cookies"
          value={cookies.clientAccessibleCount}
          hint="Non-HttpOnly"
        />
      </div>

      {/* 3. Findings Grouped by Severity */}
      <Section title="Findings" description="Identified defensive security vulnerabilities and hardening advice">
        {issueFindings.length === 0 ? (
          <EmptyState
            title="No security vulnerabilities found"
            description="HTTPS transport encryption, headers, and dependency isolation pass requirements."
          />
        ) : (
          <div className="space-y-2">
            {criticalAndHigh.map((f) => (
              <FindingRow key={f.id} finding={f} defaultExpanded={true} />
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

      {/* 6. Security Headers DataTable */}
      {headersSummary.length > 0 && (
        <Section title="Security Headers" description="Evaluation of defensive response headers">
          <DataTable
            columns={headerColumns}
            data={headersSummary}
            keyField="name"
            maxHeight="260px"
          />
        </Section>
      )}
    </div>
  );
}
