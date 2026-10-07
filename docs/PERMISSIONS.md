# WebsiteLab — Permissions & Security Architecture Audit

In alignment with **Rule 3** (Minimal Permissions Strategy) and **Rule 2** (Privacy-First Architecture), WebsiteLab requests only the minimum set of permissions strictly necessary to inspect websites on demand.

WebsiteLab does **not** request broad persistent host permissions (such as `<all_urls>` at install time). All page access is temporary, strictly initiated by explicit user interaction, and processed locally on the client.

---

## 1. Declared Manifest V3 Permissions

| Permission | Justification / Feature Need | Data Accessed | Storage & Processing Location |
| :--- | :--- | :--- | :--- |
| `activeTab` | Grants temporary access to the currently focused tab when the user clicks the extension popup or opens the side panel. Used to identify the target tab ID, URL, domain, and title. | Active tab URL, title, favicon, and tab ID. | Local memory only; discarded immediately when the panel is closed or another tab is selected. |
| `scripting` | Enables programmatic, on-demand execution of analyzer collector scripts (`executeScript`) inside the active tab. Eliminates the need for background/always-on content scripts. | DOM counts, accessibility node structures, performance navigation entries, and meta tags. | Executed inside the target tab context; serialized JSON results returned back to the background worker and dashboard. Never transmitted over the network. |
| `sidePanel` | Allows WebsiteLab to render the comprehensive developer dashboard docked alongside the inspected website. | None directly. Controls the browser side panel frame. | Native Chromium browser UI only. |
| `storage` | Stores user configurations (auto-save preference, retention limit) and user-saved historical audit reports (`chrome.storage.local`). | Saved audit report summaries, scores, issue counts, and preferences. | Stored strictly in local disk storage via `chrome.storage.local`. Excluded from cloud sync. |

---

## 2. Optional Runtime Permissions

| Permission | Justification / Feature Need | Trigger / Conditions | Fallback if Denied |
| :--- | :--- | :--- | :--- |
| `optional_host_permissions` (`*://*/*`) | Used optionally at runtime to inspect HTTP response headers (`HEAD` with `GET` fallback) for security audits (CSP, HSTS, X-Content-Type-Options, etc.). | Only invoked when the user explicitly requests a Security Analysis. Credentials (`cookies`, `auth`) are explicitly omitted (`credentials: 'omit'`). | If permissions are unavailable or denied, security headers indicate **"Could not be verified"** rather than falsely reporting "Missing". |

The only request made by the extension is to the inspected page to read its headers, and only after the user grants optional host permission. All other diagnostic data is gathered locally in memory from the active tab.

---

## 3. Strict Extension Content Security Policy (CSP)

WebsiteLab enforces a locked-down Manifest V3 Content Security Policy configured in `manifest.json`:

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self';"
}
```

### Security Guarantees:
1. **No Remote Code Execution:** All scripts must originate from the extension's local bundled package. External script tags, remote CDN scripts, and WebSockets to third-party endpoints are blocked by browser enforcement.
2. **No Dynamic Code Evaluation:** `eval()`, `new Function()`, and inline script strings are strictly banned.
3. **No External Plugins:** `object-src 'self'` prevents Flash, Silverlight, or arbitrary plugin execution.
4. **Self-Contained Exports:** The HTML report export feature embeds all styles and typography inline without requesting external fonts, stylesheets, or tracker beacons.

---

## 4. Codebase Audit & Sanitization Verification

A comprehensive static analysis audit was conducted across the codebase:
- **`innerHTML` & `dangerouslySetInnerHTML`:** 0 instances in production application code. All user-derived strings, page titles, and recommendations are bound using safe React JSX text interpolation.
- **Export Sanitization:** The HTML report generator uses a pure `escapeHtml()` utility to convert special characters (`&`, `<`, `>`, `"`, `'`) to HTML entities, protecting against stored XSS vectors.
- **Message Validation:** The background service worker validates message origin (`sender.id === chrome.runtime.id`), checks payload schemas, and rejects unauthorized or malformed requests.

---

## 5. Policy for Adding Future Permissions

1. **Strict Necessity:** A permission must only be added when an active feature cannot technically function without it.
2. **On-Demand Preference:** Whenever possible, use optional runtime permissions or `activeTab` rather than declared persistent permissions.
3. **Audit Log:** Any addition to `manifest.json` must be logged in this document with rationale, scope, and local processing guarantees before release.
