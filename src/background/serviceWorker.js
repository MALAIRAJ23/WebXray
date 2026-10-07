/**
 * WebXray - Background Service Worker (Manifest V3)
 * Follows Rule 2 (Privacy-first: local only) and Rule 6 (Validate message sender & shape)
 */

import {
  isInspectableUrl,
  getRestrictedPageReason,
  validateOverviewData,
} from '../utils/overview.js';
import { analyzePerformance } from '../analyzers/performance/index.js';
import { analyzeSeo } from '../analyzers/seo/index.js';
import { analyzeAccessibility } from '../analyzers/accessibility/index.js';
import { analyzeSecurity } from '../analyzers/security/index.js';
import { analyzeTechnology } from '../analyzers/technology/index.js';
import { getAllGlobalVariableNames } from '../services/detection/rules.js';

// Lifecycle: Installation and setup
chrome.runtime.onInstalled.addListener(() => {
  // Setup completed
});

// Runtime message listener with strict validation
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. Validate sender: reject messages not from this extension instance
  if (sender.id !== chrome.runtime.id) {
    console.warn('[WebXray Background] Rejected message from unauthorized sender:', sender);
    return false;
  }

  // 2. Validate message payload shape
  if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
    console.warn('[WebXray Background] Rejected malformed message shape:', message);
    sendResponse({ ok: false, error: 'Malformed message format: type string required' });
    return false;
  }

  // 3. Handle message actions
  switch (message.type) {
    case 'PING': {
      sendResponse({
        ok: true,
        type: 'PONG',
        timestamp: Date.now(),
        version: '1.0.0',
      });
      return false; // synchronous response
    }

    case 'ANALYZE_OVERVIEW': {
      handleAnalyzeOverview(message, sendResponse);
      return true; // asynchronous response (keeps sendResponse channel open)
    }

    case 'ANALYZE_PERFORMANCE': {
      handleAnalyzePerformance(message, sendResponse);
      return true; // asynchronous response
    }

    case 'ANALYZE_SEO': {
      handleAnalyzeSeo(message, sendResponse);
      return true; // asynchronous response
    }

    case 'ANALYZE_ACCESSIBILITY': {
      handleAnalyzeAccessibility(message, sendResponse);
      return true; // asynchronous response
    }

    case 'ANALYZE_SECURITY': {
      handleAnalyzeSecurity(message, sendResponse);
      return true; // asynchronous response
    }

    case 'ANALYZE_TECHNOLOGY': {
      handleAnalyzeTechnology(message, sendResponse);
      return true; // asynchronous response
    }

    case 'HIGHLIGHT_ELEMENT': {
      handleHighlightElement(message, sendResponse);
      return true; // asynchronous response
    }

    case 'CLEAR_HIGHLIGHT': {
      handleClearHighlight(message, sendResponse);
      return true; // asynchronous response
    }

    default: {
      console.warn(`[WebXray Background] Unrecognized message type: ${message.type}`);
      sendResponse({ ok: false, error: `Unrecognized message type: ${message.type}` });
      return false;
    }
  }
});

/**
 * Handles on-demand page inspection and overview collection
 */
