# WebsiteLab Scoring Engine Specification & Rule Catalog

> **Version:** 1.0  
> **Architecture:** Fully transparent, deterministic, auditable scoring trace:  
> `Score -> Rules -> Evidence -> Recommendation`

---

## 1. Scoring Formula & Model

Every category score and the overall health score are computed deterministically from evaluated rules:

### Category Score Formula
```text
Category Score = Math.round(
  ( sum(pointsEarned) / sum(pointsPossible of applicable rules) ) * 100
)
```

- **Applicability Guarantee:** Any rule marked `not_applicable` or `unverified` is **strictly excluded** from both pointsEarned and pointsPossible. They are listed transparently in the ledger but never penalize or artificially inflate the score.
- **Partial Credit:** Where appropriate (e.g., partial image alt text compliance, partial button accessibility), points are awarded proportionally:
  ```text
  pointsEarned = Math.round((passingCount / totalEvaluated) * rule.weight)
  ```
  The exact evaluation formula and ratios are published in the audit ledger evidence.
- **Deduction Derivation:** Breakdown deductions are strictly derived from rule results (`pointsPossible - pointsEarned`), eliminating ad-hoc penalties.

### Overall Score Formula
The overall score is a weighted composite of the five diagnostic categories:

```text
Overall Score = Math.round(
  (Performance × 0.20) +
  (SEO × 0.20) +
  (Accessibility × 0.20) +
  (Security × 0.20) +
  (Best Practices × 0.20)
)
```

| Category | Category Weight | Description |
| :--- | :--- | :--- |
| **Performance** | 20% (0.20) | Core Web Vitals (LCP, CLS, TTFB), asset hygiene, and render-blocking scripts |
| **SEO** | 20% (0.20) | Metadata presence, heading hierarchy, canonicalization, robots, and open graph |
| **Accessibility** | 20% (0.20) | WCAG 2.1 AA foundation: labels, alternative text, landmarks, and keyboard hygiene |
| **Security** | 20% (0.20) | Transport security (HTTPS), mixed content, headers (CSP, HSTS), tabnabbing protection |
| **Best Practices** | 20% (0.20) | Cross-domain reliability, protocol standards, secure links, and web standards |

---

## 2. Heuristic Thresholds Disclaimer

**Thresholds marked heuristic are opinionated defaults, not Lighthouse-equivalent scores.**

While standard rules adhere to published specifications (e.g., WCAG 2.1 AA criteria, HTTP RFCs, WHATWG standards), heuristic rules represent pragmatic engineering thresholds tailored for real-world web auditing. They are calibrated to highlight actionable bottlenecks without triggering false alarms.

---

## 3. Complete Rule Catalog by Category

### Performance (Total Weight: 100 pts)

| Rule ID | Title | Weight | Threshold | Source / Ref | Severity |
| :--- | :--- | :---: | :--- | :--- | :---: |
| `perf-lcp` | Largest Contentful Paint (LCP) is within 2.5 seconds | **20** | good: ≤ 2500 ms, fair: ≤ 4000 ms | Standard (Web Vitals LCP (Google)) | `high` |
| `perf-cls` | Cumulative Layout Shift (CLS) is 0.1 or lower | **15** | good: ≤ 0.1, fair: ≤ 0.25 | Standard (Web Vitals CLS (Google)) | `high` |
| `perf-ttfb` | Time to First Byte (TTFB) is 800 ms or faster | **15** | good: ≤ 800 ms, fair: ≤ 1000 ms | Heuristic | `high` |
| `perf-images` | Image assets are compressed and under 500 KB | **15** | max: 500000 bytes | Heuristic | `critical` |
| `perf-js-count` | JavaScript request count is 15 files or fewer | **15** | max: 15 | Heuristic | `high` |
| `perf-total-weight` | Total page transfer weight is under 3 MB | **10** | max: 3000000 bytes | Heuristic | `high` |
| `perf-render-blocking` | Critical resources do not block HTML parsing | **10** | max: 0 | Heuristic | `medium` |

#### Detailed Check Definitions:

