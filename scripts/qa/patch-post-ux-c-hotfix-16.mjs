import fs from 'node:fs';

const serverPath = 'server.ts';
const htmlPath = 'index.html';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }

let server = read(serverPath);
let html = read(htmlPath);

const marker = 'POST-UX C HOTFIX 16: server bootstrap full PDP product';

if (!server.includes(marker)) {
  const oldCache = `    // POST-UX C HOTFIX 15.1: cache PDP LCP image lookup.
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
    }`;

  const newCache = `    // POST-UX C HOTFIX 15.1: cache PDP lookup.
    // POST-UX C HOTFIX 16: server bootstrap full PDP product.
    const pdpProductCache = new Map<string, { product: any | null; expiresAt: number }>();
    const PDP_PRODUCT_CACHE_TTL_MS = 5 * 60 * 1000;

    async function getCachedPdpProduct(productId: string) {
      const now = Date.now();
      const cached = pdpProductCache.get(productId);
      if (cached && cached.expiresAt > now) return cached.product;

      const { data, error } = await supabase!
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (error) throw error;

      const product = data || null;
      pdpProductCache.set(productId, {
        product,
        expiresAt: now + PDP_PRODUCT_CACHE_TTL_MS
      });
      return product;
    }

    function serializePdpBootstrap(product: any) {
      return JSON.stringify(product)
        .replace(/&/g, '\\\\u0026')
        .replace(/</g, '\\\\u003c')
        .replace(/>/g, '\\\\u003e')
        .replace(/\\u2028/g, '\\\\u2028')
        .replace(/\\u2029/g, '\\\\u2029');
    }`;

  if (!server.includes(oldCache)) throw new Error('HOTFIX 16 cache replacement anchor not found');
  server = server.replace(oldCache, newCache);

  const oldRoute = `          const productId = req.params[0];
          const imageUrl = await getCachedPdpLcpImageUrl(productId);
          if (imageUrl) {
            const preload = buildPdpImagePreloadHtml(imageUrl);
            if (preload && html.includes('</head>')) {
              html = html.replace('</head>', preload + '  </head>');
            }
          }`;

  const newRoute = `          const productId = req.params[0];
          const product = await getCachedPdpProduct(productId);
          const imageUrl = Array.isArray(product?.images) ? product.images[0] || null : null;

          if (imageUrl) {
            const preload = buildPdpImagePreloadHtml(imageUrl);
            if (preload && html.includes('</head>')) {
              html = html.replace('</head>', preload + '  </head>');
            }
          }

          if (product && html.includes('</body>')) {
            const bootstrap = '    <script type="application/json" id="selfcare-server-product-bootstrap">' +
              serializePdpBootstrap(product) +
              '</script>\\n';
            html = html.replace('</body>', bootstrap + '  </body>');
          }`;

  if (!server.includes(oldRoute)) throw new Error('HOTFIX 16 PDP route anchor not found');
  server = server.replace(oldRoute, newRoute);
  write(serverPath, server);
  console.log('PATCH server caches and injects full PDP product bootstrap');
} else {
  console.log('SKIP HOTFIX 16 server bootstrap already present');
}

html = read(htmlPath);
const oldBootstrap = `        const id = match[1];
        const promise = fetch(\`/api/products/\${encodeURIComponent(id)}\`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          credentials: 'same-origin'
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error(\`Early product fetch failed with HTTP \${response.status}\`);
          }
          return response.json();
        }).then((product) => {`;

const newBootstrap = `        const id = match[1];
        const serverBootstrapElement = document.getElementById('selfcare-server-product-bootstrap');
        let serverProduct = null;

        if (serverBootstrapElement?.textContent) {
          try {
            const parsed = JSON.parse(serverBootstrapElement.textContent);
            if (parsed?.id === id) serverProduct = parsed;
          } catch (_) {
            // Invalid bootstrap falls back to the existing early API request.
          }
        }

        const promise = (serverProduct
          ? Promise.resolve(serverProduct)
          : fetch(\`/api/products/\${encodeURIComponent(id)}\`, {
              method: 'GET',
              headers: { Accept: 'application/json' },
              credentials: 'same-origin'
            }).then(async (response) => {
              if (!response.ok) {
                throw new Error(\`Early product fetch failed with HTTP \${response.status}\`);
              }
              return response.json();
            })
        ).then((product) => {`;

if (!html.includes("document.getElementById('selfcare-server-product-bootstrap')")) {
  if (!html.includes(oldBootstrap)) throw new Error('HOTFIX 16 index bootstrap anchor not found');
  html = html.replace(oldBootstrap, newBootstrap);
  write(htmlPath, html);
  console.log('PATCH HOTFIX 11 consumes server product bootstrap before API fallback');
} else {
  console.log('SKIP HOTFIX 16 client bootstrap already present');
}

server = read(serverPath);
html = read(htmlPath);

for (const needle of [
  marker,
  'pdpProductCache',
  'PDP_PRODUCT_CACHE_TTL_MS = 5 * 60 * 1000',
  'getCachedPdpProduct',
  ".select('*')",
  'serializePdpBootstrap',
  'selfcare-server-product-bootstrap',
  'data-selfcare-server-pdp-lcp-preload'
]) {
  if (!server.includes(needle)) throw new Error(`HOTFIX 16 server contract missing: ${needle}`);
}

for (const needle of [
  "document.getElementById('selfcare-server-product-bootstrap')",
  'Promise.resolve(serverProduct)',
  '/api/products/',
  'window.__SELFCARE_EARLY_PRODUCT__',
  'data-selfcare-server-pdp-lcp-preload'
]) {
  if (!html.includes(needle)) throw new Error(`HOTFIX 16 client contract missing: ${needle}`);
}

console.log('PASS POST-UX C HOTFIX 16 server-bootstrapped PDP product patch applied');
