# Release Notes - WebsiteLab 1.0.0

Release Date: October 2026  
Manifest Version: MV3  
Minimum Chrome Version: 114  
License: MIT  

## Overview

WebsiteLab 1.0.0 is the initial production release of the WebsiteLab Chrome extension. All diagnostics are performed locally on the client without remote analytics or telemetry tracking.

## Features

### Scoring and Recommendations
- 0 to 100 overall score combining 5 categories at 20% weight each: Performance, SEO, Accessibility, Security, and Best Practices.
- Auditable score ledger tracing scores to specific rules, observed evidence, and recommendations.
- Recommendations list aggregated across categories and ordered by severity (critical, high, medium, low).

### Diagnostic Modules
- Overview: Reports DOM element count, scripts, stylesheets, images, links, forms, HTML lang attribute, viewport meta, and doctype.
- Performance: Measures Time to First Byte (TTFB), First Contentful Paint (FCP), Largest Contentful Paint (LCP), and Cumulative Layout Shift (CLS) via Performance APIs. Summarizes network resource transfer sizes by category.
- SEO: Analyzes title length, meta description length, heading hierarchy (H1–H6) for missing or skipped levels, canonical URL, robots meta directives, OpenGraph and Twitter card metadata, image alt tags, generic anchor text, and empty hrefs.
- Accessibility: Evaluates a subset of WCAG checks, including image alt attributes, form control labels, accessible button names, heading structure, landmark elements, duplicate IDs, and positive tabindices. Includes an element highlight tool.
- Security: Checks HTTPS usage, mixed content, client-accessible cookie counts, target="_blank" links for rel="noopener", third-party resource detection, and optional security response headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options).
- Technology Detection: Identifies 18 technologies across frontend frameworks (React, Vue, Angular, Svelte), web frameworks (Next.js, Nuxt), CSS libraries (Tailwind, Bootstrap, MUI), CMS platforms (WordPress, Shopify, Drupal), analytics (Google Analytics, GTM, Meta Pixel), and hosting infrastructure (Cloudflare, Vercel, Netlify).
- Network Inspector: Sortable and filterable table of loaded network resources with transfer sizes, durations, initiator types, and third-party flags.

### Reports and Exports
- Local report storage in chrome.storage.local with configurable retention limits and auto-save options.
- Before-and-after report comparison showing score deltas and resolved versus introduced issues.
- Export options for JSON, CSV, and self-contained HTML (with print-to-PDF support).

## Hardening and Reliability
- Collection limits on large pages (headings capped at 200, links capped at 3,000, images capped at 2,000, resources capped at 500) to prevent main-thread freezing.
- Handling for restricted browser pages (chrome://, Chrome Web Store, PDF viewer) with status messages instead of execution errors.
- Monotonic request sequencing to prevent slower in-flight responses from overwriting newer audit results.
- Active tab and navigation listeners to synchronize panel contents when switching tabs or navigating client-side routes.
- Storage quota handling that prunes older reports if quota limits are reached.
- Keyboard navigation support, visible focus rings, ARIA roles, and high-contrast color tokens.

## Privacy and Permissions
- Strict extension Content Security Policy: `script-src 'self'; object-src 'self';`.
- No outbound network requests for analysis except for an optional request to the inspected page itself to inspect HTTP headers when granted optional host permission.
- Storage restricted to chrome.storage.local without cloud synchronization.

## Verification
- Test suite: 159 passing tests across 10 test files.
- Linter: 0 warnings and 0 errors via ESLint.
- Build: Classic IIFE collector scripts verified free of ES module import and export statements.
