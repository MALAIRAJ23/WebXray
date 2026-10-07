/**
 * Pure helper functions for Website Overview data processing and validation
 * Follows Rule 2 (Privacy-first) and Rule 6 (Validate message / data shape)
 */

/**
 * Checks whether a given URL can be analyzed by the extension.
 * Rejects Chrome internals, Web Store, local extension schemes, and PDFs.
 * @param {string} urlString
 * @returns {boolean}
 */
export function isInspectableUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;

  try {
    const url = new URL(urlString);
    const protocol = url.protocol.toLowerCase();
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    // 1. Only http and https protocols are inspectable
    if (protocol !== 'http:' && protocol !== 'https:') {
      return false;
    }

    // 2. Chrome Web Store is protected by browser policy
    if (
      hostname === 'chromewebstore.google.com' ||
      hostname === 'chrome.google.com' && pathname.startsWith('/webstore')
    ) {
      return false;
    }

    // 3. PDF viewer URLs
    if (pathname.endsWith('.pdf')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Returns a user-friendly explanation for why a specific page cannot be analyzed.
 * @param {string} urlString
 * @returns {string}
 */
export function getRestrictedPageReason(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return 'Invalid or empty URL provided.';
  }

  try {
    const url = new URL(urlString);
    const protocol = url.protocol.toLowerCase();
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    if (protocol === 'chrome:' || protocol === 'edge:' || protocol === 'about:') {
      return 'Browser internal settings and system pages cannot be analyzed for security reasons.';
    }

    if (protocol === 'chrome-extension:') {
      return 'Extension internal pages cannot be analyzed.';
    }

    if (protocol === 'file:') {
      return 'Local file:// URLs require explicit file access permission in Chrome extension settings.';
    }

    if (
      hostname === 'chromewebstore.google.com' ||
      (hostname === 'chrome.google.com' && pathname.startsWith('/webstore'))
    ) {
      return 'Chrome Web Store pages are strictly protected by Chrome security policies and cannot be inspected.';
    }

    if (pathname.endsWith('.pdf')) {
      return 'PDF documents and embedded PDF viewers cannot be analyzed by DOM inspectors.';
    }

    if (protocol !== 'http:' && protocol !== 'https:') {
      return `Protocol "${protocol}" is not supported for website analysis.`;
    }

    return 'This page cannot be analyzed due to browser security restrictions.';
  } catch {
    return 'Invalid page URL.';
  }
}

/**
 * Normalizes document type name for developer readability
 * @param {string|null|undefined} doctypeName
 * @returns {string}
 */
export function normalizeDoctype(doctypeName) {
  if (!doctypeName) return 'None (Quirks Mode)';
  const lower = String(doctypeName).trim().toLowerCase();
  if (lower === 'html') return 'HTML5';
  return doctypeName;
}

/**
 * Extracts overview metrics from a DOM Document and Window-like object.
 * Pure function suitable for unit testing and content script execution.
 * @param {object} doc - Document-like object
 * @param {object} win - Window-like object
 * @returns {object}
 */
export function extractOverviewFromDom(doc, win) {
  if (!doc) {
    throw new Error('Document object is required');
  }

  const title = (doc.title || '').trim();
  const url = (win?.location?.href || '').trim();
  const domain = (win?.location?.hostname || '').trim();
  const protocol = (win?.location?.protocol || '').trim();

  // Language attribute
  const htmlElement = doc.documentElement;
  const langAttr = htmlElement?.getAttribute
    ? htmlElement.getAttribute('lang')
    : htmlElement?.lang;
  const htmlLang = (langAttr || '').trim() || 'Not specified';

  // Viewport meta
  let viewportMeta = 'Not specified';
  if (typeof doc.querySelector === 'function') {
    const metaTag = doc.querySelector('meta[name="viewport"]');
    if (metaTag?.getAttribute) {
      const content = metaTag.getAttribute('content');
      if (content) viewportMeta = content.trim();
    }
  }

  // Doctype
  const rawDoctype = doc.doctype ? doc.doctype.name : null;
  const doctype = normalizeDoctype(rawDoctype);

  // Element Counts
  const domElementsCount = typeof doc.querySelectorAll === 'function'
    ? doc.querySelectorAll('*').length
    : 0;

  const imagesCount = doc.images
    ? doc.images.length
    : (typeof doc.querySelectorAll === 'function' ? doc.querySelectorAll('img').length : 0);

  const linksCount = doc.links
    ? doc.links.length
    : (typeof doc.querySelectorAll === 'function' ? doc.querySelectorAll('a[href]').length : 0);

  const formsCount = doc.forms
    ? doc.forms.length
    : (typeof doc.querySelectorAll === 'function' ? doc.querySelectorAll('form').length : 0);

  const scriptsCount = doc.scripts
    ? doc.scripts.length
    : (typeof doc.querySelectorAll === 'function' ? doc.querySelectorAll('script').length : 0);

  let stylesheetsCount = 0;
  if (typeof doc.querySelectorAll === 'function') {
    stylesheetsCount = doc.querySelectorAll('link[rel="stylesheet"], style').length;
  } else if (doc.styleSheets) {
    stylesheetsCount = doc.styleSheets.length;
  }

  return {
    title,
    url,
    domain,
    protocol,
    htmlLang,
    viewportMeta,
    doctype,
    counts: {
      domElements: domElementsCount,
      images: imagesCount,
      links: linksCount,
      forms: formsCount,
      scripts: scriptsCount,
      stylesheets: stylesheetsCount,
    },
    collectedAt: Date.now(),
  };
}

/**
 * Validates the shape of collected overview data
 * Follows Rule 6 (Validate message shape)
 * @param {any} data
 * @returns {boolean}
 */
export function validateOverviewData(data) {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.title !== 'string') return false;
  if (typeof data.url !== 'string') return false;
  if (typeof data.domain !== 'string') return false;
  if (typeof data.protocol !== 'string') return false;
  if (typeof data.htmlLang !== 'string') return false;
  if (typeof data.viewportMeta !== 'string') return false;
  if (typeof data.doctype !== 'string') return false;

  const counts = data.counts;
  if (!counts || typeof counts !== 'object') return false;

  const keys = ['domElements', 'images', 'links', 'forms', 'scripts', 'stylesheets'];
  for (const key of keys) {
    if (typeof counts[key] !== 'number' || isNaN(counts[key]) || counts[key] < 0) {
      return false;
    }
  }

  return true;
}

/**
 * Formats a count number with locale thousand separators
 * @param {number} count
 * @returns {string}
 */
export function formatCount(count) {
  if (typeof count !== 'number' || isNaN(count)) return '0';
  return count.toLocaleString('en-US');
}
