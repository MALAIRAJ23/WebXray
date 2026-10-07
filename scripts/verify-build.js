import { readdirSync, readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distRoot = resolve(__dirname, '../dist');

console.log('[verify-build] Starting post-build verification...');

// 1. Verify required files exist
const requiredFiles = [
  'manifest.json',
  'popup.html',
  'sidepanel.html',
  'src/background/serviceWorker.js',
  'icons/icon-16.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
  'src/content/overviewCollector.js',
  'src/content/performanceCollector.js',
  'src/content/seoCollector.js',
  'src/content/a11yCollector.js',
  'src/content/securityCollector.js',
  'src/content/technologyCollector.js',
  'src/content/contentScript.js',
];

let hasErrors = false;

for (const relPath of requiredFiles) {
  const fullPath = resolve(distRoot, relPath);
  if (!existsSync(fullPath)) {
    console.error(`[verify-build] ERROR: Missing required build artifact: dist/${relPath}`);
    hasErrors = true;
  }
}

// 2. Verify all files in dist/src/content/*.js contain NO import or export statements
const contentDir = resolve(distRoot, 'src/content');
if (existsSync(contentDir)) {
  const contentFiles = readdirSync(contentDir).filter((f) => f.endsWith('.js'));
  const importExportRegex = /^\s*(import\s*(\{|\*|\w+)|import\s*["']|export\s*(default|\{|\*|\w+))\b/m;

  for (const fileName of contentFiles) {
    const filePath = resolve(contentDir, fileName);
    const code = readFileSync(filePath, 'utf-8');

    const match = code.match(importExportRegex);
    if (match) {
      console.error(`[verify-build] ERROR: ${fileName} contains ES import/export statement: "${match[0].trim()}"`);
      hasErrors = true;
    } else {
      console.log(`[verify-build] OK: ${fileName} is clean classic script (no import/export).`);
    }
  }
} else {
  console.error('[verify-build] ERROR: dist/src/content directory does not exist.');
  hasErrors = true;
}

// 3. Verify serviceWorker.js contains NO external relative imports (self-contained bundle)
const swPath = resolve(distRoot, 'src/background/serviceWorker.js');
if (existsSync(swPath)) {
  const swCode = readFileSync(swPath, 'utf-8');
  const importRegex = /^\s*import\s+.*from\s+["']\.\.?\//m;
  if (importRegex.test(swCode)) {
    console.error('[verify-build] ERROR: serviceWorker.js contains external relative chunk import');
    hasErrors = true;
  } else {
    console.log('[verify-build] OK: serviceWorker.js is fully self-contained (no external chunk imports).');
  }
}

if (hasErrors) {
  console.error('[verify-build] Post-build verification FAILED.');
  process.exit(1);
}

console.log('[verify-build] Post-build verification PASSED cleanly.');
