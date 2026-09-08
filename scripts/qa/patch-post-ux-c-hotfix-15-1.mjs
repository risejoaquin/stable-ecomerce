import fs from 'node:fs';

const serverPath = 'server.ts';
const htmlPath = 'index.html';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }

let server = read(serverPath);
let html = read(htmlPath);

const cacheMarker = 'POST-UX C HOTFIX 15.1: cache PDP LCP image lookup';
const cacheAnchor = `    const responsiveProductImageRe = /^(.*\\/responsive\\/[^/]+\\/w(\\d+)\\/)(\\d+)\\.webp(?:\\?.*)?$/;

    function buildPdpImagePreloadHtml(imageUrl: string) {`;

const cacheBlock = `    const responsiveProductImageRe = /^(.*\\/responsive\\/[^/]+\\/w(\\d+)\\/)(\\d+)\\.webp(?:\\?.*)?$/;

    // POST-UX C HOTFIX 15.1: cache PDP LCP image lookup.
    const pdpLcpImageCache = new Map<string, { imageUrl: string | null; expiresAt: number }>();
    const PDP_LCP_IMAGE_CACHE_TTL_MS = 5 * 60 * 1000;

    async function getCachedPdpLcpImageUrl(productId: string) {
      const now = Date.now();
      const cached = pdpLcpImageCache.get(productId);
      if (cached && cached.expiresAt > now) return cached.imageUrl;

      const { data, error } = await supabase!
        .from('products')
        .select('images')
        .eq('id', productId)
        .maybeSingle();

      if (error) throw error;

      const imageUrl = Array.isArray(data?.images) ? data.images[0] || null : null;
      pdpLcpImageCache.set(productId, {
        imageUrl,
        expiresAt: now + PDP_LCP_IMAGE_CACHE_TTL_MS
      });
      return imageUrl;
    }

    function buildPdpImagePreloadHtml(imageUrl: string) {`;

if (!server.includes(cacheMarker)) {
  if (!server.includes(cacheAnchor)) throw new Error('HOTFIX 15.1 cache anchor not found');
  server = server.replace(cacheAnchor, cacheBlock);

  const oldLookup = `          const productId = req.params[0];
          const { data, error } = await supabase
            .from('products')
            .select('images')
            .eq('id', productId)
            .maybeSingle();

          if (!error) {
            const imageUrl = Array.isArray(data?.images) ? data.images[0] : null;
            if (imageUrl) {
              const preload = buildPdpImagePreloadHtml(imageUrl);
              if (preload && html.includes('</head>')) {
                html = html.replace('</head>', preload + '  </head>');
              }
            }
          } else {
            logger.warn({ err: error, productId }, 'PDP LCP preload product lookup failed');
          }`;

  const newLookup = `          const productId = req.params[0];
          const imageUrl = await getCachedPdpLcpImageUrl(productId);
          if (imageUrl) {
            const preload = buildPdpImagePreloadHtml(imageUrl);
            if (preload && html.includes('</head>')) {
              html = html.replace('</head>', preload + '  </head>');
            }
          }`;

  if (!server.includes(oldLookup)) throw new Error('HOTFIX 15.1 lookup anchor not found');
  server = server.replace(oldLookup, newLookup);
  write(serverPath, server);
  console.log('PATCH add cached server-side PDP image lookup');
} else {
  console.log('SKIP server cache already present');
}

html = read(htmlPath);
const oldGuard = `            if (imageUrl && !document.querySelector('link[data-selfcare-pdp-lcp-preload]')) {`;
const newGuard = `            if (
              imageUrl &&
              !document.querySelector('link[data-selfcare-server-pdp-lcp-preload], link[data-selfcare-pdp-lcp-preload]')
            ) {`;

if (!html.includes("link[data-selfcare-server-pdp-lcp-preload], link[data-selfcare-pdp-lcp-preload]")) {
  if (!html.includes(oldGuard)) throw new Error('HOTFIX 15.1 client guard anchor not found');
  html = html.replace(oldGuard, newGuard);
  write(htmlPath, html);
  console.log('PATCH prevent duplicate client preload when server preload exists');
} else {
  console.log('SKIP duplicate-preload guard already present');
}

server = read(serverPath);
html = read(htmlPath);

for (const needle of [
  cacheMarker,
  'pdpLcpImageCache',
  'PDP_LCP_IMAGE_CACHE_TTL_MS = 5 * 60 * 1000',
  'getCachedPdpLcpImageUrl',
  'data-selfcare-server-pdp-lcp-preload'
]) {
  if (!server.includes(needle)) throw new Error(`Missing server contract: ${needle}`);
}

for (const needle of [
  'data-selfcare-pdp-lcp-preload',
  'data-selfcare-server-pdp-lcp-preload',
  "link[data-selfcare-server-pdp-lcp-preload], link[data-selfcare-pdp-lcp-preload]"
]) {
  if (!html.includes(needle)) throw new Error(`Missing client contract: ${needle}`);
}

console.log('PASS POST-UX C HOTFIX 15.1 cached server-assisted PDP LCP preload patch applied');
