import fs from 'node:fs';

const vitePath = 'vite.config.ts';
const source = fs.readFileSync(vitePath, 'utf8');

const oldBlock = `              // Keep React, React DOM, React Router and lucide-react inside the same
              // stable vendor chunk. Splitting those libraries separately caused a
              // production-only circular chunk and a blank screen in the browser.
              if (
                normalizedId.includes('/react/') ||
                normalizedId.includes('/react-dom/') ||
                normalizedId.includes('/react-router/') ||
                normalizedId.includes('/react-router-dom/') ||
                normalizedId.includes('/lucide-react/')
              ) {
                return 'vendor';
              }`;

const newBlock = `              // POST-UX C HOTFIX 18: keep the proven React/React DOM/Router core
              // together, but let lucide-react follow natural Rollup boundaries.
              // This prevents icons used only by lazy routes from being pulled into
              // the critical core vendor while preserving the circular-chunk fix.
              if (normalizedId.includes('/lucide-react/')) {
                return undefined;
              }

              if (
                normalizedId.includes('/react/') ||
                normalizedId.includes('/react-dom/') ||
                normalizedId.includes('/react-router/') ||
                normalizedId.includes('/react-router-dom/')
              ) {
                return 'vendor';
              }`;

if (source.includes(newBlock)) {
  console.log('SKIP HOTFIX 18 Vite lucide natural-boundary rule already applied');
  process.exit(0);
}
if (!source.includes(oldBlock)) {
  throw new Error('HOTFIX 18 expected stable vendor block not found; refusing blind patch');
}

const updated = source.replace(oldBlock, newBlock);
fs.writeFileSync(vitePath, updated, 'utf8');
console.log('PATCH HOTFIX 18 release lucide-react from critical core vendor');
console.log('PASS POST-UX C HOTFIX 18 patch applied');
