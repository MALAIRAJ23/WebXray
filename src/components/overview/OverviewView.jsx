import React from 'react';
import { ScoreRing, FindingRow, Stat, Section, LoadingRow, ErrorState, EmptyState, ScoreLedger } from '../ui';

export default function OverviewView({
  scoreData,
  overviewData,
  isLoading = false,
  error = null,
  onReanalyze,
  onSelectTab,
}) {
  if (error) {
    return <ErrorState title="Overview inspection failed" message={error} onRetry={onReanalyze} />;
  }

  if (isLoading && !scoreData && !overviewData) {
    return (
      <div className="space-y-4 font-sans">
        <LoadingRow count={4} />
      </div>
    );
  }

  const {
    overallScore = 0,
    grade = 'N/A',
    categoryScores = { performance: 0, seo: 0, accessibility: 0, security: 0, bestPractices: 0 },
    issueCounts = { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
    topRecommendations = [],
  } = scoreData || {};

  const top5Findings = topRecommendations.slice(0, 5);

  const issueSentence =
    issueCounts.critical > 0
      ? `${issueCounts.critical} critical ${issueCounts.critical === 1 ? 'issue' : 'issues'}, ${issueCounts.total} total`
      : issueCounts.high > 0
      ? `${issueCounts.high} high priority ${issueCounts.high === 1 ? 'issue' : 'issues'}, ${issueCounts.total} total`
      : issueCounts.total > 0
      ? `${issueCounts.total} ${issueCounts.total === 1 ? 'issue' : 'issues'} detected`
      : 'No issues detected';

  const categories = [
    { id: 'performance', name: 'Performance', score: categoryScores.performance },
    { id: 'seo', name: 'SEO', score: categoryScores.seo },
    { id: 'accessibility', name: 'Accessibility', score: categoryScores.accessibility },
    { id: 'security', name: 'Security', score: categoryScores.security },
    { id: 'bestPractices', name: 'Best Practices', score: categoryScores.bestPractices },
  ];

  const getScoreColor = (score) => {
    if (typeof score !== 'number') return 'bg-[#7d8590] text-[#7d8590]';
    if (score >= 90) return 'bg-[#3fb950] text-[#3fb950]';
    if (score >= 70) return 'bg-[#d29922] text-[#d29922]';
    return 'bg-[#f85149] text-[#f85149]';
  };

  return (
    <div className="space-y-5 font-sans">
      {/* 1. Score & Categories Overview Block */}
      <div className="border border-wl-border rounded-[6px] bg-wl-surface p-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
          {/* Big overall score on the left */}
          <div className="sm:col-span-5 flex flex-col items-center sm:items-start gap-2 border-b sm:border-b-0 sm:border-r border-wl-border pb-4 sm:pb-0 sm:pr-4">
            <div className="flex items-center gap-3">
              <ScoreRing score={overallScore} size="hero" grade={grade} />
              <div>
                <span className="text-[11px] font-sans text-wl-muted block">Overall Score</span>
                <span className="text-[13px] font-medium text-wl-text">Grade {grade}</span>
              </div>
            </div>
            <p className="text-[12px] text-wl-muted text-center sm:text-left mt-1">
              {issueSentence}
            </p>
          </div>

          {/* 5 Category scores as a simple list on the right */}
          <div className="sm:col-span-7 space-y-2">
            {categories.map((cat) => {
              const numScore = typeof cat.score === 'number' ? cat.score : 0;
              const colorClasses = getScoreColor(cat.score).split(' ');
              const barBg = colorClasses[0];
              const textCol = colorClasses[1];

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectTab && onSelectTab(cat.id === 'bestPractices' ? 'overview' : cat.id)}
                  className="w-full text-left group flex items-center justify-between gap-3 text-[12px] py-1 px-1.5 rounded-[4px] hover:bg-wl-raised/50 transition-colors"
                >
                  <span className="w-24 text-wl-text font-medium truncate group-hover:text-[#4f8cff] transition-colors">
                    {cat.name}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-wl-raised overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barBg} transition-all duration-120`}
                      style={{ width: `${Math.min(Math.max(numScore, 0), 100)}%` }}
                    />
                  </div>
                  <span className={`w-8 text-right font-mono font-medium ${textCol}`}>
                    {cat.score ?? '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Transparent Auditable Ledger */}
      {scoreData && (
        <ScoreLedger
          isOverall={true}
          title="Overall Health"
          score={overallScore}
          overallData={scoreData}
          onSelectTab={onSelectTab}
        />
      )}

      {/* 2. "Fix these first" Section */}
      <Section
        title="Fix these first"
        description="Top high-impact issues identified across all categories"
      >
        {top5Findings.length === 0 ? (
          <EmptyState
            title="Clean bill of health"
            description="All diagnostic checks passed. No high-priority findings to resolve."
          />
        ) : (
          <div className="space-y-2">
            {top5Findings.map((finding, idx) => (
              <FindingRow
                key={finding.id || idx}
                finding={finding}
                defaultExpanded={idx === 0}
              />
            ))}
          </div>
        )}
      </Section>

      {/* 3. Page Structure Details */}
      {overviewData && (
        <Section title="Page Structure" description="DOM composition and asset distribution">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <Stat label="DOM Elements" value={overviewData.counts?.domElements} />
            <Stat label="Images" value={overviewData.counts?.images} />
            <Stat label="Links" value={overviewData.counts?.links} />
            <Stat label="Forms" value={overviewData.counts?.forms} />
            <Stat label="Scripts" value={overviewData.counts?.scripts} />
            <Stat label="Stylesheets" value={overviewData.counts?.stylesheets} />
          </div>

          <div className="mt-3 p-3 rounded-[6px] border border-wl-border bg-wl-surface text-[12px] grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <span className="text-[11px] text-wl-muted block">Document Title</span>
              <span className="text-wl-text font-sans truncate block" title={overviewData.title}>
                {overviewData.title || 'Untitled'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-wl-muted block">Language & Doctype</span>
              <span className="text-wl-text font-mono">
                {overviewData.htmlLang || 'Unspecified'} • {overviewData.doctype || 'HTML5'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-wl-muted block">Viewport</span>
              <span className="text-wl-text font-mono truncate block" title={overviewData.viewportMeta}>
                {overviewData.viewportMeta || 'Configured'}
              </span>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
