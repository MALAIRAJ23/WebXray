import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { calculateOverallScore } from '../analyzers/scoring';
import { getSettings, saveReport, SCORING_VERSION } from '../services/storage/reportsStorage';

const MOCK_RESOURCES = [
  { name: 'https://example.com/assets/bundle.js', type: 'js', transferSize: 520000, duration: 240, domain: 'example.com' },
  { name: 'https://example.com/img/hero.webp', type: 'images', transferSize: 380000, duration: 310, domain: 'example.com' },
  { name: 'https://example.com/fonts/inter.woff2', type: 'fonts', transferSize: 95000, duration: 80, domain: 'example.com' },
  { name: 'https://cdn.jsdelivr.net/npm/lucide@0.4.0/index.js', type: 'js', transferSize: 85000, duration: 120, domain: 'cdn.jsdelivr.net' },
  { name: 'https://fonts.googleapis.com/css2?family=Inter', type: 'css', transferSize: 15000, duration: 60, domain: 'fonts.googleapis.com' },
  { name: 'https://www.google-analytics.com/analytics.js', type: 'js', transferSize: 45000, duration: 190, domain: 'www.google-analytics.com' },
  { name: 'https://connect.facebook.net/en_US/fbevents.js', type: 'js', transferSize: 68000, duration: 220, domain: 'connect.facebook.net' },
  { name: 'https://example.com/api/user-profile', type: 'fetch', transferSize: 12000, duration: 140, domain: 'example.com' },
  { name: 'https://example.com/styles/main.css', type: 'css', transferSize: 32000, duration: 90, domain: 'example.com' },
  { name: 'https://example.com/icons/favicon.ico', type: 'images', transferSize: 4000, duration: 30, domain: 'example.com' },
];

