# WebsiteLab — Chrome Web Store Listing & QA Checklist

---

## 1. Store Metadata

### Title
```text
WebsiteLab — Web Audit, SEO, Perf & Tech Stack
```

### Short Description (max 132 characters)
```text
All-in-one developer laboratory: Core Web Vitals, SEO, accessibility, security headers, tech stack detection, and reports.
```

### Category
```text
Developer Tools
```

### Detailed Description (Markdown formatted for Web Store / Marketing)

```text
WebsiteLab is a modern, developer-first browser extension designed for auditing, diagnosing, and understanding websites in real time. 

Built with a privacy-first, zero-telemetry architecture, WebsiteLab runs 100% locally inside your browser to deliver deep insights into performance, technical SEO, web accessibility, security headers, technology fingerprints, and network payloads.

🔬 WHY WEBSITELAB?
Most developer tools only tell you: "Your website has problems."
WebsiteLab explains: Here are the problems, here is why they matter, here is the concrete evidence, and here is how to fix them.

⚡ COMPREHENSIVE DIAGNOSTIC MODULES

1. Overall Health Score & Recommendations
• Transparent weighted score (0–100) across 5 core categories with letter grades (A–F).
• "Why this score?" panel detailing exact points deducted per issue.
• Actionable recommendation engine prioritized by severity (Critical, High, Medium, Low).

2. Performance Analyzer
• Core Web Vitals: Largest Contentful Paint (LCP), First Contentful Paint (FCP), Cumulative Layout Shift (CLS), and Time to First Byte (TTFB).
• Resource timing breakdowns (JavaScript, CSS, Images, Fonts, Media, Fetch/XHR).
• Detection of unoptimized images, excessive script bundles, and render-blocking resources.

3. Technical SEO Health
• Document metadata audit (Title length, Meta Description bounds, Canonical URL, Robots meta, HTML lang).
• Heading structure tree (H1–H6 hierarchy validation and skip detection).
• Links and media audits (internal vs external, empty hrefs, non-descriptive anchor text, missing alt text).
• Real-time Google SERP search snippet preview and Social Card (Open Graph / Twitter) visual previews.

4. Accessibility (a11y) Analyzer
• WCAG 2.1 compliance checks: missing alt attributes, unlabeled form controls, missing accessible names on buttons and links.
• Landmark validation (main, nav, header, footer) and suspicious ARIA roles / aria-hidden traps.
• Interactive "Highlight on page" button that visually outlines offending DOM elements in real-time.

5. Defensive Security Audit
• HTTPS protocol verification and mixed content detection.
• Deep HTTP security response header inspection (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options).
• Tabnabbing protection (target="_blank" without rel="noopener").
• Third-party dependency analysis categorizing tracking scripts, CDNs, and vendor origins.

6. Technology Stack Detection
• Automatic detection of 20+ frameworks, libraries, CMSs, analytics tools, and hosting providers.
• Detects: React, Next.js, Vue, Nuxt, Angular, Svelte, Tailwind CSS, Bootstrap, Material UI, WordPress, Shopify, Drupal, Google Analytics, GTM, Meta Pixel, Cloudflare, Vercel, Netlify, and more.
• Expandable evidence chips showing exact script patterns, meta tags, and global variables found.

7. Network Resource Inspector
• Sortable and filterable table of all loaded network assets with instant URL and domain search.
• Size, duration, initiator type, and third-party flags.

8. Snapshots, Comparison & Multi-Format Exports
• Save audit snapshots locally to chrome.storage.local grouped by domain.
• Before vs After comparison engine displaying exact score deltas, newly introduced regressions, and resolved issues.
• Export self-contained, print-friendly HTML reports with zero external dependencies (instant Print-to-PDF), plus JSON and CSV.

🔒 PRIVACY & SECURITY FIRST
• 100% In-Browser Local Execution: Zero tracking scripts, zero external analytics, zero cloud uploads.
• Minimal Permissions: Requests activeTab, scripting, sidePanel, and storage only.
• Strict CSP: Enforces Manifest V3 script-src 'self' and object-src 'self'. No remote code execution.
```

---

## 2. Screenshot Checklist (1280x800 or 640x400)

