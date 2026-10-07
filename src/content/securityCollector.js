/**
 * WebXray - Content Script Security Collector
 * Injected on demand via chrome.scripting.executeScript (Rule 3)
 * Collects HTTPS status, mixed content, target="_blank" noopener, inline scripts, cookies, and third-party resources
 * Follows Rule 2: Privacy-first (100% in-browser local collection)
 */

(() => {
  try {
    const win = window;
    const doc = document;
    const pageProtocol = win.location.protocol;
    const pageHostname = win.location.hostname.toLowerCase();
    const isHttps = pageProtocol === 'https:';

    // 1. Mixed Content Detection (http:// subresources on https: pages)
    const mixedContentSamples = [];
    if (isHttps) {
      const httpElements = doc.querySelectorAll('img[src^="http://"], script[src^="http://"], link[href^="http://"], iframe[src^="http://"], video[src^="http://"], audio[src^="http://"]');
      httpElements.forEach((el) => {
        const url = el.getAttribute('src') || el.getAttribute('href') || '';
        if (url.startsWith('http://') && mixedContentSamples.length < 10) {
          mixedContentSamples.push({
            tag: el.tagName.toLowerCase(),
            url: url.slice(0, 100),
          });
        }
      });
    }

    // 2. target="_blank" links without rel="noopener" or rel="noreferrer"
    const targetBlankLinks = Array.from(doc.querySelectorAll('a[target="_blank"]'));
    const vulnerableBlankLinks = [];

    targetBlankLinks.forEach((a) => {
      const rel = (a.getAttribute('rel') || '').toLowerCase();
      const hasNoopener = rel.includes('noopener');
      const hasNoreferrer = rel.includes('noreferrer');

      if (!hasNoopener && !hasNoreferrer) {
        if (vulnerableBlankLinks.length < 10) {
          const href = a.getAttribute('href') || '';
          vulnerableBlankLinks.push({
            href: href.slice(0, 100),
            text: (a.textContent || '').trim().slice(0, 40) || 'unnamed-link',
          });
        }
      }
    });

    // 3. Inline Scripts (CSP Readiness indicator)
    const scriptElements = Array.from(doc.querySelectorAll('script'));
    let inlineScriptsCount = 0;
    scriptElements.forEach((s) => {
      if (!s.hasAttribute('src')) {
        inlineScriptsCount += 1;
      }
    });

    // 4. Client-Accessible Cookies
    const rawCookie = doc.cookie || '';
    const cookieTokens = rawCookie ? rawCookie.split(';').map((c) => c.trim().split('=')[0]).filter(Boolean) : [];

    // 5. Third-Party Resource Classification (PROJECT.md section 12)
    const resourceEntries = win.performance?.getEntriesByType ? win.performance.getEntriesByType('resource') : [];
    const thirdPartyDomains = new Map();
    let totalThirdPartyCount = 0;

    const companyPatterns = [
      { name: 'Google', pattern: /(google|gstatic|doubleclick|googletagmanager|google-analytics)\./i },
      { name: 'Cloudflare', pattern: /(cloudflare|cdnjs)\./i },
      { name: 'Meta / Facebook', pattern: /(facebook|fbcdn|meta|instagram)\./i },
      { name: 'YouTube', pattern: /(youtube|ytimg)\./i },
      { name: 'Amazon / AWS', pattern: /(amazon|amazonaws|cloudfront)\./i },
      { name: 'Microsoft', pattern: /(microsoft|azure|bing|msecnd)\./i },
      { name: 'Twitter / X', pattern: /(twimg|twitter|x\.com)\./i },
      { name: 'CDN / Utilities', pattern: /(jsdelivr|unpkg|fastly|bootstrapcdn|fontawesome)\./i },
    ];

    const companyCounts = {};

    resourceEntries.forEach((res) => {
      try {
        const resUrl = new URL(res.name);
        const resHost = resUrl.hostname.toLowerCase();

        // Check if third-party
        if (resHost && resHost !== pageHostname && !resHost.endsWith(`.${pageHostname}`)) {
          totalThirdPartyCount += 1;
          thirdPartyDomains.set(resHost, (thirdPartyDomains.get(resHost) || 0) + 1);

          // Categorize by company/provider
          let matchedCompany = 'Other';
          for (const c of companyPatterns) {
            if (c.pattern.test(resHost)) {
              matchedCompany = c.name;
              break;
            }
          }

          companyCounts[matchedCompany] = (companyCounts[matchedCompany] || 0) + 1;
        }
      } catch {
        // ignore malformed URLs
      }
    });

    // Format top third-party domains
    const topDomains = Array.from(thirdPartyDomains.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      ok: true,
      data: {
        isHttps,
        protocol: pageProtocol,
        domain: pageHostname,
        url: win.location.href,
        mixedContent: {
          detected: mixedContentSamples.length > 0,
          count: mixedContentSamples.length,
          samples: mixedContentSamples,
        },
        targetBlankLinks: {
          total: targetBlankLinks.length,
          vulnerableCount: vulnerableBlankLinks.length,
          samples: vulnerableBlankLinks,
        },
        inlineScripts: {
          count: inlineScriptsCount,
        },
        cookies: {
          clientAccessibleCount: cookieTokens.length,
          sampleNames: cookieTokens.slice(0, 10),
          note: 'Only client-accessible non-HttpOnly cookies are visible. HttpOnly cookies cannot be read by JavaScript.',
        },
        thirdPartyResources: {
          total: resourceEntries.length,
          thirdPartyTotal: totalThirdPartyCount,
          byCompany: companyCounts,
          topDomains,
        },
        collectedAt: Date.now(),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: 'COLLECTION_FAILED',
      message: err.message || 'Failed to collect page security indicators.',
    };
  }
})();
