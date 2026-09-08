import fs from 'node:fs';

const path = 'vite.config.ts';
let source = fs.readFileSync(path, 'utf8');

const already = `              if (
                normalizedId.includes('/react-hot-toast/') ||
                normalizedId.includes('/goober/')
              ) {
                return 'vendor-toast';
              }`;

if (source.includes(already)) {
  console.log('SKIP HOTFIX 19.2 vendor-toast isolation already applied');
  process.exit(0);
}

const anchor = `              if (
                normalizedId.includes('/motion/') ||
                normalizedId.includes('/@radix-ui/') ||
                normalizedId.includes('/react-hot-toast/') ||`;

if (!source.includes(anchor)) {
  throw new Error('HOTFIX 19.2 expected vendor-ui anchor not found');
}

source = source.replace(
  anchor,
  `              if (
                normalizedId.includes('/react-hot-toast/') ||
                normalizedId.includes('/goober/')
              ) {
                return 'vendor-toast';
              }

              if (
                normalizedId.includes('/motion/') ||
                normalizedId.includes('/@radix-ui/') ||`
);

fs.writeFileSync(path, source, 'utf8');

console.log('PATCH HOTFIX 19.2 isolate react-hot-toast + goober into vendor-toast');
console.log('PASS POST-UX C HOTFIX 19.2 patch applied');
