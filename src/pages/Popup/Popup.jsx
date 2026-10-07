import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ExternalLink, RefreshCw, Activity } from 'lucide-react';
import { calculateOverallScore } from '../../analyzers/scoring';
import { ScoreRing, FindingRow, Button, IconButton, LoadingRow, ErrorState, EmptyState } from '../../components/ui';

export default function Popup() {
  const [tabInfo, setTabInfo] = useState({ domain: 'Loading...', url: '', title: '', tabId: null, windowId: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [perfData, setPerfData] = useState(null);
  const [seoData, setSeoData] = useState(null);
  const [a11yData, setA11yData] = useState(null);
  const [secData, setSecData] = useState(null);

  const runQuickAudit = useCallback((tabId) => {
    if (!tabId) return;
    setIsLoading(true);
    setError(null);

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      const sendAsync = (type) =>
        new Promise((resolve) => {
          chrome.runtime.sendMessage({ type, tabId }, (response) => {
            if (chrome.runtime.lastError) {
              resolve(null);
            } else if (response && response.ok) {
              resolve(response.data);
            } else {
              resolve(null);
            }
          });
        });

      Promise.all([
        sendAsync('ANALYZE_PERFORMANCE'),
        sendAsync('ANALYZE_SEO'),
        sendAsync('ANALYZE_ACCESSIBILITY'),
        sendAsync('ANALYZE_SECURITY'),
      ])
        .then(([perf, seo, a11y, sec]) => {
          setIsLoading(false);
          setPerfData(perf);
          setSeoData(seo);
          setA11yData(a11y);
          setSecData(sec);
        })
        .catch((err) => {
          setIsLoading(false);
          setError(err?.message || 'Quick audit failed.');
        });
    } else {
      setTimeout(() => {
        setIsLoading(false);
        setPerfData({
          score: 84,
          findings: [
            {
              id: 'perf-lcp',
              title: 'Largest Contentful Paint needs improvement',
              severity: 'medium',
              evidence: 'LCP occurred at 2.84s (target: ≤ 2.5s)',
              recommendation: 'Preload hero images and defer non-critical scripts.',
            },
          ],
        });
        setSeoData({
          score: 86,
          findings: [
            {
              id: 'seo-headings',
              title: 'Heading hierarchy skips detected',
              severity: 'medium',
              evidence: 'H2 jumped directly to H4',
              recommendation: 'Use consecutive heading levels (H2 → H3).',
            },
          ],
        });
        setA11yData({
          score: 82,
          findings: [
            {
              id: 'a11y-labels',
              title: 'Form inputs missing associated labels',
              severity: 'critical',
              evidence: '1 input does not have an associated label',
              recommendation: 'Associate with a <label for="..."> or provide an aria-label.',
            },
          ],
        });
        setSecData({
          score: 88,
          findings: [
            {
              id: 'sec-csp',
              title: 'Missing Content-Security-Policy (CSP)',
              severity: 'high',
              evidence: 'No Content-Security-Policy header detected in server response',
              recommendation: 'Implement a Content-Security-Policy header specifying trusted script-src directives.',
            },
          ],
        });
      }, 200);
    }
  }, []);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs?.[0];
        if (activeTab?.url) {
          try {
            const parsedUrl = new URL(activeTab.url);
            const info = {
              domain: parsedUrl.hostname || 'Local Page',
              url: activeTab.url,
              title: activeTab.title || 'Untitled Tab',
              windowId: activeTab.windowId,
              tabId: activeTab.id,
            };
            setTabInfo(info);
            runQuickAudit(activeTab.id);
          } catch {
            const info = {
              domain: 'Special Page',
              url: activeTab.url,
              title: activeTab.title || 'Special Tab',
              windowId: activeTab.windowId,
              tabId: activeTab.id,
            };
            setTabInfo(info);
            runQuickAudit(activeTab.id);
          }
        } else {
          setIsLoading(false);
          setError('No active webpage detected.');
        }
      });
    } else {
      setTabInfo({
        domain: 'developer.chrome.com',
        url: 'https://developer.chrome.com/docs/extensions/mv3',
        title: 'Chrome Extensions Docs',
        tabId: 1,
      });
      runQuickAudit(1);
    }
  }, [runQuickAudit]);

  const handleOpenDashboard = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.sidePanel?.open && tabInfo.windowId) {
        await chrome.sidePanel.open({ windowId: tabInfo.windowId });
        window.close();
      }
    } catch (err) {
      console.error('Error opening side panel:', err);
    }
  };

  const scoreData = useMemo(() => {
    return calculateOverallScore({
      performance: perfData,
      seo: seoData,
      accessibility: a11yData,
      security: secData,
    });
  }, [perfData, seoData, a11yData, secData]);

  const { overallScore = 0, grade = 'N/A', issueCounts = { total: 0 }, topRecommendations = [] } = scoreData;
  const top3Findings = topRecommendations.slice(0, 3);

  return (
    <div className="w-[360px] max-w-[360px] bg-wl-bg text-wl-text p-4 font-sans select-none border border-wl-border space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-wl-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-[4px] bg-[#4f8cff] flex items-center justify-center text-white shrink-0">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-[13px] tracking-tight text-wl-text block leading-tight">
              WebXray
            </span>
            <span className="text-[11px] text-wl-muted font-mono truncate block" title={tabInfo.domain}>
              {tabInfo.domain}
            </span>
          </div>
        </div>

        <IconButton
          icon={RefreshCw}
          label="Refresh quick audit"
          disabled={isLoading}
          onClick={() => runQuickAudit(tabInfo.tabId)}
          className={isLoading ? 'text-[#4f8cff]' : ''}
        />
      </div>

      {/* Main Body */}
      {error ? (
        <ErrorState title="Audit Failed" message={error} onRetry={() => runQuickAudit(tabInfo.tabId)} />
      ) : isLoading ? (
        <LoadingRow count={3} />
      ) : (
        <div className="space-y-3.5">
          {/* Overall Score */}
          <div className="p-3 rounded-[6px] border border-wl-border bg-wl-surface flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ScoreRing score={overallScore} size="lg" grade={grade} />
              <div>
                <span className="text-[11px] text-wl-muted block">Overall Health</span>
                <span className="text-[13px] font-semibold text-wl-text">Grade {grade}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[13px] font-semibold font-mono text-wl-text block">
                {issueCounts.total}
              </span>
              <span className="text-[11px] text-wl-muted block">
                {issueCounts.total === 1 ? 'issue found' : 'issues found'}
              </span>
            </div>
          </div>

          {/* Top 3 Priority Issues */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-wl-text">Top Findings</span>
              <span className="text-[11px] text-wl-muted font-mono">{top3Findings.length} of {issueCounts.total}</span>
            </div>

            {top3Findings.length === 0 ? (
              <EmptyState
                title="All checks passing"
                description="No priority issues detected on this page."
              />
            ) : (
              <div className="space-y-1.5">
                {top3Findings.map((finding, idx) => (
                  <FindingRow
                    key={finding.id || idx}
                    finding={finding}
                    defaultExpanded={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Button */}
      <Button
        variant="primary"
        onClick={handleOpenDashboard}
        className="w-full py-2 text-[13px]"
        icon={ExternalLink}
      >
        Open full report
      </Button>

      {/* Footer */}
      <div className="pt-2 border-t border-wl-border flex items-center justify-between text-[11px] text-wl-muted font-sans">
        <span>WebXray</span>
        <span>Local Analysis Only</span>
      </div>
    </div>
  );
}
