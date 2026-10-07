import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  MoreHorizontal,
  ArrowLeft,
  FileText,
  Settings,
  Bookmark,
  Download,
  Printer,
  Check,
  Activity,
} from 'lucide-react';
import { useAnalysis } from '../../hooks/useAnalysis';
import { Tabs, IconButton } from '../../components/ui';
import OverviewView from '../../components/overview/OverviewView';
import PerformanceView from '../../components/performance/PerformanceView';
import SeoView from '../../components/seo/SeoView';
import AccessibilityView from '../../components/accessibility/AccessibilityView';
import SecurityView from '../../components/security/SecurityView';
import TechnologyView from '../../components/technology/TechnologyView';
import ReportsView from '../Reports/ReportsView';
import SettingsView from '../Settings/SettingsView';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import {
  exportReportAsJson,
  exportReportAsCsv,
  exportReportAsHtml,
  downloadFile,
} from '../../services/storage/exportReport';

export default function Dashboard() {
  const {
    tabInfo,
    overview,
    performance,
    seo,
    accessibility,
    security,
    technology,
    unifiedScore,
    isAnyLoading,
    isReportSaved,
    runAll,
    runPerformance,
    runSeo,
    runAccessibility,
    runSecurity,
    runTechnology,
    saveCurrentReport,
  } = useAnalysis();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'performance' | 'seo' | 'accessibility' | 'security' | 'technology'
  const [subView, setSubView] = useState(null); // null | 'reports' | 'settings'
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Lazy audit trigger when switching tab
  useEffect(() => {
    if (!tabInfo.id) return;
    if (activeTab === 'performance' && !performance.data && !performance.isLoading) {
      runPerformance(tabInfo.id);
    } else if (activeTab === 'seo' && !seo.data && !seo.isLoading) {
      runSeo(tabInfo.id);
    } else if (activeTab === 'accessibility' && !accessibility.data && !accessibility.isLoading) {
      runAccessibility(tabInfo.id);
    } else if (activeTab === 'security' && !security.data && !security.isLoading) {
      runSecurity(tabInfo.id);
    } else if (activeTab === 'technology' && !technology.data && !technology.isLoading) {
      runTechnology(tabInfo.id);
    }
  }, [activeTab, tabInfo.id, performance.data, performance.isLoading, seo.data, seo.isLoading, accessibility.data, accessibility.isLoading, security.data, security.isLoading, technology.data, technology.isLoading, runPerformance, runSeo, runAccessibility, runSecurity, runTechnology]);

  // Export report handler
  const handleExport = useCallback(
    (format) => {
      if (!unifiedScore || !tabInfo.url) return;

      const allFindings = [
        ...(performance.data?.findings || []),
        ...(seo.data?.findings || []),
        ...(accessibility.data?.findings || []),
        ...(security.data?.findings || []),
      ];
      const findingsSummary = allFindings.filter((f) => f && f.severity !== 'passed');

      const report = {
        url: tabInfo.url,
        domain: tabInfo.domain,
        title: overview.data?.title || tabInfo.domain,
        timestamp: Date.now(),
        scores: {
          overall: unifiedScore.overallScore,
          grade: unifiedScore.grade,
          rating: unifiedScore.rating,
          performance: unifiedScore.categoryScores.performance,
          seo: unifiedScore.categoryScores.seo,
          accessibility: unifiedScore.categoryScores.accessibility,
          security: unifiedScore.categoryScores.security,
          bestPractices: unifiedScore.categoryScores.bestPractices,
        },
        issueCounts: unifiedScore.issueCounts,
        findingsSummary,
        technologies: technology.data?.detections || [],
      };

      const domainClean = (tabInfo.domain || 'report').replace(/[^a-z0-9]/gi, '_');

      if (format === 'json') {
        downloadFile(exportReportAsJson(report), `webxray_${domainClean}_${Date.now()}.json`, 'application/json');
      } else if (format === 'csv') {
        downloadFile(exportReportAsCsv(report), `webxray_${domainClean}_${Date.now()}.csv`, 'text/csv');
      } else if (format === 'html') {
        downloadFile(exportReportAsHtml(report), `webxray_${domainClean}_${Date.now()}.html`, 'text/html');
      } else if (format === 'pdf') {
        const content = exportReportAsHtml(report);
        const blob = new Blob([content], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (win) {
          win.focus();
          setTimeout(() => {
            try {
              win.print();
            } catch {
              // Ignore
            }
          }, 500);
        }
      }
      setIsMenuOpen(false);
    },
    [unifiedScore, tabInfo, performance.data, seo.data, accessibility.data, security.data, overview.data, technology.data]
  );

  // Tab navigation config array (6 primary tabs)
  const tabConfig = [
    { id: 'overview', label: 'Overview', score: unifiedScore?.overallScore },
    { id: 'performance', label: 'Performance', score: performance.data?.score },
    { id: 'seo', label: 'SEO', score: seo.data?.score },
    { id: 'accessibility', label: 'Accessibility', score: accessibility.data?.score },
    { id: 'security', label: 'Security', score: security.data?.score },
    { id: 'technology', label: 'Technology', count: technology.data?.totalCount },
  ];

  return (
    <div className="min-h-screen bg-wl-bg text-wl-text font-sans p-4 flex flex-col gap-4 select-none w-full max-w-full overflow-x-hidden min-w-0">
      {/* 1. Header (one slim row) */}
      <header className="flex items-center justify-between pb-3 border-b border-wl-border">
        {subView ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSubView(null)}
              aria-label="Back to Dashboard"
              className="p-1 rounded-[4px] hover:bg-wl-surface text-wl-muted hover:text-wl-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff] transition-colors flex items-center gap-1.5 text-[12px] font-sans"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
            <span className="text-wl-border">/</span>
            <span className="text-[13px] font-medium text-wl-text capitalize">
              {subView === 'reports' ? 'Saved Reports' : 'Settings'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Flat logo mark without gradients */}
            <div className="w-6 h-6 rounded-[4px] bg-[#4f8cff] flex items-center justify-center text-white shrink-0">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="font-semibold text-[13px] tracking-tight text-wl-text">WebXray</span>
              <span className="text-[11px] text-wl-muted font-mono truncate" title={tabInfo.domain}>
                {tabInfo.domain || 'Detecting page...'}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 shrink-0 relative" ref={menuRef}>
          <IconButton
            icon={RefreshCw}
            label="Refresh all audits"
            disabled={isAnyLoading}
            onClick={() => runAll(tabInfo.id)}
            className={isAnyLoading ? 'text-[#4f8cff]' : ''}
          />

          <IconButton
            icon={MoreHorizontal}
            label="More options"
            active={isMenuOpen}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          />

          {/* More (⋯) Dropdown Menu */}
          {isMenuOpen && (
            <div
              role="menu"
              aria-label="More options"
              className="absolute right-0 top-full mt-1.5 w-48 rounded-[6px] border border-wl-border bg-wl-surface shadow-none z-50 py-1 text-[12px] font-sans"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  saveCurrentReport();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-wl-raised text-wl-text flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4f8cff]"
              >
                {isReportSaved ? <Check className="w-3.5 h-3.5 text-[#3fb950]" /> : <Bookmark className="w-3.5 h-3.5 text-wl-muted" />}
                <span>{isReportSaved ? 'Report Saved' : 'Save Report'}</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setSubView('reports');
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-wl-raised text-wl-text flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4f8cff]"
              >
                <FileText className="w-3.5 h-3.5 text-wl-muted" />
                <span>Saved Reports</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setSubView('settings');
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-wl-raised text-wl-text flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4f8cff]"
              >
                <Settings className="w-3.5 h-3.5 text-wl-muted" />
                <span>Settings</span>
              </button>

              <div className="my-1 border-t border-wl-border" />

              <div className="px-3 py-1 text-[11px] text-wl-muted uppercase font-medium">Export</div>

              <button
                type="button"
                role="menuitem"
                onClick={() => handleExport('json')}
                className="w-full text-left px-3 py-1.5 hover:bg-wl-raised text-wl-text flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4f8cff]"
              >
                <Download className="w-3.5 h-3.5 text-wl-muted" />
                <span>Export as JSON</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => handleExport('csv')}
                className="w-full text-left px-3 py-1.5 hover:bg-wl-raised text-wl-text flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4f8cff]"
              >
                <Download className="w-3.5 h-3.5 text-wl-muted" />
                <span>Export as CSV</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => handleExport('html')}
                className="w-full text-left px-3 py-1.5 hover:bg-wl-raised text-wl-text flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4f8cff]"
              >
                <Download className="w-3.5 h-3.5 text-wl-muted" />
                <span>Export as HTML</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => handleExport('pdf')}
                className="w-full text-left px-3 py-1.5 hover:bg-wl-raised text-wl-text flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4f8cff]"
              >
                <Printer className="w-3.5 h-3.5 text-wl-muted" />
                <span>Print / PDF</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. SubViews (Reports or Settings) OR Main Tab Navigation */}
      {subView === 'reports' ? (
        <main>
          <ErrorBoundary moduleName="Saved Reports">
            <ReportsView onBackToDashboard={() => setSubView(null)} />
          </ErrorBoundary>
        </main>
      ) : subView === 'settings' ? (
        <main>
          <ErrorBoundary moduleName="Settings">
            <SettingsView />
          </ErrorBoundary>
        </main>
      ) : (
        <>
          {/* Underline Tabs */}
          <Tabs
            tabs={tabConfig}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(tabId)}
          />

          {/* Tab Content Panes */}
          <main className="min-w-0">
            {activeTab === 'overview' && (
              <ErrorBoundary moduleName="Overview">
                <OverviewView
                  scoreData={unifiedScore}
                  overviewData={overview.data}
                  isLoading={overview.isLoading}
                  error={overview.error}
                  onReanalyze={() => runAll(tabInfo.id)}
                  onSelectTab={(tabId) => setActiveTab(tabId)}
                />
              </ErrorBoundary>
            )}

            {activeTab === 'performance' && (
              <ErrorBoundary moduleName="Performance">
                <PerformanceView
                  data={performance.data}
                  isLoading={performance.isLoading}
                  error={performance.error}
                  onReanalyze={() => runPerformance(tabInfo.id)}
                />
              </ErrorBoundary>
            )}

            {activeTab === 'seo' && (
              <ErrorBoundary moduleName="SEO">
                <SeoView
                  data={seo.data}
                  isLoading={seo.isLoading}
                  error={seo.error}
                  onReanalyze={() => runSeo(tabInfo.id)}
                />
              </ErrorBoundary>
            )}

            {activeTab === 'accessibility' && (
              <ErrorBoundary moduleName="Accessibility">
                <AccessibilityView
                  data={accessibility.data}
                  tabId={tabInfo.id}
                  isLoading={accessibility.isLoading}
                  error={accessibility.error}
                  onReanalyze={() => runAccessibility(tabInfo.id)}
                />
              </ErrorBoundary>
            )}

            {activeTab === 'security' && (
              <ErrorBoundary moduleName="Security">
                <SecurityView
                  data={security.data}
                  tabUrl={tabInfo.url}
                  isLoading={security.isLoading}
                  error={security.error}
                  onReanalyze={() => runSecurity(tabInfo.id)}
                />
              </ErrorBoundary>
            )}

            {activeTab === 'technology' && (
              <ErrorBoundary moduleName="Technology">
                <TechnologyView
                  data={technology.data}
                  isLoading={technology.isLoading}
                  error={technology.error}
                  onReanalyze={() => runTechnology(tabInfo.id)}
                />
              </ErrorBoundary>
            )}
          </main>
        </>
      )}

      {/* 3. Footer */}
      <footer className="mt-auto pt-4 border-t border-wl-border flex items-center justify-between text-[11px] text-wl-muted font-sans">
        <span>WebXray • Local Analysis Only</span>
        <span>Inspect. Understand. Improve.</span>
      </footer>
    </div>
  );
}