##### `perf-lcp`: Largest Contentful Paint (LCP) is within 2.5 seconds
- **Description:** Measures perceived loading speed by recording when the main content element has rendered.
- **Why It Matters:** LCP measures when the primary content element has rendered. Slow LCP causes users to perceive the site as unresponsive and increases bounce rates.
- **Recommendation:** Optimize the LCP element (hero image, heading, or banner). Preload it with <link rel="preload"> and eliminate render-blocking CSS/JS.
- **Threshold:** `good: ≤ 2500 ms, fair: ≤ 4000 ms`
- **Source:** Standard (Web Vitals LCP (Google))

##### `perf-cls`: Cumulative Layout Shift (CLS) is 0.1 or lower
- **Description:** Measures visual stability by quantifying unexpected layout shifts during page loading.
- **Why It Matters:** Unexpected layout movements cause jarring visual jumps, leading to frustrating misclicks and disorientation.
- **Recommendation:** Set explicit width and height dimensions on images, videos, and iframe containers, and reserve space for dynamic ads or banners.
- **Threshold:** `good: ≤ 0.1, fair: ≤ 0.25`
- **Source:** Standard (Web Vitals CLS (Google))

##### `perf-ttfb`: Time to First Byte (TTFB) is 800 ms or faster
- **Description:** Measures server responsiveness before the browser receives the first byte of HTML.
- **Why It Matters:** Slow TTFB delays every subsequent resource request, bottlenecking overall page load.
- **Recommendation:** Implement CDN edge caching, optimize server-side database queries, and enable HTTP/2 or HTTP/3.
- **Threshold:** `good: ≤ 800 ms, fair: ≤ 1000 ms`
- **Source:** Heuristic

##### `perf-images`: Image assets are compressed and under 500 KB
- **Description:** Audits image payloads to identify oversized files that deplete network bandwidth.
- **Why It Matters:** Huge image payloads severely deplete mobile data, block bandwidth, and cause severe LCP delays.
- **Recommendation:** Convert images to modern formats (WebP/AVIF), compress quality to 80%, and implement responsive srcset widths.
- **Threshold:** `max: 500000 bytes`
- **Source:** Heuristic

##### `perf-js-count`: JavaScript request count is 15 files or fewer
- **Description:** Monitors the number of individual JavaScript requests to prevent network queue bottlenecks.
- **Why It Matters:** Too many scripts create excessive HTTP handshakes, flood the browser network queue, and increase main thread script evaluation time.
- **Recommendation:** Bundle script modules with Vite or Webpack, implement code splitting, and remove redundant third-party libraries.
- **Threshold:** `max: 15`
- **Source:** Heuristic

##### `perf-total-weight`: Total page transfer weight is under 3 MB
- **Description:** Checks aggregate network transfer size across all requested page assets.
- **Why It Matters:** Transferring over 3 MB places a heavy tax on mobile networks, data plans, and device battery life.
- **Recommendation:** Audit third-party scripts, compress images, and enable HTTP gzip or brotli compression across all static assets.
- **Threshold:** `max: 3000000 bytes`
- **Source:** Heuristic

##### `perf-render-blocking`: Critical resources do not block HTML parsing
- **Description:** Identifies synchronous CSS and JavaScript resources in <head> that stall first paint.
- **Why It Matters:** Render-blocking CSS and JavaScript stall First Contentful Paint while downloading and evaluating.
- **Recommendation:** Add defer or async attributes to scripts, and inline critical above-the-fold CSS styles.
- **Threshold:** `max: 0`
- **Source:** Heuristic

---

### Search Engine Optimization (SEO) (Total Weight: 100 pts)

