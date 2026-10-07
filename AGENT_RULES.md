# WebsiteLab — Agent Rules & Engineering Guidelines

This document outlines the operational rules and architectural constraints for developing the **WebsiteLab** Chrome extension. These rules are derived from and align with [PROJECT.md](file:///e:/website-lab/project.md), which serves as the single source of truth.

---

## 1. Technology Stack
- **Extension Platform:** Chrome Extension Manifest V3 (MV3)
- **Build Tool:** Vite
- **Frontend Framework:** React
- **Language:** JavaScript (`.js`, `.jsx`) — **Strictly no TypeScript**
- **Styling:** Tailwind CSS

---

## 2. Privacy-First Architecture
- **Local Analysis Only:** All website analysis, metric collection, and evaluation must run entirely locally on the user's browser.
- **No External Servers:** Never send page contents, DOM data, network data, or browsing activity to remote servers or third-party APIs.
- **No Analytics / Tracking:** Zero telemetry, tracking, or remote scripts.
- **No Remote Code Execution:** All code must be bundled locally inside the extension package in accordance with Chrome Web Store MV3 policy.

---

## 3. Minimal Permissions Strategy
- **Least Privilege:** Request the absolute minimum permissions needed to operate.
- **On-Demand Injection:** Prefer `activeTab` + `scripting` (injecting collectors on demand upon user interaction) over broad host permissions (`<all_urls>`).
- **Audit & Documentation:** If a new feature strictly requires an additional Chrome API permission, it must only be added when building that feature and documented in `docs/PERMISSIONS.md` detailing:
  - Permission name
  - Justification / feature requirement
  - What data is accessed
  - Where and how it is processed

---

## 4. Analyzer Contract & Structure
- **Location:** Pure functions located in `src/analyzers/<name>/` (e.g., `performance/`, `seo/`, `accessibility/`, `security/`, `technology/`, `network/`).
- **Signature:** Pure function that accepts collected raw data and returns a standardized output object:
  ```javascript
  {
    score: number, // Transparent score (e.g., 0-100)
    findings: [
      {
        id: string,
        title: string,
        severity: "critical" | "high" | "medium" | "low" | "passed",
        evidence: string | object,
        whyItMatters: string,
        recommendation: string
      }
    ]
  }
  ```
- **Allowed Severity Values:**
  - `critical`
  - `high`
  - `medium`
  - `low`
  - `passed`
- **Transparent Scoring:** Scores must be strictly deterministic and derived directly from findings. Never display arbitrary numbers without underlying evidence and explanations.

---

## 5. XSS Prevention & Sanitization
- **No `innerHTML`:** Never inject webpage-derived content, URLs, titles, attributes, or HTML snippets via `innerHTML`, `dangerouslySetInnerHTML`, or `outerHTML`.
- **Safe Rendering:** Render all page-derived content as text via React elements (`<span>{text}</span>`) or properly sanitized values.

---

## 6. Runtime Message Validation
- **Sender Verification:** Validate sender origin/id on all incoming `chrome.runtime.onMessage` / `chrome.runtime.onConnect` listeners.
- **Schema & Shape Validation:** Strictly validate message type and payload shape before processing actions in background service workers or content scripts.
- **Error Handling:** Gracefully reject and log unauthorized or malformed messages.

---

## 7. Folder Structure (PROJECT.md Section 23)
Follow the standardized repository layout:
```text
websitelab/
├── public/
│   ├── icons/
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── charts/
│   │   ├── score/
│   │   ├── findings/
│   │   └── layout/
│   ├── pages/
│   │   ├── Popup/
│   │   ├── Dashboard/
│   │   ├── Reports/
│   │   └── Settings/
│   ├── analyzers/
│   │   ├── performance/
│   │   ├── seo/
│   │   ├── accessibility/
│   │   ├── security/
│   │   ├── technology/
│   │   └── network/
│   ├── services/
│   │   ├── chrome/
│   │   ├── storage/
│   │   └── detection/
│   ├── utils/
│   ├── hooks/
│   ├── types/
│   ├── content/
│   │   └── contentScript.js
│   ├── background/
│   │   └── serviceWorker.js
│   └── App.jsx
├── tests/
├── README.md
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## 8. Post-Task Reporting Format
After completing each development task, provide a clear structured summary covering:
1. **What was changed:** Specific files created or modified and non-obvious design decisions.
2. **How to build:** Exact command line instructions to install/build the extension bundle.
3. **How to test manually:** Step-by-step instructions for loading into Chrome (`chrome://extensions`) and validating the behavior.
4. **What is not done yet:** Next immediate steps and remaining items in the active phase.

---

## 9. Phased Development Discipline
- Adhere strictly to the phases outlined in PROJECT.md Section 28.
- **No premature feature work:** Do not implement features from future phases unless explicitly requested by the user.
- Focus on building solid, clean, testable foundations one phase at a time.
