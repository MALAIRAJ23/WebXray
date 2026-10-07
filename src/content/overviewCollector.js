/**
 * WebXray - Content Script Overview Collector
 * Injected on demand via chrome.scripting.executeScript (Rule 3: Minimal permissions, no persistent content script)
 * Purely local inspection (Rule 2: Privacy-first)
 */

(() => {
  try {
    const doc = document;
    const win = window;

    const title = (doc.title || '').trim();
    const url = (win.location?.href || '').trim();
    const domain = (win.location?.hostname || '').trim();
    const protocol = (win.location?.protocol || '').trim();

    // HTML Language attribute
    const htmlElement = doc.documentElement;
    const langAttr = htmlElement ? (htmlElement.getAttribute('lang') || htmlElement.lang) : '';
    const htmlLang = (langAttr || '').trim() || 'Not specified';

    // Viewport meta
    let viewportMeta = 'Not specified';
    const metaTag = doc.querySelector('meta[name="viewport"]');
    if (metaTag) {
      const content = metaTag.getAttribute('content');
      if (content) viewportMeta = content.trim();
    }

    // Doctype
    const rawDoctype = doc.doctype ? doc.doctype.name : null;
    let doctype = 'None (Quirks Mode)';
    if (rawDoctype) {
      doctype = String(rawDoctype).trim().toLowerCase() === 'html' ? 'HTML5' : rawDoctype;
    }

    // DOM & Resource element counts
    const domElementsCount = doc.querySelectorAll('*').length;
    const imagesCount = doc.images ? doc.images.length : doc.querySelectorAll('img').length;
    const linksCount = doc.links ? doc.links.length : doc.querySelectorAll('a[href]').length;
    const formsCount = doc.forms ? doc.forms.length : doc.querySelectorAll('form').length;
    const scriptsCount = doc.scripts ? doc.scripts.length : doc.querySelectorAll('script').length;
    const stylesheetsCount = doc.querySelectorAll('link[rel="stylesheet"], style').length;

    return {
      ok: true,
      data: {
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
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: 'COLLECTION_ERROR',
      message: err.message || 'Failed to inspect page DOM elements',
    };
  }
})();
