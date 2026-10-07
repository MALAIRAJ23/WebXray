/**
 * WebXray - Content Script SEO Collector
 * Injected on demand via chrome.scripting.executeScript (Rule 3)
 * Collects Document Metadata, Headings, Links, Images, and Social Tags
 * Follows Rule 2: Privacy-first (100% in-browser local collection)
 */

(() => {
  try {
    const doc = document;
    const win = window;
    const pageHostname = win.location.hostname.toLowerCase();

    // 1. Basic Metadata
    const title = (doc.title || '').trim();

    const metaDescriptionEl = doc.querySelector('meta[name="description" i]');
    const metaDescription = metaDescriptionEl?.getAttribute('content')?.trim() || '';

    const canonicalEl = doc.querySelector('link[rel="canonical" i]');
    const canonical = canonicalEl?.getAttribute('href')?.trim() || '';

    const robotsEl = doc.querySelector('meta[name="robots" i]');
    const robotsMeta = robotsEl?.getAttribute('content')?.trim() || '';

    const htmlElement = doc.documentElement;
    const htmlLang = (htmlElement?.getAttribute('lang') || htmlElement?.lang || '').trim();

    // 2. Heading Structure (H1–H6 in document order, capped at 200 for large pages)
    const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const headings = Array.from(headingElements).slice(0, 200).map((el, index) => {
      const level = parseInt(el.tagName.replace(/^H/i, ''), 10);
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
      return {
        id: el.id || `heading-${index}`,
        level,
        tag: el.tagName.toUpperCase(),
        text: text.slice(0, 150),
      };
    });

    // 3. Links Audit
    const nonDescriptivePhrases = new Set([
      'click here',
      'click',
      'read more',
      'learn more',
      'more',
      'link',
      'here',
      'view more',
      'continue',
      'go',
      'details',
      'this link',
      'see more',
    ]);

    const rawLinks = doc.querySelectorAll('a');
    const totalLinksCount = rawLinks.length;
    const allLinks = Array.from(rawLinks).slice(0, 3000);
    let internalCount = 0;
    let externalCount = 0;
    let emptyHrefCount = 0;
    const nonDescriptiveLinks = [];

    allLinks.forEach((a) => {
      const href = a.getAttribute('href');
      const text = (a.textContent || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const ariaLabel = (a.getAttribute('aria-label') || '').trim().toLowerCase();

      // Check empty or dummy hrefs
      if (!href || href === '' || href === '#' || href.startsWith('javascript:')) {
        emptyHrefCount += 1;
      }

      // Check internal vs external
      if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        try {
          const urlObj = new URL(href, win.location.href);
          if (urlObj.hostname.toLowerCase() === pageHostname) {
            internalCount += 1;
          } else {
            externalCount += 1;
          }
        } catch {
          internalCount += 1; // relative path fallback
        }
      }

      // Check non-descriptive link text
      const effectiveText = ariaLabel || text;
      if (effectiveText && nonDescriptivePhrases.has(effectiveText)) {
        if (nonDescriptiveLinks.length < 15) {
          nonDescriptiveLinks.push({
            text: effectiveText,
            href: href || '',
          });
        }
      }
    });

    // 4. Images Audit
    const rawImages = doc.querySelectorAll('img');
    const totalImagesCount = rawImages.length;
    const allImages = Array.from(rawImages).slice(0, 3000);
    let missingAltCount = 0;
    let emptyAltCount = 0;
    let missingDimensionsCount = 0;
    const sampleMissingAlt = [];

    allImages.forEach((img) => {
      const hasAlt = img.hasAttribute('alt');
      const altValue = img.getAttribute('alt');
      const src = img.getAttribute('src') || '';
      const hasDimensions = img.hasAttribute('width') && img.hasAttribute('height');

      if (!hasAlt) {
        missingAltCount += 1;
        if (sampleMissingAlt.length < 10) {
          const fileName = src.split('/').pop().split('?')[0] || src.slice(0, 40);
          sampleMissingAlt.push(fileName || 'unnamed-image');
        }
      } else if (altValue.trim() === '') {
        emptyAltCount += 1;
      }

      if (!hasDimensions) {
        missingDimensionsCount += 1;
      }
    });

    // 5. Open Graph Metadata
    const getMetaProperty = (prop) => {
      const el = doc.querySelector(`meta[property="${prop}" i]`) || doc.querySelector(`meta[name="${prop}" i]`);
      return el?.getAttribute('content')?.trim() || '';
    };

    const openGraph = {
      title: getMetaProperty('og:title'),
      description: getMetaProperty('og:description'),
      image: getMetaProperty('og:image'),
      url: getMetaProperty('og:url'),
      type: getMetaProperty('og:type'),
      siteName: getMetaProperty('og:site_name'),
    };

    // 6. Twitter Card Metadata
    const twitter = {
      card: getMetaProperty('twitter:card'),
      title: getMetaProperty('twitter:title'),
      description: getMetaProperty('twitter:description'),
      image: getMetaProperty('twitter:image'),
      site: getMetaProperty('twitter:site'),
    };

    return {
      ok: true,
      data: {
        title,
        metaDescription,
        canonical,
        robotsMeta,
        htmlLang,
        headings,
        links: {
          total: totalLinksCount,
          internal: internalCount,
          external: externalCount,
          emptyHref: emptyHrefCount,
          nonDescriptive: nonDescriptiveLinks,
        },
        images: {
          total: totalImagesCount,
          missingAlt: missingAltCount,
          emptyAlt: emptyAltCount,
          missingDimensions: missingDimensionsCount,
          sampleMissingAlt,
        },
        openGraph,
        twitter,
        url: win.location.href,
        domain: pageHostname,
        collectedAt: Date.now(),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: 'COLLECTION_FAILED',
      message: err.message || 'Failed to collect page SEO metadata.',
    };
  }
})();
