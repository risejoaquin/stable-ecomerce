import fs from 'node:fs';

const htmlPath = 'index.html';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }

let html = read(htmlPath);
const marker = 'data-selfcare-pdp-lcp-preload';

const injected = [
  '.then((product) => {',
  '          try {',
  '            const imageUrl = Array.isArray(product?.images) ? product.images[0] : null;',
  "            if (imageUrl && !document.querySelector('link[data-selfcare-pdp-lcp-preload]')) {",
  "              const preload = document.createElement('link');",
  "              preload.rel = 'preload';",
  "              preload.as = 'image';",
  '              preload.href = imageUrl;',
  "              preload.fetchPriority = 'high';",
  "              preload.setAttribute('data-selfcare-pdp-lcp-preload', 'true');",
  '',
  '              const match = imageUrl.match(/^(.*\\/responsive\\/[^/]+\\/w(\\d+)\\/)(\\d+)\\.webp(?:\\?.*)?$/);',
  '              if (match) {',
  '                const base = match[1];',
  '                const sourceWidth = Number(match[2]);',
  '                const widths = [480, 800, 1200].filter((width) => width <= sourceWidth);',
  '                if (widths.length > 0) {',
  "                  preload.imageSrcset = widths.map((width) => base + width + '.webp ' + width + 'w').join(', ');",
  "                  preload.imageSizes = '(max-width: 768px) 100vw, 50vw';",
  '                }',
  '              }',
  '',
  '              document.head.appendChild(preload);',
  '            }',
  '          } catch (_) {',
  '            // Early preload is opportunistic; React remains the source of truth.',
  '          }',
  '          return product;',
  '        })'
].join('\n');

if (html.includes(marker)) {
  console.log('SKIP early PDP LCP preload already present');
} else {
  const responseJsonRe = /(\breturn\s+response\.json\(\);\s*\r?\n[ \t]*\}\))\s*;/m;
  const match = html.match(responseJsonRe);

  if (!match) {
    throw new Error('HOTFIX 14.2 could not find the early response.json() promise-chain anchor in index.html');
  }

  html = html.replace(responseJsonRe, `$1${injected};`);
  write(htmlPath, html);
  console.log('PATCH add safe early PDP LCP image preload after product discovery');
}

html = read(htmlPath);

for (const needle of [
  marker,
  "preload.rel = 'preload'",
  "preload.as = 'image'",
  "preload.fetchPriority = 'high'",
  "preload.imageSrcset = widths.map((width) => base + width + '.webp ' + width + 'w').join(', ')",
  "preload.imageSizes = '(max-width: 768px) 100vw, 50vw'",
  'document.head.appendChild(preload)',
  'return product;'
]) {
  if (!html.includes(needle)) {
    throw new Error(`HOTFIX 14.2 contract missing: ${needle}`);
  }
}

for (const retained of [
  'window.__SELFCARE_EARLY_PRODUCT__',
  "credentials: 'same-origin'",
  'promise.catch(() => {})'
]) {
  if (!html.includes(retained)) {
    throw new Error(`HOTFIX 11 protected behavior missing after HOTFIX 14.2: ${retained}`);
  }
}

console.log('PASS POST-UX C HOTFIX 14.2 safe early PDP LCP preload patch applied');