async function handleAnalyzeOverview(message, sendResponse) {
  try {
    const tabId = message.tabId;
    if (typeof tabId !== 'number') {
      sendResponse({
        ok: false,
        error: 'INVALID_TAB_ID',
        message: 'A valid numeric tab ID is required for page analysis.',
      });
      return;
    }

    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
      sendResponse({
        ok: false,
        error: 'TAB_NOT_ACCESSIBLE',
        message: 'Could not access active browser tab.',
      });
      return;
    }

    if (!isInspectableUrl(tab.url)) {
      sendResponse({
        ok: false,
        error: 'RESTRICTED_PAGE',
        message: getRestrictedPageReason(tab.url),
        url: tab.url,
      });
      return;
    }

    let results;
    try {
      results = await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/overviewCollector.js'],
      });
    } catch (injectErr) {
      console.warn('[WebXray Background] Overview injection blocked:', injectErr);
      sendResponse({
        ok: false,
        error: 'INJECTION_FAILED',
        message: 'This page cannot be analyzed. Script execution was blocked by the browser.',
        details: injectErr.message,
      });
      return;
    }

    const executionResult = results?.[0]?.result;
    if (!executionResult || !executionResult.ok) {
      sendResponse({
        ok: false,
        error: executionResult?.error || 'COLLECTION_FAILED',
        message: executionResult?.message || 'Failed to inspect page DOM elements.',
      });
      return;
    }

    const collectedData = executionResult.data;
    if (!validateOverviewData(collectedData)) {
      sendResponse({
        ok: false,
        error: 'INVALID_DATA_SHAPE',
        message: 'Collected overview data failed schema validation.',
      });
      return;
    }

    sendResponse({
      ok: true,
      data: collectedData,
    });
  } catch (err) {
    console.error('[WebXray Background] Error during overview analysis:', err);
    sendResponse({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred during page analysis.',
    });
  }
}

/**
 * Handles on-demand page performance collection and analysis
 */
async function handleAnalyzePerformance(message, sendResponse) {
  try {
    const tabId = message.tabId;
    if (typeof tabId !== 'number') {
      sendResponse({
        ok: false,
        error: 'INVALID_TAB_ID',
        message: 'A valid numeric tab ID is required for performance analysis.',
      });
      return;
    }

    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
      sendResponse({
        ok: false,
        error: 'TAB_NOT_ACCESSIBLE',
        message: 'Could not access active browser tab.',
      });
      return;
    }

    if (!isInspectableUrl(tab.url)) {
      sendResponse({
        ok: false,
        error: 'RESTRICTED_PAGE',
        message: getRestrictedPageReason(tab.url),
        url: tab.url,
      });
      return;
    }

    let results;
    try {
      results = await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/performanceCollector.js'],
      });
    } catch (injectErr) {
      console.warn('[WebXray Background] Performance injection blocked:', injectErr);
      sendResponse({
        ok: false,
        error: 'INJECTION_FAILED',
        message: 'This page cannot be analyzed. Performance script execution was blocked by the browser.',
        details: injectErr.message,
      });
      return;
    }

    const executionResult = results?.[0]?.result;
    if (!executionResult || !executionResult.ok) {
      sendResponse({
        ok: false,
        error: executionResult?.error || 'COLLECTION_FAILED',
        message: executionResult?.message || 'Failed to inspect page performance metrics.',
      });
      return;
    }

    const rawData = executionResult.data;
    const analysis = analyzePerformance(rawData);

    sendResponse({
      ok: true,
      data: {
        ...analysis,
        allResources: Array.isArray(rawData?.resources) ? rawData.resources : [],
      },
      rawData,
    });
  } catch (err) {
    console.error('[WebXray Background] Error during performance analysis:', err);
    sendResponse({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred during performance analysis.',
    });
  }
}

/**
 * Handles on-demand SEO collection and analysis
 */
async function handleAnalyzeSeo(message, sendResponse) {
  try {
    const tabId = message.tabId;
    if (typeof tabId !== 'number') {
      sendResponse({
        ok: false,
        error: 'INVALID_TAB_ID',
        message: 'A valid numeric tab ID is required for SEO analysis.',
      });
      return;
    }

    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
      sendResponse({
        ok: false,
        error: 'TAB_NOT_ACCESSIBLE',
        message: 'Could not access active browser tab.',
      });
      return;
    }

    if (!isInspectableUrl(tab.url)) {
      sendResponse({
        ok: false,
        error: 'RESTRICTED_PAGE',
        message: getRestrictedPageReason(tab.url),
        url: tab.url,
      });
      return;
    }

    let results;
    try {
      results = await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/seoCollector.js'],
      });
    } catch (injectErr) {
      console.warn('[WebXray Background] SEO injection blocked:', injectErr);
      sendResponse({
        ok: false,
        error: 'INJECTION_FAILED',
        message: 'This page cannot be analyzed. SEO script execution was blocked by the browser.',
        details: injectErr.message,
      });
      return;
    }

    const executionResult = results?.[0]?.result;
    if (!executionResult || !executionResult.ok) {
      sendResponse({
        ok: false,
        error: executionResult?.error || 'COLLECTION_FAILED',
        message: executionResult?.message || 'Failed to collect page SEO metadata.',
      });
      return;
    }

    const rawData = executionResult.data;
    const analysis = analyzeSeo(rawData);

    sendResponse({
      ok: true,
      data: analysis,
      rawData,
    });
  } catch (err) {
    console.error('[WebXray Background] Error during SEO analysis:', err);
    sendResponse({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred during SEO analysis.',
    });
  }
}

