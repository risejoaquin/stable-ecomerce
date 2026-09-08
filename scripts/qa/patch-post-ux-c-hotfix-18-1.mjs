import fs from 'node:fs';

const vitePath = 'vite.config.ts';
let source = fs.readFileSync(vitePath, 'utf8');

const currentBlock = `              // POST-UX C HOTFIX 18: keep the proven React/React DOM/Router core
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

const restoredBlock = `              // POST-UX C HOTFIX 18.1: restore the proven stable vendor graph.
              // Production Lighthouse showed that releasing lucide-react to natural
              // boundaries reduced bytes but regressed median LCP. Keep React,
              // React DOM, React Router and lucide-react together to avoid both the
              // historical circular chunk and the HOTFIX 18 fragmentation penalty.
              if (
                normalizedId.includes('/react/') ||
                normalizedId.includes('/react-dom/') ||
                normalizedId.includes('/react-router/') ||
                normalizedId.includes('/react-router-dom/') ||
                normalizedId.includes('/lucide-react/')
              ) {
                return 'vendor';
              }`;

if (source.includes(restoredBlock)) {
  console.log('SKIP HOTFIX 18.1 stable vendor graph already restored');
  process.exit(0);
}

if (!source.includes(currentBlock)) {
  throw new Error('HOTFIX 18.1 expected HOTFIX 18 block not found; refusing blind rollback');
}

source = source.replace(currentBlock, restoredBlock);
fs.writeFileSync(vitePath, source, 'utf8');

console.log('PATCH HOTFIX 18.1 restore lucide-react to stable core vendor');
console.log('PASS POST-UX C HOTFIX 18.1 rollback applied');
