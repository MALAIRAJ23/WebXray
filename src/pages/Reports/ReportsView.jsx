import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trash2,
  Download,
  GitCompare,
  Globe,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  X,
  ChevronDown,
  ChevronRight,
  Printer,
} from 'lucide-react';
import {
  getReports,
  deleteReport,
  clearAllReports,
  getStorageUsage,
} from '../../services/storage/reportsStorage';
import { compareReports } from '../../services/storage/compareReports';
import {
  exportReportAsJson,
  exportReportAsCsv,
  exportReportAsHtml,
  downloadFile,
} from '../../services/storage/exportReport';
import { Stat, Button, IconButton, Badge } from '../../components/ui';

export default function ReportsView({ onBackToDashboard: _onBackToDashboard }) {
  const [reports, setReports] = useState([]);
  const [storageInfo, setStorageInfo] = useState({ bytesUsed: 0, formatted: '0 B', count: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportIds, setSelectedReportIds] = useState([]);
  const [collapsedDomains, setCollapsedDomains] = useState({});
  const [comparisonResult, setComparisonResult] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [list, usage] = await Promise.all([getReports(), getStorageUsage()]);
      setReports(list);
      setStorageInfo(usage);
    } catch (err) {
      console.error('[WebXray] Error loading reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (window.confirm('Delete this report snapshot?')) {
      await deleteReport(id);
      setSelectedReportIds((prev) => prev.filter((item) => item !== id));
      if (comparisonResult && (comparisonResult.before.id === id || comparisonResult.after.id === id)) {
        setComparisonResult(null);
      }
      await loadData();
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete all saved reports? This cannot be undone.')) {
      await clearAllReports();
      setSelectedReportIds([]);
      setComparisonResult(null);
      await loadData();
    }
  };

  const toggleSelectReport = (id) => {
    setSelectedReportIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const handleRunComparison = () => {
    if (selectedReportIds.length !== 2) return;
    const r1 = reports.find((r) => r.id === selectedReportIds[0]);
    const r2 = reports.find((r) => r.id === selectedReportIds[1]);
    if (!r1 || !r2) return;

    const diff = compareReports(r1, r2);
    setComparisonResult(diff);
  };

  const handleExportJson = (report, e) => {
    if (e) e.stopPropagation();
    const dataStr = exportReportAsJson(report);
    const domainClean = (report.domain || 'report').replace(/[^a-z0-9]/gi, '_');
    downloadFile(dataStr, `webxray_${domainClean}_${report.timestamp}.json`, 'application/json');
  };

  const handleExportCsv = (report, e) => {
    if (e) e.stopPropagation();
    const csvStr = exportReportAsCsv(report);
    const domainClean = (report.domain || 'report').replace(/[^a-z0-9]/gi, '_');
    downloadFile(csvStr, `webxray_${domainClean}_${report.timestamp}.csv`, 'text/csv');
  };

  const handleExportHtml = (report, e) => {
    if (e) e.stopPropagation();
    const htmlStr = exportReportAsHtml(report);
    const domainClean = (report.domain || 'report').replace(/[^a-z0-9]/gi, '_');
    downloadFile(htmlStr, `webxray_${domainClean}_${report.timestamp}.html`, 'text/html');
  };

  const handlePrintPdf = (report, e) => {
    if (e) e.stopPropagation();
    const htmlStr = exportReportAsHtml(report);
    const blob = new Blob([htmlStr], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    if (win) {
      win.focus();
      setTimeout(() => {
        try {
          win.print();
        } catch {
          // ignore
        }
      }, 500);
    }
  };

  const toggleDomainCollapse = (domain) => {
    setCollapsedDomains((prev) => ({ ...prev, [domain]: !prev[domain] }));
  };

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter(
      (r) =>
        r.domain?.toLowerCase().includes(q) ||
        r.url?.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q)
    );
  }, [reports, searchQuery]);

  const groupedByDomain = useMemo(() => {
    const map = {};
    for (const r of filteredReports) {
      const d = r.domain || 'Unknown Domain';
      if (!map[d]) map[d] = [];
      map[d].push(r);
    }
    return map;
  }, [filteredReports]);

  return (
    <div className="font-sans text-wl-text space-y-5">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-wl-border pb-3">
        <div>
          <h2 className="text-[16px] font-semibold text-wl-text">Saved Reports</h2>
          <p className="text-[12px] text-wl-muted mt-0.5">
            Historical audit snapshots stored in local browser memory
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={loadData} disabled={isLoading} icon={RefreshCw}>
            Refresh
          </Button>

          {reports.length > 0 && (
            <Button variant="danger" size="sm" onClick={handleClearAll} icon={Trash2}>
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* 2. Storage Utilization Bar */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Saved Reports" value={storageInfo.count} />
        <Stat label="Storage Used" value={storageInfo.formatted} />
        <Stat
          label="Selected to Compare"
          value={`${selectedReportIds.length} / 2`}
          hint={selectedReportIds.length === 2 ? 'Ready to compare' : 'Select 2 to diff'}
        />
      </div>

      {/* Compare Action Banner (when 2 selected) */}
      {selectedReportIds.length === 2 && (
        <div className="p-3 rounded-[6px] bg-[#4f8cff]/10 border border-[#4f8cff]/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] text-wl-text">
            <GitCompare className="w-4 h-4 text-[#4f8cff] shrink-0" />
            <span>Two audit reports selected for comparison.</span>
          </div>
          <Button variant="primary" size="sm" onClick={handleRunComparison} icon={GitCompare}>
            Compare now
          </Button>
        </div>
      )}

      {/* 3. Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-wl-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter reports by domain or URL..."
          className="w-full pl-9 pr-3 py-1.5 rounded-[6px] bg-wl-surface border border-wl-border text-[12px] text-wl-text placeholder-wl-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4f8cff] font-sans"
        />
      </div>

      {/* 4. Comparison View */}
      {comparisonResult && (
        <div className="rounded-[6px] border border-wl-border bg-wl-surface p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-wl-border">
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-[#4f8cff]" />
              <h3 className="text-[13px] font-semibold text-wl-text flex items-center gap-1.5">
                <span>Before</span>
                <ArrowRight className="w-3.5 h-3.5 text-wl-muted" />
                <span>After Comparison</span>
              </h3>
            </div>
            <IconButton
              icon={X}
              label="Close comparison"
              variant="ghost"
              size="sm"
              onClick={() => setComparisonResult(null)}
            />
          </div>

          {comparisonResult.versionWarning && (
            <div className="p-3 rounded-[6px] bg-[#d29922]/10 border border-[#d29922]/30 flex items-center gap-2 text-[12px] text-[#d29922]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{comparisonResult.versionWarning}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
            <div className="p-3 rounded-[6px] bg-wl-bg border border-wl-border">
              <span className="text-[11px] text-wl-muted block">Earlier Audit (Before)</span>
              <div className="text-wl-text font-medium truncate mt-0.5">{comparisonResult.before.domain}</div>
              <div className="text-[11px] text-wl-muted font-mono">{new Date(comparisonResult.before.timestamp).toLocaleString()}</div>
              <div className="mt-1 font-semibold text-wl-text font-mono">
                Score: {comparisonResult.before.scores.overall}/100
              </div>
            </div>

            <div className="p-3 rounded-[6px] bg-wl-bg border border-wl-border">
              <span className="text-[11px] text-wl-muted block">Later Audit (After)</span>
              <div className="text-wl-text font-medium truncate mt-0.5">{comparisonResult.after.domain}</div>
              <div className="text-[11px] text-wl-muted font-mono">{new Date(comparisonResult.after.timestamp).toLocaleString()}</div>
              <div className="mt-1 font-semibold text-wl-text font-mono flex items-center gap-2">
                <span>Score: {comparisonResult.after.scores.overall}/100</span>
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-[4px] font-mono font-medium flex items-center gap-0.5 ${
                    comparisonResult.scoreDeltas.overall > 0
                      ? 'bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/30'
                      : comparisonResult.scoreDeltas.overall < 0
                      ? 'bg-[#f85149]/10 text-[#f85149] border border-[#f85149]/30'
                      : 'bg-wl-raised text-wl-muted'
                  }`}
                >
                  {comparisonResult.scoreDeltas.overall > 0 && <ArrowUp className="w-3 h-3" />}
                  {comparisonResult.scoreDeltas.overall < 0 && <ArrowDown className="w-3 h-3" />}
                  {comparisonResult.scoreDeltas.overall > 0 ? `+${comparisonResult.scoreDeltas.overall}` : comparisonResult.scoreDeltas.overall} pts
                </span>
              </div>
            </div>
          </div>

          {/* Category Score Delta Table */}
          <div className="border border-wl-border rounded-[6px] overflow-hidden bg-wl-bg">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-wl-raised border-b border-wl-border text-[11px] text-wl-muted font-medium">
                <tr>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">Before</th>
                  <th className="py-2 px-3 text-right">After</th>
                  <th className="py-2 px-3 text-right">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-wl-border font-mono">
                {['performance', 'seo', 'accessibility', 'security', 'bestPractices'].map((cat) => {
                  const delta = comparisonResult.scoreDeltas[cat] || 0;
                  return (
                    <tr key={cat} className="hover:bg-wl-raised/30">
                      <td className="py-2 px-3 capitalize font-sans text-wl-text">{cat === 'bestPractices' ? 'Best Practices' : cat}</td>
                      <td className="py-2 px-3 text-right text-wl-muted">{comparisonResult.before.scores[cat] ?? '—'}</td>
                      <td className="py-2 px-3 text-right text-wl-text font-semibold">{comparisonResult.after.scores[cat] ?? '—'}</td>
                      <td className="py-2 px-3 text-right font-semibold">
                        <span
                          className={
                            delta > 0
                              ? 'text-[#3fb950]'
                              : delta < 0
                              ? 'text-[#f85149]'
                              : 'text-wl-muted'
                          }
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Findings Diff Breakdown */}
          <div className="space-y-2 text-[12px]">
            {/* Resolved Findings */}
            <div className="p-3 rounded-[6px] bg-[#3fb950]/5 border border-[#3fb950]/30 space-y-1">
              <div className="flex items-center justify-between text-[#3fb950] font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Resolved Findings ({comparisonResult.findingsComparison.counts.resolved})
                </span>
                <span className="text-[11px]">Fixed Issues</span>
              </div>
              {comparisonResult.findingsComparison.resolved.length === 0 ? (
                <div className="text-[11px] text-wl-muted pl-5">No previously detected issues were resolved.</div>
              ) : (
                <div className="space-y-1 pl-5">
                  {comparisonResult.findingsComparison.resolved.map((f, i) => (
                    <div key={i} className="text-wl-text text-[11px] flex items-center gap-1.5">
                      <span className="text-[#3fb950]">✓</span>
                      <span>{f.title}</span>
                      <Badge variant="neutral">{f.category}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Newly Introduced Findings */}
            <div className="p-3 rounded-[6px] bg-[#f85149]/5 border border-[#f85149]/30 space-y-1">
              <div className="flex items-center justify-between text-[#f85149] font-medium">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Newly Introduced Findings ({comparisonResult.findingsComparison.counts.newlyIntroduced})
                </span>
                <span className="text-[11px]">Regressions</span>
              </div>
              {comparisonResult.findingsComparison.newlyIntroduced.length === 0 ? (
                <div className="text-[11px] text-wl-muted pl-5">No new issues were introduced.</div>
              ) : (
                <div className="space-y-1 pl-5">
                  {comparisonResult.findingsComparison.newlyIntroduced.map((f, i) => (
                    <div key={i} className="text-wl-text text-[11px] flex items-center gap-1.5">
                      <span className="text-[#f85149]">!</span>
                      <span>{f.title}</span>
                      <Badge variant="neutral">{f.category}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Domain-Grouped Report List */}
      {reports.length === 0 ? (
        <div className="p-8 text-center rounded-[6px] border border-wl-border bg-wl-surface space-y-2">
          <h3 className="text-[13px] font-medium text-wl-text">No Saved Reports Yet</h3>
          <p className="text-[11px] text-wl-muted max-w-sm mx-auto leading-relaxed">
            Audit any webpage and save reports from the options menu (⋯) to track progress over time.
          </p>
        </div>
      ) : Object.keys(groupedByDomain).length === 0 ? (
        <div className="p-6 text-center rounded-[6px] border border-wl-border bg-wl-surface text-[12px] text-wl-muted">
          No reports matching &quot;{searchQuery}&quot;.
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedByDomain).map(([domain, domainReports]) => {
            const isCollapsed = Boolean(collapsedDomains[domain]);

            return (
              <div key={domain} className="rounded-[6px] border border-wl-border overflow-hidden bg-wl-surface">
                {/* Domain Header Accordion */}
                <button
                  type="button"
                  onClick={() => toggleDomainCollapse(domain)}
                  className="w-full text-left p-3 bg-wl-surface hover:bg-wl-raised/50 border-b border-wl-border flex items-center justify-between cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-4 h-4 text-wl-muted shrink-0" />
                    <span className="font-mono text-[12px] font-semibold text-wl-text truncate">{domain}</span>
                    <Badge variant="neutral" mono>
                      {domainReports.length} {domainReports.length === 1 ? 'audit' : 'audits'}
                    </Badge>
                  </div>

                  <div className="text-wl-muted">
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Domain Reports List */}
                {!isCollapsed && (
                  <div className="divide-y divide-wl-border p-2 space-y-2">
                    {domainReports.map((report) => {
                      const isSelected = selectedReportIds.includes(report.id);
                      const scores = report.scores || {};
                      const overall = scores.overall ?? 0;
                      const grade = scores.grade || 'N/A';

                      return (
                        <div
                          key={report.id}
                          className={`p-3 rounded-[6px] border transition-colors ${
                            isSelected
                              ? 'bg-wl-raised border-[#4f8cff]/50'
                              : 'bg-wl-bg border-wl-border hover:border-wl-muted/40'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectReport(report.id)}
                                className="mt-1 w-3.5 h-3.5 rounded-[4px] bg-wl-surface border-wl-border text-[#4f8cff] focus:ring-0 cursor-pointer"
                                title="Select to compare"
                              />

                              <div className="min-w-0">
                                <div className="text-[13px] font-medium text-wl-text truncate max-w-[260px]" title={report.title || report.url}>
                                  {report.title || report.domain}
                                </div>
                                <div className="text-[11px] text-wl-muted font-mono truncate max-w-[260px]" title={report.url}>
                                  {report.url}
                                </div>
                                <div className="text-[11px] text-wl-muted font-mono mt-0.5">
                                  {new Date(report.timestamp).toLocaleString()}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                              <div
                                className={`px-2 py-1 rounded-[4px] border font-mono font-semibold text-[12px] flex items-center gap-1 ${
                                  overall >= 80
                                    ? 'bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/30'
                                    : overall >= 60
                                    ? 'bg-[#d29922]/10 text-[#d29922] border-[#d29922]/30'
                                    : 'bg-[#f85149]/10 text-[#f85149] border-[#f85149]/30'
                                }`}
                              >
                                <span>{overall}</span>
                                <span className="text-[11px] text-wl-muted">({grade})</span>
                              </div>

                              <div className="flex items-center gap-1">
                                <IconButton
                                  icon={Download}
                                  label="Export HTML"
                                  size="sm"
                                  onClick={(e) => handleExportHtml(report, e)}
                                />
                                <IconButton
                                  icon={Printer}
                                  label="Print / PDF"
                                  size="sm"
                                  onClick={(e) => handlePrintPdf(report, e)}
                                />
                                <button
                                  type="button"
                                  onClick={(e) => handleExportCsv(report, e)}
                                  className="py-1 px-1.5 rounded-[4px] bg-wl-surface hover:bg-wl-raised border border-wl-border text-[11px] font-mono text-wl-muted hover:text-wl-text transition-colors"
                                  title="Export CSV"
                                >
                                  CSV
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleExportJson(report, e)}
                                  className="py-1 px-1.5 rounded-[4px] bg-wl-surface hover:bg-wl-raised border border-wl-border text-[11px] font-mono text-wl-muted hover:text-wl-text transition-colors"
                                  title="Export JSON"
                                >
                                  JSON
                                </button>
                                <IconButton
                                  icon={Trash2}
                                  label="Delete report"
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => handleDelete(report.id, e)}
                                  className="hover:text-[#f85149] hover:border-[#f85149]/40"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Mini Category Scores Row */}
                          <div className="mt-2 pt-2 border-t border-wl-border grid grid-cols-4 gap-1 text-[11px] font-mono text-center">
                            <div className="p-1 rounded-[4px] bg-wl-surface border border-wl-border">
                              <span className="text-wl-muted block text-[11px]">Perf</span>
                              <span className="font-semibold text-wl-text">{scores.performance ?? '—'}</span>
                            </div>
                            <div className="p-1 rounded-[4px] bg-wl-surface border border-wl-border">
                              <span className="text-wl-muted block text-[11px]">SEO</span>
                              <span className="font-semibold text-wl-text">{scores.seo ?? '—'}</span>
                            </div>
                            <div className="p-1 rounded-[4px] bg-wl-surface border border-wl-border">
                              <span className="text-wl-muted block text-[11px]">A11y</span>
                              <span className="font-semibold text-wl-text">{scores.accessibility ?? '—'}</span>
                            </div>
                            <div className="p-1 rounded-[4px] bg-wl-surface border border-wl-border">
                              <span className="text-wl-muted block text-[11px]">Sec</span>
                              <span className="font-semibold text-wl-text">{scores.security ?? '—'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
