/**
 * WebXray - Technology Detection Rules
 * Data-driven definitions for detecting frontend, CSS, CMS, analytics, CDN, and hosting stacks.
 * Follows Rule 2: 100% local, observable evidence only.
 */

export const TECHNOLOGY_RULES = [
  // 1. Frontend Frameworks
  {
    id: 'react',
    name: 'React',
    category: 'Frontend Framework',
    description: 'A declarative, component-based JavaScript library for building user interfaces.',
    rules: {
      globals: ['React', '__REACT_DEVTOOLS_GLOBAL_HOOK__', 'hasReactFiber'],
      domSelectors: ['[data-reactroot]', '[data-reactid]'],
      scriptPatterns: [
        /react(-dom)?(\.production|\.development)?(\.min)?\.js/i,
        /\/_next\/static\//i,
        /\/static\/js\/.*react/i,
      ],
    },
  },
  {
    id: 'vue',
    name: 'Vue.js',
    category: 'Frontend Framework',
    description: 'A progressive JavaScript framework for building user interfaces on the web.',
    rules: {
      globals: ['Vue', '__VUE__', '__VUE_DEVTOOLS_GLOBAL_HOOK__'],
      domSelectors: ['[data-v-app]', '[v-cloak]', '[data-v-]'],
      scriptPatterns: [/vue(\.runtime)?(\.global)?(\.prod|\.esm)?(\.min)?\.js/i],
    },
  },
  {
    id: 'angular',
    name: 'Angular',
    category: 'Frontend Framework',
    description: 'A TypeScript-based component framework for building scalable web applications.',
    rules: {
      globals: ['ng', 'angular', 'getAllAngularRootElements'],
      domSelectors: ['[ng-version]', '[ng-app]', '[ng-controller]', 'app-root'],
      scriptPatterns: [/angular(\.min)?\.js/i, /zone(\.min)?\.js/i],
    },
  },
  {
    id: 'svelte',
    name: 'Svelte',
    category: 'Frontend Framework',
    description: 'A compiler that converts components into lightweight, framework-free imperative code.',
    rules: {
      globals: ['__svelte'],
      domSelectors: ['[class*="svelte-"]', '[data-svelte-h]'],
      scriptPatterns: [/svelte/i, /\/_app\/immutable\//i],
    },
  },

  // 2. Web Frameworks (Full-Stack / SSR)
  {
    id: 'nextjs',
    name: 'Next.js',
    category: 'Web Framework',
    description: 'A React framework providing hybrid static and server-side rendering with routing.',
    rules: {
      globals: ['__NEXT_DATA__', 'next'],
      domSelectors: ['#__next', 'script#__NEXT_DATA__', 'link[href*="/_next/"]'],
      scriptPatterns: [/\/_next\/static\//i],
      headers: [
        { header: 'x-powered-by', pattern: /next\.js/i },
      ],
    },
  },
  {
    id: 'nuxt',
    name: 'Nuxt',
    category: 'Web Framework',
    description: 'An open-source framework based on Vue.js for universal, server-rendered applications.',
    rules: {
      globals: ['__NUXT__', '$nuxt'],
      domSelectors: ['#__nuxt', '#nuxt-loading', 'script#__NUXT_DATA__'],
      scriptPatterns: [/\/_nuxt\//i],
      headers: [
        { header: 'x-powered-by', pattern: /nuxt/i },
      ],
    },
  },

  // 3. CSS Frameworks & Component Libraries
  {
    id: 'tailwind',
    name: 'Tailwind CSS',
    category: 'CSS Framework',
    description: 'A utility-first CSS framework packed with composable atomic classes.',
    rules: {
      domSelectors: [
        '[class*="text-slate-"]',
        '[class*="bg-dark-"]',
        '[class*="text-zinc-"]',
        '[class*="bg-neutral-"]',
      ],
      cssPatterns: [
        /\b(flex|grid)\b.*\b(items-center|justify-between|gap-[0-9]+)\b/,
        /\b(bg|text|border)-(slate|gray|zinc|neutral|red|amber|emerald|cyan|blue|indigo)-[0-9]{2,3}\b/,
      ],
      stylesheetPatterns: [/tailwind/i],
    },
  },
  {
    id: 'bootstrap',
    name: 'Bootstrap',
    category: 'CSS Framework',
    description: 'An open source toolkit for developing responsive layouts and mobile-first sites.',
    rules: {
      globals: ['bootstrap'],
      domSelectors: [
        '.container-fluid',
        '.navbar-toggler',
        '.modal-backdrop',
        '[class*="col-md-"]',
        '[class*="col-lg-"]',
        '.btn-primary',
      ],
      scriptPatterns: [/bootstrap(\.bundle)?(\.min)?\.js/i],
      stylesheetPatterns: [/bootstrap(\.min)?\.css/i],
    },
  },
  {
    id: 'mui',
    name: 'Material UI',
    category: 'CSS Framework',
    description: 'A comprehensive React UI library implementing Google Material Design guidelines.',
    rules: {
      domSelectors: [
        '[class*="MuiButton-"]',
        '[class*="MuiBox-"]',
        '[class*="MuiTypography-"]',
        '[class*="MuiContainer-"]',
        'style[data-meta="MuiButton"]',
      ],
      cssPatterns: [/\bMui[A-Z][a-zA-Z0-9]+-[a-zA-Z0-9]+\b/],
    },
  },

  // 4. Content Management Systems (CMS)
  {
    id: 'wordpress',
    name: 'WordPress',
    category: 'CMS',
    description: 'The world\'s most popular open-source content management system and blog engine.',
    rules: {
      metaGenerators: [/wordpress/i],
      globals: ['wp', 'wpApiSettings'],
      domSelectors: [
        'link[rel="https://api.w.org/"]',
        'link[href*="/wp-content/"]',
        'link[href*="/wp-includes/"]',
        '[class*="wp-block-"]',
      ],
      scriptPatterns: [/\/wp-(content|includes)\//i],
    },
  },
  {
    id: 'shopify',
    name: 'Shopify',
    category: 'CMS',
    description: 'A dedicated multi-channel cloud commerce platform designed for online retail stores.',
    rules: {
      metaGenerators: [/shopify/i],
      globals: ['Shopify', 'ShopifyBuy', 'BOOMR'],
      domSelectors: [
        'link[href*="cdn.shopify.com"]',
        'script[src*="cdn.shopify.com"]',
      ],
      scriptPatterns: [/cdn\.shopify\.com/i],
    },
  },
  {
    id: 'drupal',
    name: 'Drupal',
    category: 'CMS',
    description: 'An enterprise modular open-source digital experience and web publishing platform.',
    rules: {
      metaGenerators: [/drupal/i],
      globals: ['Drupal', 'drupalSettings'],
      domSelectors: [
        'script[src*="/sites/default/files/"]',
        'script[src*="/core/assets/"]',
      ],
      headers: [
        { header: 'x-generator', pattern: /drupal/i },
        { header: 'x-drupal-cache', pattern: /.+/i },
      ],
    },
  },

  // 5. Analytics & Tag Managers
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    category: 'Analytics & Tracking',
    description: 'Web analytics platform that tracks and reports website traffic and conversion funnels.',
    rules: {
      globals: ['ga', 'GoogleAnalyticsObject', 'gtag'],
      scriptPatterns: [
        /google-analytics\.com\/(analytics|ga)\.js/i,
        /googletagmanager\.com\/gtag\/js/i,
      ],
      domSelectors: [
        'script[src*="google-analytics.com"]',
        'script[src*="googletagmanager.com/gtag"]',
      ],
    },
  },
  {
    id: 'gtm',
    name: 'Google Tag Manager',
    category: 'Analytics & Tracking',
    description: 'Tag management system that deploys measurement codes and related scripts.',
    rules: {
      globals: ['google_tag_manager', 'dataLayer'],
      scriptPatterns: [/googletagmanager\.com\/gtm\.js/i],
      domSelectors: [
        'script[src*="googletagmanager.com/gtm.js"]',
        'iframe[src*="googletagmanager.com/ns.html"]',
      ],
    },
  },
  {
    id: 'meta-pixel',
    name: 'Meta Pixel',
    category: 'Analytics & Tracking',
    description: 'Conversion tracking pixel for measuring ad effectiveness and custom audience retargeting.',
    rules: {
      globals: ['fbq', '_fbq'],
      scriptPatterns: [/connect\.facebook\.net\/.*\/fbevents\.js/i],
      domSelectors: [
        'script[src*="connect.facebook.net"]',
        'img[src*="facebook.com/tr"]',
      ],
    },
  },

  // 6. CDN & Network Infrastructure
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    category: 'CDN & Infrastructure',
    description: 'Global distributed network providing reverse proxy, edge caching, and DDoS defense.',
    rules: {
      headers: [
        { header: 'server', pattern: /cloudflare/i },
        { header: 'cf-ray', pattern: /.+/i },
        { header: 'cf-cache-status', pattern: /.+/i },
      ],
      scriptPatterns: [
        /cdnjs\.cloudflare\.com/i,
        /static\.cloudflareinsights\.com/i,
      ],
      domSelectors: [
        'script[src*="cloudflareinsights.com"]',
        'script[src*="cdnjs.cloudflare.com"]',
      ],
    },
  },

  // 7. Hosting & Cloud Platforms
  {
    id: 'vercel',
    name: 'Vercel',
    category: 'Hosting & Cloud',
    description: 'Frontend cloud platform offering global edge networks and automated Git deployments.',
    rules: {
      headers: [
        { header: 'x-vercel-id', pattern: /.+/i },
        { header: 'server', pattern: /vercel/i },
      ],
      scriptPatterns: [
        /\/_vercel\/insights/i,
        /\/_vercel\/speed-insights/i,
      ],
      domSelectors: ['script[src*="/_vercel/"]'],
    },
  },
  {
    id: 'netlify',
    name: 'Netlify',
    category: 'Hosting & Cloud',
    description: 'Cloud hosting platform with built-in CI/CD pipelines and serverless edge functions.',
    rules: {
      headers: [
        { header: 'x-nf-request-id', pattern: /.+/i },
        { header: 'server', pattern: /netlify/i },
      ],
      scriptPatterns: [/\.netlify\/functions\//i],
    },
  },
];

/**
 * Returns a unique array of global variable names to check in the MAIN execution world
 */
export function getAllGlobalVariableNames() {
  const set = new Set();
  for (const tech of TECHNOLOGY_RULES) {
    if (tech.rules.globals) {
      for (const g of tech.rules.globals) {
        set.add(g);
      }
    }
  }
  return Array.from(set);
}

/**
 * Returns a unique array of DOM selectors to check in the content collector
 */
export function getAllDomSelectors() {
  const set = new Set();
  for (const tech of TECHNOLOGY_RULES) {
    if (tech.rules.domSelectors) {
      for (const sel of tech.rules.domSelectors) {
        set.add(sel);
      }
    }
  }
  return Array.from(set);
}