| Screenshot # | Name / Feature | Description & Annotation Callouts |
| :---: | :--- | :--- |
| **01** | **Unified Dashboard & Overall Score** | Side panel open next to an inspected site showing the overall score ring (e.g. 94/100 Grade A), category pills, severity badges, and top recommendations. Callout: *"Instant 360° Website Health Check"*. |
| **02** | **Performance & Core Web Vitals** | Performance tab showing LCP, FCP, TTFB, and CLS metric cards alongside the resource breakdown donut and transfer size metrics. Callout: *"Real-time Core Web Vitals & Resource Diagnostics"*. |
| **03** | **Technical SEO & Previews** | SEO tab displaying the Google search snippet preview, Open Graph social card preview, and heading hierarchy tree. Callout: *"Search Snippet & Heading Hierarchy Previews"*. |
| **04** | **Accessibility & On-Page Highlighting** | Accessibility tab showing WCAG findings with the "Highlight on page" action active, showing an element outlined on the inspected webpage. Callout: *"Find & Outline Accessibility Issues Instantly"*. |
| **05** | **Technology Detection & Network** | Technology tab displaying detected React, Next.js, Tailwind CSS, and Cloudflare badges with expandable evidence tags. Callout: *"Frameworks, CMS & Third-Party Library Fingerprinting"*. |
| **06** | **Report Comparison & Export** | Reports tab displaying the side-by-side Before/After comparison with score deltas and resolved/newly introduced issue badges. Callout: *"Track Regressions & Export Self-Contained HTML Reports"*. |

---

## 3. Manual QA Checklist

Before releasing each version, execute the following manual test suite across 5 archetypal site architectures and edge cases:

### Test Case 1: Static Website (e.g. `example.com` or static HTML portfolio)
- [ ] Overview loads DOM counts, doctype (`HTML5`), viewport meta, and language.
- [ ] SEO analyzer evaluates title, meta description, and headings.
- [ ] Accessibility analyzer flags any images missing alt attributes or form inputs missing labels.
- [ ] Security analyzer confirms HTTPS and evaluates headers.
- [ ] Export generates valid HTML, JSON, and CSV.

### Test Case 2: React Client-Side SPA (e.g. Vite React app or create-react-app)
- [ ] Technology analyzer detects **React** via DOM root (`[data-reactroot]`) or global `window.React`.
- [ ] Performance analyzer captures navigation timings and script transfer sizes.
- [ ] Network inspector lists all chunked JavaScript bundles with correct MIME groupings.
- [ ] "Highlight on page" outlines interactive button components correctly.

### Test Case 3: Next.js Server-Rendered / Static Site (e.g. `nextjs.org` or Vercel site)
- [ ] Technology analyzer detects both **Next.js** (`__NEXT_DATA__`, `#__next`) and **React**.
- [ ] SEO analyzer validates Open Graph and Twitter Card tags.
- [ ] Performance analyzer correctly records LCP element tag (e.g., `h1` or `img`).
- [ ] Saving report succeeds and increments storage size indicator in Reports view.

### Test Case 4: WordPress CMS Website (e.g. `wordpress.org` or any WP blog)
- [ ] Technology analyzer detects **WordPress** via `meta[name="generator"]`, `/wp-content/`, or `/wp-includes/`.
- [ ] Third-party resources list external plugins, analytics, or Google Fonts.
- [ ] Security analyzer checks for `rel="noopener"` on external links and notes inline scripts.
- [ ] Compare view correctly calculates deltas against an earlier audit snapshot.

### Test Case 5: Complex Single Page Application with Dynamic Routing
- [ ] Re-analyzing after client-side route navigation re-inspects the new active DOM state without full page refresh.
- [ ] Cumulative Layout Shift (CLS) observer reports valid numbers.
- [ ] Auto-save setting (if enabled) stores a new snapshot automatically upon audit completion.

### Test Case 6: Edge Cases & Error Boundaries
- [ ] **Restricted URLs:** Navigate to `chrome://extensions` or `https://chromewebstore.google.com/`. Verify friendly banner: *"This page cannot be analyzed for security reasons"*.
- [ ] **Local Files:** Open a local PDF file. Verify friendly PDF restriction message.
- [ ] **High-Density Stress Test (10k+ DOM nodes):** Open a heavy documentation site or DOM-heavy app. Verify collector completes without lag, headings capped at 200, resources capped at 500, no memory crashes.
- [ ] **Data Management:** In Settings, test "Clear All Data" and verify storage indicator drops to `0 B`.