/**
 * Handles on-demand Accessibility collection and analysis
 */
async function handleAnalyzeAccessibility(message, sendResponse) {
  try {
    const tabId = message.tabId;
    if (typeof tabId !== 'number') {
      sendResponse({
        ok: false,
        error: 'INVALID_TAB_ID',
        message: 'A valid numeric tab ID is required for accessibility analysis.',
      });
      return;
    }

    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
      sendResponse({
        ok: false,
        error: 'TAB_NOT_ACCESSIBLE',
        message: 'Could not access active browser tab.',
      });
      return;
    }

    if (!isInspectableUrl(tab.url)) {
      sendResponse({
        ok: false,
        error: 'RESTRICTED_PAGE',
        message: getRestrictedPageReason(tab.url),
        url: tab.url,
      });
      return;
    }

    let results;
    try {
      results = await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/a11yCollector.js'],
      });
    } catch (injectErr) {
      console.warn('[WebXray Background] Accessibility injection blocked:', injectErr);
      sendResponse({
        ok: false,
        error: 'INJECTION_FAILED',
        message: 'This page cannot be analyzed. Accessibility script execution was blocked by the browser.',
        details: injectErr.message,
      });
      return;
    }

    const executionResult = results?.[0]?.result;
    if (!executionResult || !executionResult.ok) {
      sendResponse({
        ok: false,
        error: executionResult?.error || 'COLLECTION_FAILED',
        message: executionResult?.message || 'Failed to inspect page accessibility elements.',
      });
      return;
    }

    const rawData = executionResult.data;
    const analysis = analyzeAccessibility(rawData);

    sendResponse({
      ok: true,
      data: analysis,
      rawData,
    });
  } catch (err) {
    console.error('[WebXray Background] Error during accessibility analysis:', err);
    sendResponse({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred during accessibility analysis.',
    });
  }
}

/**
 * Highlights an element on the live inspected page
 */
async function handleHighlightElement(message, sendResponse) {
  try {
    const { tabId, selector } = message;
    if (typeof tabId !== 'number' || typeof selector !== 'string') {
      sendResponse({ ok: false, error: 'Invalid parameters: tabId and selector required' });
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel) => {
        const existing = document.getElementById('webxray-a11y-highlight');
        if (existing) existing.remove();

        if (!sel) return;
        const el = document.querySelector(sel);
        if (!el) return;

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const overlay = document.createElement('div');
        overlay.id = 'webxray-a11y-highlight';
        overlay.style.position = 'absolute';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '2147483647';
        overlay.style.border = '3px solid #f43f5e';
        overlay.style.borderRadius = '4px';
        overlay.style.boxShadow = '0 0 0 4px rgba(244, 63, 94, 0.4), 0 0 20px rgba(244, 63, 94, 0.8)';
        overlay.style.transition = 'all 0.2s ease-in-out';

        const rect = el.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset || 0;
        const scrollY = window.scrollY || window.pageYOffset || 0;

        overlay.style.top = `${rect.top + scrollY - 4}px`;
        overlay.style.left = `${rect.left + scrollX - 4}px`;
        overlay.style.width = `${Math.max(rect.width, 24) + 8}px`;
        overlay.style.height = `${Math.max(rect.height, 24) + 8}px`;

        const badge = document.createElement('div');
        badge.textContent = `WebXray: ${sel}`;
        badge.style.position = 'absolute';
        badge.style.bottom = '100%';
        badge.style.left = '0';
        badge.style.marginBottom = '6px';
        badge.style.background = '#0f172a';
        badge.style.color = '#fda4af';
        badge.style.border = '1px solid #f43f5e';
        badge.style.padding = '3px 8px';
        badge.style.fontSize = '11px';
        badge.style.fontFamily = 'monospace';
        badge.style.borderRadius = '4px';
        badge.style.whiteSpace = 'nowrap';
        overlay.appendChild(badge);

        document.body.appendChild(overlay);
      },
      args: [selector],
    });

    sendResponse({ ok: true });
  } catch (err) {
    console.warn('[WebXray Background] Highlight error:', err);
    sendResponse({ ok: false, error: err.message });
  }
}

