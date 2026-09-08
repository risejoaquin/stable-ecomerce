import fs from 'node:fs';

const htmlPath = 'index.html';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }

let html = read(htmlPath);

if (html.includes("document.getElementById('selfcare-server-product-bootstrap')")) {
  console.log('SKIP HOTFIX 16.1 client bootstrap already present');
} else {
  const re = /(\s*const id = match\[1\];\s*\r?\n)([\s\S]*?)(\s*const promise = fetch\(`\/api\/products\/\$\{encodeURIComponent\(id\)\}`,\s*\{[\s\S]*?\}\)\.then\(async \(response\) => \{[\s\S]*?return response\.json\(\);\s*\}\))(\.then\(\(product\) => \{)/m;

  const match = html.match(re);
  if (!match) {
    throw new Error('HOTFIX 16.1 current HOTFIX 11 bootstrap shape not found in index.html');
  }

  const replacement =
`${match[1]}        const serverBootstrapElement = document.getElementById('selfcare-server-product-bootstrap');
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
        )${match[4]}`;

  html = html.replace(re, replacement);
  write(htmlPath, html);
  console.log('PATCH HOTFIX 16.1 consume server product bootstrap before API fallback');
}

html = read(htmlPath);

for (const needle of [
  "document.getElementById('selfcare-server-product-bootstrap')",
  'Promise.resolve(serverProduct)',
  '/api/products/',
  'window.__SELFCARE_EARLY_PRODUCT__',
  "link[data-selfcare-server-pdp-lcp-preload], link[data-selfcare-pdp-lcp-preload]"
]) {
  if (!html.includes(needle)) {
    throw new Error(`HOTFIX 16.1 client contract missing: ${needle}`);
  }
}

console.log('PASS POST-UX C HOTFIX 16.1 client bootstrap repair applied');
