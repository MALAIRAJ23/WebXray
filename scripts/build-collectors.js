import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const collectors = [
  'overviewCollector',
  'performanceCollector',
  'seoCollector',
  'a11yCollector',
  'securityCollector',
  'technologyCollector',
  'contentScript',
];

const returnCollectorResultPlugin = {
  name: 'return-collector-result',
  renderChunk(code) {
    if (code.includes('return (() => {') || code.includes('return(()=>{')) {
      return code;
    }
    const idx = code.indexOf('(() => {');
    if (idx !== -1) {
      return code.slice(0, idx) + 'return ' + code.slice(idx);
    }
    const idx2 = code.indexOf('(()=>{');
    if (idx2 !== -1) {
      return code.slice(0, idx2) + 'return ' + code.slice(idx2);
    }
    return code;
  },
};

async function buildCollectors() {
  console.log('[build-collectors] Bundling self-contained classic collector scripts...');

  for (const name of collectors) {
    console.log(`[build-collectors] Building ${name}.js...`);
    await build({
      configFile: false,
      publicDir: false,
      plugins: [returnCollectorResultPlugin],
      build: {
        outDir: resolve(__dirname, '../dist/src/content'),
        emptyOutDir: false,
        lib: {
          entry: resolve(__dirname, `../src/content/${name}.js`),
          name,
          formats: ['iife'],
          fileName: () => `${name}.js`,
        },
        rollupOptions: {
          output: {
            format: 'iife',
            inlineDynamicImports: true,
          },
        },
      },
    });
  }

  console.log('[build-collectors] All collectors built successfully.');
}

buildCollectors().catch((err) => {
  console.error('[build-collectors] Build failed:', err);
  process.exit(1);
});