| Rule ID | Title | Weight | Threshold | Source / Ref | Severity |
| :--- | :--- | :---: | :--- | :--- | :---: |
| `seo-title-length` | Page title is between 30 and 60 characters | **20** | 30 – 60 | Heuristic | `critical` |
| `seo-meta-description` | Meta description is between 70 and 160 characters | **15** | 70 – 160 | Heuristic | `high` |
| `seo-h1` | Document contains exactly one H1 heading | **15** | target: 1 | Heuristic | `high` |
| `seo-heading-hierarchy` | Headings follow a logical sequential order without skips | **10** | {"maxSkips":0} | Heuristic | `medium` |
| `seo-canonical` | Authoritative canonical URL is declared | **10** | — | Standard (RFC 6596 (The Canonical Link Relation)) | `medium` |
| `seo-robots` | Robots meta tag permits public indexing | **10** | — | Standard (Robots Exclusion Protocol / RFC 9309) | `high` |
| `seo-social-metadata` | Open Graph and Twitter social card tags are defined | **8** | — | Standard (Open Graph Protocol Specification) | `medium` |
| `seo-image-alt` | All images declare descriptive alternative text | **4** | {"maxMissing":0} | Standard (WCAG 1.1.1 Non-text Content) | `high` |
| `seo-link-anchors` | Links use descriptive keyword anchor text | **4** | {"maxNonDescriptive":0} | Heuristic | `medium` |
| `seo-html-lang` | HTML root element declares language attribute | **4** | — | Standard (W3C Internationalization / BCP 47) | `medium` |

#### Detailed Check Definitions:

##### `seo-title-length`: Page title is between 30 and 60 characters
- **Description:** Ensures the document title is descriptive and will not be truncated in search results.
- **Why It Matters:** The page title is the single most critical on-page SEO signal. Search engines use it as the primary headline in search result pages.
- **Recommendation:** Add a descriptive <title> tag between 30 and 60 characters containing primary keywords.
- **Threshold:** `30 – 60`
- **Source:** Heuristic

##### `seo-meta-description`: Meta description is between 70 and 160 characters
- **Description:** Verifies the presence and length of the meta description snippet.
- **Why It Matters:** Without a meta description, search engines auto-generate snippet text from random page copy, often resulting in lower click-through rates (CTR).
- **Recommendation:** Add an informative meta description between 70 and 160 characters summarizing the page and including a call to action.
- **Threshold:** `70 – 160`
- **Source:** Heuristic

##### `seo-h1`: Document contains exactly one H1 heading
- **Description:** Checks for a single prominent primary heading that establishes page topic.
- **Why It Matters:** An H1 heading represents the primary subject of the page for search indexers and assistive technologies.
- **Recommendation:** Add exactly one <h1> heading near the top of the page reflecting the primary page topic.
- **Threshold:** `target: 1`
- **Source:** Heuristic

##### `seo-heading-hierarchy`: Headings follow a logical sequential order without skips
- **Description:** Checks that heading levels progress sequentially without jumping levels (e.g., H2 to H4).
- **Why It Matters:** Skipping heading levels (such as H2 directly to H4) confuses screen readers and breaks logical document structuring for search bots.
- **Recommendation:** Organize headings in strictly descending sequential order (H1 → H2 → H3).
- **Threshold:** `{"maxSkips":0}`
- **Source:** Heuristic

##### `seo-canonical`: Authoritative canonical URL is declared
- **Description:** Ensures a rel="canonical" link tag specifies the authoritative page URL.
- **Why It Matters:** Canonical URLs prevent duplicate content issues when pages are accessed via multiple URL parameters or protocols.
- **Recommendation:** Add a <link rel="canonical" href="..."> pointing to the authoritative URL of this page.
- **Source:** Standard (RFC 6596 (The Canonical Link Relation))

##### `seo-robots`: Robots meta tag permits public indexing
- **Description:** Validates that robots meta tags do not accidentally block search engines with noindex.
- **Why It Matters:** The "noindex" directive instructs search engines not to index or display this page in public search results.
- **Recommendation:** If this page is intended for organic search traffic, remove the "noindex" attribute immediately.
- **Source:** Standard (Robots Exclusion Protocol / RFC 9309)

##### `seo-social-metadata`: Open Graph and Twitter social card tags are defined
- **Description:** Checks for og:title, og:description, og:image, and twitter:card meta tags.
- **Why It Matters:** Without Open Graph and Twitter Card tags, shares on LinkedIn, Facebook, Slack, and X lack rich thumbnails and descriptions.
- **Recommendation:** Add og:title, og:description, og:image, and twitter:card meta tags.
- **Source:** Standard (Open Graph Protocol Specification)

