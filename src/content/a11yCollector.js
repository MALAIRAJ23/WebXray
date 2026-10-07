/**
 * WebXray - Content Script Accessibility Collector
 * Injected on demand via chrome.scripting.executeScript (Rule 3)
 * Collects a11y DOM metrics, accessible names, landmarks, ARIA issues, duplicate IDs, and selectors
 * Follows Rule 2: Privacy-first (100% in-browser local inspection)
 */

(() => {
  try {
    const doc = document;

    // Helper: generate a concise, human-readable CSS selector
    function getShortSelector(el) {
      if (!el || el.nodeType !== 1) return '';
      if (el.id) {
        return `#${CSS.escape ? CSS.escape(el.id) : el.id}`;
      }

      const parts = [];
      let curr = el;
      let depth = 0;

      while (curr && curr.nodeType === 1 && depth < 3) {
        let part = curr.tagName.toLowerCase();
        if (curr.id) {
          part = `#${CSS.escape ? CSS.escape(curr.id) : curr.id}`;
          parts.unshift(part);
          break;
        }

        if (curr.getAttribute('name')) {
          part += `[name="${curr.getAttribute('name')}"]`;
        } else if (curr.classList && curr.classList.length > 0) {
          const cleanClass = Array.from(curr.classList).find((c) => /^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(c));
          if (cleanClass) {
            part += `.${cleanClass}`;
          }
        }

        if (curr.parentElement) {
          const sameTagSiblings = Array.from(curr.parentElement.children).filter((c) => c.tagName === curr.tagName);
          if (sameTagSiblings.length > 1) {
            const index = sameTagSiblings.indexOf(curr) + 1;
            part += `:nth-of-type(${index})`;
          }
        }

        parts.unshift(part);
        if (curr.tagName.toLowerCase() === 'body' || curr.tagName.toLowerCase() === 'html') {
          break;
        }
        curr = curr.parentElement;
        depth++;
      }

      return parts.join(' > ');
    }

    // 1. Images without ALT
    const allImages = Array.from(doc.querySelectorAll('img')).slice(0, 2000);
    const imagesWithoutAlt = [];
    allImages.forEach((img) => {
      if (!img.hasAttribute('alt')) {
        if (imagesWithoutAlt.length < 10) {
          imagesWithoutAlt.push({
            selector: getShortSelector(img),
            src: (img.getAttribute('src') || '').split('/').pop().split('?')[0] || 'unnamed-image',
          });
        }
      }
    });

    // 2. Form Controls without a Label
    const formControls = Array.from(doc.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="reset"]):not([type="button"]), textarea, select')).slice(0, 2000);
    const formControlsWithoutLabel = [];

    formControls.forEach((control) => {
      const id = control.id;
      let hasLabel = false;

      // Check <label for="id">
      if (id && doc.querySelector(`label[for="${CSS.escape ? CSS.escape(id) : id}"]`)) {
        hasLabel = true;
      }
      // Check enclosing <label>
      if (!hasLabel && control.closest('label')) {
        hasLabel = true;
      }
      // Check aria-label
      if (!hasLabel && (control.getAttribute('aria-label') || '').trim().length > 0) {
        hasLabel = true;
      }
      // Check aria-labelledby
      if (!hasLabel && control.getAttribute('aria-labelledby')) {
        const labelledBy = control.getAttribute('aria-labelledby').split(/\s+/);
        const exists = labelledBy.some((labelId) => {
          const el = doc.getElementById(labelId);
          return el && (el.textContent || '').trim().length > 0;
        });
        if (exists) hasLabel = true;
      }
      // Check title attribute fallback
      if (!hasLabel && (control.getAttribute('title') || '').trim().length > 0) {
        hasLabel = true;
      }

      if (!hasLabel) {
        if (formControlsWithoutLabel.length < 10) {
          formControlsWithoutLabel.push({
            selector: getShortSelector(control),
            tag: control.tagName.toLowerCase(),
            type: control.getAttribute('type') || 'text',
            name: control.getAttribute('name') || '',
          });
        }
      }
    });

    // 3. Buttons & Links without Accessible Name
    const buttons = Array.from(doc.querySelectorAll('button, [role="button"]')).slice(0, 2000);
    const buttonsWithoutName = [];
    buttons.forEach((btn) => {
      const text = (btn.textContent || '').trim();
      const ariaLabel = (btn.getAttribute('aria-label') || '').trim();
      const ariaLabelledBy = btn.getAttribute('aria-labelledby');
      const title = (btn.getAttribute('title') || '').trim();
      const hasImgWithAlt = Array.from(btn.querySelectorAll('img[alt]')).some((img) => (img.getAttribute('alt') || '').trim().length > 0);

      const hasAccessibleName = text.length > 0 || ariaLabel.length > 0 || Boolean(ariaLabelledBy) || title.length > 0 || hasImgWithAlt;

      if (!hasAccessibleName) {
        if (buttonsWithoutName.length < 10) {
          buttonsWithoutName.push({
            selector: getShortSelector(btn),
            tag: btn.tagName.toLowerCase(),
          });
        }
      }
    });

    const links = Array.from(doc.querySelectorAll('a[href], [role="link"]')).slice(0, 2000);
    const linksWithoutName = [];
    links.forEach((link) => {
      const text = (link.textContent || '').trim();
      const ariaLabel = (link.getAttribute('aria-label') || '').trim();
      const ariaLabelledBy = link.getAttribute('aria-labelledby');
      const title = (link.getAttribute('title') || '').trim();
      const hasImgWithAlt = Array.from(link.querySelectorAll('img[alt]')).some((img) => (img.getAttribute('alt') || '').trim().length > 0);

      const hasAccessibleName = text.length > 0 || ariaLabel.length > 0 || Boolean(ariaLabelledBy) || title.length > 0 || hasImgWithAlt;

      if (!hasAccessibleName) {
        if (linksWithoutName.length < 10) {
          linksWithoutName.push({
            selector: getShortSelector(link),
            href: link.getAttribute('href') || '',
          });
        }
      }
    });

    // 4. Headings List (capped at 100 for large pages)
    const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const headings = Array.from(headingElements).slice(0, 100).map((el, i) => ({
      level: parseInt(el.tagName.replace(/^H/i, ''), 10),
      tag: el.tagName.toUpperCase(),
      text: (el.textContent || '').trim().slice(0, 100),
      selector: getShortSelector(el) || `h${el.tagName[1]}:nth-of-type(${i + 1})`,
    }));

    // 5. HTML Language
    const htmlLang = (doc.documentElement?.getAttribute('lang') || doc.documentElement?.lang || '').trim();

    // 6. Landmark Elements
    const landmarks = {
      main: doc.querySelectorAll('main, [role="main"]').length,
      nav: doc.querySelectorAll('nav, [role="navigation"]').length,
      header: doc.querySelectorAll('header, [role="banner"]').length,
      footer: doc.querySelectorAll('footer, [role="contentinfo"]').length,
    };

    // 7. Invalid or Suspicious ARIA
    const validRoles = new Set([
      'alert', 'alertdialog', 'application', 'article', 'banner', 'button', 'cell', 'checkbox',
      'columnheader', 'combobox', 'command', 'complementary', 'composite', 'contentinfo', 'definition',
      'dialog', 'directory', 'document', 'feed', 'figure', 'form', 'generic', 'grid', 'gridcell',
      'group', 'heading', 'img', 'input', 'landmark', 'link', 'list', 'listbox', 'listitem',
      'log', 'main', 'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
      'menuitemradio', 'meter', 'navigation', 'none', 'note', 'option', 'presentation',
      'progressbar', 'radio', 'radiogroup', 'range', 'region', 'role', 'roletype', 'row',
      'rowgroup', 'rowheader', 'scrollbar', 'search', 'searchbox', 'section', 'sectionhead',
      'select', 'separator', 'slider', 'spinbutton', 'status', 'structure', 'switch', 'tab',
      'table', 'tablist', 'tabpanel', 'term', 'textbox', 'timer', 'toolbar', 'tooltip',
      'tree', 'treegrid', 'treeitem', 'widget', 'window',
    ]);

    const unknownRoles = [];
    const elementsWithRole = Array.from(doc.querySelectorAll('[role]')).slice(0, 2000);
    for (const el of elementsWithRole) {
      if (unknownRoles.length >= 10) break;
      const roleAttr = (el.getAttribute('role') || '').trim().toLowerCase();
      const roles = roleAttr.split(/\s+/);
      const isInvalid = roles.some((r) => r && !validRoles.has(r));
      if (isInvalid) {
        unknownRoles.push({
          selector: getShortSelector(el),
          role: roleAttr,
        });
      }
    }

    // aria-hidden on focusable elements (early exit after 10 samples)
    const ariaHiddenFocusable = [];
    const ariaHiddenElements = Array.from(doc.querySelectorAll('[aria-hidden="true"]')).slice(0, 500);
    for (const container of ariaHiddenElements) {
      if (ariaHiddenFocusable.length >= 10) break;
      // Is container itself or children focusable?
      const focusables = container.matches('a[href], button, input, select, textarea, [tabindex]')
        ? [container]
        : Array.from(container.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'));

      for (const focusEl of focusables) {
        if (ariaHiddenFocusable.length >= 10) break;
        const tabIndex = focusEl.getAttribute('tabindex');
        if (tabIndex !== '-1') {
          ariaHiddenFocusable.push({
            selector: getShortSelector(focusEl),
            tag: focusEl.tagName.toLowerCase(),
          });
        }
      }
    }

    // 8. Duplicate IDs
    const idMap = new Map();
    const elementsWithId = Array.from(doc.querySelectorAll('[id]')).slice(0, 5000);
    elementsWithId.forEach((el) => {
      const id = el.id.trim();
      if (id) {
        idMap.set(id, (idMap.get(id) || 0) + 1);
      }
    });

    const duplicateIds = [];
    idMap.forEach((count, id) => {
      if (count > 1) {
        if (duplicateIds.length < 10) {
          duplicateIds.push({
            id,
            count,
            selector: `#${CSS.escape ? CSS.escape(id) : id}`,
          });
        }
      }
    });

    // 9. Positive Tabindex Values
    const elementsWithTabindex = Array.from(doc.querySelectorAll('[tabindex]')).slice(0, 2000);
    const positiveTabindices = [];
    elementsWithTabindex.forEach((el) => {
      const val = parseInt(el.getAttribute('tabindex'), 10);
      if (val > 0) {
        if (positiveTabindices.length < 10) {
          positiveTabindices.push({
            selector: getShortSelector(el),
            tabindex: val,
          });
        }
      }
    });

    return {
      ok: true,
      data: {
        imagesCount: allImages.length,
        imagesWithoutAlt,
        formControlsCount: formControls.length,
        formControlsWithoutLabel,
        buttonsCount: buttons.length,
        buttonsWithoutName,
        linksCount: links.length,
        linksWithoutName,
        headings,
        htmlLang,
        landmarks,
        unknownRoles,
        ariaHiddenFocusable,
        duplicateIds,
        positiveTabindices,
        collectedAt: Date.now(),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: 'COLLECTION_FAILED',
      message: err.message || 'Failed to inspect page accessibility metrics.',
    };
  }
})();
