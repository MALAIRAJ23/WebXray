# WebXray

> A browser extension for analyzing, diagnosing, and understanding websites.

[![CI](https://github.com/[YOUR_GITHUB_USERNAME]/webxray/actions/workflows/ci.yml/badge.svg)](https://github.com/[YOUR_GITHUB_USERNAME]/webxray/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-159%20passed-emerald?style=flat-square)](#tests)
[![Manifest V3](https://img.shields.io/badge/manifest-v3-blue?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=flat-square)](LICENSE)
[![Privacy](https://img.shields.io/badge/privacy-100%25%20local-cyan?style=flat-square)](PRIVACY.md)

WebXray provides technical diagnostics across performance, SEO health, accessibility compliance, defensive security, technology detection, and network resources. All audits produce transparent scores with concrete evidence, with results processed locally on the client.

```text
                  WebXray
                     │
        ┌────────────┼────────────┐
        │            │            │
   Understand     Diagnose     Improve
        │            │            │
        ▼            ▼            ▼
  Technologies    Problems    Actionable
   & Stacks      & Regress   Recommendations
        │            │            │
        └────────────┼────────────┘
                     ▼
              Better Websites
```

---

## Screenshots

<!-- Placeholder: Screenshots of Overview, Performance, SEO, Accessibility, Security, and Technology views -->
_Screenshots will be added upon Chrome Web Store asset publication._

---

## Features

- **Overview**: DOM element, script, stylesheet, image, and link counts, HTML lang attribute, viewport meta, and doctype detection.
- **Performance**: Core Web Vitals (LCP, FCP, CLS, TTFB), resource request counts and byte breakdowns by asset category.
- **Technical SEO**: Heading hierarchy tree (H1–H6) with level-skip detection, title and meta description character bounds, canonical link validation, robots meta directives, generic anchor text ("click here", "read more"), and empty href checks.
- **Accessibility**: A subset of WCAG checks (missing image alt text, form controls missing labels, buttons missing accessible names, landmark structure, duplicate IDs, positive tabindex) with an on-page element highlighter.
- **Defensive Security**: Transport encryption (HTTPS), mixed content detection, client-accessible cookie counts, external link tabnabbing checks (`target="_blank"`), third-party resource detection, and optional security response header inspection (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options).
- **Technology Detection**: Fingerprints exactly 18 technologies across frontend frameworks, web frameworks, CSS libraries, CMS platforms, analytics, and cloud infrastructure.
- **Network Resource Inspector**: Sortable and filterable table of loaded network assets with transfer sizes, durations, initiator types, and third-party flags.
- **Reports & Comparison**: Audit snapshots saved locally in `chrome.storage.local`, before/after comparison diffing, and export to JSON, CSV, and self-contained HTML (printable to PDF).

---

## Architecture

WebXray is built for Manifest V3 using a modular architecture:

```text
┌────────────────────────────────────────────────────────┐
│                      Google Chrome                     │
│                                                        │
│  ┌──────────────────────┐    ┌──────────────────────┐  │
│  │     Popup Window     │    │   Side Panel App     │  │
│  │   (Compact Summary)  │    │  (Full Dashboard)    │  │
│  └──────────┬───────────┘    └──────────┬───────────┘  │
│             │                           │              │
│             ▼                           ▼              │
│      chrome.runtime.sendMessage (Validated Action)     │
│                         │                              │
│                         ▼                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Background Service Worker (MV3)          │  │
│  │  - Sender ID & Message Schema Validation         │  │
│  │  - Restricted URL Filtering (chrome://, etc.)    │  │
│  │  - In-memory Security Headers Inspector          │  │
│  └──────────────────────┬───────────────────────────┘  │
│                         │                              │
│            chrome.scripting.executeScript              │
│              (On-Demand Dynamic Injection)             │
│                         │                              │
│                         ▼                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Inspected Webpage Target Tab             │  │
│  │  - overviewCollector.js      - a11yCollector.js  │  │
│  │  - performanceCollector.js   - securityCollector │  │
│  │  - seoCollector.js           - techCollector.js  │  │
│  └──────────────────────────────────────────────────┘  │
│                         │                              │
│                         ▼                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Local Pure Analyzer Engines           │  │
│  │  - Performance   - SEO      - Accessibility      │  │
│  │  - Security      - Tech     - Scoring Engine     │  │
│  └──────────────────────┬───────────────────────────┘  │
│                         │                              │
│                         ▼                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │      Local Persistence (chrome.storage.local)    │  │
│  │  - Saved Reports   - Settings   - No Cloud Sync  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## Installation

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Google Chrome >= 114 (or any Chromium browser supporting the Side Panel API)

### Build Steps
```bash
# Clone the repository
git clone https://github.com/[YOUR_GITHUB_USERNAME]/webxray.git
cd webxray

# Install dependencies
npm ci

# Build the extension bundle
npm run build
```

### Loading the Extension into Chrome
1. Navigate to `chrome://extensions/` in Google Chrome.
2. Enable **Developer mode** via the toggle in the top-right corner.
3. Click **Load unpacked**.
4. Select the `dist/` directory generated inside the `webxray` project folder.
5. Pin the WebXray icon to your browser toolbar.

---

## How Scoring Works

WebXray calculates an overall website health score (0–100) using a weighted composite of 5 categories:

- **Performance** (20%)
- **SEO** (20%)
- **Accessibility** (20%)
- **Security** (20%)
- **Best Practices** (20%)

Every score is computed deterministically through a transparent rule ledger. For full documentation on category weights, deduction formulas, and the complete rule catalog, see [docs/SCORING.md](docs/SCORING.md).

---

## Privacy and Permissions

WebXray is built to run entirely on the client side:
- **Zero remote telemetry**: No analytics, tracking pixels, or remote error reporting endpoints are included.
- **Network requests**: The only request made by the extension is to the inspected page to read its headers, and only after the user grants optional host permission.
- **Local persistence**: Reports and settings are stored locally in `chrome.storage.local` and are never synced to external servers.

For detailed documentation, see [PRIVACY.md](PRIVACY.md) and [docs/PERMISSIONS.md](docs/PERMISSIONS.md).

---

## Development

```bash
# Build production bundle and bundle collector classic scripts
npm run build

# Run unit and integration tests
npm test

# Run ESLint validation
npm run lint

# Generate updated scoring documentation
npm run docs:scoring
```

Because Chrome extensions run built bundles in the browser context, rebuild the project with `npm run build` and click the reload icon on `chrome://extensions` to test updates.

---

## Tests

The test suite runs with Vitest and validates collectors, pure analyzers, scoring ledgers, and export formatting:

```bash
npm test
```

Current test suite status:
```text
 Test Files  10 passed (10)
      Tests  159 passed (159)
```

---

## License

This project is licensed under the [MIT License](LICENSE).
"# WebXray" 