##### `seo-image-alt`: All images declare descriptive alternative text
- **Description:** Audits image tags for alt attributes that inform search crawlers of image contents.
- **Why It Matters:** Search engines index image alt text for image search ranking, and screen readers require alt text for accessibility.
- **Recommendation:** Add descriptive alt text to informative images, or alt="" to purely decorative graphics.
- **Threshold:** `{"maxMissing":0}`
- **Source:** Standard (WCAG 1.1.1 Non-text Content)

##### `seo-link-anchors`: Links use descriptive keyword anchor text
- **Description:** Flags generic anchor text such as "click here" or "read more".
- **Why It Matters:** Generic link anchor text ("click here", "read more") provides poor context to search engines about the destination page.
- **Recommendation:** Replace generic text with keyword-rich descriptive anchors explaining where the link leads.
- **Threshold:** `{"maxNonDescriptive":0}`
- **Source:** Heuristic

##### `seo-html-lang`: HTML root element declares language attribute
- **Description:** Confirms <html lang="..."> attribute is present for regional and language targeting.
- **Why It Matters:** Declaring language assists search engines in geographic and language-specific search ranking and allows screen readers to use correct phonetics.
- **Recommendation:** Add a lang attribute to the <html> tag (e.g. <html lang="en">).
- **Source:** Standard (W3C Internationalization / BCP 47)

---

### Accessibility (A11y) (Total Weight: 100 pts)

| Rule ID | Title | Weight | Threshold | Source / Ref | Severity |
| :--- | :--- | :---: | :--- | :--- | :---: |
| `a11y-form-labels` | Interactive form inputs have associated accessible labels | **18** | {"maxUnlabeled":0} | Standard (WCAG 1.3.1 Info and Relationships, 4.1.2 Name, Role, Value (Level A)) | `critical` |
| `a11y-buttons-name` | Button elements have programmatic accessible names | **16** | {"maxEmpty":0} | Standard (WCAG 4.1.2 Name, Role, Value (Level A)) | `critical` |
| `a11y-images-alt` | Images provide alternative text via alt attributes | **15** | {"maxMissing":0} | Standard (WCAG 1.1.1 Non-text Content (Level A)) | `high` |
| `a11y-links-name` | Anchor links provide discernible text or accessible labels | **12** | {"maxEmpty":0} | Standard (WCAG 2.4.4 Link Purpose (In Context, Level A), 4.1.2 Name, Role, Value) | `high` |
| `a11y-aria-hidden-focusable` | Focusable interactive elements are not obscured by aria-hidden | **10** | {"maxHidden":0} | Standard (WAI-ARIA 1.2 / WCAG 4.1.2 Name, Role, Value) | `high` |
| `a11y-main-landmark` | Document includes a primary <main> content landmark | **8** | {"minCount":1} | Standard (WCAG 1.3.1 Info and Relationships, 2.4.1 Bypass Blocks (Level A)) | `medium` |
| `a11y-duplicate-ids` | HTML id attributes are strictly unique within the DOM | **7** | {"maxDuplicates":0} | Standard (WCAG 4.1.1 Parsing (Level A)) | `medium` |
| `a11y-positive-tabindex` | Avoid positive tabindex values to preserve natural tab order | **6** | {"maxPositive":0} | Standard (WCAG 2.4.3 Focus Order (Level A)) | `medium` |
| `a11y-html-lang` | HTML root element declares valid lang attribute | **4** | — | Standard (WCAG 3.1.1 Language of Page (Level A)) | `medium` |
| `a11y-heading-skips` | Heading structure preserves logical hierarchical order | **2** | {"maxSkips":0} | Heuristic | `medium` |
| `a11y-unknown-roles` | All ARIA roles conform to valid WAI-ARIA specifications | **2** | {"maxInvalid":0} | Standard (WAI-ARIA 1.2 Specification) | `medium` |

#### Detailed Check Definitions:

##### `a11y-form-labels`: Interactive form inputs have associated accessible labels
- **Description:** Ensures <input>, <select>, and <textarea> elements have a programmatic label.
- **Why It Matters:** Unlabeled form controls prevent screen reader users from identifying what information to enter, creating major accessibility barriers.
- **Recommendation:** Associate each control with a <label for="id">, wrap it within a <label>, or provide an aria-label.
- **Threshold:** `{"maxUnlabeled":0}`
- **Source:** Standard (WCAG 1.3.1 Info and Relationships, 4.1.2 Name, Role, Value (Level A))

