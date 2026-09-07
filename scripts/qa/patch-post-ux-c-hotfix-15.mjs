import fs from 'node:fs';

const serverPath = 'server.ts';
function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }

let server = read(serverPath);

const oldBlock = `  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }`;

const newBlock = `  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));

    // POST-UX C HOTFIX 15: server-assisted PDP LCP image preload.
    const responsiveProductImageRe = /^(.*\\/responsive\\/[^/]+\\/w(\\d+)\\/)(\\d+)\\.webp(?:\\?.*)?$/;

    function buildPdpImagePreloadHtml(imageUrl: string) {
      const escapedHref = String(imageUrl || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      if (!escapedHref) return '';

      let imageSrcset = '';
      const match = String(imageUrl).match(responsiveProductImageRe);
      if (match) {
        const base = match[1];
        const sourceWidth = Number(match[2]);
        const widths = [480, 800, 1200].filter((width) => width <= sourceWidth);
        if (widths.length > 0) {
          imageSrcset = widths.map((width) => base + width + '.webp ' + width + 'w').join(', ');
        }
      }

      const srcsetAttr = imageSrcset
        ? ' imagesrcset="' + imageSrcset.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" imagesizes="(max-width: 768px) 100vw, 50vw"'
        : '';

      return '    <link rel="preload" as="image" href="' + escapedHref + '"' + srcsetAttr + ' fetchpriority="high" data-selfcare-server-pdp-lcp-preload="true">\\n';
    }

    app.get(/^\\/product\\/([0-9a-f-]{36})(?:\\/.*)?$/i, asyncHandler(async (req: any, res) => {
      const indexPath = path.join(distPath, 'index.html');
      let html = await fs.promises.readFile(indexPath, 'utf8');

      if (supabase) {
        try {
          const productId = req.params[0];
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
          }
        } catch (error) {
          logger.warn({ err: error }, 'PDP LCP preload injection failed');
        }
      }

      res.type('html').send(html);
    }));

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }`;

if (server.includes('POST-UX C HOTFIX 15: server-assisted PDP LCP image preload')) {
  console.log('SKIP HOTFIX 15 server-assisted PDP preload already present');
} else if (server.includes(oldBlock)) {
  server = server.replace(oldBlock, newBlock);
  write(serverPath, server);
  console.log('PATCH add server-assisted PDP LCP preload route before SPA fallback');
} else {
  throw new Error('HOTFIX 15 production static-serving anchor not found in server.ts');
}

server = read(serverPath);
for (const needle of [
  'POST-UX C HOTFIX 15: server-assisted PDP LCP image preload',
  ".select('images')",
  'data-selfcare-server-pdp-lcp-preload',
  'imagesrcset=',
  'imagesizes="(max-width: 768px) 100vw, 50vw"',
  'fetchpriority="high"',
  "html.replace('</head>'",
  "res.type('html').send(html)",
  "app.get('*', (req, res) =>",
  "res.sendFile(path.join(distPath, 'index.html'))"
]) {
  if (!server.includes(needle)) throw new Error(`HOTFIX 15 contract missing: ${needle}`);
}

console.log('PASS POST-UX C HOTFIX 15 server-assisted PDP LCP preload patch applied');
