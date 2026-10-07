# Manual QA Checklist - WebsiteLab 1.0.0

Use this checklist to manually test WebsiteLab in Google Chrome before release.

---

## Pre-Flight Setup
1. Open Google Chrome (version 114 or newer).
2. Navigate to `chrome://extensions`.
3. Enable **Developer mode** via the toggle in the top-right corner.
4. Click **Load unpacked** and select the `dist/` directory.
5. Pin the WebsiteLab extension icon to the browser toolbar.

---

## Test Scenarios

### Test 1: Static HTML Site (`https://example.com`)

- Overview:
  - [ ] URL is `https://example.com`, domain is `example.com`, protocol is `https:`.
  - [ ] DOM elements count is between 20 and 50.
  - [ ] Doctype displays `HTML5`.
- Performance:
  - [ ] TTFB, FCP, and LCP metrics are calculated.
  - [ ] Total transfer size is under 50 KB.
  - [ ] Performance score is high (>= 90).
  - [ ] Network table displays 1 to 5 resources.
- SEO:
  - [ ] Title is identified as "Example Domain".
  - [ ] Missing meta description is flagged with a deduction.
  - [ ] Exactly one H1 is detected with 0 heading level skips.
- Accessibility:
  - [ ] Form controls count is 0.
  - [ ] Accessibility score is high (>= 90).
- Security:
  - [ ] HTTPS connection is marked passed.
  - [ ] Mixed content is marked passed (0 detected).
  - [ ] Third-party resources count is 0.
- Technology:
  - [ ] 0 or minimal technologies detected (clean static page).

Result / Notes: [                                                              ]

---

### Test 2: React Client Site (`https://react.dev`)

- Overview:
  - [ ] Title corresponds to the React website title.
  - [ ] Script and stylesheet counts are populated.
- Performance:
  - [ ] Core Web Vitals (LCP, FCP, CLS, TTFB) are displayed.
  - [ ] Resource table categorizes JavaScript bundles and CSS files.
- SEO:
  - [ ] Canonical URL is identified.
  - [ ] OpenGraph card metadata is displayed.
- Accessibility:
  - [ ] Landmarks (`<main>`, `<nav>`, `<header>`) are identified.
  - [ ] Buttons have accessible names.
- Security:
  - [ ] HTTPS connection is verified.
- Technology:
  - [ ] "React" is detected with High confidence via global variable or DOM selector.

Result / Notes: [                                                              ]

---

### Test 3: Next.js Site (`https://nextjs.org`)

- Overview:
  - [ ] DOM counts and viewport metadata are displayed.
- Performance:
  - [ ] Static JavaScript chunks and fonts appear in the Network table.
- SEO:
  - [ ] Heading hierarchy tree renders headings in document order.
- Accessibility:
  - [ ] Navigation landmarks and form controls are evaluated.
- Security:
  - [ ] HTTPS connection is verified.
- Technology:
  - [ ] "React" is detected with High confidence.
  - [ ] "Next.js" is detected with High confidence via `window.__NEXT_DATA__` or script pattern.

Result / Notes: [                                                              ]

---

### Test 4: WordPress Site (`https://wordpress.org` or a WordPress blog)

- Overview:
  - [ ] HTML lang attribute and doctype are displayed.
- Performance:
  - [ ] Stylesheets and scripts categorized in the Network table.
- SEO:
  - [ ] Meta description presence and length evaluated.
  - [ ] Image alt attributes evaluated.
- Accessibility:
  - [ ] Heading hierarchy and link text evaluated.
- Security:
  - [ ] HTTPS connection is verified.
- Technology:
  - [ ] "WordPress" CMS is detected with High confidence via `wp-content` or generator meta tag.

Result / Notes: [                                                              ]

---

### Test 5: Large Content Site (10,000+ to 20,000+ DOM Nodes)
Suggested URL: Wikipedia long article (e.g. `https://en.wikipedia.org/wiki/List_of_common_misconceptions`)

- Stability & Truncation:
  - [ ] Side panel opens and UI remains responsive (no freezing).
  - [ ] Analysis finishes under 2,000 ms.
    - Measured Analysis Time: _________ ms (Target: < 2,000 ms)
  - [ ] Headings list caps at 200 items without memory leaks.
  - [ ] Resource timing table caps at 500 items cleanly.
  - [ ] Scrolling inside the side panel remains smooth.

Result / Notes: [                                                              ]

---

### Test 6: Single Page Application (SPA) & Tab Navigation
Suggested URL: `https://github.com` or any client-routed SPA

- Route and Tab Sync:
  - [ ] Client-side route change: Navigating to a new route in the inspected tab updates the URL and refreshes audit results.
  - [ ] Tab switching: Switching between active browser tabs updates the side panel to display the newly focused tab's data.
  - [ ] Rapid clicking: Rapidly clicking the refresh button 5 times completes cleanly without race conditions or corrupted ledgers.

Result / Notes: [                                                              ]

---

### Test 7: Blocked and Restricted Pages
Suggested URLs: `chrome://extensions`, `chrome://settings`, Chrome Web Store, local PDF

- Error Handling:
  - [ ] Overview displays friendly restricted page notification without console errors.
  - [ ] Service worker returns clean restricted response without uncaught exceptions.
  - [ ] Side panel remains interactive (Saved Reports and Settings accessible).

Result / Notes: [                                                              ]

---

### Test 8: Reports Storage, Comparison & Exports

- Storage & Comparison:
  - [ ] "Save Report" stores snapshot under the current domain in Saved Reports.
  - [ ] "Compare" between two reports for the same domain shows score diffs and resolved vs introduced findings.
  - [ ] JSON export downloads valid JSON containing `scoringVersion: "1.0"`.
  - [ ] CSV export downloads valid tabular data.
  - [ ] HTML export opens as a self-contained report with escaped HTML copy.
  - [ ] Auto-save setting persists across sessions.
  - [ ] "Clear All Reports" resets storage to 0 B.

Result / Notes: [                                                              ]

---

### Test 9: Accessibility and Color Contrast

- Keyboard and Semantics:
  - [ ] Full keyboard reachability: All buttons, tabs, links, and table toggles can be focused using Tab / Shift+Tab.
  - [ ] Visible focus rings: Clear focus indicator visible on every focused element.
  - [ ] Arrow key navigation: Left / Right arrow keys switch tabs; Home / End jump to start / end.
  - [ ] ARIA roles & labels: Tabs have `role="tab"`, menu has `role="menu"`, icons have descriptive `aria-label`.
- Visual Contrast & Color:
  - [ ] Normal text contrast: Dark mode `--wl-text` (`#e6e9ee` on `#0e1116`) >= 4.5:1. Light mode `--wl-text` (`#1f2328` on `#ffffff`) >= 4.5:1.
  - [ ] Muted text contrast: Dark mode `--wl-muted` (`#8b94a3` on `#0e1116`) >= 4.5:1 (measures ~5.4:1). Light mode `--wl-muted` (`#656d76` on `#ffffff`) >= 4.5:1 (measures ~4.7:1).
  - [ ] Severity color contrast & indicators: Severity text and badges maintain readable contrast, and severity is never conveyed by color alone (text labels accompany all indicators).

Result / Notes: [                                                              ]