##### `a11y-buttons-name`: Button elements have programmatic accessible names
- **Description:** Ensures all button elements provide visible text or an aria-label.
- **Why It Matters:** Assistive technologies announce empty buttons as simply "button", leaving users unable to know what action will occur.
- **Recommendation:** Add visible text, an aria-label, or an svg with <title> inside the button.
- **Threshold:** `{"maxEmpty":0}`
- **Source:** Standard (WCAG 4.1.2 Name, Role, Value (Level A))

##### `a11y-images-alt`: Images provide alternative text via alt attributes
- **Description:** Checks that <img> elements include an alt attribute describing image contents.
- **Why It Matters:** Screen readers cannot describe images without alt text, often reading raw filenames or skipping them altogether.
- **Recommendation:** Add meaningful alt attributes describing informative images, or alt="" for purely decorative graphics.
- **Threshold:** `{"maxMissing":0}`
- **Source:** Standard (WCAG 1.1.1 Non-text Content (Level A))

##### `a11y-links-name`: Anchor links provide discernible text or accessible labels
- **Description:** Ensures hyperlinks communicate their target destination or action.
- **Why It Matters:** Empty links provide no context to screen reader users browsing through a page link list.
- **Recommendation:** Include descriptive text or an aria-label on every <a> element.
- **Threshold:** `{"maxEmpty":0}`
- **Source:** Standard (WCAG 2.4.4 Link Purpose (In Context, Level A), 4.1.2 Name, Role, Value)

##### `a11y-aria-hidden-focusable`: Focusable interactive elements are not obscured by aria-hidden
- **Description:** Prevents interactive controls with keyboard focus from being hidden from screen readers.
- **Why It Matters:** Keyboard users can navigate focus to these elements, but screen readers will be completely silent, causing confusing focus traps.
- **Recommendation:** Remove aria-hidden="true" or add tabindex="-1" to remove the element from the keyboard tab sequence.
- **Threshold:** `{"maxHidden":0}`
- **Source:** Standard (WAI-ARIA 1.2 / WCAG 4.1.2 Name, Role, Value)

##### `a11y-main-landmark`: Document includes a primary <main> content landmark
- **Description:** Verifies the presence of a <main> element or role="main" landmark container.
- **Why It Matters:** The main landmark allows assistive technology users to skip repeated navigation links and jump directly to core content.
- **Recommendation:** Enclose the primary page content inside a <main> tag.
- **Threshold:** `{"minCount":1}`
- **Source:** Standard (WCAG 1.3.1 Info and Relationships, 2.4.1 Bypass Blocks (Level A))

##### `a11y-duplicate-ids`: HTML id attributes are strictly unique within the DOM
- **Description:** Flags duplicate element IDs that break label associations and fragment navigation.
- **Why It Matters:** Duplicate IDs cause assistive technologies and <label for="..."> associations to fail or behave unpredictably.
- **Recommendation:** Ensure all id attributes on the page are unique.
- **Threshold:** `{"maxDuplicates":0}`
- **Source:** Standard (WCAG 4.1.1 Parsing (Level A))

##### `a11y-positive-tabindex`: Avoid positive tabindex values to preserve natural tab order
- **Description:** Checks that elements do not specify tabindex greater than 0.
- **Why It Matters:** Positive tabindex values disrupt the natural DOM tab navigation order, confusing keyboard-only users.
- **Recommendation:** Remove positive tabindex values and rely on logical DOM source order or tabindex="0".
- **Threshold:** `{"maxPositive":0}`
- **Source:** Standard (WCAG 2.4.3 Focus Order (Level A))

##### `a11y-html-lang`: HTML root element declares valid lang attribute
- **Description:** Ensures screen readers synthesize speech with appropriate language accents.
- **Why It Matters:** Screen readers need a declared language to pronounce text with the correct phonetics and accent rules.
- **Recommendation:** Add a lang attribute to the <html> tag (e.g. <html lang="en">).
- **Source:** Standard (WCAG 3.1.1 Language of Page (Level A))

