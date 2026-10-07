import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import {
  Section,
  Badge,
  LoadingRow,
  ErrorState,
  EmptyState,
} from '../ui';
import { pluralize } from '../../utils/format';

export default function TechnologyView({
  data,
  isLoading = false,
  error = null,
  onReanalyze,
}) {
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (error) {
    return <ErrorState title="Technology detection failed" message={error} onRetry={onReanalyze} />;
  }

  if (isLoading && !data) {
    return <LoadingRow count={5} />;
  }

  if (!data) {
    return (
      <EmptyState
        title="Technology detection not run"
        description="Run an analysis to detect frameworks, CMS, analytics, and infrastructure."
      />
    );
  }

  const { totalCount = 0, categories = {}, detections = [] } = data;

  const categoryEntries =
    Object.keys(categories).length > 0
      ? Object.entries(categories)
      : detections.reduce((acc, d) => {
          const cat = d.category || 'Other';
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(d);
          return acc;
        }, {});

  const entries = Array.isArray(categoryEntries) ? categoryEntries : Object.entries(categoryEntries);

  return (
    <div className="space-y-5 font-sans">
      {/* 1. One-line Summary Row */}
      <div className="flex items-center justify-between border-b border-wl-border pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[6px] border border-wl-border bg-wl-surface flex items-center justify-center text-wl-muted shrink-0">
            <Layers className="w-5 h-5 text-wl-muted" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-wl-text">Technology Stack</h2>
            <p className="text-[12px] text-wl-muted">
              {totalCount === 0
                ? 'No matching signatures detected'
                : pluralize(totalCount, 'technology signature identified', 'technology signatures identified')}
            </p>
          </div>
        </div>

        <Badge variant="neutral" mono>
          {pluralize(totalCount, 'signature', 'signatures')}
        </Badge>
      </div>

      {/* 2. Detected Technologies Grouped by Category */}
      {entries.length === 0 ? (
        <EmptyState
          title="No technologies identified"
          description="The active page does not expose recognizable framework globals or meta tags."
        />
      ) : (
        <div className="space-y-4">
          {entries.map(([categoryName, items]) => {
            if (!Array.isArray(items) || items.length === 0) return null;

            return (
              <Section key={categoryName} title={categoryName} divider={false}>
                <div className="space-y-1.5">
                  {items.map((tech) => {
                    const isExpanded = expandedIds.has(tech.id);
                    const evidenceList = tech.evidence || [];

                    return (
                      <div
                        key={tech.id}
                        className="border border-wl-border rounded-[6px] bg-wl-surface transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => toggleExpand(tech.id)}
                          aria-expanded={isExpanded}
                          className="w-full text-left py-2 px-3 flex items-center justify-between gap-3 text-[12px] select-none hover:bg-wl-raised/40 rounded-[6px]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-wl-text text-[13px]">{tech.name}</span>
                            {tech.description && (
                              <span className="text-[11px] text-wl-muted truncate max-w-xs hidden sm:inline">
                                — {tech.description}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant={
                                tech.confidence === 'high'
                                  ? 'passed'
                                  : tech.confidence === 'medium'
                                  ? 'medium'
                                  : 'low'
                              }
                            >
                              {tech.confidence || 'detected'}
                            </Badge>
                            {evidenceList.length > 0 && (
                              isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-wl-muted" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-wl-muted" />
                              )
                            )}
                          </div>
                        </button>

                        {isExpanded && evidenceList.length > 0 && (
                          <div className="px-3 pb-3 pt-1 border-t border-wl-border space-y-1.5 text-[11px]">
                            <span className="text-wl-muted font-medium block">
                              Detection Evidence ({evidenceList.length}):
                            </span>
                            <div className="space-y-1">
                              {evidenceList.map((ev, i) => (
                                <div
                                  key={i}
                                  className="p-1.5 rounded-[4px] bg-wl-bg border border-wl-border font-mono text-wl-text flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                                >
                                  <span className="text-wl-muted font-sans text-[11px]">
                                    {ev.label || ev.type}:
                                  </span>
                                  <span className="truncate max-w-sm" title={ev.detail || ev.value}>
                                    {ev.detail || ev.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>
            );
          })}
        </div>
      )}
    </div>
  );
}
