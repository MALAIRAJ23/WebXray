import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildServiceWorker() {
  console.log('[build-service-worker] Bundling self-contained background service worker...');

  await build({
    configFile: false,
    publicDir: false,
    build: {
      outDir: resolve(__dirname, '../dist/src/background'),
      emptyOutDir: false,
      lib: {
        entry: resolve(__dirname, '../src/background/serviceWorker.js'),
        name: 'serviceWorker',
        formats: ['es'],
        fileName: () => 'serviceWorker.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });

  console.log('[build-service-worker] Background service worker built successfully.');
}

buildServiceWorker().catch((err) => {
  console.error('[build-service-worker] Build failed:', err);
  process.exit(1);
});