##### `a11y-heading-skips`: Heading structure preserves logical hierarchical order
- **Description:** Validates that heading levels do not jump without intervening subheadings.
- **Why It Matters:** Screen reader users rely on headings for navigation. Skipping levels causes confusion about document structure.
- **Recommendation:** Organize headings sequentially (H1 → H2 → H3).
- **Threshold:** `{"maxSkips":0}`
- **Source:** Heuristic

##### `a11y-unknown-roles`: All ARIA roles conform to valid WAI-ARIA specifications
- **Description:** Detects unrecognized or misspelled ARIA role values on DOM elements.
- **Why It Matters:** Browsers ignore invalid ARIA roles, falling back to default semantic behavior.
- **Recommendation:** Use valid WAI-ARIA role keywords.
- **Threshold:** `{"maxInvalid":0}`
- **Source:** Standard (WAI-ARIA 1.2 Specification)

---

### Security (Total Weight: 100 pts)

| Rule ID | Title | Weight | Threshold | Source / Ref | Severity |
| :--- | :--- | :---: | :--- | :--- | :---: |
| `sec-https` | Website enforces encrypted HTTPS transport connection | **25** | — | Standard (RFC 2818 (HTTP Over TLS)) | `critical` |
| `sec-mixed-content` | HTTPS page does not request insecure HTTP subresources | **15** | {"maxInsecureResources":0} | Standard (W3C Mixed Content Specification) | `high` |
| `sec-csp` | Content-Security-Policy (CSP) header is defined | **12** | — | Standard (W3C Content Security Policy Level 3) | `high` |
| `sec-hsts` | Strict-Transport-Security (HSTS) header is active | **8** | — | Standard (RFC 6797 (HTTP Strict Transport Security)) | `medium` |
| `sec-nosniff` | X-Content-Type-Options: nosniff header is enabled | **6** | — | Standard (Fetch Living Standard / MIME Sniffing Standard) | `medium` |
| `sec-frame` | Clickjacking defenses configured via frame-ancestors or X-Frame-Options | **6** | — | Standard (RFC 7034 / CSP Level 3 frame-ancestors) | `medium` |
| `sec-referrer` | Referrer-Policy header restricts cross-origin URL leaks | **4** | — | Standard (W3C Referrer Policy Specification) | `low` |
| `sec-permissions` | Permissions-Policy header restricts browser hardware APIs | **4** | — | Standard (W3C Permissions Policy Specification) | `low` |
| `sec-tabnabbing` | External target="_blank" links include rel="noopener" or rel="noreferrer" | **10** | {"maxVulnerable":0} | Standard (HTML Living Standard (Link types: noopener)) | `medium` |
| `sec-third-party` | Third-party resource dependency surface is kept lean | **10** | {"maxThirdParty":25} | Heuristic | `medium` |

#### Detailed Check Definitions:

##### `sec-https`: Website enforces encrypted HTTPS transport connection
- **Description:** Ensures data is transmitted over TLS/HTTPS rather than unencrypted HTTP.
- **Why It Matters:** Unencrypted HTTP connections allow attackers on the same network to intercept, eavesdrop on, and manipulate transmitted data.
- **Recommendation:** Enable HTTPS on the web server with a valid SSL/TLS certificate and configure automatic 301 redirects from HTTP to HTTPS.
- **Source:** Standard (RFC 2818 (HTTP Over TLS))

##### `sec-mixed-content`: HTTPS page does not request insecure HTTP subresources
- **Description:** Verifies that scripts, stylesheets, and media are fetched exclusively over HTTPS.
- **Why It Matters:** Loading unencrypted HTTP resources inside an HTTPS page weakens SSL protections and triggers browser security warnings.
- **Recommendation:** Update all subresource URLs to use https:// or protocol-relative paths.
- **Threshold:** `{"maxInsecureResources":0}`
- **Source:** Standard (W3C Mixed Content Specification)

