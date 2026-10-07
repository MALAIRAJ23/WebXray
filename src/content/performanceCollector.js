/**
 * WebXray - Content Script Performance Collector
 * Injected on demand via chrome.scripting.executeScript (Rule 3)
 * Collects Navigation Timing, Paint metrics (FCP, LCP, CLS), and Resource Timing
 * Follows Rule 2: Privacy-first (100% in-browser local collection)
 */

(() => {
  try {
    const win = window;
    const perf = win.performance;

    if (!perf) {
      return {
        ok: false,
        error: 'PERFORMANCE_API_UNAVAILABLE',
        message: 'Window Performance API is not supported in this browser context.',
      };
    }

    // 1. Navigation Timing
    const navEntries = perf.getEntriesByType ? perf.getEntriesByType('navigation') : [];
    const nav = navEntries && navEntries.length > 0 ? navEntries[0] : null;

    let ttfb = null;
    let domContentLoaded = null;
    let loadEvent = null;

    if (nav) {
      ttfb = nav.responseStart > 0 ? Math.round(nav.responseStart - nav.requestStart) : null;
      domContentLoaded = nav.domContentLoadedEventEnd > 0 ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : null;
      loadEvent = nav.loadEventEnd > 0 ? Math.round(nav.loadEventEnd - nav.startTime) : null;
    } else if (perf.timing) {
      // Fallback for older timing API
      const timing = perf.timing;
      const navStart = timing.navigationStart;
      if (timing.responseStart && timing.requestStart) {
        ttfb = Math.max(0, timing.responseStart - timing.requestStart);
      }
      if (timing.domContentLoadedEventEnd && navStart) {
        domContentLoaded = Math.max(0, timing.domContentLoadedEventEnd - navStart);
      }
      if (timing.loadEventEnd && navStart) {
        loadEvent = Math.max(0, timing.loadEventEnd - navStart);
      }
    }

    // 2. First Contentful Paint (FCP)
    let fcp = null;
    if (perf.getEntriesByName) {
      const fcpEntries = perf.getEntriesByName('first-contentful-paint');
      if (fcpEntries && fcpEntries.length > 0) {
        fcp = Math.round(fcpEntries[0].startTime);
      }
    }

    // 3. Largest Contentful Paint (LCP) via PerformanceObserver buffered entries
    let lcp = null;
    let lcpElement = null;
    if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint')) {
      try {
        const observer = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          if (entries && entries.length > 0) {
            const lastEntry = entries[entries.length - 1];
            lcp = Math.round(lastEntry.startTime);
            if (lastEntry.element?.tagName) {
              lcpElement = lastEntry.element.tagName.toLowerCase();
            }
          }
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        observer.disconnect();
      } catch (err) {
        console.debug('[WebXray] LCP observer error:', err);
      }
    }

    // 4. Cumulative Layout Shift (CLS) via PerformanceObserver buffered entries
    let cls = 0;
    let hasCls = false;
    if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('layout-shift')) {
      try {
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              cls += entry.value;
              hasCls = true;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });
        observer.disconnect();
      } catch (err) {
        console.debug('[WebXray] CLS observer error:', err);
      }
    }

    // 5. Resource Timing (capped at 500 entries for large pages)
    const allRawResources = perf.getEntriesByType ? perf.getEntriesByType('resource') : [];
    const rawResources = allRawResources.slice(0, 500);
    const pageHostname = win.location.hostname.toLowerCase();

    const resources = rawResources.map((res) => {
      let domain = '';
      try {
        domain = new URL(res.name).hostname.toLowerCase();
      } catch {
        domain = pageHostname;
      }

      const isCrossOrigin = domain !== pageHostname;
      const initiator = (res.initiatorType || 'other').toLowerCase();
      const rawTransferSize = typeof res.transferSize === 'number' ? res.transferSize : null;
      const encodedBodySize = typeof res.encodedBodySize === 'number' ? res.encodedBodySize : null;

      // Rule: transferSize can be 0 for cross-origin resources without Timing-Allow-Origin.
      // Mark such sizes as 'unknown' instead of treating them as 0.
      let transferSize = rawTransferSize;
      let isUnknownSize = false;

      if (rawTransferSize === 0 && (isCrossOrigin || (!encodedBodySize && res.duration > 0))) {
        transferSize = 'unknown';
        isUnknownSize = true;
      }

      // Identify resource type grouping
      let type = 'other';
      const urlLower = res.name.toLowerCase();

      if (initiator === 'script' || urlLower.match(/\.(js|mjs|cjs)(\?|#|$)/)) {
        type = 'js';
      } else if (initiator === 'css' || initiator === 'link' && urlLower.match(/\.css(\?|#|$)/) || urlLower.match(/\.css(\?|#|$)/)) {
        type = 'css';
      } else if (initiator === 'img' || initiator === 'image' || urlLower.match(/\.(png|jpe?g|webp|avif|svg|gif|ico)(\?|#|$)/)) {
        type = 'images';
      } else if (initiator === 'font' || urlLower.match(/\.(woff2?|ttf|otf|eot)(\?|#|$)/)) {
        type = 'fonts';
      } else if (initiator === 'video' || initiator === 'audio' || urlLower.match(/\.(mp4|webm|ogv|mp3|wav|ogg)(\?|#|$)/)) {
        type = 'media';
      } else if (initiator === 'fetch' || initiator === 'xmlhttprequest') {
        type = 'fetch';
      }

      return {
        name: res.name,
        initiatorType: initiator,
        type,
        transferSize,
        isUnknownSize,
        encodedBodySize,
        duration: Math.round(res.duration || 0),
        domain,
        renderBlockingStatus: res.renderBlockingStatus || null,
      };
    });

    return {
      ok: true,
      data: {
        timings: {
          ttfb,
          domContentLoaded,
          loadEvent,
          fcp,
          lcp,
          lcpElement,
          cls: hasCls ? parseFloat(cls.toFixed(4)) : 0,
        },
        resources,
        url: win.location.href,
        domain: pageHostname,
        collectedAt: Date.now(),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: 'COLLECTION_FAILED',
      message: err.message || 'Failed to inspect page performance metrics.',
    };
  }
})();
