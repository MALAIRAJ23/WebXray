import { describe, it, expect } from 'vitest';
import { matchTechnologies } from '../src/services/detection/matcher.js';
import { analyzeTechnology } from '../src/analyzers/technology/index.js';
import { getAllGlobalVariableNames, getAllDomSelectors } from '../src/services/detection/rules.js';

describe('Technology Detection Rules & Matcher', () => {
  it('exports valid global variable names and DOM selectors lists', () => {
    const globals = getAllGlobalVariableNames();
    const selectors = getAllDomSelectors();

    expect(Array.isArray(globals)).toBe(true);
    expect(globals.length).toBeGreaterThan(10);
    expect(globals).toContain('React');
    expect(globals).toContain('__NEXT_DATA__');
    expect(globals).toContain('Vue');
    expect(globals).toContain('Shopify');

    expect(Array.isArray(selectors)).toBe(true);
    expect(selectors.length).toBeGreaterThan(10);
    expect(selectors).toContain('[data-reactroot]');
    expect(selectors).toContain('#__next');
    expect(selectors).toContain('[ng-version]');
  });

  it('never reports a technology without at least one piece of observable evidence', () => {
    const emptyResult = matchTechnologies({});
    expect(emptyResult.detections).toEqual([]);
    expect(emptyResult.totalCount).toBe(0);
    expect(emptyResult.categories).toEqual({});

    const emptyAnalysis = analyzeTechnology({});
    expect(emptyAnalysis.totalCount).toBe(0);
    expect(emptyAnalysis.detections).toEqual([]);
    expect(emptyAnalysis.findings.length).toBeGreaterThan(0);
    expect(emptyAnalysis.findings[0].id).toBe('tech-none-detected');
  });

  it('detects React and Next.js with high confidence from window globals, DOM, and headers', () => {
    const collected = {
      globals: {
        React: true,
        __NEXT_DATA__: true,
      },
      matchedSelectors: {
        '[data-reactroot]': true,
        '#__next': true,
      },
      scripts: [
        'https://example.com/_next/static/chunks/main.js',
        'https://example.com/_next/static/chunks/react.js',
      ],
      headers: {
        'x-powered-by': 'Next.js',
      },
    };

    const result = matchTechnologies(collected);

    expect(result.totalCount).toBeGreaterThanOrEqual(2);

    const reactDet = result.detections.find((d) => d.id === 'react');
    expect(reactDet).toBeDefined();
    expect(reactDet.name).toBe('React');
    expect(reactDet.category).toBe('Frontend Framework');
    expect(reactDet.confidence).toBe('high');
    expect(reactDet.evidence.length).toBeGreaterThanOrEqual(2);
    expect(reactDet.evidence.some((e) => e.type === 'global')).toBe(true);

    const nextDet = result.detections.find((d) => d.id === 'nextjs');
    expect(nextDet).toBeDefined();
    expect(nextDet.name).toBe('Next.js');
    expect(nextDet.category).toBe('Web Framework');
    expect(nextDet.confidence).toBe('high');
    expect(nextDet.evidence.some((e) => e.type === 'header')).toBe(true);
  });

  it('detects Vue.js and Nuxt from globals and DOM attributes', () => {
    const collected = {
      globals: {
        Vue: true,
        __NUXT__: true,
      },
      matchedSelectors: {
        '[data-v-app]': true,
        '#__nuxt': true,
      },
      scripts: ['https://example.com/_nuxt/entry.js'],
      headers: {
        'x-powered-by': 'Nuxt',
      },
    };

    const result = matchTechnologies(collected);

    const vueDet = result.detections.find((d) => d.id === 'vue');
    expect(vueDet).toBeDefined();
    expect(vueDet.name).toBe('Vue.js');
    expect(vueDet.confidence).toBe('high');

    const nuxtDet = result.detections.find((d) => d.id === 'nuxt');
    expect(nuxtDet).toBeDefined();
    expect(nuxtDet.name).toBe('Nuxt');
    expect(nuxtDet.confidence).toBe('high');
  });

  it('detects Angular and Svelte signatures', () => {
    const collected = {
      globals: {
        ng: true,
        __svelte: true,
      },
      matchedSelectors: {
        '[ng-version]': true,
        '[data-svelte-h]': true,
      },
    };

    const result = matchTechnologies(collected);

    const angularDet = result.detections.find((d) => d.id === 'angular');
    expect(angularDet).toBeDefined();
    expect(angularDet.name).toBe('Angular');

    const svelteDet = result.detections.find((d) => d.id === 'svelte');
    expect(svelteDet).toBeDefined();
    expect(svelteDet.name).toBe('Svelte');
  });

  it('detects CSS frameworks: Tailwind CSS, Bootstrap, and Material UI', () => {
    const collected = {
      globals: {
        bootstrap: true,
      },
      matchedSelectors: {
        '.container-fluid': true,
        '[class*="MuiButton-"]': true,
      },
      classNames: [
        'flex items-center justify-between text-xs font-mono bg-dark-950 text-slate-200',
        'MuiButton-root MuiButton-contained',
      ],
      stylesheets: [
        'https://cdn.example.com/bootstrap.min.css',
      ],
    };

    const result = matchTechnologies(collected);

    const tailwindDet = result.detections.find((d) => d.id === 'tailwind');
    expect(tailwindDet).toBeDefined();
    expect(tailwindDet.category).toBe('CSS Framework');

    const bootstrapDet = result.detections.find((d) => d.id === 'bootstrap');
    expect(bootstrapDet).toBeDefined();
    expect(bootstrapDet.confidence).toBe('high');

    const muiDet = result.detections.find((d) => d.id === 'mui');
    expect(muiDet).toBeDefined();
    expect(muiDet.name).toBe('Material UI');
  });

  it('detects CMS platforms: WordPress, Shopify, and Drupal', () => {
    const collectedWp = {
      metaGenerators: ['WordPress 6.4.3'],
      globals: { wp: true },
      scripts: ['https://example.com/wp-content/themes/theme/main.js'],
      matchedSelectors: { 'link[rel="https://api.w.org/"]': true },
    };
    const resWp = matchTechnologies(collectedWp);
    expect(resWp.detections.some((d) => d.id === 'wordpress' && d.confidence === 'high')).toBe(true);

    const collectedShopify = {
      globals: { Shopify: true },
      matchedSelectors: { 'link[href*="cdn.shopify.com"]': true },
      scripts: ['https://cdn.shopify.com/s/files/script.js'],
    };
    const resShopify = matchTechnologies(collectedShopify);
    expect(resShopify.detections.some((d) => d.id === 'shopify' && d.confidence === 'high')).toBe(true);

    const collectedDrupal = {
      metaGenerators: ['Drupal 10 (https://www.drupal.org)'],
      headers: { 'x-generator': 'Drupal 10' },
    };
    const resDrupal = matchTechnologies(collectedDrupal);
    expect(resDrupal.detections.some((d) => d.id === 'drupal' && d.confidence === 'high')).toBe(true);
  });

  it('detects analytics tools: Google Analytics, Google Tag Manager, and Meta Pixel', () => {
    const collected = {
      globals: {
        gtag: true,
        google_tag_manager: true,
        fbq: true,
      },
      scripts: [
        'https://www.googletagmanager.com/gtag/js?id=G-12345',
        'https://www.googletagmanager.com/gtm.js?id=GTM-67890',
        'https://connect.facebook.net/en_US/fbevents.js',
      ],
    };

    const result = matchTechnologies(collected);

    expect(result.detections.some((d) => d.id === 'google-analytics')).toBe(true);
    expect(result.detections.some((d) => d.id === 'gtm')).toBe(true);
    expect(result.detections.some((d) => d.id === 'meta-pixel')).toBe(true);
  });

  it('detects CDN and hosting indicators: Cloudflare, Vercel, and Netlify', () => {
    const collected = {
      headers: {
        server: 'cloudflare',
        'cf-ray': '8a123bc-IAD',
        'x-vercel-id': 'iad1::iad1::v12345',
        'x-nf-request-id': '01HQ5678',
      },
      scripts: [
        'https://cdnjs.cloudflare.com/ajax/libs/axios/1.6.0/axios.min.js',
      ],
    };

    const result = matchTechnologies(collected);

    expect(result.detections.some((d) => d.id === 'cloudflare' && d.category === 'CDN & Infrastructure')).toBe(true);
    expect(result.detections.some((d) => d.id === 'vercel' && d.category === 'Hosting & Cloud')).toBe(true);
    expect(result.detections.some((d) => d.id === 'netlify' && d.category === 'Hosting & Cloud')).toBe(true);
  });

  it('groups detections into categories correctly', () => {
    const collected = {
      globals: { React: true, gtag: true },
      headers: { server: 'cloudflare' },
    };

    const result = matchTechnologies(collected);

    expect(result.categories).toHaveProperty('Frontend Framework');
    expect(result.categories).toHaveProperty('Analytics & Tracking');
    expect(result.categories).toHaveProperty('CDN & Infrastructure');
    expect(result.categories['Frontend Framework'][0].name).toBe('React');
  });

  it('adheres to AGENT_RULES.md (Rule 4) pure analyzer contract', () => {
    const collected = {
      globals: { React: true },
      matchedSelectors: { '[data-reactroot]': true },
    };

    const analysis = analyzeTechnology(collected);

    expect(analysis).toHaveProperty('score');
    expect(analysis).toHaveProperty('findings');
    expect(analysis).toHaveProperty('detections');
    expect(analysis).toHaveProperty('categories');
    expect(analysis).toHaveProperty('totalCount');

    expect(Array.isArray(analysis.findings)).toBe(true);
    analysis.findings.forEach((f) => {
      expect(f).toHaveProperty('id');
      expect(f).toHaveProperty('title');
      expect(f).toHaveProperty('severity');
      expect(f).toHaveProperty('evidence');
      expect(f).toHaveProperty('whyItMatters');
      expect(f).toHaveProperty('recommendation');
    });
  });
});
