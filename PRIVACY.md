# Privacy Policy for WebXray

**Last Updated:** October 2026  
**Version:** 1.0.0

WebXray is committed to developer privacy and digital transparency. This Privacy Policy outlines our data handling practices and confirms our strict **zero-data-collection** guarantee.

---

## 1. Zero Data Collection Guarantee

WebXray operates entirely on the client side:
- **No Remote Servers:** WebXray does not operate external application servers, APIs, or data collection endpoints.
- **No Analytics or Trackers:** There are no analytics libraries (e.g. Google Analytics, Mixpanel), error telemetry agents (e.g. Sentry), tracking pixels, or third-party tracking scripts included in this extension.
- **No Monetization of User Data:** We do not sell, rent, monetize, or transmit any user information or audited website content to any third parties.

---

## 2. What Data Is Accessed and How It Is Processed

When you activate WebXray to audit a webpage, the extension inspects the target website in real time using the Chrome Extension API (`chrome.scripting.executeScript` and `activeTab`):

| Data Type | Purpose | How It Is Processed | Retention |
| :--- | :--- | :--- | :--- |
| **Active Webpage URL & Title** | Displayed in dashboard header and saved report metadata. | Read in memory when user opens the extension. | Kept in temporary React component state while open. |
| **DOM Metrics & Headings** | SEO hierarchy and structure analysis. | Counted and evaluated in-browser. | Discarded when tab closes unless manually saved. |
| **Performance Timings** | Core Web Vitals (LCP, FCP, TTFB, CLS) and resource timings. | Read from `window.performance` API. | Processed locally in memory. |
| **Accessibility Attributes** | Detecting missing alt tags, form labels, and ARIA roles. | Read from DOM elements. | Processed locally in memory. |
| **Security Headers** | Evaluating CSP, HSTS, and X-Content-Type-Options. | Inspected only after user grants optional host permission via local `HEAD`/`GET` request with `credentials: 'omit'`. | Evaluated in memory; no cookies or credentials sent. |
| **Technology Fingerprints** | Detecting frameworks, CMS, and analytics tools. | Evaluated against local static detection rules. | Evaluated locally in memory. |

---

## 3. Local Storage Usage

WebXray uses `chrome.storage.local` exclusively for client-side persistence:
- **Settings:** Storing user configuration options (Auto-Save preference, Report Retention Limit).
- **Archived Reports:** Storing sanitized report snapshots that you choose to save or auto-save.
  - Saved reports contain only: URL, timestamp, category scores, issue counts, and findings summaries with short evidence strings.
  - Saved reports **never** contain raw HTML source code, form input values, user session cookies, or sensitive authentication tokens.
- **Clearing Your Data:** You can delete individual reports, clear all saved reports, or reset all storage at any time via the **Reports** or **Settings** tabs in the extension side panel.

---

## 4. Network Activity

WebXray does not initiate outbound connections to any third-party analytics or external reporting service.

The only network activity occurs when:
1. You explicitly request a **Security Analysis**, in which case the only request made by the extension is to the inspected page to read its headers, and only after the user grants optional host permission (with credentials omitted via `credentials: 'omit'`).
2. You export a report as HTML/CSV/JSON, which uses standard browser `URL.createObjectURL` to download the file directly to your local file system.

---

## 5. Chrome Web Store Compliance

WebXray strictly complies with the **Google Chrome Web Store Developer Program Policies**, including the **Limited Use Policy**:
- WebXray does not transfer user data to third parties.
- WebXray does not use or transfer user data for personalized advertising or credit scoring.
- WebXray only requests permissions strictly necessary to perform developer website audits.

---

## 6. Open Source & Auditability

WebXray is open-source software under the MIT License. Anyone can audit our source code, network requests, and storage operations on GitHub.

## 7. Contact & Support

If you have questions regarding this Privacy Policy or WebXray's security practices, please open an issue in the official GitHub repository or contact the project maintainers.