/**
 * Clears element highlight from page
 */
async function handleClearHighlight(message, sendResponse) {
  try {
    const { tabId } = message;
    if (typeof tabId !== 'number') {
      sendResponse({ ok: false, error: 'Invalid tabId' });
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const existing = document.getElementById('webxray-a11y-highlight');
        if (existing) existing.remove();
      },
    });

    sendResponse({ ok: true });
  } catch (err) {
    console.warn('[WebXray Background] Clear highlight error:', err);
    sendResponse({ ok: false, error: err.message });
  }
}

/**
 * Fetches page headers defensively from background service worker
 * Method HEAD with fallback to GET, credentials omitted, cache no-store
 */
async function fetchPageHeaders(url) {
  try {
    let response;
    try {
      response = await fetch(url, {
        method: 'HEAD',
        credentials: 'omit',
        cache: 'no-store',
      });
    } catch {
      // Fallback to GET with credentials omitted
      response = await fetch(url, {
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
      });
    }

    if (!response || !response.headers) {
      return { status: 'unverified', data: {} };
    }

    const csp = response.headers.get('content-security-policy');
    const hsts = response.headers.get('strict-transport-security');
    const xContentType = response.headers.get('x-content-type-options');
    const referrerPolicy = response.headers.get('referrer-policy');
    const permissionsPolicy = response.headers.get('permissions-policy');
    const xFrameOptions = response.headers.get('x-frame-options');

    const allHeaders = {};
    if (response.headers.forEach) {
      response.headers.forEach((value, key) => {
        allHeaders[key.toLowerCase()] = value;
      });
    }

    return {
      status: 'verified',
      allHeaders,
      data: {
        csp,
        hsts,
        xContentType,
        referrerPolicy,
        permissionsPolicy,
        xFrameOptions,
      },
    };
  } catch (err) {
    console.warn('[WebXray Background] Security headers could not be verified:', err);
    return {
      status: 'unverified',
      allHeaders: {},
      error: err.message,
      data: {},
    };
  }
}

/**
 * Handles on-demand Security collection and analysis
 */
async function handleAnalyzeSecurity(message, sendResponse) {
  try {
    const tabId = message.tabId;
    if (typeof tabId !== 'number') {
      sendResponse({
        ok: false,
        error: 'INVALID_TAB_ID',
        message: 'A valid numeric tab ID is required for security analysis.',
      });
      return;
    }

    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
      sendResponse({
        ok: false,
        error: 'TAB_NOT_ACCESSIBLE',
        message: 'Could not access active browser tab.',
      });
      return;
    }

    if (!isInspectableUrl(tab.url)) {
      sendResponse({
        ok: false,
        error: 'RESTRICTED_PAGE',
        message: getRestrictedPageReason(tab.url),
        url: tab.url,
      });
      return;
    }

    let results;
    try {
      results = await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/securityCollector.js'],
      });
    } catch (injectErr) {
      console.warn('[WebXray Background] Security injection blocked:', injectErr);
      sendResponse({
        ok: false,
        error: 'INJECTION_FAILED',
        message: 'This page cannot be analyzed. Security script execution was blocked by the browser.',
        details: injectErr.message,
      });
      return;
    }

    const executionResult = results?.[0]?.result;
    if (!executionResult || !executionResult.ok) {
      sendResponse({
        ok: false,
        error: executionResult?.error || 'COLLECTION_FAILED',
        message: executionResult?.message || 'Failed to inspect page security indicators.',
      });
      return;
    }

    const rawData = executionResult.data;

    // Fetch headers from service worker
    const headers = await fetchPageHeaders(tab.url);

    const combinedData = {
      ...rawData,
      headers,
    };

    const analysis = analyzeSecurity(combinedData);

    sendResponse({
      ok: true,
      data: analysis,
      rawData: combinedData,
    });
  } catch (err) {
    console.error('[WebXray Background] Error during security analysis:', err);
    sendResponse({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred during security analysis.',
    });
  }
}