##### `sec-csp`: Content-Security-Policy (CSP) header is defined
- **Description:** Validates that a CSP header restricts script execution and resource origins.
- **Why It Matters:** A robust CSP serves as a primary defense-in-depth barrier against Cross-Site Scripting (XSS) and code injection.
- **Recommendation:** Implement a Content-Security-Policy header specifying trusted script-src and object-src directives.
- **Source:** Standard (W3C Content Security Policy Level 3)

##### `sec-hsts`: Strict-Transport-Security (HSTS) header is active
- **Description:** Ensures modern browsers remember to exclusively connect over HTTPS.
- **Why It Matters:** Without HSTS, initial user requests can be intercepted or downgraded to insecure HTTP.
- **Recommendation:** Add Strict-Transport-Security: max-age=31536000; includeSubDomains.
- **Source:** Standard (RFC 6797 (HTTP Strict Transport Security))

##### `sec-nosniff`: X-Content-Type-Options: nosniff header is enabled
- **Description:** Prevents browsers from MIME-sniffing responses away from declared Content-Type.
- **Why It Matters:** Allows browsers to MIME-sniff responses away from the declared content-type, potentially executing malicious scripts.
- **Recommendation:** Send X-Content-Type-Options: nosniff on all HTML and API responses.
- **Source:** Standard (Fetch Living Standard / MIME Sniffing Standard)

##### `sec-frame`: Clickjacking defenses configured via frame-ancestors or X-Frame-Options
- **Description:** Ensures the page cannot be framed inside transparent malicious iframes.
- **Why It Matters:** Without frame protections, malicious websites can embed this page in a transparent iframe to steal user interactions (clickjacking).
- **Recommendation:** Send X-Frame-Options: SAMEORIGIN or set CSP frame-ancestors "self".
- **Source:** Standard (RFC 7034 / CSP Level 3 frame-ancestors)

##### `sec-referrer`: Referrer-Policy header restricts cross-origin URL leaks
- **Description:** Controls referrer data passed when navigating away from this site.
- **Why It Matters:** Full URLs including query parameters might leak to external domains upon navigation.
- **Recommendation:** Send Referrer-Policy: strict-origin-when-cross-origin.
- **Source:** Standard (W3C Referrer Policy Specification)

##### `sec-permissions`: Permissions-Policy header restricts browser hardware APIs
- **Description:** Explicitly disables access to camera, microphone, and geolocation.
- **Why It Matters:** Leaves browser hardware feature access open to default policies without explicit scoping.
- **Recommendation:** Configure Permissions-Policy to explicitly restrict camera, microphone, and geolocation.
- **Source:** Standard (W3C Permissions Policy Specification)

##### `sec-tabnabbing`: External target="_blank" links include rel="noopener" or rel="noreferrer"
- **Description:** Protects against reverse tabnabbing window.opener redirects.
- **Why It Matters:** Opening links in new tabs without noopener gives the opened page access to window.opener, enabling reverse tabnabbing phishing redirects.
- **Recommendation:** Add rel="noopener noreferrer" to all anchor tags with target="_blank".
- **Threshold:** `{"maxVulnerable":0}`
- **Source:** Standard (HTML Living Standard (Link types: noopener))

##### `sec-third-party`: Third-party resource dependency surface is kept lean
- **Description:** Monitors the number of external origins loaded on the page.
- **Why It Matters:** High dependency on third-party scripts expands the supply chain attack surface and exposes user activity to external entities.
- **Recommendation:** Audit third-party tags and analytics, self-host critical libraries, and enforce strict CSP.
- **Threshold:** `{"maxThirdParty":25}`
- **Source:** Heuristic

---

### Best Practices (Total Weight: 100 pts)

