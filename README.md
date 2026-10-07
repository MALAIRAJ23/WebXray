# 🔬 WebXray

> **Inspect. Analyze. Improve.**

A developer-focused Chrome extension for **analyzing, diagnosing, and understanding websites** through performance, SEO, accessibility, security, technology detection, and network resource analysis.

[![CI](https://github.com/YOUR_GITHUB_USERNAME/webxray/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_GITHUB_USERNAME/webxray/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-159%20passed-emerald?style=flat-square)](#tests)
[![Manifest V3](https://img.shields.io/badge/manifest-v3-blue?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/)
[![Version](https://img.shields.io/badge/version-1.0.0-purple?style=flat-square)](#release)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=flat-square)](LICENSE)
[![Privacy](https://img.shields.io/badge/privacy-local--first-cyan?style=flat-square)](PRIVACY.md)

---

## 🚀 Download WebXray

### Latest Release — v1.0.0

**[⬇️ Download WebXray v1.0.0](YOUR_GITHUB_RELEASE_ASSET_URL)**

Download the ready-to-use WebXray Chrome extension package from the latest GitHub Release.

> **Note:** WebXray is currently distributed through GitHub as a developer-mode Chrome extension. Chrome Web Store distribution can be added in a future release.

---

## 📌 What is WebXray?

WebXray is a **privacy-first browser-based website auditing tool** built for developers, students, QA engineers, web designers, SEO professionals, and security learners.

It analyzes the currently opened webpage and brings multiple technical checks into one unified dashboard.

Instead of switching between multiple tools, WebXray provides a single place to inspect:

- ⚡ Performance
- 🔎 Technical SEO
- ♿ Accessibility
- 🔐 Defensive security
- 🧩 Technology stack
- 📡 Network resources
- 📊 Website health scores
- 💡 Actionable recommendations
- 📑 Audit reports
- ⚖️ Before/after comparisons

The goal is simple:

> **Don't just detect problems. Understand them and know what to improve.**

---

## 🎯 How WebXray Works

```text
                         WebXray
                            │
           ┌────────────────┼────────────────┐
           │                │                │
           ▼                ▼                ▼
       Understand       Diagnose          Improve
           │                │                │
           ▼                ▼                ▼
     Technologies       Problems       Recommendations
      & Resources       & Issues             │
           │                │                │
           └────────────────┼────────────────┘
                            ▼
                     Better Websites
```

---

# ✨ Features

## 🌐 Website Overview

Quickly understand the structure of the current webpage.

WebXray analyzes:

- DOM element count
- Script count
- Stylesheet count
- Image count
- Link count
- HTML `lang` attribute
- Viewport meta tag
- Document type

---

## ⚡ Performance Analysis

Analyze important performance characteristics of the current page.

### Metrics

- Largest Contentful Paint (LCP)
- First Contentful Paint (FCP)
- Cumulative Layout Shift (CLS)
- Time to First Byte (TTFB)
- Resource request count
- Transferred bytes
- Resource category breakdown
- JavaScript resources
- CSS resources
- Images
- Fonts
- Other assets

WebXray uses actual browser measurements and resource information rather than generating arbitrary performance scores.

---

## 🔎 Technical SEO Analysis

WebXray performs technical SEO checks including:

- Page title
- Meta description
- Title/description length
- H1–H6 heading hierarchy
- Heading level skips
- Canonical URL
- Robots meta directives
- Generic anchor text
- Empty `href` values
- Open Graph-related metadata

Example findings:

```text
⚠ Heading hierarchy issue

H1
 └── H3
      └── H4

H2 is missing between H1 and H3.
```

---

## ♿ Accessibility Analysis

WebXray performs a practical subset of accessibility checks based on common WCAG-related patterns.

Checks include:

- Missing image ALT text
- Form controls without labels
- Buttons without accessible names
- Landmark structure
- Duplicate IDs
- Positive `tabindex`
- Heading structure

### Element Highlighting

Accessibility findings can be connected to elements on the inspected webpage, allowing developers to identify where an issue occurs.

---

## 🔐 Defensive Security Analysis

WebXray focuses on **defensive website security inspection**.

Checks include:

- HTTPS
- Mixed content
- Client-accessible cookie information
- External link tabnabbing risks
- Third-party resources
- Security response headers where available

Supported header checks include:

- Content-Security-Policy
- Strict-Transport-Security
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- X-Frame-Options

> WebXray is an auditing and diagnostic tool. It does not attempt to exploit vulnerabilities or perform unauthorized attacks.

---

## 🧩 Technology Detection

WebXray identifies observable technologies used by websites.

The current detector fingerprints **18 technologies** across categories including:

- Frontend frameworks
- Web frameworks
- CSS libraries
- CMS platforms
- Analytics
- Cloud/infrastructure indicators

Technology detection is based on observable evidence available to the extension.

---

## 📡 Network Resource Inspector

Inspect resources loaded by the current webpage.

The resource inspector provides information such as:

- Resource URL
- Resource type
- Transfer size
- Duration
- Initiator type
- Third-party status
- Asset category

Resources can be sorted and filtered to make large pages easier to investigate.

---

# 📊 Transparent Scoring

WebXray provides an overall **Website Health Score from 0–100**.

The score is **not presented as an industry-standard score**. It is WebXray's own deterministic audit score based on its documented rule system.

### Category weighting

| Category | Weight |
|---|---:|
| Performance | 20% |
| SEO | 20% |
| Accessibility | 20% |
| Security | 20% |
| Best Practices | 20% |

```text
Performance       20%
SEO               20%
Accessibility     20%
Security          20%
Best Practices    20%
───────────────────────
Overall           100%
```

Every score is calculated through a transparent rule ledger.

The scoring system follows:

```text
Measurement
    ↓
Rule
    ↓
Evidence
    ↓
Deduction / Credit
    ↓
Category Score
    ↓
Overall Score
    ↓
Recommendation
```

For the complete scoring methodology, rules, weights, and formulas:

**[View the WebXray Scoring Specification](docs/SCORING.md)**

---

# 💡 Actionable Recommendations

WebXray does not simply report:

> "ALT attribute missing."

It attempts to provide useful context:

```text
⚠ Missing image ALT text

4 images do not contain ALT attributes.

Why it matters:
Screen readers may not be able to communicate
the purpose of these images to users.

Recommended action:
Add meaningful ALT text to informative images.
```

The objective is:

> **Finding → Explanation → Recommendation**

---

# 📑 Reports & Comparison

WebXray can save audit snapshots locally using:

```text
chrome.storage.local
```

### Reports

Saved reports can be reviewed later without requiring a cloud account.

### Comparison

Compare two audit snapshots to understand how a website changed over time.

```text
                 Before       After

Performance        68          84
SEO                74          91
Accessibility      63          82
Security           79          88
Best Practices     72          90
────────────────────────────────────
Overall             71          87
```

---

# 📤 Export

Audit results can be exported as:

- JSON
- CSV
- Self-contained HTML

The HTML report can also be printed or saved as PDF through the browser's print functionality.

---

# 🏗️ Architecture

WebXray uses a modular **Chrome Manifest V3** architecture.

```text
┌──────────────────────────────────────────────────────────┐
│                        Google Chrome                      │
│                                                          │
│  ┌──────────────────────┐    ┌────────────────────────┐  │
│  │     Popup Window     │    │     Side Panel App      │  │
│  │   Compact Summary    │    │    Full Dashboard      │  │
│  └──────────┬───────────┘    └────────────┬───────────┘  │
│             │                             │              │
│             └──────────────┬──────────────┘              │
│                            ▼                             │
│              chrome.runtime messaging                    │
│                            │                             │
│                            ▼                             │
│  ┌────────────────────────────────────────────────────┐  │
│  │          Background Service Worker (MV3)           │  │
│  │                                                    │  │
│  │  • Message validation                              │  │
│  │  • Sender validation                               │  │
│  │  • Restricted URL filtering                        │  │
│  │  • Security header inspection                      │  │
│  └────────────────────────┬───────────────────────────┘  │
│                           │                              │
│                           ▼                              │
│                chrome.scripting API                     │
│                           │                              │
│                           ▼                              │
│  ┌────────────────────────────────────────────────────┐  │
│  │               Inspected Webpage                    │  │
│  │                                                    │  │
│  │  overviewCollector.js                              │  │
│  │  performanceCollector.js                           │  │
│  │  seoCollector.js                                   │  │
│  │  a11yCollector.js                                  │  │
│  │  securityCollector.js                              │  │
│  │  technologyCollector.js                            │  │
│  └────────────────────────┬───────────────────────────┘  │
│                           │                              │
│                           ▼                              │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Local Analyzer Engines                │  │
│  │                                                    │  │
│  │  Performance • SEO • Accessibility • Security     │  │
│  │  Technology • Scoring • Recommendations            │  │
│  └────────────────────────┬───────────────────────────┘  │
│                           │                              │
│                           ▼                              │
│  ┌────────────────────────────────────────────────────┐  │
│  │             chrome.storage.local                  │  │
│  │                                                    │  │
│  │  • Saved reports                                   │  │
│  │  • Settings                                        │  │
│  │  • Local preferences                               │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

# 🔒 Privacy

WebXray follows a **local-first privacy model**.

### No remote telemetry

WebXray does not include:

- Analytics tracking
- Tracking pixels
- Remote error reporting
- Advertising trackers
- User profiling

### Local processing

Website audit results are processed locally whenever possible.

### Local storage

Reports and settings are stored in:

```text
chrome.storage.local
```

They are not synchronized to an external WebXray server.

### Network access

Some analysis capabilities may require access to the inspected website, such as retrieving response headers where supported.

For complete details, see:

- [Privacy Policy](PRIVACY.md)
- [Permissions Documentation](docs/PERMISSIONS.md)

---

# 🛡️ Security Principles

WebXray itself follows several security principles:

- Minimal required permissions
- Manifest V3 architecture
- Message validation
- Sender validation
- Restricted URL filtering
- No remote executable code
- No unnecessary external services
- Local-first data handling
- No stored API secrets
- No unauthorized exploitation

---

# 🚀 Installation

## Option 1 — Download the Latest Release

**[⬇️ Download WebXray v1.0.0](YOUR_GITHUB_RELEASE_ASSET_URL)**

### Installation Steps

1. Download `WebXray-v1.0.0.zip`.
2. Extract the ZIP to a folder.
3. Open Google Chrome.
4. Navigate to:

```text
chrome://extensions/
```

5. Enable **Developer mode**.
6. Click **Load unpacked**.
7. Select the folder containing `manifest.json`.
8. Pin WebXray to your Chrome toolbar.
9. Open any supported webpage.
10. Click the WebXray icon.

### Important

Select the **extracted extension folder**, not the ZIP file.

The selected folder should directly contain:

```text
manifest.json
```

---

# 🛠️ Development Setup

## Requirements

- Node.js >= 18
- npm >= 9
- Google Chrome >= 114
- Chromium-based browser with required extension APIs

## Clone

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/webxray.git
cd webxray
```

## Install Dependencies

```bash
npm ci
```

## Build

```bash
npm run build
```

The production extension is generated in:

```text
dist/
```

## Load Development Build

Open:

```text
chrome://extensions/
```

Enable Developer Mode → **Load unpacked** → select `dist/`.

After making changes:

```bash
npm run build
```

Then click **Reload** on the WebXray extension in Chrome.

---

# 🧪 Testing

WebXray uses **Vitest** for automated testing.

The test suite covers:

- Collectors
- Pure analyzers
- Scoring rules
- Scoring ledgers
- Export formatting
- Core analysis logic

Run:

```bash
npm test
```

Current test status:

```text
Test Files  10 passed (10)
Tests       159 passed (159)
```

---

# 🔍 Code Quality

Run ESLint:

```bash
npm run lint
```

Generate/update scoring documentation:

```bash
npm run docs:scoring
```

Build and verify the production bundle:

```bash
npm run build
```

The production build includes post-build verification for:

- Classic collector scripts
- Service worker bundling
- Required extension files
- Build integrity

---

# 📁 Project Structure

```text
webxray/
│
├── .github/
│   └── workflows/
│
├── docs/
│   ├── SCORING.md
│   ├── PERMISSIONS.md
│   └── ...
│
├── public/
│
├── scripts/
│   ├── build-service-worker.js
│   ├── build-collectors.js
│   └── verify-build.js
│
├── src/
│   ├── analyzers/
│   ├── background/
│   ├── components/
│   ├── content/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── utils/
│   └── ...
│
├── LICENSE
├── PRIVACY.md
├── README.md
├── package.json
└── vite.config.js
```

---

# 📸 Screenshots

Screenshots should be added here to demonstrate the main WebXray interfaces.

Recommended screenshots:

1. Overview Dashboard
2. Performance Analysis
3. SEO Analysis
4. Accessibility Analysis
5. Security Analysis
6. Technology Detection
7. Network Resource Inspector
8. Reports
9. Before/After Comparison
10. Exported Report

Example:

```text
docs/
└── screenshots/
    ├── overview.png
    ├── performance.png
    ├── seo.png
    ├── accessibility.png
    ├── security.png
    ├── technology.png
    ├── network.png
    ├── reports.png
    └── comparison.png
```

---

# 📋 Release

## WebXray v1.0.0

### Included

- Website overview analysis
- Performance analysis
- Core Web Vitals
- Technical SEO analysis
- Accessibility analysis
- Defensive security analysis
- Technology detection
- Network resource inspection
- Transparent scoring
- Actionable recommendations
- Local reports
- Report comparison
- JSON export
- CSV export
- HTML export
- Manifest V3 architecture
- Local-first privacy model
- Automated test suite

### Release Package

**[⬇️ Download WebXray v1.0.0](YOUR_GITHUB_RELEASE_ASSET_URL)**

---

# 🗺️ Roadmap

Possible future improvements:

- [ ] Chrome Web Store publication
- [ ] Additional accessibility rules
- [ ] Additional technology fingerprints
- [ ] Advanced performance diagnostics
- [ ] More detailed network analysis
- [ ] Custom audit rules
- [ ] Custom scoring profiles
- [ ] Scheduled website monitoring
- [ ] Team reports
- [ ] CI/CD integration
- [ ] Optional cloud dashboard

The roadmap is intentionally separate from the stable v1.0.0 feature set.

---

# 🤝 Contributing

Contributions, suggestions, and bug reports are welcome.

### Suggested workflow

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/webxray.git
cd webxray
npm ci
npm test
npm run lint
npm run build
```

Create a feature branch:

```bash
git checkout -b feature/your-feature
```

After making changes:

```bash
npm test
npm run lint
npm run build
```

Then open a pull request.

---

# ⚖️ License

WebXray is licensed under the **MIT License**.

See [LICENSE](LICENSE) for details.

---

# 👨‍💻 Project

**WebXray**

> **Inspect. Analyze. Improve.**

A privacy-first developer tool for understanding what is happening inside modern websites.

---

## ⭐ If WebXray Helps You

If you find WebXray useful:

- ⭐ Star the repository
- 🐛 Report bugs
- 💡 Suggest improvements
- 🔀 Contribute improvements
- 📢 Share the project

**Built to help developers understand the web better.**
