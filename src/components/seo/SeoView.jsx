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

export default function SeoView({
  data,
  isLoading = false,
  error = null,
  onReanalyze,
}) {
  const [showPassed, setShowPassed] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (error) {
    return <ErrorState title="SEO inspection failed" message={error} onRetry={onReanalyze} />;
  }

  if (isLoading && !data) {
    return <LoadingRow count={5} />;
  }

  if (!data) {
    return (
      <EmptyState
        title="SEO audit not run"
        description="Run an analysis to inspect search engine metadata, heading hierarchy, and robots configuration."
      />
    );
  }

  const { score = 0, breakdown = {}, metadata = {}, headings = [], links = {}, images = {}, findings = [] } = data;

  const issueFindings = findings.filter((f) => f.severity !== 'passed');
  const passedFindings = findings.filter((f) => f.severity === 'passed');
  const deductions = breakdown.deductions || [];

  const criticalAndHigh = issueFindings.filter((f) => f.severity === 'critical' || f.severity === 'high');
  const mediumAndLow = issueFindings.filter((f) => f.severity === 'medium' || f.severity === 'low');

  const titleLength = metadata.title ? metadata.title.length : 0;
  const descLength = metadata.metaDescription ? metadata.metaDescription.length : 0;

  const headingColumns = [
    {
      key: 'level',
      header: 'Level',
      width: '60px',
      mono: true,
      render: (val) => <Badge variant="neutral" mono>H{val}</Badge>,
    },
    {
      key: 'text',
      header: 'Heading Text',
      render: (val) => <span className="font-sans text-wl-text truncate block">{val || '(empty)'}</span>,
    },
  ];

  return (
    <div className="space-y-5 font-sans">
      {/* 1. One-line Summary Row */}
      <div className="flex items-center justify-between border-b border-wl-border pb-3">
        <div className="flex items-center gap-3">
          <ScoreRing score={score} size="md" />
          <div>
            <h2 className="text-[16px] font-semibold text-wl-text">Search Engine Optimization</h2>
            <p className="text-[12px] text-wl-muted">
              {issueFindings.length === 0
                ? 'All SEO checks passed'
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
        <ScoreLedger title="SEO" score={score} results={data.results} />
      )}

      {/* 2. Key Metrics Grid (max 6 stats) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <Stat
          label="Title Length"
          value={`${titleLength} chars`}
          status={titleLength >= 30 && titleLength <= 65 ? 'good' : 'warning'}
          hint="Target: 50–60"
        />
        <Stat
          label="Description"
          value={`${descLength} chars`}
          status={descLength >= 70 && descLength <= 160 ? 'good' : 'warning'}
          hint="Target: 70–160"
        />
        <Stat
          label="Headings"
          value={headings.length}
          hint={headings.length > 0 ? `H1 count: ${headings.filter((h) => h.level === 1).length}` : 'None'}
        />
        <Stat
          label="Total Links"
          value={links.total ?? 0}
          hint={`Internal: ${links.internal ?? 0}`}
        />
        <Stat
          label="Total Images"
          value={images.total ?? 0}
          status={images.missingAlt > 0 ? 'warning' : 'good'}
          hint={images.missingAlt > 0 ? `${images.missingAlt} missing alt` : 'All alt set'}
        />
        <Stat
          label="Canonical"
          value={metadata.canonical ? 'Set' : 'Missing'}
          status={metadata.canonical ? 'good' : 'warning'}
          mono={false}
          hint={metadata.canonical ? 'Valid URL' : 'None specified'}
        />
      </div>

      {/* 3. Findings Grouped by Severity */}
      <Section title="Findings" description="Identified SEO issues and search indexing opportunities">
        {issueFindings.length === 0 ? (
          <EmptyState
            title="No SEO issues found"
            description="Page metadata, heading hierarchy, and robots configuration meet guidelines."
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

      {/* 6. Headings Structure DataTable */}
      {headings.length > 0 && (
        <Section title="Heading Structure" description="Document outline as parsed by web indexers">
          <DataTable
            columns={headingColumns}
            data={headings}
            keyField="id"
            maxHeight="240px"
            emptyMessage="No heading tags detected in document."
          />
        </Section>
      )}
    </div>
  );
}