export function useAnalysis() {
  const [tabInfo, setTabInfo] = useState({ id: null, url: '', domain: '', title: '' });
  const tabInfoRef = useRef({ id: null, url: '', domain: '', title: '' });
  const activeRunSequenceRef = useRef(0);

  // Analyzer data states
  const [overview, setOverview] = useState({ data: null, isLoading: true, error: null });
  const [performance, setPerformance] = useState({ data: null, isLoading: false, error: null });
  const [seo, setSeo] = useState({ data: null, isLoading: false, error: null });
  const [accessibility, setAccessibility] = useState({ data: null, isLoading: false, error: null });
  const [security, setSecurity] = useState({ data: null, isLoading: false, error: null });
  const [technology, setTechnology] = useState({ data: null, isLoading: false, error: null });

  const [isReportSaved, setIsReportSaved] = useState(false);

  // Send message helper
  const sendChromeMessage = useCallback((type, tabId) => {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type, tabId }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || 'Service worker communication error'));
          } else if (response && response.ok) {
            resolve(response.data);
          } else {
            reject(new Error(response?.message || `${type} failed`));
          }
        });
      } else {
        // Fallback mock responses when running outside Chrome extension environment
        setTimeout(() => {
          if (type === 'ANALYZE_OVERVIEW') {
            resolve({
              title: 'Chrome Extension Documentation | Chrome for Developers',
              url: 'https://developer.chrome.com/docs/extensions/mv3',
              domain: 'developer.chrome.com',
              protocol: 'https:',
              htmlLang: 'en',
              viewportMeta: 'width=device-width, initial-scale=1',
              doctype: 'HTML5',
              counts: {
                domElements: 486,
                images: 18,
                links: 72,
                forms: 2,
                scripts: 14,
                stylesheets: 5,
              },
              collectedAt: Date.now(),
            });
          } else if (type === 'ANALYZE_PERFORMANCE') {
            resolve({
              score: 84,
              breakdown: {
                baseScore: 100,
                totalDeductions: 16,
                deductions: [
                  { id: 'perf-lcp-needs-improvement', reason: 'Largest Contentful Paint Needs Improvement', points: 8 },
                  { id: 'perf-js-high-count', reason: 'Excessive JavaScript Files Detected', points: 8 },
                ],
              },
              metrics: {
                ttfb: 142,
                domContentLoaded: 680,
                loadEvent: 1820,
                fcp: 620,
                lcp: 2840,
                cls: 0.014,
              },
              allResources: MOCK_RESOURCES,
              resourcesSummary: {
                totalCount: 42,
                totalKnownTransferBytes: 1845000,
                unknownSizeCount: 3,
                allResources: MOCK_RESOURCES,
                byType: {
                  js: { count: 18, bytes: 840000 },
                  css: { count: 4, bytes: 120000 },
                  images: { count: 12, bytes: 640000 },
                  fonts: { count: 3, bytes: 145000 },
                  media: { count: 0, bytes: 0 },
                  fetch: { count: 5, bytes: 100000 },
                  other: { count: 0, bytes: 0 },
                },
                topLargest: MOCK_RESOURCES.slice(0, 3),
              },
              findings: [
                {
                  id: 'perf-lcp-needs-improvement',
                  title: 'Largest Contentful Paint needs improvement',
                  severity: 'medium',
                  evidence: 'LCP occurred at 2.84s (target: ≤ 2.5s)',
                  whyItMatters: 'LCP measures when primary content renders.',
                  recommendation: 'Preload the hero image and defer non-critical scripts.',
                },
                {
                  id: 'perf-js-high-count',
                  title: 'Excessive JavaScript files detected',
                  severity: 'medium',
                  evidence: '18 separate JavaScript files requested (recommended: ≤ 15)',
                  whyItMatters: 'Too many scripts delay interactivity.',
                  recommendation: 'Bundle script modules with Vite and lazy load analytics.',
                },
                {
                  id: 'perf-cls-passed',
                  title: 'Stable page layout (low CLS)',
                  severity: 'passed',
                  evidence: 'CLS score is 0.014 (target: ≤ 0.1)',
                  whyItMatters: 'Page elements remain stable while loading.',
                  recommendation: 'Continue specifying dimensions on media containers.',
                },
                {
                  id: 'perf-images-passed',
                  title: 'Images appropriately sized',
                  severity: 'passed',
                  evidence: 'All 12 loaded images are under 500 KB',
                  whyItMatters: 'Keeping images lightweight preserves user bandwidth.',
                  recommendation: 'Continue serving optimized responsive images.',
                },
              ],
            });
          } else if (type === 'ANALYZE_SEO') {
            resolve({
              score: 86,
              breakdown: {
                baseScore: 100,
                totalDeductions: 14,
                deductions: [
                  { id: 'seo-heading-skips', reason: 'Heading Hierarchy Skips Detected', points: 8 },
                  { id: 'seo-links-non-descriptive', reason: 'Non-Descriptive Link Text Detected', points: 6 },
                ],
              },
              metadata: {
                title: 'Chrome Extension Documentation | Chrome for Developers',
                metaDescription: 'Discover the latest APIs, developer guides, and architectural best practices for building powerful Manifest V3 Chrome extensions.',
                canonical: 'https://developer.chrome.com/docs/extensions/mv3',
                robotsMeta: 'index, follow',
                htmlLang: 'en',
                domain: 'developer.chrome.com',
                openGraph: {
                  title: 'Chrome Extension Documentation',
                  description: 'Guides and reference materials for building Chrome extensions.',
                  image: 'https://developer.chrome.com/static/images/share.png',
                },
                twitter: { card: 'summary_large_image' },
              },
              headings: [
                { id: 'h1', level: 1, text: 'Chrome Extension Documentation' },
                { id: 'h2-1', level: 2, text: 'Getting Started with Manifest V3' },
                { id: 'h3-1', level: 3, text: 'Background Service Workers' },
                { id: 'h2-2', level: 2, text: 'Core APIs' },
                { id: 'h4-1', level: 4, text: 'Declarative Net Request' },
              ],
              links: {
                total: 38,
                internal: 28,
                external: 10,
                emptyHref: 0,
                nonDescriptive: [
                  { text: 'click here', href: '/docs' },
                  { text: 'read more', href: '/guides' },
                ],
              },
              images: {
                total: 6,
                missingAlt: 0,
                emptyAlt: 1,
                missingDimensions: 2,
                sampleMissingAlt: [],
              },
              findings: [
                {
                  id: 'seo-title-optimal',
                  title: 'Optimal page title length',
                  severity: 'passed',
                  evidence: '53 characters: "Chrome Extension Documentation | Chrome for Developers"',
                  whyItMatters: 'Optimal title length ensures full visibility in search headlines.',
                  recommendation: 'Maintain current title format.',
                },
                {
                  id: 'seo-desc-optimal',
                  title: 'Optimal meta description length',
                  severity: 'passed',
                  evidence: '136 characters (within 70–160 range)',
                  whyItMatters: 'Engaging descriptions drive search click-through rates.',
                  recommendation: 'Maintain descriptive copy.',
                },
                {
                  id: 'seo-heading-skips',
                  title: 'Heading hierarchy skips detected',
                  severity: 'medium',
                  evidence: '1 hierarchy skip: H2 jumped directly to H4 ("Declarative Net Request")',
                  whyItMatters: 'Skipping heading levels confuses screen readers and search bots.',
                  recommendation: 'Use consecutive heading levels (H2 → H3).',
                },
                {
                  id: 'seo-links-non-descriptive',
                  title: 'Non-descriptive link text detected',
                  severity: 'medium',
                  evidence: '2 links use generic labels ("click here", "read more")',
                  whyItMatters: 'Generic link anchors fail to convey context to search engines.',
                  recommendation: 'Replace generic text with informative descriptive anchors.',
                },
              ],
            });
          } else if (type === 'ANALYZE_ACCESSIBILITY') {
            resolve({
              score: 82,
              breakdown: {
                baseScore: 100,
                totalDeductions: 18,
                deductions: [{ id: 'a11y-form-labels', reason: 'Form Inputs Missing Associated Labels', points: 18 }],
              },
              summary: {
                imagesCount: 12,
                missingAltCount: 0,
                formControlsCount: 4,
                missingLabelsCount: 1,
                buttonsCount: 8,
                missingButtonNamesCount: 0,
                landmarks: { main: 1, nav: 2, header: 1, footer: 1 },
                duplicateIdsCount: 0,
                positiveTabindexCount: 0,
              },
              findings: [
                {
                  id: 'a11y-form-labels',
                  title: 'Form inputs missing associated labels',
                  severity: 'critical',
                  evidence: '1 input does not have an associated <label>, aria-label, or title attribute.',
                  selectors: ['form#search-form > input[name="q"]'],
                  whyItMatters: 'Unlabeled form controls prevent screen reader users from understanding what data is required.',
                  recommendation: 'Associate with a <label for="..."> or provide an aria-label.',
                },
                {
                  id: 'a11y-main-landmark-passed',
                  title: 'Page contains a main landmark',
                  severity: 'passed',
                  evidence: '<main> landmark detected',
                  whyItMatters: 'Enables landmark navigation in assistive technologies.',
                  recommendation: 'Ensure one primary main landmark per page.',
                },
                {
                  id: 'a11y-buttons-passed',
                  title: 'All buttons have accessible names',
                  severity: 'passed',
                  evidence: 'All 8 buttons contain accessible text or aria-label',
                  whyItMatters: 'Allows users to know what action each button performs.',
                  recommendation: 'Maintain accessible names on all interactive controls.',
                },
                {
                  id: 'a11y-images-passed',
                  title: 'All images have alt attributes',
                  severity: 'passed',
                  evidence: 'All 12 images have alt attributes',
                  whyItMatters: 'Provides descriptive text for visual content.',
                  recommendation: 'Keep alt descriptions descriptive and concise.',
                },
              ],
            });
          } else if (type === 'ANALYZE_SECURITY') {
            resolve({
              score: 88,
              breakdown: {
                baseScore: 100,
                totalDeductions: 12,
                deductions: [{ id: 'sec-csp-missing', reason: 'Missing Content-Security-Policy (CSP)', points: 12 }],
              },
              headersSummary: [
                { name: 'Content-Security-Policy', status: 'missing', value: null, recommendation: 'Add CSP to mitigate XSS.' },
                { name: 'Strict-Transport-Security', status: 'configured', value: 'max-age=31536000; includeSubDomains; preload', recommendation: 'Enforce HTTPS connections.' },
                { name: 'X-Content-Type-Options', status: 'configured', value: 'nosniff', recommendation: 'Send nosniff header.' },
                { name: 'Referrer-Policy', status: 'configured', value: 'strict-origin-when-cross-origin', recommendation: 'Protect referral paths.' },
                { name: 'Permissions-Policy', status: 'missing', value: null, recommendation: 'Disable unused hardware APIs.' },
                { name: 'X-Frame-Options', status: 'configured', value: 'SAMEORIGIN', recommendation: 'Defend against clickjacking.' },
              ],
              mixedContent: { detected: false, count: 0, samples: [] },
              targetBlankLinks: { total: 14, vulnerableCount: 0, samples: [] },
              inlineScripts: { count: 2 },
              cookies: { clientAccessibleCount: 2, sampleNames: ['session_hint', 'theme_preference'], note: 'HttpOnly cookies cannot be read by JavaScript.' },
              thirdParty: {
                total: 34,
                thirdPartyTotal: 18,
                byCompany: { Google: 8, Cloudflare: 4, 'Meta / Facebook': 2, Other: 4 },
                topDomains: [
                  { domain: 'fonts.googleapis.com', count: 4 },
                  { domain: 'cdnjs.cloudflare.com', count: 4 },
                  { domain: 'www.google-analytics.com', count: 4 },
                  { domain: 'connect.facebook.net', count: 2 },
                ],
              },
              findings: [
                {
                  id: 'sec-https-passed',
                  title: 'HTTPS connection secured',
                  severity: 'passed',
                  evidence: 'Page is served over encrypted HTTPS connection',
                  whyItMatters: 'Protects user confidentiality and data integrity in transit.',
                  recommendation: 'Maintain SSL/TLS certificate renewals.',
                },
                {
                  id: 'sec-mixed-content-passed',
                  title: 'No mixed content detected',
                  severity: 'passed',
                  evidence: 'All inspected subresources are loaded securely over HTTPS',
                  whyItMatters: 'Preserves complete transport encryption across all page elements.',
                  recommendation: 'Continue enforcing HTTPS for all embedded assets.',
                },
                {
                  id: 'sec-csp-missing',
                  title: 'Missing Content-Security-Policy (CSP)',
                  severity: 'high',
                  evidence: 'No Content-Security-Policy header detected in server response',
                  whyItMatters: 'A robust CSP serves as primary defense against Cross-Site Scripting (XSS).',
                  recommendation: 'Implement a Content-Security-Policy header specifying trusted script-src directives.',
                },
              ],
            });
          } else if (type === 'ANALYZE_TECHNOLOGY') {
            resolve({
              score: 100,
              totalCount: 4,
              categories: {
                'Frontend Framework': [
                  {
                    id: 'react',
                    name: 'React',
                    category: 'Frontend Framework',
                    description: 'A declarative, component-based JavaScript library for building user interfaces.',
                    confidence: 'high',
                    evidence: [
                      { type: 'global', label: 'Window Global', value: 'window.React', detail: 'Detected global: window.React' },
                      { type: 'dom', label: 'DOM Element', value: '[data-reactroot]', detail: 'Found selector: [data-reactroot]' },
                    ],
                  },
                ],
                'Web Framework': [
                  {
                    id: 'nextjs',
                    name: 'Next.js',
                    category: 'Web Framework',
                    description: 'A React framework providing hybrid static and server-side rendering.',
                    confidence: 'high',
                    evidence: [
                      { type: 'global', label: 'Window Global', value: 'window.__NEXT_DATA__', detail: 'Detected global: window.__NEXT_DATA__' },
                    ],
                  },
                ],
                'CSS Framework': [
                  {
                    id: 'tailwind',
                    name: 'Tailwind CSS',
                    category: 'CSS Framework',
                    description: 'A utility-first CSS framework.',
                    confidence: 'medium',
                    evidence: [{ type: 'css', label: 'CSS Class', value: 'flex items-center', detail: 'Matched class pattern' }],
                  },
                ],
                'Hosting & Cloud': [
                  {
                    id: 'vercel',
                    name: 'Vercel',
                    category: 'Hosting & Cloud',
                    description: 'Frontend cloud platform.',
                    confidence: 'high',
                    evidence: [{ type: 'header', label: 'HTTP Response Header', value: 'x-vercel-id', detail: 'Server header match' }],
                  },
                ],
              },
              detections: [
                { id: 'react', name: 'React', category: 'Frontend Framework', confidence: 'high' },
                { id: 'nextjs', name: 'Next.js', category: 'Web Framework', confidence: 'high' },
                { id: 'tailwind', name: 'Tailwind CSS', category: 'CSS Framework', confidence: 'medium' },
                { id: 'vercel', name: 'Vercel', category: 'Hosting & Cloud', confidence: 'high' },
              ],
              findings: [],
            });
          } else {
            resolve(null);
          }
        }, 150);
      }
    });
  }, []);

  // Execution runners with monotonic sequence tracking (prevents race conditions)
  const runOverview = useCallback(
    async (id, expectedSeq) => {
      if (!id) return;
      const seq = expectedSeq ?? activeRunSequenceRef.current;
      setOverview((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const data = await sendChromeMessage('ANALYZE_OVERVIEW', id);
        if (seq !== activeRunSequenceRef.current) return; // Discard stale response
        setOverview({ data, isLoading: false, error: null });
      } catch (err) {
        if (seq !== activeRunSequenceRef.current) return;
        setOverview({ data: null, isLoading: false, error: err.message });
      }
    },
    [sendChromeMessage]
  );

  const runPerformance = useCallback(
    async (id, expectedSeq) => {
      if (!id) return;
      const seq = expectedSeq ?? activeRunSequenceRef.current;
      setPerformance((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const data = await sendChromeMessage('ANALYZE_PERFORMANCE', id);
        if (seq !== activeRunSequenceRef.current) return;
        setPerformance({
          data: {
            ...data,
            allResources: Array.isArray(data?.allResources)
              ? data.allResources
              : Array.isArray(data?.resourcesSummary?.allResources)
              ? data.resourcesSummary.allResources
              : data?.resourcesSummary?.topLargest || [],
          },
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (seq !== activeRunSequenceRef.current) return;
        setPerformance({ data: null, isLoading: false, error: err.message });
      }
    },
    [sendChromeMessage]
  );

  const runSeo = useCallback(
    async (id, expectedSeq) => {
      if (!id) return;
      const seq = expectedSeq ?? activeRunSequenceRef.current;
      setSeo((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const data = await sendChromeMessage('ANALYZE_SEO', id);
        if (seq !== activeRunSequenceRef.current) return;
        setSeo({ data, isLoading: false, error: null });
      } catch (err) {
        if (seq !== activeRunSequenceRef.current) return;
        setSeo({ data: null, isLoading: false, error: err.message });
      }
    },
    [sendChromeMessage]
  );

  const runAccessibility = useCallback(
    async (id, expectedSeq) => {
      if (!id) return;
      const seq = expectedSeq ?? activeRunSequenceRef.current;
      setAccessibility((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const data = await sendChromeMessage('ANALYZE_ACCESSIBILITY', id);
        if (seq !== activeRunSequenceRef.current) return;
        setAccessibility({ data, isLoading: false, error: null });
      } catch (err) {
        if (seq !== activeRunSequenceRef.current) return;
        setAccessibility({ data: null, isLoading: false, error: err.message });
      }
    },
    [sendChromeMessage]
  );

  const runSecurity = useCallback(
    async (id, expectedSeq) => {
      if (!id) return;
      const seq = expectedSeq ?? activeRunSequenceRef.current;
      setSecurity((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const data = await sendChromeMessage('ANALYZE_SECURITY', id);
        if (seq !== activeRunSequenceRef.current) return;
        setSecurity({ data, isLoading: false, error: null });
      } catch (err) {
        if (seq !== activeRunSequenceRef.current) return;
        setSecurity({ data: null, isLoading: false, error: err.message });
      }
    },
    [sendChromeMessage]
  );

  const runTechnology = useCallback(
    async (id, expectedSeq) => {
      if (!id) return;
      const seq = expectedSeq ?? activeRunSequenceRef.current;
      setTechnology((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const data = await sendChromeMessage('ANALYZE_TECHNOLOGY', id);
        if (seq !== activeRunSequenceRef.current) return;
        setTechnology({ data, isLoading: false, error: null });
      } catch (err) {
        if (seq !== activeRunSequenceRef.current) return;
        setTechnology({ data: null, isLoading: false, error: err.message });
      }
    },
    [sendChromeMessage]
  );

  const runAll = useCallback(
    (id) => {
      const targetId = id || tabInfoRef.current.id;
      if (!targetId) return;
      const seq = ++activeRunSequenceRef.current;
      runOverview(targetId, seq);
      runPerformance(targetId, seq);
      runSeo(targetId, seq);
      runAccessibility(targetId, seq);
      runSecurity(targetId, seq);
      runTechnology(targetId, seq);
    },
    [runOverview, runPerformance, runSeo, runAccessibility, runSecurity, runTechnology]
  );

  // Initialize active tab and attach listeners for tab switching & SPA/page navigations
  useEffect(() => {
    let isMounted = true;

    const inspectTab = (tab) => {
      if (!isMounted || !tab?.id) return;
      let domain = 'Special Page';
      try {
        domain = new URL(tab.url).hostname || 'Special Page';
      } catch {
        // Keep fallback
      }
      const info = {
        id: tab.id,
        url: tab.url || '',
        domain,
        title: tab.title || '',
      };
      tabInfoRef.current = info;
      setTabInfo(info);
      runAll(tab.id);
    };

    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      // 1. Initial active tab check
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const active = tabs?.[0];
        if (active?.id) {
          inspectTab(active);
        } else {
          setOverview({ data: null, isLoading: false, error: 'No active tab detected.' });
        }
      });

      // 2. Tab switch listener: active tab changed in window
      const handleTabActivated = (activeInfo) => {
        chrome.tabs.get(activeInfo.tabId, (tab) => {
          if (chrome.runtime.lastError || !tab) return;
          inspectTab(tab);
        });
      };

      // 3. Tab navigation / update listener: page loaded or URL changed
      const handleTabUpdated = (tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete' || changeInfo.url) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentActive = tabs?.[0];
            if (currentActive && currentActive.id === tabId) {
              inspectTab(tab);
            }
          });
        }
      };

      chrome.tabs.onActivated?.addListener(handleTabActivated);
      chrome.tabs.onUpdated?.addListener(handleTabUpdated);

      return () => {
        isMounted = false;
        chrome.tabs.onActivated?.removeListener(handleTabActivated);
        chrome.tabs.onUpdated?.removeListener(handleTabUpdated);
      };
    } else {
      // Dev / Mock environment
      const mockInfo = {
        id: 1,
        url: 'https://developer.chrome.com/docs/extensions/mv3',
        domain: 'developer.chrome.com',
        title: 'Chrome Extension Documentation | Chrome for Developers',
      };
      tabInfoRef.current = mockInfo;
      setTabInfo(mockInfo);
      runAll(1);
      return () => {
        isMounted = false;
      };
    }
  }, [runAll]);

  // Unified score computation
  const unifiedScore = useMemo(() => {
    return calculateOverallScore({
      performance: performance.data,
      seo: seo.data,
      accessibility: accessibility.data,
      security: security.data,
    });
  }, [performance.data, seo.data, accessibility.data, security.data]);

  // Save report
  const saveCurrentReport = useCallback(async () => {
    if (!unifiedScore || !tabInfo.url) return;

    const allFindings = [
      ...(performance.data?.findings || []),
      ...(seo.data?.findings || []),
      ...(accessibility.data?.findings || []),
      ...(security.data?.findings || []),
    ];
    const findingsSummary = allFindings.filter((f) => f && f.severity !== 'passed');

    const allRuleResults = [
      ...(performance.data?.results || []),
      ...(seo.data?.results || []),
      ...(accessibility.data?.results || []),
      ...(security.data?.results || []),
      ...(unifiedScore.ruleResultsByCategory?.bestPractices || []),
    ];

    const reportToSave = {
      url: tabInfo.url,
      domain: tabInfo.domain,
      title: overview.data?.title || tabInfo.domain,
      timestamp: Date.now(),
      scoringVersion: SCORING_VERSION,
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
      ruleResults: allRuleResults,
      findingsSummary,
      technologies: technology.data?.detections || [],
    };

    try {
      await saveReport(reportToSave);
      setIsReportSaved(true);
      setTimeout(() => setIsReportSaved(false), 3000);
    } catch (err) {
      console.error('[WebXray] Error saving report:', err);
    }
  }, [unifiedScore, tabInfo, performance.data, seo.data, accessibility.data, security.data, overview.data, technology.data]);

  // Auto-save check if enabled
  useEffect(() => {
    async function checkAutoSave() {
      if (
        performance.data &&
        seo.data &&
        accessibility.data &&
        security.data &&
        tabInfo.url &&
        !overview.isLoading
      ) {
        try {
          const settings = await getSettings();
          if (settings.autoSave) {
            saveCurrentReport();
          }
        } catch {
          // ignore
        }
      }
    }
    checkAutoSave();
  }, [performance.data, seo.data, accessibility.data, security.data, tabInfo.url, overview.isLoading, saveCurrentReport]);

  const isAnyLoading =
    overview.isLoading ||
    performance.isLoading ||
    seo.isLoading ||
    accessibility.isLoading ||
    security.isLoading ||
    technology.isLoading;

  return {
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
    runOverview,
    runPerformance,
    runSeo,
    runAccessibility,
    runSecurity,
    runTechnology,
    saveCurrentReport,
  };
}