| Rule ID | Title | Weight | Threshold | Source / Ref | Severity |
| :--- | :--- | :---: | :--- | :--- | :---: |
| `bp-https` | Website enforces HTTPS transport security | **25** | — | Standard (RFC 2818 (HTTP Over TLS)) | `critical` |
| `bp-mixed-content` | No insecure HTTP subresources loaded on secure pages | **20** | {"maxInsecureResources":0} | Standard (W3C Mixed Content Specification) | `high` |
| `bp-tabnabbing` | External target="_blank" links include rel="noopener" | **15** | {"maxVulnerable":0} | Standard (HTML Living Standard (Link types: noopener)) | `medium` |
| `bp-html-lang` | HTML document declares lang attribute | **15** | — | Standard (W3C Internationalization / BCP 47) | `medium` |
| `bp-cls` | Visual layout remains stable during page load (CLS ≤ 0.1) | **15** | {"maxCls":0.1} | Standard (Web Vitals CLS (Google)) | `medium` |
| `bp-links` | Links use descriptive keyword anchor text | **10** | {"maxNonDescriptive":0} | Heuristic | `medium` |

#### Detailed Check Definitions:

##### `bp-https`: Website enforces HTTPS transport security
- **Description:** Ensures the site communicates securely over HTTPS to protect data integrity.
- **Why It Matters:** Unencrypted sites trigger browser security warnings, compromise visitor trust, and lack transport confidentiality.
- **Recommendation:** Configure an SSL/TLS certificate and enforce HTTPS redirects.
- **Source:** Standard (RFC 2818 (HTTP Over TLS))

##### `bp-mixed-content`: No insecure HTTP subresources loaded on secure pages
- **Description:** Verifies that no active or passive mixed content is fetched over plaintext HTTP.
- **Why It Matters:** Mixed content introduces vulnerabilities into otherwise encrypted connections and triggers modern browser blocking.
- **Recommendation:** Ensure all subresources (scripts, images, stylesheets) load via HTTPS.
- **Threshold:** `{"maxInsecureResources":0}`
- **Source:** Standard (W3C Mixed Content Specification)

##### `bp-tabnabbing`: External target="_blank" links include rel="noopener"
- **Description:** Guarantees that new tabs opened by links cannot control the origin window.
- **Why It Matters:** Links without noopener leave the opener window accessible to window.opener manipulation and phishing redirections.
- **Recommendation:** Add rel="noopener noreferrer" to external links opening with target="_blank".
- **Threshold:** `{"maxVulnerable":0}`
- **Source:** Standard (HTML Living Standard (Link types: noopener))

##### `bp-html-lang`: HTML document declares lang attribute
- **Description:** Validates that the root document element specifies a valid language code.
- **Why It Matters:** Screen readers and translation tools depend on the lang attribute to accurately parse and vocalize page content.
- **Recommendation:** Add a lang attribute to the <html> tag (e.g. <html lang="en">).
- **Source:** Standard (W3C Internationalization / BCP 47)

##### `bp-cls`: Visual layout remains stable during page load (CLS ≤ 0.1)
- **Description:** Checks that visual shift does not disorient visitors or cause accidental interactions.
- **Why It Matters:** Unstable visual layouts frustrate visitors by moving interactive elements unexpectedly while reading or tapping.
- **Recommendation:** Reserve aspect-ratio dimensions for media and embed elements.
- **Threshold:** `{"maxCls":0.1}`
- **Source:** Standard (Web Vitals CLS (Google))

##### `bp-links`: Links use descriptive keyword anchor text
- **Description:** Ensures links provide clear context about their destination rather than generic text.
- **Why It Matters:** Generic anchor labels like "click here" or "learn more" hurt usability and crawlability for search bots and screen readers.
- **Recommendation:** Replace generic anchor text with descriptive destinations.
- **Threshold:** `{"maxNonDescriptive":0}`
- **Source:** Heuristic

---

## 4. Report Storage & Audit Ledger Verification

1. **Storage Hygiene:** Reports persist rule outcomes (`ruleId`, `status`, `pointsEarned`, `pointsPossible`, `observed`, `expected`, and evidence truncated to at most 10 items and 200 characters). Full DOM content and sensitive attributes are **never** retained.
2. **Scoring Versioning (`scoringVersion: "1.0"`):** Whenever weights or rule thresholds are adjusted, the version identifier increments. Report comparisons between differing versions emit an explicit comparability warning:
   > *"Scoring model version mismatch (v1.0 vs v...): scores are not directly comparable."*
3. **Deterministic Output:** Given identical collector input payloads, analyzer output is pure, deterministic, and free of arbitrary timestamps or random values.