/**
 * Handles on-demand Technology collection and analysis
 */
async function handleAnalyzeTechnology(message, sendResponse) {
  try {
    const tabId = message.tabId;
    if (typeof tabId !== 'number') {
      sendResponse({
        ok: false,
        error: 'INVALID_TAB_ID',
        message: 'A valid numeric tab ID is required for technology detection.',
      });
      return;
    }

    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
      sendResponse({
        ok: false,
        error: 'TAB_NOT_ACCESSIBLE',
        message: 'Could not access active browser tab.',
      });
      return;
    }

    if (!isInspectableUrl(tab.url)) {
      sendResponse({
        ok: false,
        error: 'RESTRICTED_PAGE',
        message: getRestrictedPageReason(tab.url),
        url: tab.url,
      });
      return;
    }

    // 1. Inject technologyCollector.js in the isolated world
    let domResults;
    try {
      domResults = await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/technologyCollector.js'],
      });
    } catch (injectErr) {
      console.warn('[WebXray Background] Technology collector injection blocked:', injectErr);
      sendResponse({
        ok: false,
        error: 'INJECTION_FAILED',
        message: 'This page cannot be analyzed. Script execution was blocked by the browser.',
        details: injectErr.message,
      });
      return;
    }

    const domExecutionResult = domResults?.[0]?.result;
    if (!domExecutionResult || !domExecutionResult.ok) {
      sendResponse({
        ok: false,
        error: domExecutionResult?.error || 'COLLECTION_FAILED',
        message: domExecutionResult?.message || 'Failed to inspect page technology signatures.',
      });
      return;
    }

    const domData = domExecutionResult.data || {};

    // 2. Execute global variable detection in MAIN world
    // Must return only plain serializable results (booleans/strings)
    const globalNames = getAllGlobalVariableNames();
    let globals = {};
    try {
      const mainWorldResults = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: (varNames) => {
          const results = {};
          if (Array.isArray(varNames)) {
            for (const name of varNames) {
              try {
                results[name] = Boolean(window[name]);
              } catch {
                results[name] = false;
              }
            }
          }
          // Additional React Fiber root detection in MAIN context
          try {
            const rootEl = document.querySelector('#root, #__next, [data-reactroot], body > div');
            if (rootEl) {
              const keys = Object.keys(rootEl);
              if (
                rootEl._reactRootContainer ||
                keys.some((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'))
              ) {
                results['hasReactFiber'] = true;
              }
            }
          } catch {
            // ignore
          }
          return results;
        },
        args: [globalNames],
      });
      globals = mainWorldResults?.[0]?.result || {};
    } catch (mainErr) {
      console.warn('[WebXray Background] MAIN world script execution failed:', mainErr);
    }

    // 3. Fetch headers from service worker
    const headersResult = await fetchPageHeaders(tab.url);
    const headers = headersResult?.allHeaders || {};

    // 4. Combine signals and run pure analyzer
    const combinedData = {
      ...domData,
      globals,
      headers,
    };

    const analysis = analyzeTechnology(combinedData);

    sendResponse({
      ok: true,
      data: analysis,
      rawData: combinedData,
    });
  } catch (err) {
    console.error('[WebXray Background] Error during technology analysis:', err);
    sendResponse({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred during technology detection.',
    });
  }
}


