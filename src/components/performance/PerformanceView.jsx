import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
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
import { formatTime, formatSize, formatCls, pluralize } from '../../utils/format';

export default function PerformanceView({
  data,
  isLoading = false,
  error = null,
  onReanalyze,
}) {
  const [showPassed, setShowPassed] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [requestSearch, setRequestSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const resources = useMemo(() => {
    if (!data) return [];
    return data.allResources || data.resourcesSummary?.allResources || [];
  }, [data]);

  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      if (selectedType !== 'all' && res.type !== selectedType) return false;
      if (requestSearch && !res.name?.toLowerCase().includes(requestSearch.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [resources, selectedType, requestSearch]);

  if (error) {
    return <ErrorState title="Performance audit failed" message={error} onRetry={onReanalyze} />;
  }

  if (isLoading && !data) {
    return <LoadingRow count={5} />;
  }

  if (!data) {
    return (
      <EmptyState
        title="Performance audit not run"
        description="Run an analysis to inspect Core Web Vitals, load timings, and resource payloads."
      />
    );
  }

  const { score = 0, breakdown = {}, metrics = {}, resourcesSummary = {}, findings = [] } = data;

  const issueFindings = findings.filter((f) => f.severity !== 'passed');
  const passedFindings = findings.filter((f) => f.severity === 'passed');
  const deductions = breakdown.deductions || [];

  // Group issue findings by severity
  const criticalAndHigh = issueFindings.filter((f) => f.severity === 'critical' || f.severity === 'high');
  const mediumAndLow = issueFindings.filter((f) => f.severity === 'medium' || f.severity === 'low');

  const resourceColumns = [
    {
      key: 'name',
      header: 'Resource',
      mono: true,
      render: (val) => {
        try {
          const u = new URL(val);
          return (
            <span className="truncate block max-w-xs" title={val}>
              {u.pathname.split('/').pop() || u.hostname}
              <span className="text-wl-muted ml-1 text-[11px]">{u.hostname}</span>
            </span>
          );
        } catch {
          return <span className="truncate block max-w-xs" title={val}>{val}</span>;
        }
      },
    },
    {
      key: 'type',
      header: 'Type',
      width: '70px',
      render: (val) => <Badge variant="neutral" mono>{val || 'other'}</Badge>,
    },
    {
      key: 'transferSize',
      header: 'Size',
      width: '90px',
      align: 'right',
      mono: true,
      render: (val) => formatSize(val),
    },
    {
      key: 'duration',
      header: 'Duration',
      width: '90px',
      align: 'right',
      mono: true,
      render: (val) => formatTime(val),
    },
  ];

  return (
    <div className="space-y-5 font-sans">
      {/* 1. One-line Summary Row */}
      <div className="flex items-center justify-between border-b border-wl-border pb-3">
        <div className="flex items-center gap-3">
          <ScoreRing score={score} size="md" />
          <div>
            <h2 className="text-[16px] font-semibold text-wl-text">Performance</h2>
            <p className="text-[12px] text-wl-muted">
              {issueFindings.length === 0
                ? 'All performance checks passed'
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
        <ScoreLedger title="Performance" score={score} results={data.results} />
      )}

      {/* 2. Key Metrics Grid (max 6 stats) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <Stat
          label="TTFB"
          value={formatTime(metrics.ttfb)}
          status={metrics.ttfb > 800 ? 'warning' : 'good'}
          hint="≤ 800 ms target"
        />
        <Stat
          label="FCP"
          value={formatTime(metrics.fcp)}
          status={metrics.fcp > 1800 ? 'warning' : 'good'}
          hint="≤ 1.8 s target"
        />
        <Stat
          label="LCP"
          value={formatTime(metrics.lcp)}
          status={metrics.lcp > 2500 ? 'error' : 'good'}
          hint="≤ 2.5 s target"
        />
        <Stat
          label="CLS"
          value={formatCls(metrics.cls)}
          status={metrics.cls > 0.1 ? 'warning' : 'good'}
          hint="≤ 0.100 target"
        />
        <Stat
          label="Requests"
          value={resourcesSummary.totalCount ?? resources.length}
          hint="Total transferred"
        />
        <Stat
          label="Total Size"
          value={formatSize(resourcesSummary.totalKnownTransferBytes)}
          hint="Transferred weight"
        />
      </div>

      {/* 3. Findings Grouped by Severity */}
      <Section title="Findings" description="Identified performance bottlenecks and diagnostics">
        {issueFindings.length === 0 ? (
          <EmptyState
            title="No performance issues found"
            description="Core Web Vitals and resource weight conform to established thresholds."
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

      {/* 6. Requests Subsection (Network Inspection) */}
      <Section
        title="Requests"
        description="Network subresources collected during page load"
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-2 text-wl-muted" />
              <input
                type="text"
                placeholder="Filter requests..."
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
                className="pl-7 pr-2 py-1 text-[11px] rounded-[4px] bg-wl-surface border border-wl-border text-wl-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4f8cff] w-36 sm:w-48"
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="py-1 px-2 text-[11px] rounded-[4px] bg-wl-surface border border-wl-border text-wl-text focus-visible:outline-none"
            >
              <option value="all">All Types</option>
              <option value="js">JavaScript</option>
              <option value="css">CSS</option>
              <option value="images">Images</option>
              <option value="fonts">Fonts</option>
              <option value="fetch">Fetch/XHR</option>
              <option value="other">Other</option>
            </select>
          </div>
        }
      >
        <DataTable
          columns={resourceColumns}
          data={filteredResources}
          keyField="name"
          maxHeight="320px"
          emptyMessage="No matching network requests found."
        />
      </Section>
    </div>
  );
}
